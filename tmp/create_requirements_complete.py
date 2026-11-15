from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Cm, Pt, RGBColor
from docx.oxml.ns import qn

OUT = r"C:\Users\Lenovo\OneDrive\Belgeler\ChatGPT\SecureShare\docs\requirements-analysis-detailed.docx"

def font(run, size=10.8, bold=False, italic=False):
    run.font.name = 'Calibri'
    run._element.rPr.rFonts.set(qn('w:ascii'), 'Calibri')
    run._element.rPr.rFonts.set(qn('w:hAnsi'), 'Calibri')
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = RGBColor(0, 0, 0)

def spacing(p, before=0, after=6, line=1.12):
    fmt = p.paragraph_format
    fmt.space_before = Pt(before)
    fmt.space_after = Pt(after)
    fmt.line_spacing = line

def heading(doc, text):
    p = doc.add_paragraph()
    spacing(p, before=10, after=4, line=1.0)
    font(p.add_run(text), size=12, bold=True)

def paragraph(doc, text):
    p = doc.add_paragraph()
    spacing(p, after=7, line=1.12)
    font(p.add_run(text), size=10.8)

def bullet(doc, text):
    p = doc.add_paragraph(style='List Bullet')
    spacing(p, after=3, line=1.10)
    font(p.add_run(text), size=10.5)

doc = Document()
sec = doc.sections[0]
sec.top_margin = Cm(1.9)
sec.bottom_margin = Cm(1.7)
sec.left_margin = Cm(2.15)
sec.right_margin = Cm(2.15)
normal = doc.styles['Normal']
normal.font.name = 'Calibri'
normal._element.rPr.rFonts.set(qn('w:ascii'), 'Calibri')
normal._element.rPr.rFonts.set(qn('w:hAnsi'), 'Calibri')
normal.font.size = Pt(10.8)
normal.font.color.rgb = RGBColor(0, 0, 0)

title = doc.add_paragraph()
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
spacing(title, after=3, line=1.0)
font(title.add_run('SecureShare Gereksinim Analiz Raporu'), size=17, bold=True)
sub = doc.add_paragraph()
sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
spacing(sub, after=10, line=1.0)
font(sub.add_run('Güvenli dosya paylaşımı ve erişim kontrolü uygulaması'), size=11, italic=True)
meta = doc.add_paragraph()
meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
spacing(meta, after=12, line=1.0)
font(meta.add_run('Hazırlayan: Gamze Nur Aslan ve proje ekibi'), size=10)

heading(doc, '1. Projenin Amacı')
paragraph(doc, 'SecureShare, kullanıcıların dosyalarını güvenli biçimde yüklemesini, şifreli olarak saklamasını ve yalnızca yetkilendirilmiş kişilerle paylaşmasını sağlayan web ve mobil tabanlı bir uygulamadır. Sistem; kimlik doğrulama, dosya yönetimi, şifreleme, erişim kontrolü ve işlem takibini tek bir uygulamada birleştirerek hassas dosyaların korunmasını amaçlamaktadır.')

heading(doc, '2. Fonksiyonel Gereksinimler')
heading(doc, '2.1 Kullanıcı ve Kimlik Doğrulama')
for item in [
    'Kullanıcılar ad, e-posta ve parola bilgileriyle kayıt olabilmeli; eksik, hatalı veya geçersiz bilgiler reddedilmelidir.',
    'Aynı e-posta adresiyle ikinci kayıt engellenmeli ve kullanıcıya açıklayıcı hata mesajı gösterilmelidir.',
    'Kullanıcılar e-posta ve parola ile giriş yapabilmeli; başarılı girişte JWT tabanlı oturum oluşturulmalıdır.',
    'Kullanıcı oturumunu güvenli biçimde kapatabilmeli ve geçersiz veya süresi dolmuş token ile işlem yapamamalıdır.',
]:
    bullet(doc, item)

heading(doc, '2.2 Dosya Yönetimi')
for item in [
    'Kullanıcılar dosya seçip yükleyebilmeli; dosyanın adı, türü, boyutu ve yüklenme tarihi görüntülenebilmelidir.',
    'Kullanıcı kendi dosyalarını listeleyebilmeli, yetkisi olan dosyaları görüntüleyebilmeli ve indirebilmelidir.',
    'Desteklenmeyen dosya türleri veya izin verilen boyutu aşan dosyalar için uygun uyarı verilmelidir.',
]:
    bullet(doc, item)

