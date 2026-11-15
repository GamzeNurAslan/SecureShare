from copy import deepcopy
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.shared import Pt


SOURCE = Path(r"C:\Users\Lenovo\Downloads\Hafta1_Proje raporu (1).docx")
OUTPUT = Path(r"C:\Users\Lenovo\OneDrive\Belgeler\ChatGPT\SecureShare\docs\Hafta1_Proje_Raporu_Doldurulmus.docx")
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

doc = Document(str(SOURCE))


def set_run_font(run, size=9, bold=None):
    run.font.name = "Arial"
    run._element.get_or_add_rPr().rFonts.set(qn("w:ascii"), "Arial")
    run._element.get_or_add_rPr().rFonts.set(qn("w:hAnsi"), "Arial")
    run.font.size = Pt(size)
    if bold is not None:
        run.bold = bold


def replace_paragraph(paragraph, text, bold=False, size=9, alignment=None):
    for run in list(paragraph.runs):
        paragraph._p.remove(run._r)
    run = paragraph.add_run(text)
    set_run_font(run, size=size, bold=bold)
    if alignment is not None:
        paragraph.alignment = alignment
    return paragraph


def set_cell(cell, text, size=9, bold=False, alignment=WD_ALIGN_PARAGRAPH.LEFT):
    # Keep the original first paragraph and its table formatting.
    first = cell.paragraphs[0]
    for run in list(first.runs):
        first._p.remove(run._r)
    first.alignment = alignment
    first.paragraph_format.line_spacing = 1.0
    run = first.add_run(text)
    set_run_font(run, size=size, bold=bold)
    for paragraph in cell.paragraphs[1:]:
        for run in list(paragraph.runs):
            paragraph._p.remove(run._r)
    return cell


def set_blank_cell_text(cell, text, size=9, alignment=WD_ALIGN_PARAGRAPH.LEFT):
    # Blank one-cell answer areas contain several empty paragraphs; use the first
    # paragraph and remove the redundant empty paragraphs to keep the answer compact.
    first = cell.paragraphs[0]
    for run in list(first.runs):
        first._p.remove(run._r)
    first.alignment = alignment
    first.paragraph_format.line_spacing = 1.0
    first.paragraph_format.space_after = Pt(0)
    run = first.add_run(text)
    set_run_font(run, size=size)
    for paragraph in list(cell.paragraphs[1:]):
        paragraph._element.getparent().remove(paragraph._element)
    return cell


# Team information
team = doc.tables[0]
set_cell(team.cell(0, 1), "SecureShare Ekibi")
set_cell(team.cell(1, 1), "Gamze Nur Aslan")
set_cell(team.cell(2, 1), "Gamze Nur Aslan\nBüşra Özer\nHava Şener")
set_cell(team.cell(3, 1), "SecureShare: Güvenli Dosya Paylaşım ve Erişim Kontrol Sistemi")

# Team process checklist: the three members completed the stated initial stage.
process = doc.tables[1]
for row in range(1, len(process.rows)):
    set_cell(process.cell(row, 1), "√", alignment=WD_ALIGN_PARAGRAPH.CENTER)
    set_cell(process.cell(row, 2), "", alignment=WD_ALIGN_PARAGRAPH.CENTER)

# Project progress checklist
progress = doc.tables[2]
for row in range(1, len(progress.rows)):
    set_cell(progress.cell(row, 1), "√", alignment=WD_ALIGN_PARAGRAPH.CENTER)
    set_cell(progress.cell(row, 2), "", alignment=WD_ALIGN_PARAGRAPH.CENTER)

# Introductory sections and answer areas
set_blank_cell_text(
    doc.tables[3].cell(0, 0),
    "SecureShare, kullanıcıların dosyalarını şifreleyerek saklamasını ve yalnızca yetkili kişilerle paylaşmasını sağlayan web ve mobil tabanlı bir dosya paylaşım ve erişim kontrol sistemidir. Projede kimlik doğrulama, dosya şifreleme, yetkilendirme ve işlem takibi birlikte ele alınmıştır.",
    size=9,
)
replace_paragraph(
    doc.paragraphs[21],
    "Projenin amacı; dosyaların güvenli biçimde yüklenmesi, şifreli olarak saklanması, belirli kullanıcılarla paylaşılması ve erişim izinlerinin yönetilmesidir.",
    size=9,
)
set_blank_cell_text(
    doc.tables[4].cell(0, 0),
    "Kullanıcıların dosyalarını güvenli biçimde yükleyebilmesi, şifreli depolayabilmesi, yetkili kişilerle paylaşabilmesi ve erişim kayıtlarını izleyebilmesi hedeflenmiştir.",
    size=9,
)

