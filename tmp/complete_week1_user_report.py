from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.shared import Pt


SOURCE = Path(r"C:\Users\Lenovo\Downloads\Hafta1_Proje raporu (1) (1).docx")
OUTPUT = Path(r"C:\Users\Lenovo\OneDrive\Belgeler\ChatGPT\SecureShare\docs\Hafta1_Proje_Raporu_Tamamlanmis.docx")
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
doc = Document(str(SOURCE))


def style_run(run, size=9, bold=False):
    run.font.name = "Arial"
    rpr = run._element.get_or_add_rPr()
    rpr.rFonts.set(qn("w:ascii"), "Arial")
    rpr.rFonts.set(qn("w:hAnsi"), "Arial")
    run.font.size = Pt(size)
    run.bold = bold


def set_cell(cell, text, size=8.5, alignment=WD_ALIGN_PARAGRAPH.LEFT):
    paragraph = cell.paragraphs[0]
    for run in list(paragraph.runs):
        paragraph._p.remove(run._r)
    paragraph.alignment = alignment
    paragraph.paragraph_format.line_spacing = 1.0
    paragraph.paragraph_format.space_after = Pt(0)
    run = paragraph.add_run(text)
    style_run(run, size=size)
    for extra in list(cell.paragraphs[1:]):
        extra._element.getparent().remove(extra._element)


def set_paragraph(paragraph, text, size=8.5):
    for run in list(paragraph.runs):
        paragraph._p.remove(run._r)
    run = paragraph.add_run(text)
    style_run(run, size=size)


# Team and project evaluation checklists.
for table_index in (1, 2):
    table = doc.tables[table_index]
    for row in table.rows[1:]:
        set_cell(row.cells[1], "√", size=9, alignment=WD_ALIGN_PARAGRAPH.CENTER)
        set_cell(row.cells[2], "", size=9, alignment=WD_ALIGN_PARAGRAPH.CENTER)

# Team members; student numbers are intentionally left blank because they were not provided.
members = doc.tables[6]
rows = [
    ("1", "Gamze Nur Aslan", "Takım kaptanı; veritabanı, mobil arayüz, dokümantasyon ve koordinasyon"),
    ("2", "Büşra Özer", "Node.js backend ve PostgreSQL bağlantısı"),
    ("3", "Hava Şener", "AES-128-GCM, DEK/KEK ve MinIO depolama"),
]
for row_index, (number, name, role) in enumerate(rows, start=1):
    set_cell(members.cell(row_index, 0), number, size=8, alignment=WD_ALIGN_PARAGRAPH.CENTER)
    set_cell(members.cell(row_index, 1), "", size=8, alignment=WD_ALIGN_PARAGRAPH.CENTER)
    set_cell(members.cell(row_index, 2), name, size=8, alignment=WD_ALIGN_PARAGRAPH.CENTER)
    set_cell(members.cell(row_index, 3), role, size=8, alignment=WD_ALIGN_PARAGRAPH.CENTER)

# Work packages for the initial development stage.
packages = doc.tables[7]
tasks = [
    ("Gereksinim analizi ve proje planı", "Gamze"),
    ("PostgreSQL şeması ve Docker kurulumu", "Gamze"),
    ("Node.js backend ve PostgreSQL bağlantısı", "Büşra"),
    ("AES-128-GCM ile DEK/KEK şifreleme", "Hava"),
    ("MinIO üzerinde şifreli dosya depolama", "Hava"),
    ("React Native giriş, kayıt ve dashboard ekranları", "Gamze"),
    ("Entegrasyon, test ve raporlama", "Tüm ekip"),
]
for row_index, (task, owner) in enumerate(tasks, start=1):
    set_cell(packages.cell(row_index, 1), task, size=8)
    set_cell(packages.cell(row_index, 2), owner, size=8, alignment=WD_ALIGN_PARAGRAPH.CENTER)

# Theory and results section.
set_cell(
    doc.tables[8].cell(0, 0),
    "Projenin teknik temelini; katmanlı mimari, güvenli kimlik doğrulama, dosya şifreleme, erişim kontrolü ve nesne depolama yaklaşımları oluşturmaktadır. İlk aşamada PostgreSQL veritabanı şeması hazırlanmış ve Docker üzerinde çalıştırılmıştır. Node.js backend’in /health ve /health/db uçları ile sunucu ve veritabanı bağlantısı doğrulanmıştır. Mobil uygulamada giriş, kayıt ve dashboard ekranları hazırlanmıştır. Hava’nın AES-128-GCM, DEK/KEK ve MinIO çalışmalarının tamamlandığı kabul edilerek sistemin sonraki aşamasında backend, mobil istemci ve depolama modüllerinin birlikte çalışması planlanmıştır.",
    size=8.8,
)

# Repository link.
set_cell(doc.tables[9].cell(0, 0), "https://github.com/GamzeNurAslan/SecureShare", size=8.8)

# References section.
set_paragraph(
    doc.paragraphs[51],
    "SecureShare GitHub deposu: https://github.com/GamzeNurAslan/SecureShare\nNode.js, PostgreSQL, React Native, Docker ve MinIO resmi dokümantasyonları.",
    size=8,
)

doc.save(str(OUTPUT))
print(OUTPUT)
