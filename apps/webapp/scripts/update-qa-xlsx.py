#!/usr/bin/env python3
"""Merge qa-checklist-results.json into qa-manual-checklist.xlsx."""
import csv
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
CSV_PATH = ROOT / "qa-manual-checklist.csv"
XLSX_PATH = ROOT / "qa-manual-checklist.xlsx"
RESULTS_PATH = ROOT / "qa-checklist-results.json"


def normalize_page(page: str) -> str:
    return re.sub(r"\[.*?\]", "[id]", page.strip().lower())


def normalize_probleme(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())[:80]


def load_results() -> list[dict]:
    if not RESULTS_PATH.exists():
        print(f"No results at {RESULTS_PATH}", file=sys.stderr)
        return []
    data = json.loads(RESULTS_PATH.read_text(encoding="utf-8"))
    return data.get("results", [])


def match_row(row: dict, result: dict) -> bool:
    row_page = normalize_page(row.get("Page", ""))
    res_page = normalize_page(result.get("page", ""))
    if row_page != res_page and not (row_page in res_page or res_page in row_page):
        # class routes: match prefix
        if "/classes/" in row_page and "/classes/" in res_page:
            row_base = row_page.split("/classes/")[0] + "/classes/[classid]/" + row_page.split("/classes/")[1].split("/", 1)[-1] if "/classes/" in row_page else row_page
            res_parts = res_page.split("/")
            if len(res_parts) >= 5 and "classes" in res_parts:
                pass  # continue to probleme match
            else:
                return False
        elif row_page not in res_page and res_page not in row_page:
            return False

    row_prob = normalize_probleme(row.get("Probleme", ""))
    res_prob = normalize_probleme(result.get("probleme", ""))
    if row_prob in res_prob or res_prob in row_prob:
        return True
    # keyword overlap
    row_words = set(re.findall(r"\w{4,}", row_prob))
    res_words = set(re.findall(r"\w{4,}", res_prob))
    overlap = row_words & res_words
    return len(overlap) >= 2


def update_csv(rows: list[dict], results: list[dict]) -> list[dict]:
    used_results = set()
    for row in rows:
        for i, result in enumerate(results):
            if i in used_results:
                continue
            if match_row(row, result):
                row["Etat"] = result.get("etat", row.get("Etat", ""))
                if result.get("detail"):
                    row["Détail problème"] = result["detail"]
                if result.get("suggestion"):
                    row["Suggestion"] = result["suggestion"]
                used_results.add(i)
                break
    return rows


def write_xlsx(rows: list[dict], fieldnames: list[str]) -> None:
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
    from openpyxl.utils import get_column_letter

    wb = Workbook()
    ws = wb.active
    ws.title = "QA Manual"
    ws.append(fieldnames)
    for row in rows:
        ws.append([row.get(f, "") for f in fieldnames])

    header_fill = PatternFill("solid", fgColor="1F4E79")
    header_font = Font(bold=True, color="FFFFFF")
    thin = Border(
        left=Side(style="thin", color="D9D9D9"),
        right=Side(style="thin", color="D9D9D9"),
        top=Side(style="thin", color="D9D9D9"),
        bottom=Side(style="thin", color="D9D9D9"),
    )
    fills = {
        "NOT OK": (PatternFill("solid", fgColor="FFC7CE"), Font(color="9C0006")),
        "OK": (PatternFill("solid", fgColor="C6EFCE"), Font(color="006100")),
        "N/A": (PatternFill("solid", fgColor="E7E6E6"), Font(color="595959")),
        "À faire": (PatternFill("solid", fgColor="FFF2CC"), Font(color="7F6000")),
    }

    for cell in ws[1]:
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    etat_col = fieldnames.index("Etat") + 1
    for row in ws.iter_rows(min_row=2, max_row=ws.max_row, max_col=ws.max_column):
        for cell in row:
            cell.border = thin
            cell.alignment = Alignment(vertical="top", wrap_text=True)
        etat = row[etat_col - 1].value
        if etat in fills:
            fill, font = fills[etat]
            row[etat_col - 1].fill = fill
            row[etat_col - 1].font = font

    widths = [8, 55, 70, 50, 30, 12]
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.auto_filter.ref = ws.dimensions
    ws.freeze_panes = "A2"
    try:
        wb.save(XLSX_PATH)
    except PermissionError:
        alt = XLSX_PATH.with_name(XLSX_PATH.stem + "-updated" + XLSX_PATH.suffix)
        wb.save(alt)
        print(f"Could not overwrite {XLSX_PATH} (file open?) — wrote {alt}")
        return


def main() -> None:
    results = load_results()
    with CSV_PATH.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f, delimiter=";")
        fieldnames = [name for name in (reader.fieldnames or []) if name]
        rows = [{k: (row.get(k) or "") for k in fieldnames} for row in reader]

    rows = update_csv(rows, results)
    with CSV_PATH.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter=";")
        writer.writeheader()
        writer.writerows(rows)

    write_xlsx(rows, fieldnames)
    ok = sum(1 for r in rows if r.get("Etat") == "OK")
    not_ok = sum(1 for r in rows if r.get("Etat") == "NOT OK")
    todo = sum(1 for r in rows if r.get("Etat") == "À faire")
    print(f"Updated {XLSX_PATH}: OK={ok} NOT OK={not_ok} À faire={todo}")


if __name__ == "__main__":
    main()
