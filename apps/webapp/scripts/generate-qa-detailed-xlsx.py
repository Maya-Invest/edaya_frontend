#!/usr/bin/env python3
"""Génère qa-test-matrix-detailed.xlsx — rapport procédure + inputs + blockers."""
import csv
import sys
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

STATUT_FILLS = {
    "NOT OK": (PatternFill("solid", fgColor="FFC7CE"), Font(color="9C0006", bold=True)),
    "OK": (PatternFill("solid", fgColor="C6EFCE"), Font(color="006100")),
    "N/A": (PatternFill("solid", fgColor="E7E6E6"), Font(color="595959")),
    "Manuel": (PatternFill("solid", fgColor="DDEBF7"), Font(color="1F4E79")),
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

# #, Trace, Procedure, Inputs, Statut, Blocker, Catégorie, Endpoint, Action, Auto
WIDTHS = [6, 42, 56, 40, 12, 48, 14, 44, 36, 14]


def read_csv(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    with path.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f, delimiter=";")
        fieldnames = reader.fieldnames or []
        rows = [dict(row) for row in reader]
    return fieldnames, rows


def style_sheet(ws, fieldnames: list[str]) -> None:
    for i, w in enumerate(WIDTHS, 1):
        if i <= len(fieldnames):
            ws.column_dimensions[get_column_letter(i)].width = w

    for cell in ws[1]:
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    statut_col = fieldnames.index("Statut") + 1 if "Statut" in fieldnames else 5

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
    ws.freeze_panes = "B2"
    ws.row_dimensions[1].height = 28


def write_rows(ws, fieldnames: list[str], rows: list[dict[str, str]]) -> None:
    ws.append(fieldnames)
    for row in rows:
        ws.append([row.get(f, "") for f in fieldnames])


def main() -> None:
    csv_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("qa-test-matrix-detailed.csv")
    xlsx_path = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("qa-test-matrix-detailed.xlsx")

    fieldnames, rows = read_csv(csv_path)
    if not fieldnames:
        sys.exit("Empty CSV")

    wb = Workbook()

    # Synthèse
    ws_sum = wb.active
    ws_sum.title = "Synthèse"
    ws_sum.append(["Statut", "Nombre"])
    for cell in ws_sum[1]:
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
    statuts = [r.get("Statut", "") for r in rows]
    for label in ["OK", "NOT OK", "N/A", "Manuel", "À faire"]:
        ws_sum.append([label, statuts.count(label)])
    ws_sum.append(["TOTAL", len(rows)])
    ws_sum.append([])
    ws_sum.append(["NOT OK uniquement (blockers)", statuts.count("NOT OK")])
    ws_sum.column_dimensions["A"].width = 28
    ws_sum.column_dimensions["B"].width = 12

    # Blockers sheet
    ws_blk = wb.create_sheet("Blockers")
    blocker_cols = [c for c in fieldnames if c != "Exécuté en run auto"]
    blocker_rows = [r for r in rows if r.get("Statut") == "NOT OK"]
    write_rows(ws_blk, blocker_cols, blocker_rows)
    style_sheet(ws_blk, blocker_cols)

    # All rows
    ws_all = wb.create_sheet("Tous les tests")
    write_rows(ws_all, fieldnames, rows)
    style_sheet(ws_all, fieldnames)

    # Per module
    modules = sorted({r.get("Catégorie", "") for r in rows if r.get("Catégorie")})
    for module in modules:
        mod_rows = [r for r in rows if r.get("Catégorie") == module]
        safe_name = module[:31]
        ws = wb.create_sheet(safe_name)
        write_rows(ws, fieldnames, mod_rows)
        style_sheet(ws, fieldnames)

    wb.save(xlsx_path)
    print(f"Wrote {xlsx_path} ({len(rows)} tests, {len(modules)} modules)")


if __name__ == "__main__":
    main()
