from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Cm, Pt, RGBColor
from docx.oxml.ns import qn

OUT = r"C:\Users\Lenovo\OneDrive\Belgeler\ChatGPT\SecureShare\docs\requirements-analysis-detailed.docx"

def style_run(run, size=9.6, bold=False, italic=False):
    run.font.name = 'Calibri'
    run._element.rPr.rFonts.set(qn('w:ascii'), 'Calibri')
    run._element.rPr.rFonts.set(qn('w:hAnsi'), 'Calibri')
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic
    run.font.color.rgb = RGBColor(0, 0, 0)

def set_spacing(paragraph, before=0, after=3, line=1.0):
    fmt = paragraph.paragraph_format
    fmt.space_before = Pt(before)
    fmt.space_after = Pt(after)
    fmt.line_spacing = line

def add_heading(doc, text):
    p = doc.add_paragraph()
    set_spacing(p, before=4, after=1, line=1.0)
    style_run(p.add_run(text), size=10.8, bold=True)

def add_paragraph(doc, text):
    p = doc.add_paragraph()
    set_spacing(p, after=3, line=1.0)
    style_run(p.add_run(text), size=9.6)

def add_bullet(doc, text):
    p = doc.add_paragraph(style='List Bullet')
    set_spacing(p, after=1, line=0.98)
    style_run(p.add_run(text), size=9.25)

doc = Document()
sec = doc.sections[0]
sec.top_margin = Cm(1.25)
sec.bottom_margin = Cm(1.2)
sec.left_margin = Cm(1.65)
sec.right_margin = Cm(1.65)
normal = doc.styles['Normal']
normal.font.name = 'Calibri'
normal._element.rPr.rFonts.set(qn('w:ascii'), 'Calibri')
normal._element.rPr.rFonts.set(qn('w:hAnsi'), 'Calibri')
normal.font.size = Pt(9.6)
normal.font.color.rgb = RGBColor(0, 0, 0)

title = doc.add_paragraph()
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
set_spacing(title, after=1, line=1.0)
style_run(title.add_run('SecureShare Gereksinim Analiz Raporu'), size=15, bold=True)
subtitle = doc.add_paragraph()
subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
set_spacing(subtitle, after=3, line=1.0)
style_run(subtitle.add_run('Güvenli dosya paylaşımı ve erişim kontrolü uygulaması'), size=9.5, italic=True)
authors = doc.add_paragraph()
authors.alignment = WD_ALIGN_PARAGRAPH.CENTER
set_spacing(authors, after=5, line=1.0)
style_run(authors.add_run('Hazırlayanlar: Gamze Nur Aslan, Büşra Özer ve Hava Şener'), size=8.8)

add_heading(doc, '1. Projenin Amacı ve Kapsamı')
add_paragraph(doc, 'SecureShare; kullanıcıların dosyalarını güvenli biçimde yüklemesini, şifreli olarak saklamasını ve yalnızca yetkilendirilmiş kişilerle paylaşmasını sağlayan web ve mobil uygulamadır. Sistem; kullanıcı yönetimi, dosya yönetimi, şifreleme, erişim kontrolü ve işlem takibini kapsar. Kullanıcılar React web arayüzü veya React Native + Expo mobil uygulaması üzerinden sisteme erişir.')

add_heading(doc, '2. Fonksiyonel Gereksinimler')
for item in [
    'Kullanıcılar ad, e-posta ve parola ile kayıt olabilmeli; eksik veya geçersiz bilgiler reddedilmelidir.',
    'Aynı e-posta ile ikinci kayıt engellenmeli; kullanıcılar doğru bilgilerle giriş yapabilmelidir.',
    'Başarılı girişte JWT oturumu oluşturulmalı, kullanıcı çıkış yapabilmeli ve geçersiz token reddedilmelidir.',
    'Kullanıcılar dosya yükleyebilmeli; dosya adı, türü, boyutu ve tarihi görüntülenebilmelidir.',
    'Dosya sahibi kendi dosyasını indirebilmeli ve belirlediği kullanıcılara erişim verebilmelidir.',
    'Dosya sahibi verdiği yetkiyi kaldırabilmeli; yetkisi kaldırılan kullanıcı dosyaya erişememelidir.',
    'Kullanıcılar kendileriyle paylaşılan dosyaları görebilmeli ve yalnızca izinleri kapsamında indirebilmelidir.',
    'Kayıt, giriş, yükleme, indirme, paylaşma, yetki değişikliği ve başarısız erişimler audit log’a yazılmalıdır.',
]:
    add_bullet(doc, item)

add_heading(doc, '3. Fonksiyonel Olmayan Gereksinimler')
for item in [
    'Parolalar Argon2id ile hashlenmeli; dosyalar AES-128-GCM ve DEK/KEK yaklaşımıyla korunmalıdır.',
    'Yetkisiz kullanıcılar dosya içeriğine veya dosya anahtarına erişememelidir.',
    'API istekleri JWT doğrulaması ve dosya bazlı yetkilendirme kontrolünden geçirilmelidir.',
    'Veritabanı parolası ve diğer gizli bilgiler kaynak kodda tutulmamalı, ortam değişkenleri kullanılmalıdır.',
    'Arayüz anlaşılır, erişilebilir ve farklı web veya mobil ekran boyutlarına uyumlu olmalıdır.',
    'Node.js REST API, PostgreSQL ve MinIO modüler, sürdürülebilir ve ekip çalışmasına uygun geliştirilmelidir.',
]:
    add_bullet(doc, item)

add_heading(doc, '4. Kısıtlar ve Kabul Kriterleri')
add_paragraph(doc, 'Proje eğitim amacıyla geliştirilecek ve ilk aşamada PostgreSQL Docker ortamında çalışacaktır. Gerçek e-posta gönderimi, gelişmiş yönetici paneli ve üretim dağıtımı ilk sürüm kapsamı dışındadır. Sistem; kayıt ve girişin çalışması, dosyanın şifreli saklanması, yalnızca yetkili kullanıcıya açılması, yetki kaldırmanın erişimi durdurması ve işlemlerin audit log’a yazılması durumunda temel gereksinimleri karşılamış kabul edilir.')

footer = sec.footer.paragraphs[0]
footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
set_spacing(footer, before=1, after=0, line=1.0)
style_run(footer.add_run('SecureShare | Gereksinim Analizi'), size=7.5)
doc.save(OUT)
print(OUT)
