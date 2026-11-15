import sys
from docx import Document
from docx.oxml.ns import qn

sys.stdout.reconfigure(encoding="utf-8")
path = r"C:\Users\Lenovo\Downloads\Hafta1_Proje raporu (1).docx"
doc = Document(path)
print("sections", len(doc.sections))
for i, section in enumerate(doc.sections):
    print("section", i, "size", section.page_width, section.page_height, "margins", section.top_margin, section.bottom_margin, section.left_margin, section.right_margin)
for ti, table in enumerate(doc.tables):
    print("TABLE", ti, "style", table.style.name if table.style else None, "rows", len(table.rows), "cols", len(table.columns))
    for ri, row in enumerate(table.rows):
        print(" row", ri, "height", row.height, "cells", len(row.cells))
        for ci, cell in enumerate(row.cells):
            print("  cell", ci, "text", repr(cell.text), "width", cell.width)
            for pi, p in enumerate(cell.paragraphs):
                print("   p", pi, "style", p.style.name, "align", p.alignment, "spacing", p.paragraph_format.space_before, p.paragraph_format.space_after, p.paragraph_format.line_spacing)
