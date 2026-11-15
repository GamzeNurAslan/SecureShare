from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Cm, Pt, RGBColor
from docx.oxml.ns import qn

OUT = r"C:\Users\Lenovo\OneDrive\Belgeler\ChatGPT\SecureShare\docs\requirements-analysis.docx"

def font(run, size=10.5, bold=False, italic=False):
    run.font.name = 'Calibri'
    run._element.rPr.rFonts.set(qn('w:ascii'), 'Calibri')
    run._element.rPr.rFonts.set(qn('w:hAnsi'), 'Calibri')
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = RGBColor(0, 0, 0)

def spacing(p, before=0, after=5, line=1.12):
    fmt = p.paragraph_format
    fmt.space_before = Pt(before)
    fmt.space_after = Pt(after)
    fmt.line_spacing = line

def heading(doc, text):
    p = doc.add_paragraph()
    spacing(p, before=8, after=3, line=1.0)
    font(p.add_run(text), size=11.5, bold=True)

def paragraph(doc, text):
    p = doc.add_paragraph()
    spacing(p, after=6, line=1.12)
    font(p.add_run(text), size=10.5)

def bullet(doc, text):
    p = doc.add_paragraph(style='List Bullet')
    spacing(p, after=3, line=1.10)
    font(p.add_run(text), size=10.2)

doc = Document()
sec = doc.sections[0]
sec.top_margin = Cm(1.55)
sec.bottom_margin = Cm(1.45)
sec.left_margin = Cm(2.05)
sec.right_margin = Cm(2.05)
normal = doc.styles['Normal']
normal.font.name = 'Calibri'
normal._element.rPr.rFonts.set(qn('w:ascii'), 'Calibri')
normal._element.rPr.rFonts.set(qn('w:hAnsi'), 'Calibri')
normal.font.size = Pt(10.5)
normal.font.color.rgb = RGBColor(0, 0, 0)

title = doc.add_paragraph()
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
spacing(title, after=3, line=1.0)
font(title.add_run('SecureShare Gereksinim Analiz Raporu'), size=16, bold=True)
sub = doc.add_paragraph()
sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
spacing(sub, after=8, line=1.0)
font(sub.add_run('Güvenli dosya paylaşımı ve erişim kontrolü uygulaması'), size=10.5, italic=True)
meta = doc.add_paragraph()
meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
spacing(meta, after=10, line=1.0)
font(meta.add_run('Hazırlayan: Gamze Nur Aslan ve proje ekibi'), size=9.5)

heading(doc, '1. Projenin Amacı')
paragraph(doc, 'SecureShare, kullanıcıların dosyalarını güvenli biçimde yüklemesini, şifreli olarak saklamasını ve yalnızca yetkilendirilmiş kişilerle paylaşmasını sağlayan web ve mobil tabanlı bir uygulamadır. Projenin amacı, dosya paylaşımında gizlilik, bütünlük ve erişim kontrolünü birlikte sağlamaktır.')

heading(doc, '2. Kullanıcılar ve Kapsam')
paragraph(doc, 'Sistemin temel kullanıcıları dosya yükleyen kişiler ve kendileriyle dosya paylaşılan kişilerdir. Kullanıcılar web veya React Native mobil uygulaması üzerinden sisteme erişecektir. Proje; kullanıcı yönetimi, dosya paylaşımı, erişim izinleri, şifreli depolama ve işlem kayıtlarını kapsamaktadır.')

heading(doc, '3. Fonksiyonel Gereksinimler')
for item in [
    'Kullanıcı kayıt olabilmeli; ad, e-posta ve parola bilgileri doğrulanmalı, aynı e-posta ile ikinci kayıt engellenmelidir.',
    'Kullanıcı giriş yapabilmeli; doğru bilgilerde JWT oturumu oluşturulmalı, yanlış bilgilerde açıklayıcı hata gösterilmelidir.',
    'Kullanıcı dosya yükleyebilmeli, kendi dosyalarını ve temel dosya bilgilerini görüntüleyebilmelidir.',
    'Dosya sahibi belirli kullanıcılara erişim verebilmeli, izinleri kaldırabilmeli ve yetkili kullanıcı dosyayı indirebilmelidir.',
    'Dosya yükleme ve erişim öncesinde gerekli şifreleme işlemleri uygulanmalıdır.',
    'Yükleme, indirme, paylaşma, yetki değişikliği ve başarısız erişim denemeleri audit log’a kaydedilmelidir.',
]:
    bullet(doc, item)

heading(doc, '4. Fonksiyonel Olmayan Gereksinimler')
for item in [
    'Parolalar Argon2id ile hashlenmeli; dosyalar AES-128-GCM ve DEK/KEK yaklaşımıyla korunmalıdır.',
    'Yetkisiz kullanıcılar dosya içeriğine erişememeli; tüm API istekleri kimlik doğrulama ve yetkilendirmeden geçmelidir.',
    'Veritabanı parolaları ve diğer gizli bilgiler kaynak kodda tutulmamalı, ortam değişkenleriyle yönetilmelidir.',
    'Arayüz web ve mobil ekranlarda anlaşılır olmalı, farklı ekran boyutlarına uyum sağlamalıdır.',
    'Uygulama Node.js REST API, PostgreSQL ve MinIO ile modüler, sürdürülebilir ve ekip çalışmasına uygun geliştirilmelidir.',
]:
    bullet(doc, item)

heading(doc, '5. Kısıtlar ve Kabul Kriterleri')
paragraph(doc, 'Proje eğitim amacıyla geliştirilecektir ve ilk aşamada PostgreSQL Docker ortamında çalışacaktır. Gerçek e-posta gönderimi ve gelişmiş yönetici paneli ilk sürüm kapsamı dışındadır. Sistem; kayıt, güvenli giriş, yetkili dosya erişimi ve audit log akışları çalıştığında temel gereksinimleri karşılamış kabul edilecektir.')

footer = sec.footer.paragraphs[0]
footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
spacing(footer, before=3, after=0, line=1.0)
font(footer.add_run('SecureShare | Gereksinim Analizi'), size=8.5)
doc.save(OUT)
print(OUT)
