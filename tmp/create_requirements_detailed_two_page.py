from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Cm, Pt, RGBColor
from docx.oxml.ns import qn

OUT = r"C:\Users\Lenovo\OneDrive\Belgeler\ChatGPT\SecureShare\docs\requirements-analysis-detailed.docx"

def font(run, size=11, bold=False, italic=False):
    run.font.name = 'Calibri'
    run._element.rPr.rFonts.set(qn('w:ascii'), 'Calibri')
    run._element.rPr.rFonts.set(qn('w:hAnsi'), 'Calibri')
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = RGBColor(0, 0, 0)

def spacing(p, before=0, after=6, line=1.15):
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
    spacing(p, after=7, line=1.15)
    font(p.add_run(text), size=11)

def bullet(doc, text):
    p = doc.add_paragraph(style='List Bullet')
    spacing(p, after=4, line=1.12)
    font(p.add_run(text), size=10.8)

doc = Document()
sec = doc.sections[0]
sec.top_margin = Cm(2.0)
sec.bottom_margin = Cm(1.8)
sec.left_margin = Cm(2.2)
sec.right_margin = Cm(2.2)
normal = doc.styles['Normal']
normal.font.name = 'Calibri'
normal._element.rPr.rFonts.set(qn('w:ascii'), 'Calibri')
normal._element.rPr.rFonts.set(qn('w:hAnsi'), 'Calibri')
normal.font.size = Pt(11)
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

heading(doc, '1. Projenin Tanımı ve Amacı')
paragraph(doc, 'SecureShare; kullanıcıların dosyalarını güvenli biçimde yüklemesini, şifreli olarak saklamasını ve yalnızca yetkilendirilmiş kişilerle paylaşmasını sağlayan web ve mobil tabanlı bir uygulamadır. Projenin temel amacı, dosya paylaşımı sırasında oluşabilecek yetkisiz erişim, veri sızıntısı ve kontrolsüz paylaşım risklerini azaltmaktır. Bu amaçla kimlik doğrulama, dosya şifreleme, dosya bazlı yetkilendirme ve işlem kayıtları birlikte kullanılacaktır.')

heading(doc, '2. Paydaşlar, Kullanıcılar ve Kapsam')
paragraph(doc, 'Sistemin birincil kullanıcıları dosya yükleyen ve paylaşan kişiler ile kendileriyle dosya paylaşılan kişilerdir. Proje ekibi, uygulamanın geliştirilmesi ve test edilmesinden; öğretim elemanı ise gereksinimlerin ve çıktının değerlendirilmesinden sorumludur. Uygulama React tabanlı web arayüzü ve React Native + Expo mobil arayüzü üzerinden kullanılacaktır. İlk sürümde kayıt, giriş, dosya yönetimi, paylaşım, yetki yönetimi, şifreli depolama ve audit log özellikleri kapsam dahilindedir.')

heading(doc, '3. Fonksiyonel Gereksinimler')
for item in [
    'Kullanıcı kayıt işlemi ad, e-posta ve parola bilgileriyle yapılabilmelidir. Boş, geçersiz veya eksik bilgiler kabul edilmemelidir.',
    'Aynı e-posta adresiyle ikinci bir kullanıcı kaydı oluşturulmamalı ve kullanıcıya anlaşılır bir hata mesajı gösterilmelidir.',
    'Kullanıcılar e-posta ve parola ile giriş yapabilmeli; başarılı girişten sonra JWT tabanlı oturum başlatılmalıdır.',
    'Yanlış parola, kayıtlı olmayan e-posta veya geçersiz token durumlarında güvenli hata yanıtı dönülmeli ve hassas bilgi açığa çıkarılmamalıdır.',
    'Kullanıcı dosya yükleyebilmeli; dosyanın adı, boyutu, türü ve yüklenme tarihi gibi temel bilgileri liste üzerinde görebilmelidir.',
    'Dosya sahibi kendi dosyasını indirebilmeli ve belirli bir kullanıcıya görüntüleme veya indirme yetkisi verebilmelidir.',
    'Dosya sahibi daha önce verdiği erişim iznini kaldırabilmeli; yetkisi kaldırılan kullanıcı sonraki istekte dosyaya erişememelidir.',
    'Kullanıcılar kendileriyle paylaşılmış dosyaları ayrı bir listede görebilmeli ve yalnızca sahip oldukları izin kapsamında işlem yapabilmelidir.',
    'Dosya yükleme, indirme, paylaşma, yetki kaldırma, giriş ve başarısız erişim denemeleri tarih, kullanıcı ve işlem bilgisiyle audit log’a yazılmalıdır.',
]:
    bullet(doc, item)

