from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Cm, Pt, RGBColor
from docx.oxml.ns import qn

OUT = r"C:\Users\Lenovo\OneDrive\Belgeler\ChatGPT\SecureShare\docs\requirements-analysis-detailed.docx"

def set_font(run, size=9.1, bold=False, italic=False):
    run.font.name = 'Calibri'
    run._element.rPr.rFonts.set(qn('w:ascii'), 'Calibri')
    run._element.rPr.rFonts.set(qn('w:hAnsi'), 'Calibri')
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic
    run.font.color.rgb = RGBColor(0, 0, 0)

def set_spacing(p, before=0, after=2, line=0.98):
    fmt = p.paragraph_format
    fmt.space_before = Pt(before)
    fmt.space_after = Pt(after)
    fmt.line_spacing = line

def add_heading(doc, text, size=10.8, before=4):
    p = doc.add_paragraph()
    set_spacing(p, before=before, after=1, line=1.0)
    set_font(p.add_run(text), size=size, bold=True)

def add_body(doc, text):
    p = doc.add_paragraph()
    set_spacing(p, after=2, line=0.98)
    set_font(p.add_run(text), size=9.1)

def add_req(doc, code, text):
    p = doc.add_paragraph(style='List Bullet')
    set_spacing(p, after=1, line=0.96)
    set_font(p.add_run(f'[{code}] '), size=8.9, bold=True)
    set_font(p.add_run(text), size=8.9)

doc = Document()
section = doc.sections[0]
section.top_margin = Cm(1.05)
section.bottom_margin = Cm(1.0)
section.left_margin = Cm(1.45)
section.right_margin = Cm(1.45)
normal = doc.styles['Normal']
normal.font.name = 'Calibri'
normal._element.rPr.rFonts.set(qn('w:ascii'), 'Calibri')
normal._element.rPr.rFonts.set(qn('w:hAnsi'), 'Calibri')
normal.font.size = Pt(9.1)
normal.font.color.rgb = RGBColor(0, 0, 0)

title = doc.add_paragraph()
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
set_spacing(title, after=1, line=1.0)
set_font(title.add_run('Gereksinim Analiz Raporu: SecureShare'), size=14.5, bold=True)
sub = doc.add_paragraph()
sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
set_spacing(sub, after=3, line=1.0)
set_font(sub.add_run('Güvenli Dosya Paylaşımı ve Erişim Kontrolü Uygulaması'), size=8.8, italic=True)

add_heading(doc, '1. Giriş', size=10.8, before=2)
add_body(doc, 'Bu rapor, SecureShare projesinin kullanıcı ihtiyaçlarını, sistem kapsamını ve uygulanması gereken teknik gereksinimleri tanımlamaktadır. Proje, hassas dosyaların güvenli şekilde saklanmasını ve yalnızca yetkili kişilerle paylaşılmasını hedeflemektedir.')

add_heading(doc, '2. Amaç', size=10.8, before=3)
add_body(doc, 'SecureShare’in amacı; dosya paylaşımında gizlilik, bütünlük ve erişim kontrolü sağlamak, kullanıcı işlemlerini izlenebilir hale getirmek ve web ile mobil platformlarda kullanılabilir güvenli bir çözüm sunmaktır.')

add_heading(doc, '3. Kapsam', size=10.8, before=3)
add_body(doc, 'Proje; kullanıcı kayıt ve giriş işlemlerini, dosya yükleme ve indirmeyi, dosyaların şifreli depolanmasını, kullanıcı bazlı paylaşım izinlerini, yetki kaldırma işlemlerini ve audit log kayıtlarını kapsamaktadır. Sistem web arayüzü ve React Native + Expo mobil uygulaması üzerinden kullanılacaktır.')

add_heading(doc, '4. Fonksiyonel Gereksinimler', size=10.8, before=3)
add_req(doc, 'FG-01', 'Kullanıcı Kaydı: Kullanıcı ad, e-posta ve parola bilgileriyle kayıt olabilmeli; eksik, geçersiz veya daha önce kullanılmış e-posta reddedilmelidir.')
add_req(doc, 'FG-02', 'Kullanıcı Girişi: Kullanıcı doğru bilgilerle giriş yapabilmeli, başarılı girişte JWT oturumu oluşturulmalı ve çıkış işlemi yapılabilmelidir.')
add_req(doc, 'FG-03', 'Dosya Yükleme: Kullanıcı dosya yükleyebilmeli; dosya adı, türü, boyutu ve yüklenme tarihi görüntülenebilmelidir.')
add_req(doc, 'FG-04', 'Şifreli Depolama: Yüklenen dosya depolama alanına aktarılmadan önce şifrelenmeli ve güvenli biçimde saklanmalıdır.')
add_req(doc, 'FG-05', 'Dosya Paylaşımı: Dosya sahibi belirli kullanıcılara görüntüleme veya indirme yetkisi verebilmelidir.')
add_req(doc, 'FG-06', 'Yetki Kaldırma: Dosya sahibi daha önce verdiği izni kaldırabilmeli; yetkisi kaldırılan kullanıcı sonraki erişimde engellenmelidir.')
add_req(doc, 'FG-07', 'Dosya Erişimi: Kullanıcılar kendi dosyalarını ve kendileriyle paylaşılan dosyaları yalnızca sahip oldukları izin kapsamında görüntüleyebilmelidir.')
add_req(doc, 'FG-08', 'İşlem Kaydı: Kayıt, giriş, yükleme, indirme, paylaşma, yetki değişikliği ve başarısız erişimler audit log’a yazılmalıdır.')

add_heading(doc, '5. Fonksiyonel Olmayan Gereksinimler', size=10.8, before=3)
add_req(doc, 'FOG-01', 'Güvenlik: Parolalar Argon2id ile hashlenmeli; dosyalar AES-128-GCM ve DEK/KEK ile korunmalıdır.')
add_req(doc, 'FOG-02', 'Yetkilendirme: API istekleri JWT ve dosya bazlı izin kontrollerinden geçirilmelidir.')
add_req(doc, 'FOG-03', 'Gizlilik: Veritabanı parolası, JWT anahtarı ve diğer gizli bilgiler kaynak kodda tutulmamalıdır.')
add_req(doc, 'FOG-04', 'Kullanılabilirlik: Arayüz web ve mobil ekranlarda anlaşılır, erişilebilir ve uyumlu olmalıdır.')
add_req(doc, 'FOG-05', 'Sürdürülebilirlik: Kod modüler, test edilebilir ve ekip çalışmasına uygun geliştirilmelidir.')

add_heading(doc, '6. Sistem Mimarisi ve Teknolojileri', size=10.8, before=3)
add_body(doc, 'Sistem; React web ve React Native + Expo mobil istemcilerini karşılayan Node.js REST API katmanından oluşacaktır. Kullanıcı ve izin bilgileri PostgreSQL’de, şifreli dosyalar MinIO’da tutulacak; JWT, Argon2id, AES-128-GCM ve DEK/KEK yaklaşımı kullanılacaktır.')

add_heading(doc, '7. Sonuç', size=10.8, before=3)
add_body(doc, 'Bu gereksinimler karşılandığında SecureShare, dosyaların güvenli ve izlenebilir biçimde paylaşılmasını sağlayacaktır.')

doc.save(OUT)
print(OUT)
