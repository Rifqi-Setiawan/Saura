import io
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def generate_weekly_pdf(
    site_name: str,
    kwp: float,
    city: str,
    period_str: str,
    totals: dict[str, Any],
    days_data: list[dict[str, Any]],
    incident_notes: str | None = None,
) -> bytes:
    """Generate a clean weekly PDF report using ReportLab."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=4,
    )

    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=11,
        leading=14,
        textColor=colors.HexColor("#475569"),
        spaceAfter=15,
    )

    section_heading = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#1e293b"),
        spaceBefore=12,
        spaceAfter=8,
    )

    cell_style = ParagraphStyle(
        "CellText",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#1e293b"),
    )

    cell_bold = ParagraphStyle(
        "CellBold",
        parent=cell_style,
        fontName="Helvetica-Bold",
    )

    elements = []

    # Title & Header
    elements.append(Paragraph("SAURA — Laporan Mingguan Kinerja PLTS", title_style))
    elements.append(
        Paragraph(
            f"<b>Situs:</b> {site_name} ({kwp:.1f} kWp) — {city} | <b>Periode:</b> {period_str}",
            subtitle_style,
        )
    )

    # 1. KPI Summary Cards in Table
    loss_idr = totals.get("loss_idr", 0)
    loss_formatted = f"Rp{loss_idr:,}".replace(",", ".")
    actual_kwh = totals.get("actual_kwh", 0.0)
    expected_kwh = totals.get("expected_kwh", 0.0)
    gap_kwh = totals.get("gap_kwh", 0.0)

    summary_data = [
        [
            Paragraph("<b>Total Aktual</b>", cell_style),
            Paragraph("<b>Perkiraan Cuaca</b>", cell_style),
            Paragraph("<b>Selisih Energi</b>", cell_style),
            Paragraph("<b>Dampak Finansial</b>", cell_style),
        ],
        [
            Paragraph(f"<b>{actual_kwh:.1f} kWh</b>", cell_bold),
            Paragraph(f"<b>{expected_kwh:.1f} kWh</b>", cell_bold),
            Paragraph(f"<b>{gap_kwh:.1f} kWh</b>", cell_bold),
            Paragraph(f"<b>{loss_formatted}</b>", cell_bold),
        ],
    ]
    summary_table = Table(summary_data, colWidths=[130, 130, 130, 130])
    summary_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ]
        )
    )
    elements.append(summary_table)
    elements.append(Spacer(1, 15))

    # 2. Daily Breakdown Table
    elements.append(Paragraph("Rincian Harian", section_heading))
    table_rows = [
        [
            Paragraph("<b>Tanggal</b>", cell_bold),
            Paragraph("<b>Aktual</b>", cell_bold),
            Paragraph("<b>Perkiraan</b>", cell_bold),
            Paragraph("<b>Selisih</b>", cell_bold),
            Paragraph("<b>Kinerja</b>", cell_bold),
            Paragraph("<b>Status</b>", cell_bold),
        ]
    ]

    for d in days_data:
        perf = d.get("performance")
        perf_pct = f"{int(round(perf * 100))}%" if perf is not None else "-"
        st = d.get("status", "-")
        table_rows.append(
            [
                Paragraph(str(d.get("date")), cell_style),
                Paragraph(f"{d.get('actual_kwh', 0.0):.1f} kWh", cell_style),
                Paragraph(f"{d.get('expected_kwh', 0.0):.1f} kWh", cell_style),
                Paragraph(f"{d.get('gap_kwh', 0.0):.1f} kWh", cell_style),
                Paragraph(perf_pct, cell_style),
                Paragraph(f"<b>{st}</b>", cell_style),
            ]
        )

    daily_table = Table(table_rows, colWidths=[80, 85, 85, 85, 85, 100])
    daily_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
                ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    elements.append(daily_table)
    elements.append(Spacer(1, 15))

    # 3. Incident Notes / Recovery Status
    if incident_notes:
        elements.append(Paragraph("Catatan Pemulihan & Tiket", section_heading))
        elements.append(Paragraph(incident_notes, cell_style))
        elements.append(Spacer(1, 15))

    # Footer notice
    footer_text = (
        "Laporan dibuat otomatis secara deterministik oleh SAURA "
        "(Sistem Analisis Unjuk Kerja PLTS & Rekomendasi Aksi). Data cuaca: Open-Meteo & NASA POWER."
    )
    elements.append(Paragraph(f"<i>{footer_text}</i>", cell_style))

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()
