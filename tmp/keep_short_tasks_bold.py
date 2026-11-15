from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.shared import Pt


path = Path(r"C:\Users\Lenovo\OneDrive\Belgeler\ChatGPT\SecureShare\docs\Hafta1_Proje_Raporu_GecenHaftaUyumlu.docx")
doc = Document(str(path))
table = doc.tables[7]
task_texts = [
    "Gereksinim analizi ve proje planı",
    "PostgreSQL şeması ve Docker kurulumu",
    "Node.js backend ve PostgreSQL bağlantısı",
    "AES-128-GCM ile DEK/KEK şifreleme",
    "MinIO üzerinde şifreli dosya depolama",
    "React Native giriş, kayıt ve dashboard ekranları",
    "Entegrasyon, test ve raporlama",
]

for row_index, text in enumerate(task_texts, start=1):
    cell = table.cell(row_index, 1)
    paragraph = cell.paragraphs[0]
    for run in list(paragraph.runs):
        paragraph._p.remove(run._r)
    paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT
    paragraph.paragraph_format.line_spacing = 1.0
    paragraph.paragraph_format.space_after = Pt(0)
    run = paragraph.add_run(text)
    run.bold = True
    run.font.name = "Arial"
    rpr = run._element.get_or_add_rPr()
    rpr.rFonts.set(qn("w:ascii"), "Arial")
    rpr.rFonts.set(qn("w:hAnsi"), "Arial")
    run.font.size = Pt(7.5)
    for extra in list(cell.paragraphs[1:]):
        extra._element.getparent().remove(extra._element)

doc.save(str(path))
print(path)
