import sys
from docx import Document

sys.stdout.reconfigure(encoding="utf-8")
path = sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\Lenovo\Downloads\Hafta1_Proje raporu (1).docx"
doc = Document(path)
print("PARAGRAPHS")
for i, paragraph in enumerate(doc.paragraphs):
    print(i, repr(paragraph.text), paragraph.style.name)
print("TABLES", len(doc.tables))
for i, table in enumerate(doc.tables):
    print("TABLE", i, len(table.rows), len(table.columns))
    for row_index, row in enumerate(table.rows):
        print(row_index, [cell.text for cell in row.cells])