heading(doc, '2.3 Şifreleme ve Depolama')
for item in [
    'Dosyalar depolama alanına aktarılmadan önce AES-128-GCM ile şifrelenmelidir.',
    'Dosya şifreleme anahtarları DEK ve KEK yaklaşımıyla korunmalı; anahtarlar dosya içeriğinden ayrı tutulmalıdır.',
    'Şifrelenmiş dosyalar MinIO üzerinde saklanmalı ve veritabanında dosya sahibi ile depolama bilgileri tutulmalıdır.',
]:
    bullet(doc, item)

heading(doc, '2.4 Paylaşım ve Erişim Kontrolü')
for item in [
    'Dosya sahibi belirli bir kullanıcıya erişim verebilmeli ve daha önce verdiği yetkiyi kaldırabilmelidir.',
    'Yetkili kullanıcı yalnızca kendisine tanımlanan izin kapsamında dosyayı görüntüleyebilmeli veya indirebilmelidir.',
    'Yetkisi kaldırılan kullanıcı sonraki istekte dosyaya erişememelidir.',
]:
    bullet(doc, item)

heading(doc, '2.5 Audit Log ve Arayüz')
for item in [
    'Kayıt, giriş, yükleme, indirme, paylaşma, yetki kaldırma ve başarısız erişim denemeleri tarih, kullanıcı ve işlem bilgisiyle kaydedilmelidir.',
    'Web ve mobil arayüzlerde kayıt, giriş, dosya listesi, dosya paylaşımı ve çıkış akışları kullanıcı tarafından takip edilebilir olmalıdır.',
]:
    bullet(doc, item)

heading(doc, '3. Fonksiyonel Olmayan Gereksinimler')
for item in [
    'Parolalar Argon2id ile hashlenmeli ve düz metin olarak saklanmamalıdır.',
    'Yetkisiz kullanıcılar dosya içeriğine, indirme bağlantısına veya dosya anahtarına erişememelidir.',
    'API istekleri JWT doğrulaması ve dosya bazlı yetkilendirme kontrolünden geçirilmelidir.',
    'Veritabanı parolası, JWT anahtarı ve diğer gizli bilgiler kaynak kodda tutulmamalı; ortam değişkenleriyle yönetilmelidir.',
    'Arayüz web ve mobil ekranlarda anlaşılır, erişilebilir ve farklı ekran boyutlarına uyumlu olmalıdır.',
    'Uygulama hataları kullanıcıya anlaşılır biçimde gösterilmeli; teknik hata ayrıntıları güvenli loglarda tutulmalıdır.',
    'PostgreSQL, Node.js REST API ve MinIO bileşenleri modüler, sürdürülebilir ve ekip çalışmasına uygun geliştirilmelidir.',
    'Dosya ve kullanıcı verilerinin tutarlılığı korunmalı; beklenmeyen hatalarda yetkisiz veri kaybı oluşmamalıdır.',
]:
    bullet(doc, item)

heading(doc, '4. Kısıtlar, Varsayımlar ve Kabul Kriterleri')
paragraph(doc, 'Proje eğitim amacıyla geliştirilmektedir. İlk geliştirme ortamında PostgreSQL Docker üzerinden çalıştırılacak; web istemcisi React, mobil istemci React Native + Expo ile geliştirilecektir. Gerçek e-posta gönderimi, gelişmiş yönetici paneli, çoklu organizasyon desteği ve üretim ortamına dağıtım ilk sürüm kapsamı dışındadır. Sistem; kayıt ve girişin çalışması, dosyanın şifreli saklanması, yalnızca yetkili kullanıcıya açılması, yetki kaldırma işleminin erişimi durdurması ve ilgili işlemlerin audit log’a yazılması durumunda temel kabul kriterlerini karşılamış sayılacaktır.')

footer = sec.footer.paragraphs[0]
footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
spacing(footer, before=3, after=0, line=1.0)
font(footer.add_run('SecureShare | Gereksinim Analizi'), size=8.5)
doc.save(OUT)
print(OUT)
