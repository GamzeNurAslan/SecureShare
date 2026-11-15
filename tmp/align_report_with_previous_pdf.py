from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.shared import Pt


SOURCE = Path(r"C:\Users\Lenovo\Downloads\Hafta1_Proje raporu (1) (1).docx")
OUTPUT = Path(r"C:\Users\Lenovo\OneDrive\Belgeler\ChatGPT\SecureShare\docs\Hafta1_Proje_Raporu_GecenHaftaUyumlu.docx")
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
    p = cell.paragraphs[0]
    for run in list(p.runs):
        p._p.remove(run._r)
    p.alignment = alignment
    p.paragraph_format.line_spacing = 1.0
    p.paragraph_format.space_after = Pt(0)
    parts = text.split("\n")
    for i, part in enumerate(parts):
        run = p.add_run(part)
        style_run(run, size=size)
        if i < len(parts) - 1:
            run.add_break()
            run.add_break()
    for extra in list(cell.paragraphs[1:]):
        extra._element.getparent().remove(extra._element)


def set_paragraph(paragraph, text, size=8.5):
    for run in list(paragraph.runs):
        paragraph._p.remove(run._r)
    run = paragraph.add_run(text)
    style_run(run, size=size)


# Match the previous report's team information exactly.
team = doc.tables[0]
set_cell(team.cell(0, 1), "SecureShare", size=9)
set_cell(team.cell(1, 1), "Büşra ÖZER", size=9)
set_cell(team.cell(2, 1), "Hava ŞENER, Gamze Nur ASLAN, Büşra ÖZER", size=8.5)
set_cell(team.cell(3, 1), "Şifreli Dosya Paylaşımı ve Erişim Kontrolü Uygulaması", size=8.5)

# The previous report records all initial team-process and progress criteria as met.
for table_index in (1, 2):
    table = doc.tables[table_index]
    for row in table.rows[1:]:
        set_cell(row.cells[1], "√", size=9, alignment=WD_ALIGN_PARAGRAPH.CENTER)
        set_cell(row.cells[2], "", size=9, alignment=WD_ALIGN_PARAGRAPH.CENTER)

# Match the previous report's member numbers and responsibilities.
members = doc.tables[6]
member_rows = [
    ("1", "230260092", "Gamze Nur ASLAN", "Veritabanı ve Kimlik Doğrulama, Mobil Uygulama"),
    ("2", "250260119", "Büşra ÖZER", "Backend ve REST API, Erişim Kontrolü ve Dosya Paylaşımı, Web Uygulaması"),
    ("3", "230260153", "Hava ŞENER", "Dosya Şifreleme ve Güvenli Depolama, Sistem Entegrasyonu, Test ve Değerlendirme"),
]
for row_index, (member_no, student_no, name, role) in enumerate(member_rows, start=1):
    set_cell(members.cell(row_index, 0), member_no, size=7.8, alignment=WD_ALIGN_PARAGRAPH.CENTER)
    set_cell(members.cell(row_index, 1), student_no, size=7.8, alignment=WD_ALIGN_PARAGRAPH.CENTER)
    set_cell(members.cell(row_index, 2), name, size=7.8, alignment=WD_ALIGN_PARAGRAPH.CENTER)
    set_cell(members.cell(row_index, 3), role, size=7.5, alignment=WD_ALIGN_PARAGRAPH.CENTER)