# Method section
replace_paragraph(
    doc.paragraphs[27],
    "Proje; katmanlı mimari ve görevlerin paralel yürütüldüğü iteratif çalışma yöntemiyle geliştirilmiştir.",
    size=9,
)
set_blank_cell_text(
    doc.tables[5].cell(0, 0),
    "React web ve React Native + Expo mobil istemcileri Node.js REST API’ye bağlanır. PostgreSQL kullanıcı, dosya ve izin bilgilerini; MinIO şifreli dosyaları saklar. PostgreSQL Docker üzerinde çalıştırılmış; JWT, Argon2id, AES-128-GCM ve DEK/KEK yaklaşımı kullanılmıştır. Geliştirme GitHub branch ve Pull Request akışıyla yürütülmüştür.",
    size=9,
)

# Team member table
members = doc.tables[6]
member_rows = [
    ("1", "", "Gamze Nur Aslan", "Takım kaptanı; veritabanı, mobil arayüz, dokümantasyon ve koordinasyon"),
    ("2", "", "Büşra Özer", "Node.js backend ve PostgreSQL bağlantısı"),
    ("3", "", "Hava Şener", "AES-128-GCM, DEK/KEK ve MinIO depolama"),
]
for ri, (no, number, name, role) in enumerate(member_rows, start=1):
    set_cell(members.cell(ri, 0), no, size=8, alignment=WD_ALIGN_PARAGRAPH.CENTER)
    set_cell(members.cell(ri, 1), number, size=8, alignment=WD_ALIGN_PARAGRAPH.CENTER)
    set_cell(members.cell(ri, 2), name, size=8, alignment=WD_ALIGN_PARAGRAPH.CENTER)
    set_cell(members.cell(ri, 3), role, size=8, alignment=WD_ALIGN_PARAGRAPH.CENTER)

# Work packages
packages = doc.tables[7]
package_rows = [
    ("Gereksinim analizi ve proje planı", "Gamze"),
    ("PostgreSQL şeması ve Docker kurulumu", "Gamze"),
    ("Node.js backend ve PostgreSQL bağlantısı", "Büşra"),
    ("AES-128-GCM ile DEK/KEK şifreleme", "Hava"),
    ("MinIO üzerinde şifreli dosya depolama", "Hava"),
    ("React Native giriş, kayıt ve dashboard ekranları", "Gamze"),
    ("Entegrasyon, test ve raporlama", "Tüm ekip"),
]
for ri, (task, owner) in enumerate(package_rows, start=1):
    set_cell(packages.cell(ri, 1), task, size=8)
    set_cell(packages.cell(ri, 2), owner, size=8, alignment=WD_ALIGN_PARAGRAPH.CENTER)

# Progress summary
set_blank_cell_text(
    doc.tables[8].cell(0, 0),
    "İlk aşamada gereksinimler ve sistem mimarisi belirlendi. PostgreSQL şeması Docker üzerinde çalıştırıldı; Node.js backend’in /health ve /health/db uçları doğrulandı. Mobil giriş, kayıt ve dashboard ekranları hazırlandı. AES-128-GCM, DEK/KEK ve MinIO tabanlı şifreli depolama çalışmaları tamamlanarak entegrasyon aşamasına geçildi.",
    size=9,
)

# Repository link
set_blank_cell_text(
    doc.tables[9].cell(0, 0),
    "https://github.com/GamzeNurAslan/SecureShare",
    size=9,
)

# Sources
replace_paragraph(
    doc.paragraphs[50],
    "KAYNAKLAR",
    bold=True,
    size=9,
)
replace_paragraph(
    doc.paragraphs[51],
    "SecureShare GitHub deposu: https://github.com/GamzeNurAslan/SecureShare\nNode.js, PostgreSQL, React Native, Docker ve MinIO resmi dokümantasyonları.",
    size=8,
)

doc.save(str(OUTPUT))
print(OUTPUT)
