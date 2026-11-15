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

def spacing(p, before=0, after=5, line=1.08):
    fmt = p.paragraph_format
    fmt.space_before = Pt(before)
    fmt.space_after = Pt(after)
    fmt.line_spacing = line

def heading(doc, text):
    p = doc.add_paragraph()
    spacing(p, before=7, after=2, line=1.0)
    font(p.add_run(text), size=11.5, bold=True)

def paragraph(doc, text):
    p = doc.add_paragraph()
    spacing(p, after=5, line=1.08)
    font(p.add_run(text), size=10.5)

def bullet(doc, text):
    p = doc.add_paragraph(style='List Bullet')
    spacing(p, after=2, line=1.05)
    font(p.add_run(text), size=10.1)

doc = Document()
sec = doc.sections[0]
sec.top_margin = Cm(1.8)
sec.bottom_margin = Cm(1.65)
sec.left_margin = Cm(2.15)
sec.right_margin = Cm(2.15)
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
spacing(sub, after=10, line=1.0)
font(sub.add_run('Güvenli dosya paylaşımı ve erişim kontrolü uygulaması'), size=10.5, italic=True)
meta = doc.add_paragraph()
meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
spacing(meta, after=9, line=1.0)
font(meta.add_run('Hazırlayan: Gamze Nur Aslan ve proje ekibi'), size=9.5)

heading(doc, '1. Projenin Amacı')
paragraph(doc, 'SecureShare, kullanıcıların dosyalarını güvenli biçimde yüklemesini, şifreli olarak saklamasını ve yalnızca yetkilendirilmiş kişilerle paylaşmasını sağlayan web ve mobil tabanlı bir uygulamadır. Projenin amacı; dosya paylaşımı sırasında gizlilik, bütünlük ve erişim kontrolü sağlayarak kullanıcıların hassas verilerini korumaktır.')

heading(doc, '2. Kullanıcılar ve Kapsam')
paragraph(doc, 'Sistemin temel kullanıcıları dosya yükleyen kişiler ve kendileriyle dosya paylaşılan kişilerdir. Kullanıcılar web uygulaması veya React Native tabanlı mobil uygulama üzerinden sisteme erişecektir. Proje; kullanıcı yönetimi, dosya paylaşımı, erişim izinleri ve işlem kayıtlarını kapsamaktadır.')

heading(doc, '3. Fonksiyonel Gereksinimler')
for item in [
    'Kullanıcılar ad, e-posta ve parola bilgileriyle kayıt olabilmelidir.',
    'Kullanıcılar e-posta ve parola ile giriş yapabilmelidir.',
    'Başarılı giriş sonrasında JWT tabanlı bir oturum oluşturulmalıdır.',
    'Kullanıcılar dosya yükleyebilmeli, kendi dosyalarını görüntüleyebilmeli ve indirebilmelidir.',
    'Dosya sahibi, dosyayı paylaşacağı kullanıcıları belirleyebilmeli ve erişim yetkisini kaldırabilmelidir.',
    'Yükleme, indirme, paylaşma ve yetki değişikliği işlemleri audit log kayıtlarına eklenmelidir.',
]:
    bullet(doc, item)

heading(doc, '4. Fonksiyonel Olmayan Gereksinimler')
for item in [
    'Parolalar Argon2id ile hashlenmeli ve düz metin olarak saklanmamalıdır.',
    'Dosyalar AES-128-GCM ile şifrelenerek MinIO üzerinde saklanmalıdır.',
    'Yetkisiz kullanıcılar dosya içeriğine erişememelidir.',
    'API istekleri kimlik doğrulama ve yetkilendirme kontrollerinden geçirilmelidir.',
    'Veritabanı bağlantı bilgileri ortam değişkenleri ile yönetilmelidir.',
    'Arayüz web ve mobil ekranlarda anlaşılır ve farklı ekran boyutlarına uyumlu olmalıdır.',
    'Sistem Node.js REST API ve PostgreSQL ile sürdürülebilir bir yapıda geliştirilmelidir.',
]:
    bullet(doc, item)

heading(doc, '5. Kısıtlar ve Varsayımlar')
paragraph(doc, 'Proje eğitim amacıyla geliştirilmektedir ve ilk aşamada PostgreSQL Docker ortamında çalışacaktır. Gerçek e-posta gönderimi, gelişmiş yönetici paneli ve üretim ortamına dağıtım ilk sürümün kapsamı dışındadır. Kullanıcıların geçerli bir e-posta adresine ve internet bağlantısına sahip olduğu varsayılmaktadır.')

heading(doc, '6. Kabul Kriterleri')
paragraph(doc, 'Sistem; yeni kullanıcıların kayıt olabilmesi, kayıtlı kullanıcıların doğru bilgilerle giriş yapabilmesi, hatalı girişlerin engellenmesi, dosyaların yalnızca yetkili kullanıcılar tarafından görüntülenebilmesi ve güvenlikle ilgili işlemlerin audit log kayıtlarına yazılması durumunda temel gereksinimleri karşılamış kabul edilecektir.')

footer = sec.footer.paragraphs[0]
footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
spacing(footer, before=2, after=0, line=1.0)
font(footer.add_run('SecureShare | Gereksinim Analizi'), size=8.5)
doc.save(OUT)
print(OUT)
