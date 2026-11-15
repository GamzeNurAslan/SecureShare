from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Cm, Pt, RGBColor
from docx.oxml.ns import qn

OUT = r"C:\Users\Lenovo\OneDrive\Belgeler\ChatGPT\SecureShare\docs\requirements-analysis-detailed.docx"

def run_style(run, size=10.0, bold=False, italic=False):
    run.font.name = 'Calibri'
    run._element.rPr.rFonts.set(qn('w:ascii'), 'Calibri')
    run._element.rPr.rFonts.set(qn('w:hAnsi'), 'Calibri')
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic
    run.font.color.rgb = RGBColor(0, 0, 0)

def para_style(p, before=0, after=3, line=1.0):
    fmt = p.paragraph_format
    fmt.space_before = Pt(before)
    fmt.space_after = Pt(after)
    fmt.line_spacing = line

def heading(doc, text, size=11.5, before=5):
    p = doc.add_paragraph()
    para_style(p, before=before, after=1, line=1.0)
    run_style(p.add_run(text), size=size, bold=True)

def body(doc, text):
    p = doc.add_paragraph()
    para_style(p, after=3, line=1.0)
    run_style(p.add_run(text), size=9.75)

def bullet(doc, text, numbered=False):
    style = 'List Number' if numbered else 'List Bullet'
    p = doc.add_paragraph(style=style)
    para_style(p, after=1, line=0.98)
    run_style(p.add_run(text), size=9.3)

doc = Document()
section = doc.sections[0]
section.top_margin = Cm(1.25)
section.bottom_margin = Cm(1.15)
section.left_margin = Cm(1.7)
section.right_margin = Cm(1.7)
normal = doc.styles['Normal']
normal.font.name = 'Calibri'
normal._element.rPr.rFonts.set(qn('w:ascii'), 'Calibri')
normal._element.rPr.rFonts.set(qn('w:hAnsi'), 'Calibri')
normal.font.size = Pt(9.75)
normal.font.color.rgb = RGBColor(0, 0, 0)

title = doc.add_paragraph()
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
para_style(title, after=2, line=1.0)
run_style(title.add_run('Gereksinim Analiz Raporu: SecureShare'), size=15, bold=True)
subtitle = doc.add_paragraph()
subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
para_style(subtitle, after=4, line=1.0)
run_style(subtitle.add_run('Güvenli Dosya Paylaşımı ve Erişim Kontrolü Uygulaması'), size=9.5, italic=True)

heading(doc, '1. Giriş', size=11.5, before=4)
body(doc, 'Bu rapor, SecureShare projesinin kullanıcı ihtiyaçlarını, sistem kapsamını ve teknik gereksinimlerini tanımlamak amacıyla hazırlanmıştır. Proje; dosyaların güvenli biçimde paylaşılması, şifreli olarak saklanması ve yalnızca yetkili kişiler tarafından kullanılmasını hedeflemektedir.')

heading(doc, '1.1 Amaç', size=10.5, before=3)
body(doc, 'Sistemin temel amacı, kullanıcıların hassas dosyalarını yetkisiz erişimden korumak ve dosya paylaşım sürecini güvenli, izlenebilir ve yönetilebilir hale getirmektir.')

heading(doc, '1.2 Kapsam', size=10.5, before=3)
for item in [
    'Kullanıcı kayıt, giriş, JWT tabanlı oturum ve çıkış işlemleri.',
    'Dosya yükleme, listeleme, indirme, silme ve dosya bilgilerini görüntüleme.',
    'Dosya sahibi tarafından kullanıcı seçilmesi ve görüntüleme/indirme yetkisi verilmesi.',
    'AES-128-GCM, DEK/KEK, PostgreSQL ve MinIO kullanılarak güvenli depolama.',
    'Yükleme, indirme, paylaşma ve yetki değişikliklerinin audit log ile izlenmesi.',
]:
    bullet(doc, item)

heading(doc, '2. Fonksiyonel Gereksinimler', size=11.5, before=4)
for item in [
    'Kullanıcı kayıt sırasında ad, e-posta ve parola bilgilerini girmeli; eksik veya geçersiz bilgiler reddedilmelidir.',
    'Aynı e-posta adresiyle ikinci kayıt oluşturulmamalı; başarılı girişte JWT oturumu başlatılmalıdır.',
    'Kullanıcı dosya yükleyebilmeli ve dosyanın adı, türü, boyutu ile yüklenme tarihini görebilmelidir.',
    'Dosya sahibi belirli kullanıcılara erişim verebilmeli, yetkiyi kaldırabilmeli ve kendi dosyasını silebilmelidir.',
    'Kullanıcılar kendileriyle paylaşılan dosyaları yalnızca sahip oldukları izin kapsamında görüntüleyebilmelidir.',
    'Kayıt, giriş, dosya işlemleri ve başarısız erişim denemeleri audit log’a yazılmalıdır.',
]:
    bullet(doc, item)

heading(doc, '3. Fonksiyonel Olmayan Gereksinimler', size=11.5, before=4)
for item in [
    'Parolalar Argon2id ile hashlenmeli; dosya içerikleri AES-128-GCM ile şifrelenmelidir.',
    'Yetkisiz kullanıcılar dosya içeriğine, anahtarına veya indirme bağlantısına erişememelidir.',
    'Gizli bilgiler kaynak kodda tutulmamalı ve ortam değişkenleriyle yönetilmelidir.',
    'Arayüz web ve mobil ekranlarda anlaşılır, erişilebilir ve uyumlu olmalıdır.',
    'Node.js REST API, PostgreSQL ve MinIO modüler ve sürdürülebilir bir yapıda geliştirilmelidir.',
]:
    bullet(doc, item)

heading(doc, '4. Kısıtlar ve Kabul Kriterleri', size=11.5, before=4)
body(doc, 'Proje eğitim amacıyla geliştirilecek ve ilk aşamada PostgreSQL Docker ortamında çalışacaktır. React web, React Native + Expo mobil istemcisi ve Node.js REST API kullanılacaktır. Gerçek e-posta gönderimi ve gelişmiş yönetici paneli ilk sürüm kapsamı dışındadır. Sistem; kayıt ve girişin çalışması, dosyanın şifreli saklanması, erişim izinlerinin uygulanması ve işlemlerin audit log’a yazılması durumunda temel gereksinimleri karşılamış kabul edilir.')

authors = doc.add_paragraph()
authors.alignment = WD_ALIGN_PARAGRAPH.RIGHT
para_style(authors, before=3, after=0, line=1.0)
run_style(authors.add_run('Hazırlayanlar: Gamze Nur Aslan, Büşra Özer ve Hava Şener'), size=8.4)

doc.save(OUT)
print(OUT)