# Match the seven work packages from the previous report.
packages = doc.tables[7]
work_packages = [
    ("Backend ve REST API Altyapısı: Node.js/Express backend'in kurulması, REST API endpointlerinin oluşturulması ve web/mobil istemcilerin ortak backend üzerinden haberleşmesinin sağlanması", "Büşra ÖZER"),
    ("Veritabanı ve Kimlik Doğrulama: PostgreSQL veritabanı tasarımı, kullanıcı kayıt/giriş işlemleri, oturum yönetimi ve parola güvenliği", "Gamze Nur ASLAN"),
    ("Dosya Şifreleme ve Güvenli Depolama: AES-128-GCM, DEK/KEK mekanizması ve şifrelenmiş dosyaların MinIO üzerinde saklanması", "Hava ŞENER"),
    ("Erişim Kontrolü ve Dosya Paylaşımı: DAC + ACL yapısı, READ/DOWNLOAD/SHARE/DELETE izinleri, süreli erişim ve erişim iptali", "Büşra ÖZER"),
    ("Web Uygulaması: React kullanıcı arayüzünün geliştirilmesi ve REST API üzerinden backend ile haberleşmesi", "Büşra ÖZER"),
    ("Mobil Uygulama: REST API kullanan mobil istemci ile dosya yükleme, görüntüleme, paylaşma ve erişim işlemlerinin hazırlanması", "Gamze Nur ASLAN"),
    ("Sistem Entegrasyonu, Test ve Değerlendirme: Web ve mobil uygulamaların backend ile entegrasyonu, fonksiyonel/güvenlik testleri ve performans ölçümleri", "Hava ŞENER"),
]
for row_index, (task, owner) in enumerate(work_packages, start=1):
    set_cell(packages.cell(row_index, 1), task, size=7.5)
    set_cell(packages.cell(row_index, 2), owner, size=7.5, alignment=WD_ALIGN_PARAGRAPH.CENTER)

# Add the prior report's access-control decisions to the user's method text without deleting it.
method_cell = doc.tables[5].cell(0, 0)
method_text = method_cell.text
if "DAC" not in method_text:
    method_text += "\n\nErişim kontrolünde dosya sahibinin yetki belirlediği DAC ve dosya başına izin listesi tutan ACL yaklaşımı kullanılacaktır. READ, DOWNLOAD, SHARE ve DELETE izinleri ile süreli erişim desteklenecek; izin kaldırıldığında sonraki istekler sunucu tarafında reddedilecektir. Erişim kayıtlarının bütünlüğü için hash zinciri yaklaşımı kullanılacaktır."
set_cell(method_cell, method_text, size=8.2)

# Fill the theory/results and repository sections left blank in the user's copy.
set_cell(
    doc.tables[8].cell(0, 0),
    "SecureShare'de düz metin (plaintext) dosya okunabilir veriyi, şifreli metin (ciphertext) ise AES-128-GCM sonrası oluşan korunmuş veriyi ifade eder. Her dosya için benzersiz bir DEK oluşturulacak, dosya bu anahtarla şifrelenecek ve DEK bir KEK ile korunarak veritabanında saklanacaktır. AES-GCM ile kullanılan benzersiz nonce ve dosya kimliğinin AAD olarak eklenmesi, dosya içeriği veya kimliği değiştirildiğinde doğrulamanın başarısız olmasını sağlayacaktır.\n\nKullanıcı dosya yüklediğinde sunucu kimliği doğrular, dosyayı şifreler ve ciphertext'i MinIO'ya kaydeder; dosya kimliği, sahibi, meta verileri ve şifrelenmiş DEK PostgreSQL'de tutulur. Paylaşım sırasında ACL kaydı oluşturulur. Görüntüleme veya indirme isteğinde JWT, izin türü ve varsa bitiş tarihi kontrol edilir. İzin kaldırılmışsa istek reddedilir. Her başarılı veya başarısız erişim audit log tablosuna yazılır.\n\nBeklenen sonuç; dosyaların depolama alanında yalnızca şifreli biçimde tutulması, yetkisiz erişimlerin engellenmesi, izin iptalinden sonra erişimin reddedilmesi ve erişim kayıtlarının bütünlüğünün doğrulanabilmesidir. Test aşamasında farklı dosya boyutlarıyla şifreleme/çözme süreleri, yetkisiz erişim ve erişim iptali senaryoları değerlendirilecektir.",
    size=8.2,
)
set_cell(doc.tables[9].cell(0, 0), "GitHub: https://github.com/GamzeNurAslan/SecureShare", size=8.5)

# Keep the source style but align references with the previous report's topic.
set_paragraph(
    doc.paragraphs[51],
    "[1] NIST SP 800-38D, Galois/Counter Mode (GCM) and GMAC.\n[2] NIST SP 800-57, Key Management.\n[3] NIST, Discretionary Access Control (DAC).\n[4] OWASP Cryptographic Storage Cheat Sheet.\n[5] SecureShare GitHub deposu: https://github.com/GamzeNurAslan/SecureShare",
    size=7.8,
)

doc.save(str(OUTPUT))
print(OUTPUT)
