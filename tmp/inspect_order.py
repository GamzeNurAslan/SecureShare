import sys
from docx import Document
from docx.oxml.ns import qn

sys.stdout.reconfigure(encoding="utf-8")
doc = Document(r"C:\Users\Lenovo\Downloads\Hafta1_Proje raporu (1).docx")
body = doc.element.body
pi = ti = 0
for child in body.iterchildren():
    if child.tag == qn("w:p"):
        text = "".join(child.itertext()).strip()
        print(f"P{pi}: {text!r}")
        pi += 1
    elif child.tag == qn("w:tbl"):
        print(f"T{ti}: {len(child.findall('.//' + qn('w:tr')))} rows")
        ti += 1
