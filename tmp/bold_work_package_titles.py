from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.shared import Pt


path = Path(r"C:\Users\Lenovo\OneDrive\Belgeler\ChatGPT\SecureShare\docs\Hafta1_Proje_Raporu_GecenHaftaUyumlu.docx")
doc = Document(str(path))
table = doc.tables[7]

titles = [
    "Backend ve REST API Altyapısı:",
    "Veritabanı ve Kimlik Doğrulama:",
    "Dosya Şifreleme ve Güvenli Depolama:",
    "Erişim Kontrolü ve Dosya Paylaşımı:",
    "Web Uygulaması:",
    "Mobil Uygulama:",
    "Sistem Entegrasyonu, Test ve Değerlendirme:",
]

for row_index, title in enumerate(titles, start=1):
    cell = table.cell(row_index, 1)
    existing = cell.text.strip()
    body = existing.split(":", 1)[1].strip() if ":" in existing else existing
    paragraph = cell.paragraphs[0]
    for run in list(paragraph.runs):
        paragraph._p.remove(run._r)
    paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT
    paragraph.paragraph_format.line_spacing = 1.0
    paragraph.paragraph_format.space_after = Pt(0)

    title_run = paragraph.add_run(title + " ")
    title_run.bold = True
    title_run.font.name = "Arial"
    title_run._element.get_or_add_rPr().rFonts.set(qn("w:ascii"), "Arial")
    title_run._element.get_or_add_rPr().rFonts.set(qn("w:hAnsi"), "Arial")
    title_run.font.size = Pt(7.5)

    body_run = paragraph.add_run(body)
    body_run.bold = False
    body_run.font.name = "Arial"
    body_run._element.get_or_add_rPr().rFonts.set(qn("w:ascii"), "Arial")
    body_run._element.get_or_add_rPr().rFonts.set(qn("w:hAnsi"), "Arial")
    body_run.font.size = Pt(7.5)

doc.save(str(path))
print(path)