heading(doc, '4. Fonksiyonel Olmayan Gereksinimler')
for item in [
    'Parolalar Argon2id ile hashlenmeli ve hiçbir koşulda düz metin olarak saklanmamalıdır.',
    'Dosyalar AES-128-GCM ile şifrelenmeli; DEK ve KEK yaklaşımı kullanılarak dosya anahtarlarının korunması sağlanmalıdır.',
    'Yetkisiz kullanıcılar dosya içeriğine, indirme bağlantısına veya dosya anahtarına erişememelidir.',
    'API istekleri JWT doğrulamasından geçirilmeli ve dosya sahibi ile yetkili kullanıcı ayrımı sunucu tarafında kontrol edilmelidir.',
    'Veritabanı parolası, JWT anahtarı ve diğer gizli bilgiler kaynak kodda tutulmamalı; ortam değişkenleriyle yönetilmelidir.',
    'Arayüz web ve mobil ekranlarda anlaşılır, erişilebilir ve farklı ekran boyutlarına uyumlu olmalıdır.',
    'Uygulama hataları kullanıcıya anlaşılır biçimde gösterilmeli; sunucu tarafında hata ayrıntıları güvenli biçimde loglanmalıdır.',
    'Node.js REST API, PostgreSQL ve MinIO bileşenleri modüler ve sürdürülebilir bir yapıda geliştirilmelidir.',
]:
    bullet(doc, item)

heading(doc, '5. Teknik Kısıtlar ve Varsayımlar')
paragraph(doc, 'Proje eğitim amacıyla geliştirilmektedir. İlk geliştirme ortamında PostgreSQL Docker üzerinden çalıştırılacak ve bağlantı bilgileri ortam değişkenlerinden okunacaktır. Dosya depolama için MinIO, web istemcisi için React, mobil istemci için React Native + Expo kullanılacaktır. Gerçek e-posta gönderimi, gelişmiş yönetici paneli, çoklu organizasyon desteği ve üretim ortamı dağıtımı ilk sürüm kapsamı dışındadır. Kullanıcıların geçerli bir e-posta adresine, internet bağlantısına ve desteklenen bir tarayıcı ya da mobil cihaza sahip olduğu varsayılmaktadır.')

heading(doc, '6. Kabul Kriterleri')
paragraph(doc, 'Sistem; yeni kullanıcıların kayıt olabilmesi, kayıtlı kullanıcıların doğru bilgilerle giriş yapabilmesi ve hatalı girişlerin engellenmesi durumunda kimlik doğrulama gereksinimini karşılamış sayılacaktır. Bir dosya yalnızca sahibi veya açıkça yetkilendirilmiş kullanıcı tarafından görüntülenip indirilebilmelidir. Dosyanın şifreli saklandığı, yetki kaldırma işleminin sonraki erişimleri engellediği ve ilgili işlemlerin audit log kayıtlarına eklendiği gösterilmelidir. Temel akışların web ve mobil arayüzlerde çalışması, projenin ilk sürüm kabul koşuludur.')

footer = sec.footer.paragraphs[0]
footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
spacing(footer, before=3, after=0, line=1.0)
font(footer.add_run('SecureShare | Gereksinim Analizi'), size=8.5)
doc.save(OUT)
print(OUT)
