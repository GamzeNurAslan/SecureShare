from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.shared import Pt


path = Path(r"C:\Users\Lenovo\OneDrive\Belgeler\ChatGPT\SecureShare\docs\Hafta1_Proje_Raporu_Tamamlanmis.docx")
doc = Document(str(path))
cell = doc.tables[6].cell(1, 3)
paragraph = cell.paragraphs[0]
for run in list(paragraph.runs):
    paragraph._p.remove(run._r)
paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
paragraph.paragraph_format.line_spacing = 1.0
run = paragraph.add_run(
    "Takım kaptanı; gereksinim analizi ve raporu, PostgreSQL şeması ve Docker kurulumu, "
    "kimlik doğrulama API dokümantasyonu, mobil arayüz, GitHub koordinasyonu ve entegrasyon takibi"
)
run.font.name = "Arial"
rpr = run._element.get_or_add_rPr()
rpr.rFonts.set(qn("w:ascii"), "Arial")
rpr.rFonts.set(qn("w:hAnsi"), "Arial")
run.font.size = Pt(7.5)
doc.save(str(path))
print(path)
