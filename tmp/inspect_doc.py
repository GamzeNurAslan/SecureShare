import sys
from docx import Document

sys.stdout.reconfigure(encoding="utf-8")
path = r"C:\Users\Lenovo\OneDrive\Belgeler\ChatGPT\SecureShare\docs\Hafta1_Proje_Raporu_Tamamlanmis.docx"
doc = Document(path)
for table_index, table in enumerate(doc.tables):
    print(f"\nTABLE {table_index}")
    for row_index, row in enumerate(table.rows):
        print("R", row_index, [repr(cell.text) for cell in row.cells])
