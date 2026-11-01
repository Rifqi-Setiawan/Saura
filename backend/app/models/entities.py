import datetime
import uuid

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    Time,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.db.session import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utc_now() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


class AppUser(Base):
    __tablename__ = "app_user"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(128), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(32), nullable=False)  # admin, manager, technician
    phone = Column(String(32), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    managed_sites = relationship("Site", back_populates="manager", foreign_keys="Site.manager_id")
    assigned_tickets = relationship(
        "Ticket", back_populates="technician", foreign_keys="Ticket.technician_id"
    )


class Operator(Base):
    __tablename__ = "operator"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    telegram_user_id = Column(BigInteger, unique=True, nullable=False, index=True)
    telegram_chat_id = Column(BigInteger, nullable=False)
    name = Column(String(128), nullable=False)
    honorific = Column(String(16), default="Pak", nullable=False)  # Pak, Bu
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    sites = relationship("Site", back_populates="operator")


class Site(Base):
    __tablename__ = "site"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(128), nullable=False)
    city = Column(String(64), nullable=False)
    province = Column(String(64), nullable=False)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    kwp = Column(Float, nullable=False)
    system_type = Column(String(32), default="on_grid", nullable=False)  # on_grid, hybrid, off_grid
    has_battery = Column(Boolean, default=False, nullable=False)
    panel_mount = Column(String(32), default="roof", nullable=False)  # roof, ground, unknown
    timezone = Column(String(64), default="Asia/Jakarta", nullable=False)
    tariff_idr_per_kwh = Column(Integer, default=1500, nullable=False)
    pr_default = Column(Float, default=0.790, nullable=False)
    pr_calibrated = Column(Float, nullable=True)
    operator_id = Column(String(36), ForeignKey("operator.id"), nullable=True)
    manager_id = Column(String(36), ForeignKey("app_user.id"), nullable=True)
    technician_id = Column(String(36), ForeignKey("app_user.id"), nullable=True)
    reminder_time = Column(Time, nullable=True)
    is_simulated = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    operator = relationship("Operator", back_populates="sites")
    manager = relationship("AppUser", back_populates="managed_sites", foreign_keys=[manager_id])
    technician = relationship("AppUser", foreign_keys=[technician_id])
    reports = relationship("DailyReport", back_populates="site", cascade="all, delete-orphan")
    assessments = relationship(
        "DailyAssessment", back_populates="site", cascade="all, delete-orphan"
    )
    tickets = relationship("Ticket", back_populates="site", cascade="all, delete-orphan")


