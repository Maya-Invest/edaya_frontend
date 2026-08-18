#!/usr/bin/env python3
"""Génère qa-test-matrix.xlsx avec feuilles par catégorie + vue globale."""
import csv
import sys
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

MODULE_COLORS = {
    "Auth": "4472C4",
    "Onboarding": "7030A0",
    "Shell": "404040",
    "Dashboard": "2E75B6",
    "Compte": "548235",
    "École": "C55A11",
    "Classes": "BF8F00",
    "Finance": "00B050",
    "Configuration": "5B9BD5",
    "Outils & imports": "7F7F7F",
    "Permissions": "843C0C",
}

STATUT_FILLS = {
    "NOT OK": (PatternFill("solid", fgColor="FFC7CE"), Font(color="9C0006", bold=True)),
    "OK": (PatternFill("solid", fgColor="C6EFCE"), Font(color="006100")),
    "N/A": (PatternFill("solid", fgColor="E7E6E6"), Font(color="595959")),
    "À faire": (PatternFill("solid", fgColor="FFF2CC"), Font(color="7F6000")),
}

HEADER_FILL = PatternFill("solid", fgColor="1F4E79")
HEADER_FONT = Font(bold=True, color="FFFFFF")
THIN = Border(
    left=Side(style="thin", color="D9D9D9"),
    right=Side(style="thin", color="D9D9D9"),
    top=Side(style="thin", color="D9D9D9"),
    bottom=Side(style="thin", color="D9D9D9"),
)
WIDTHS = [18, 52, 48, 56, 42, 28, 12]


def read_csv(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    with path.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f, delimiter=";")
        fieldnames = reader.fieldnames or []
        rows = [dict(row) for row in reader]
    return fieldnames, rows


def style_sheet(ws, fieldnames: list[str]) -> None:
    for i, w in enumerate(WIDTHS, 1):
        ws.column_dimensions[get_column_letter(i)].width = w

    for cell in ws[1]:
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    statut_col = fieldnames.index("Statut") + 1 if "Statut" in fieldnames else 6

    for row in ws.iter_rows(min_row=2, max_row=ws.max_row, max_col=len(fieldnames)):
        for cell in row:
            cell.border = THIN
            cell.alignment = Alignment(vertical="top", wrap_text=True)
        statut = row[statut_col - 1].value
        if statut in STATUT_FILLS:
            fill, font = STATUT_FILLS[statut]
            row[statut_col - 1].fill = fill
            row[statut_col - 1].font = font

    ws.auto_filter.ref = ws.dimensions
    ws.freeze_panes = "A2"
    ws.row_dimensions[1].height = 24


def write_rows(ws, fieldnames: list[str], rows: list[dict[str, str]]) -> None:
    ws.append(fieldnames)
    for row in rows:
        ws.append([row.get(f, "") for f in fieldnames])


def main() -> None:
    csv_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("qa-test-matrix.csv")
    xlsx_path = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("qa-test-matrix.xlsx")

    fieldnames, rows = read_csv(csv_path)
    if not fieldnames:
        fieldnames = [
            "Catégorie",
            "Endpoint",
            "Action / description du test",
            "Objectif du test",
            "Détail problème",
            "Suggestion",
            "Statut",
        ]

    wb = Workbook()
    # Feuille globale
    ws_all = wb.active
    ws_all.title = "Tous"
    write_rows(ws_all, fieldnames, rows)
    style_sheet(ws_all, fieldnames)

    # Feuille par module
    modules = sorted({r.get("Catégorie", "") for r in rows if r.get("Catégorie")})
    for module in modules:
        mod_rows = [r for r in rows if r.get("Catégorie") == module]
        safe_name = module[:31]
        ws = wb.create_sheet(safe_name)
        write_rows(ws, fieldnames, mod_rows)
        style_sheet(ws, fieldnames)
        # Bandeau catégorie couleur en colonne A
        color = MODULE_COLORS.get(module, "808080")
        mod_fill = PatternFill("solid", fgColor=color)
        mod_font = Font(color="FFFFFF", bold=True)
        for row in ws.iter_rows(min_row=2, max_row=ws.max_row, min_col=1, max_col=1):
            for cell in row:
                cell.fill = mod_fill
                cell.font = mod_font

    # Feuille synthèse
    ws_sum = wb.create_sheet("Synthèse", 0)
    ws_sum.append(["Catégorie", "Total", "OK", "NOT OK", "N/A", "À faire"])
    for cell in ws_sum[1]:
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT

    for module in modules:
        mod_rows = [r for r in rows if r.get("Catégorie") == module]
        statuts = [r.get("Statut", "") for r in mod_rows]
        ws_sum.append([
            module,
            len(mod_rows),
            statuts.count("OK"),
            statuts.count("NOT OK"),
            statuts.count("N/A"),
            statuts.count("À faire"),
        ])

    ws_sum.append([])
    ws_sum.append([
        "TOTAL",
        len(rows),
        sum(1 for r in rows if r.get("Statut") == "OK"),
        sum(1 for r in rows if r.get("Statut") == "NOT OK"),
        sum(1 for r in rows if r.get("Statut") == "N/A"),
        sum(1 for r in rows if r.get("Statut") == "À faire"),
    ])

    for col, w in enumerate([22, 10, 10, 10, 10, 12], 1):
        ws_sum.column_dimensions[get_column_letter(col)].width = w

    wb.save(xlsx_path)
    print(f"Wrote {xlsx_path} ({len(rows)} tests, {len(modules)} modules)")


if __name__ == "__main__":
    main()
