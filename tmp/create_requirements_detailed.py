from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Cm, Pt, RGBColor
from docx.oxml.ns import qn

OUT = r"C:\Users\Lenovo\OneDrive\Belgeler\ChatGPT\SecureShare\docs\requirements-analysis.docx"

def font(run, size=10.1, bold=False, italic=False):
    run.font.name = 'Calibri'
    run._element.rPr.rFonts.set(qn('w:ascii'), 'Calibri')
    run._element.rPr.rFonts.set(qn('w:hAnsi'), 'Calibri')
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = RGBColor(0, 0, 0)

def spacing(p, before=0, after=4, line=1.04):
    fmt = p.paragraph_format
    fmt.space_before = Pt(before)
    fmt.space_after = Pt(after)
    fmt.line_spacing = line

def heading(doc, text):
    p = doc.add_paragraph()
    spacing(p, before=6, after=2, line=1.0)
    font(p.add_run(text), size=11.2, bold=True)

def paragraph(doc, text):
    p = doc.add_paragraph()
    spacing(p, after=4, line=1.04)
    font(p.add_run(text), size=10.1)

def bullet(doc, text):
    p = doc.add_paragraph(style='List Bullet')
    spacing(p, after=1, line=1.02)
    font(p.add_run(text), size=9.75)

doc = Document()
sec = doc.sections[0]
sec.top_margin = Cm(1.55)
sec.bottom_margin = Cm(1.45)
sec.left_margin = Cm(1.95)
sec.right_margin = Cm(1.95)
normal = doc.styles['Normal']
normal.font.name = 'Calibri'
normal._element.rPr.rFonts.set(qn('w:ascii'), 'Calibri')
normal._element.rPr.rFonts.set(qn('w:hAnsi'), 'Calibri')
normal.font.size = Pt(10.1)
normal.font.color.rgb = RGBColor(0, 0, 0)

title = doc.add_paragraph()
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
spacing(title, after=2, line=1.0)
font(title.add_run('SecureShare Gereksinim Analiz Raporu'), size=15.5, bold=True)
sub = doc.add_paragraph()
sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
spacing(sub, after=7, line=1.0)
font(sub.add_run('Güvenli dosya paylaşımı ve erişim kontrolü uygulaması'), size=10.1, italic=True)
meta = doc.add_paragraph()
meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
spacing(meta, after=7, line=1.0)
font(meta.add_run('Hazırlayan: Gamze Nur Aslan ve proje ekibi'), size=9.2)

heading(doc, '1. Projenin Amacı')
paragraph(doc, 'SecureShare, kullanıcıların dosyalarını güvenli biçimde yüklemesini, şifreli olarak saklamasını ve yalnızca yetkilendirilmiş kişilerle paylaşmasını sağlayan web ve mobil tabanlı bir uygulamadır. Projenin amacı, dosya paylaşımı sırasında gizlilik, bütünlük ve erişim kontrolünü birlikte sağlayarak hassas verilerin korunmasına yardımcı olmaktır.')

heading(doc, '2. Kullanıcılar ve Kapsam')
paragraph(doc, 'Sistemin temel kullanıcıları dosya yükleyen kişiler ve kendileriyle dosya paylaşılan kişilerdir. Kullanıcılar React tabanlı web uygulaması veya React Native mobil uygulaması üzerinden sisteme erişecektir. Proje; kullanıcı yönetimi, dosya yükleme ve indirme, dosya paylaşımı, erişim izinlerinin yönetimi, şifreli depolama ve işlem kayıtlarını kapsamaktadır.')

heading(doc, '3. Fonksiyonel Gereksinimler')
for item in [
    'Kullanıcılar ad, e-posta ve parola bilgileriyle kayıt olabilmeli; eksik veya geçersiz bilgiler için uyarı almalıdır.',
    'Aynı e-posta adresiyle tekrar kayıt oluşturulması engellenmelidir.',
    'Kullanıcılar e-posta ve parola ile giriş yapabilmeli; yanlış bilgilerde uygun hata mesajı gösterilmelidir.',
    'Başarılı giriş sonrasında JWT tabanlı oturum oluşturulmalı ve kullanıcı çıkış yapabilmelidir.',
    'Kullanıcılar dosya yükleyebilmeli, dosya adı ve yüklenme tarihi gibi temel bilgileri görüntüleyebilmelidir.',
    'Kullanıcılar kendi dosyalarını indirebilmeli; kendileriyle paylaşılan dosyalara verilen izin ölçüsünde erişebilmelidir.',
    'Dosya sahibi belirli kullanıcılara erişim verebilmeli ve daha önce verdiği erişim yetkisini kaldırabilmelidir.',
    'Yükleme, indirme, paylaşma, yetki değiştirme ve başarısız erişim denemeleri audit log kayıtlarına yazılmalıdır.',
]:
    bullet(doc, item)

heading(doc, '4. Fonksiyonel Olmayan Gereksinimler')
for item in [
    'Parolalar Argon2id ile hashlenmeli; dosya içerikleri AES-128-GCM, anahtar yönetimi ise DEK ve KEK yaklaşımıyla korunmalıdır.',
    'Yetkisiz kullanıcılar dosya adına veya dosya içeriğine erişememeli; API istekleri kimlik doğrulama ve yetkilendirmeden geçmelidir.',
    'Şifreler, veritabanı parolaları ve diğer gizli bilgiler kaynak kodda tutulmamalı, ortam değişkenleriyle yönetilmelidir.',
    'Uygulama web ve mobil ekranlarda anlaşılır olmalı, farklı ekran boyutlarına uyum sağlamalı ve temel işlemlerde kullanıcıyı yönlendirmelidir.',
    'Dosya ve kullanıcı verileri PostgreSQL ile tutarlı biçimde saklanmalı; beklenmeyen hatalarda veri kaybı oluşmamalıdır.',
    'Node.js REST API, PostgreSQL, MinIO ve istemci uygulamaları modüler yapıda geliştirilerek ekip çalışmasına uygun tutulmalıdır.',
]:
    bullet(doc, item)

heading(doc, '5. Kısıtlar, Varsayımlar ve Kabul Kriterleri')
paragraph(doc, 'Proje eğitim amacıyla geliştirilmektedir ve ilk aşamada PostgreSQL Docker ortamında çalışacaktır. Gerçek e-posta gönderimi, gelişmiş yönetici paneli ve üretim ortamına dağıtım ilk sürüm kapsamı dışındadır. Sistem; kullanıcının kayıt olabilmesi, doğru bilgilerle giriş yapabilmesi, hatalı girişin engellenmesi, dosyaların yalnızca yetkili kişilere açılması ve işlemlerin audit log’a yazılması durumunda temel gereksinimleri karşılamış kabul edilecektir.')

footer = sec.footer.paragraphs[0]
footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
spacing(footer, before=2, after=0, line=1.0)
font(footer.add_run('SecureShare | Gereksinim Analizi'), size=8.2)
doc.save(OUT)
print(OUT)
