from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Cm, Pt, RGBColor
from docx.oxml.ns import qn

OUT = r"C:\Users\Lenovo\OneDrive\Belgeler\ChatGPT\SecureShare\docs\requirements-analysis.docx"

def style_run(run, size=10, bold=False, italic=False):
    run.font.name = 'Calibri'
    run._element.rPr.rFonts.set(qn('w:ascii'), 'Calibri')
    run._element.rPr.rFonts.set(qn('w:hAnsi'), 'Calibri')
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = RGBColor(0, 0, 0)

def compact(paragraph, before=0, after=3, line=1.0):
    fmt = paragraph.paragraph_format
    fmt.space_before = Pt(before)
    fmt.space_after = Pt(after)
    fmt.line_spacing = line

def add_heading(doc, text, level=1):
    p = doc.add_paragraph()
    compact(p, before=5 if level == 1 else 3, after=2)
    style_run(p.add_run(text), size=11 if level == 1 else 10, bold=True)

def add_body(doc, text):
    p = doc.add_paragraph()
    compact(p, after=3, line=1.03)
    style_run(p.add_run(text), size=9.5)

def add_bullet(doc, text):
    p = doc.add_paragraph(style='List Bullet')
    compact(p, after=1, line=1.0)
    style_run(p.add_run(text), size=9.1)

doc = Document()
section = doc.sections[0]
section.top_margin = Cm(1.6)
section.bottom_margin = Cm(1.45)
section.left_margin = Cm(2.0)
section.right_margin = Cm(2.0)

normal = doc.styles['Normal']
normal.font.name = 'Calibri'
normal._element.rPr.rFonts.set(qn('w:ascii'), 'Calibri')
normal._element.rPr.rFonts.set(qn('w:hAnsi'), 'Calibri')
normal.font.size = Pt(9.5)
normal.font.color.rgb = RGBColor(0, 0, 0)

title = doc.add_paragraph()
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
compact(title, after=2)
style_run(title.add_run('SECURESHARE GEREKSİNİM ANALİZ RAPORU'), size=15, bold=True)
subtitle = doc.add_paragraph()
subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
compact(subtitle, after=8)
style_run(subtitle.add_run('Güvenli dosya paylaşımı ve erişim kontrolü uygulaması'), size=10, italic=True)

add_heading(doc, '1. Projenin Amacı')
add_body(doc, 'SecureShare, kullanıcıların dosyalarını güvenli biçimde yüklemesini, şifreli olarak saklamasını ve yalnızca yetkilendirilmiş kişilerle paylaşmasını sağlayan web ve mobil tabanlı bir uygulamadır. Projenin temel amacı, dosya paylaşım sürecinde gizlilik, bütünlük ve erişim kontrolü sağlamaktır.')

add_heading(doc, '2. Kullanıcılar ve Paydaşlar')
add_body(doc, 'Sistemin temel kullanıcıları dosya yükleyen kullanıcılar ve kendileriyle dosya paylaşılan kullanıcılardır. Diğer paydaşlar proje geliştirme ekibi ve dersi yürüten öğretim elemanıdır. Sistem React tabanlı web uygulaması ve React Native mobil uygulaması üzerinden kullanılacaktır.')

add_heading(doc, '3. Fonksiyonel Gereksinimler')
for item in [
    'Kullanıcılar ad, e-posta ve parola bilgileriyle kayıt olabilmelidir.',
    'Kullanıcılar e-posta ve parola ile giriş yapabilmeli; başarılı girişte JWT tabanlı oturum oluşturulmalıdır.',
    'Parolalar düz metin olarak saklanmamalı ve Argon2id algoritması ile hashlenmelidir.',
    'Kullanıcılar dosya yükleyebilmeli, kendi dosyalarını görüntüleyebilmeli ve indirebilmelidir.',
    'Dosyalar AES-128-GCM ile şifrelenerek MinIO üzerinde saklanmalıdır.',
    'Dosya sahibi, dosyaya erişebilecek kullanıcıları belirleyebilmeli ve erişim yetkisini kaldırabilmelidir.',
    'Yükleme, indirme, paylaşma ve yetki değişiklikleri audit log kayıtlarına eklenmelidir.',
]:
    add_bullet(doc, item)

add_heading(doc, '4. Fonksiyonel Olmayan Gereksinimler')
for item in [
    'Yetkisiz kullanıcılar dosya içeriğine erişememelidir.',
    'API istekleri kimlik doğrulama ve yetkilendirme kontrollerinden geçirilmelidir.',
    'Veritabanı bağlantı bilgileri kaynak kodda tutulmamalı, ortam değişkenleri kullanılmalıdır.',
    'Arayüz web ve mobil ekranlarda anlaşılır, erişilebilir ve farklı ekran boyutlarına uyumlu olmalıdır.',
    'Sistem PostgreSQL veritabanı ve modüler Node.js REST API yapısı ile çalışmalıdır.',
]:
    add_bullet(doc, item)

add_heading(doc, '5. Kısıtlar ve Varsayımlar')
add_body(doc, 'Proje eğitim amacıyla geliştirilmektedir. İlk aşamada PostgreSQL Docker ortamında kullanılacaktır. Gerçek e-posta gönderimi, gelişmiş yönetici paneli ve üretim ortamı dağıtımı ilk sürüm kapsamı dışındadır. Kullanıcıların geçerli e-posta adresine ve internet bağlantısına sahip olduğu varsayılmaktadır.')

add_heading(doc, '6. Kabul Kriterleri')
add_body(doc, 'Sistem; yeni kullanıcıların kayıt olabilmesi, kayıtlı kullanıcıların doğru bilgilerle giriş yapabilmesi, hatalı girişlerin engellenmesi, dosyaların yalnızca yetkili kullanıcılar tarafından görüntülenebilmesi ve güvenlikle ilgili işlemlerin audit log kayıtlarına yazılması durumunda temel gereksinimleri karşılamış kabul edilecektir.')

footer = section.footer.paragraphs[0]
footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
compact(footer, before=2, after=0)
style_run(footer.add_run('SecureShare - Gereksinim Analizi'), size=8)

doc.save(OUT)
print(OUT)
