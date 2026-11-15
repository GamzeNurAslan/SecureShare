import sys
from docx import Document

sys.stdout.reconfigure(encoding="utf-8")
doc = Document(r"C:\Users\Lenovo\Downloads\Hafta1_Proje raporu (1).docx")
for idx in [2, 3, 15, 19, 21, 25, 27]:
    p=doc.paragraphs[idx]
    print(idx, [(r.text, r.font.name, r.font.size.pt if r.font.size else None, r.bold, r.italic) for r in p.runs])
for ti, ci in [(0,0),(0,1),(1,0),(6,0),(7,1)]:
    c=doc.tables[ti].cell(0 if ti not in (0,) else 0,ci)
    print('cell',ti,ci,[(r.text,r.font.name,r.font.size.pt if r.font.size else None,r.bold) for p in c.paragraphs for r in p.runs])