class Photo(Base):
    __tablename__ = "photo"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    site_id = Column(String(36), ForeignKey("site.id"), nullable=True)
    kind = Column(String(32), nullable=False)  # inverter, panel, error_code
    storage_path = Column(String(255), nullable=False)
    telegram_file_id = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class DailyReport(Base):
    __tablename__ = "daily_report"
    __table_args__ = (UniqueConstraint("site_id", "date", name="uq_site_date_report"),)

    id = Column(String(36), primary_key=True, default=generate_uuid)
    site_id = Column(String(36), ForeignKey("site.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    kwh = Column(Float, nullable=False)
    source = Column(String(32), default="manual", nullable=False)  # ocr, manual, csv, sim
    photo_id = Column(String(36), ForeignKey("photo.id"), nullable=True)
    ocr_confidence = Column(Float, nullable=True)
    confirmed_by_operator = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    site = relationship("Site", back_populates="reports")
    photo = relationship("Photo")


class WeatherDaily(Base):
    __tablename__ = "weather_daily"

    site_id = Column(String(36), ForeignKey("site.id"), primary_key=True)
    date = Column(Date, primary_key=True)
    irradiance_kwh_m2 = Column(Float, nullable=False)
    source = Column(String(32), nullable=False)  # open_meteo, nasa_power, nasa_climatology
    fetched_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class DailyAssessment(Base):
    __tablename__ = "daily_assessment"
    __table_args__ = (UniqueConstraint("site_id", "date", name="uq_site_date_assessment"),)

    id = Column(String(36), primary_key=True, default=generate_uuid)
    site_id = Column(String(36), ForeignKey("site.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    report_id = Column(String(36), ForeignKey("daily_report.id"), nullable=True)
    expected_kwh = Column(Float, nullable=True)
    actual_kwh = Column(Float, nullable=True)
    gap_kwh = Column(Float, nullable=True)
    performance = Column(Float, nullable=True)
    loss_idr = Column(Integer, nullable=True)
    status = Column(String(32), nullable=True)  # NO_DATA, CRITICAL, ACTION, NORMAL or None
    reason_code = Column(String(64), nullable=True)
    weather_source = Column(String(32), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    site = relationship("Site", back_populates="assessments")
    report = relationship("DailyReport")


class Conversation(Base):
    __tablename__ = "conversation"

    operator_id = Column(String(36), ForeignKey("operator.id"), primary_key=True)
    state = Column(String(64), default="IDLE", nullable=False)
    context = Column(JSON, default=dict, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)


class CheckSession(Base):
    __tablename__ = "check_session"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    site_id = Column(String(36), ForeignKey("site.id"), nullable=False)
    assessment_id = Column(String(36), ForeignKey("daily_assessment.id"), nullable=True)
    answers = Column(JSON, default=dict, nullable=False)
    cause = Column(String(64), nullable=True)
    confidence = Column(String(32), nullable=True)
    started_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    ended_at = Column(DateTime(timezone=True), nullable=True)


class Ticket(Base):
    __tablename__ = "ticket"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    code = Column(String(32), unique=True, nullable=False, index=True)  # e.g. SA-024
    site_id = Column(String(36), ForeignKey("site.id"), nullable=False, index=True)
    status = Column(
        String(32), default="AWAITING_APPROVAL", nullable=False
    )  # AWAITING_APPROVAL, SCHEDULED, POSTPONED, DONE_BY_TECH, RESOLVED, REOPENED
    priority = Column(String(32), default="normal", nullable=False)  # critical, normal
    reason = Column(Text, nullable=True)
    cause = Column(String(128), nullable=True)
    technician_id = Column(String(36), ForeignKey("app_user.id"), nullable=True)
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    estimated_cost_idr = Column(Integer, nullable=True)
    approved_by = Column(String(36), ForeignKey("app_user.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    site = relationship("Site", back_populates="tickets")
    technician = relationship(
        "AppUser", back_populates="assigned_tickets", foreign_keys=[technician_id]
    )
    approver = relationship("AppUser", foreign_keys=[approved_by])
    events = relationship(
        "TicketEvent",
        back_populates="ticket",
        cascade="all, delete-orphan",
        order_by="TicketEvent.created_at",
    )
    photos = relationship("TicketPhoto", back_populates="ticket", cascade="all, delete-orphan")


class TicketEvent(Base):
    __tablename__ = "ticket_event"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    ticket_id = Column(String(36), ForeignKey("ticket.id"), nullable=False, index=True)
    type = Column(
        String(32), nullable=False
    )  # created, approved, postponed, question, done_by_tech, resolved, reopened, cost_change
    actor_user_id = Column(String(36), ForeignKey("app_user.id"), nullable=True)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    ticket = relationship("Ticket", back_populates="events")
    actor = relationship("AppUser")


class TicketPhoto(Base):
    __tablename__ = "ticket_photo"

    ticket_id = Column(String(36), ForeignKey("ticket.id"), primary_key=True)
    photo_id = Column(String(36), ForeignKey("photo.id"), primary_key=True)

    ticket = relationship("Ticket", back_populates="photos")
    photo = relationship("Photo")


class Notification(Base):
    __tablename__ = "notification"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("app_user.id"), nullable=False, index=True)
    site_id = Column(String(36), ForeignKey("site.id"), nullable=True)
    ticket_id = Column(String(36), ForeignKey("ticket.id"), nullable=True)
    text = Column(Text, nullable=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class AgentLog(Base):
    __tablename__ = "agent_log"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    operator_id = Column(String(36), ForeignKey("operator.id"), nullable=True)
    site_id = Column(String(36), ForeignKey("site.id"), nullable=True)
    event = Column(String(64), nullable=False)
    context_summary = Column(JSON, nullable=True)
    tool_calls = Column(JSON, nullable=True)
    final_message = Column(Text, nullable=True)
    guardrail_hits = Column(JSON, nullable=True)
    duration_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class WeeklyReport(Base):
    __tablename__ = "weekly_report"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    site_id = Column(String(36), ForeignKey("site.id"), nullable=False, index=True)
    week_start = Column(Date, nullable=False)
    totals = Column(JSON, nullable=False)
    pdf_path = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class Config(Base):
    __tablename__ = "config"

    key = Column(String(64), primary_key=True)
    value = Column(JSON, nullable=False)
