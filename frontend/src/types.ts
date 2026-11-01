export type UserRole = "admin" | "manager" | "technician";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string | null;
}

export type SiteStatus = "NORMAL" | "ACTION" | "CRITICAL" | "NO_DATA";

export interface SiteSummary {
  id: string;
  name: string;
  city: string;
  province: string;
  kwp: number;
  system_type: string;
  has_battery: boolean;
  status: SiteStatus;
  actual_kwh: number | null;
  expected_kwh: number | null;
  gap_kwh: number | null;
  loss_idr: number | null;
  performance: number | null;
  operator_name: string | null;
}

export interface DayMetric {
  date: string;
  actual_kwh: number | null;
  expected_kwh: number | null;
  gap_kwh: number | null;
  performance: number | null;
  loss_idr: number | null;
  status: SiteStatus;
  weather_source: string | null;
}

export interface SiteDetail {
  id: string;
  name: string;
  city: string;
  province: string;
  lat: number;
  lon: number;
  kwp: number;
  system_type: string;
  has_battery: boolean;
  panel_mount: string;
  timezone: string;
  tariff_idr_per_kwh: number;
  pr_default: number;
  pr_calibrated: number | null;
  operator: {
    name: string;
    honorific: string;
  } | null;
  today_assessment: {
    date: string;
    status: SiteStatus;
    actual_kwh: number | null;
    expected_kwh: number | null;
    gap_kwh: number | null;
    performance: number | null;
    loss_idr: number | null;
    reason_code: string;
    weather_source: string | null;
  } | null;
  last_7_days: DayMetric[];
}

export type TicketStatus =
  | "AWAITING_APPROVAL"
  | "SCHEDULED"
  | "POSTPONED"
  | "DONE_BY_TECH"
  | "RESOLVED"
  | "REOPENED";

export interface TicketEvent {
  id: string;
  type: string;
  note: string | null;
  actor_name: string;
  created_at: string;
}

export interface Ticket {
  id: string;
  code: string;
  site_id: string;
  site_name: string;
  status: TicketStatus;
  priority: "critical" | "normal";
  reason: string;
  cause: string | null;
  technician_name: string | null;
  estimated_cost_idr: number | null;
  scheduled_at: string | null;
  approved_at: string | null;
  created_at: string;
  events?: TicketEvent[];
}

export interface WeeklyTotals {
  actual_kwh: number;
  expected_kwh: number;
  gap_kwh: number;
  loss_idr: number;
}

export interface WeeklyReport {
  site_id: string;
  site_name: string;
  kwp: number;
  period: string;
  totals: WeeklyTotals;
  days: DayMetric[];
}
