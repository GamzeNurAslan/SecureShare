from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.shared import Cm, Pt, RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

OUT = r"C:\Users\Lenovo\OneDrive\Belgeler\ChatGPT\SecureShare\docs\requirements-analysis.docx"

def set_cell_shading(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn('w:shd'))
    if shd is None:
        shd = OxmlElement('w:shd')
        tc_pr.append(shd)
    shd.set(qn('w:fill'), fill)

def set_cell_border(cell, color='D9E1F2', size='6'):
    tc_pr = cell._tc.get_or_add_tcPr()
    borders = tc_pr.first_child_found_in('w:tcBorders')
    if borders is None:
        borders = OxmlElement('w:tcBorders')
        tc_pr.append(borders)
    for edge in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        tag = 'w:' + edge
        element = borders.find(qn(tag))
        if element is None:
            element = OxmlElement(tag)
            borders.append(element)
        element.set(qn('w:val'), 'single')
        element.set(qn('w:sz'), size)
        element.set(qn('w:space'), '0')
        element.set(qn('w:color'), color)

def set_cell_margins(cell, top=70, start=90, bottom=70, end=90):
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in('w:tcMar')
    if tc_mar is None:
        tc_mar = OxmlElement('w:tcMar')
        tc_pr.append(tc_mar)
    for m, value in [('top', top), ('start', start), ('bottom', bottom), ('end', end)]:
        node = tc_mar.find(qn('w:' + m))
        if node is None:
            node = OxmlElement('w:' + m)
            tc_mar.append(node)
        node.set(qn('w:w'), str(value))
        node.set(qn('w:type'), 'dxa')

def set_font(run, size=9.3, bold=False, color='1F2937'):
    run.font.name = 'Aptos'
    run._element.rPr.rFonts.set(qn('w:ascii'), 'Aptos')
    run._element.rPr.rFonts.set(qn('w:hAnsi'), 'Aptos')
    run.font.size = Pt(size)
    run.bold = bold
    run.font.color.rgb = RGBColor.from_string(color)

def set_para(paragraph, before=0, after=3, line=1.0):
    fmt = paragraph.paragraph_format
    fmt.space_before = Pt(before)
    fmt.space_after = Pt(after)
    fmt.line_spacing = line

def add_heading(doc, text):
    p = doc.add_paragraph()
    set_para(p, before=5, after=2)
    set_font(p.add_run(text), size=11.2, bold=True, color='123B5D')

def add_body(doc, text):
    p = doc.add_paragraph()
    set_para(p, after=3, line=1.03)
    set_font(p.add_run(text), size=9.3)

def add_req_table(doc, headers, rows, widths):
    table = doc.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    for i, (cell, header) in enumerate(zip(table.rows[0].cells, headers)):
        cell.width = Cm(widths[i])
        set_cell_shading(cell, '123B5D')
        set_cell_border(cell)
        set_cell_margins(cell)
        cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        p = cell.paragraphs[0]
        set_para(p, after=0)
        set_font(p.add_run(header), size=8.5, bold=True, color='FFFFFF')
    for row_i, row in enumerate(rows):
        cells = table.add_row().cells
        for i, (cell, value) in enumerate(zip(cells, row)):
            cell.width = Cm(widths[i])
            set_cell_shading(cell, 'F5F8FC' if row_i % 2 else 'FFFFFF')
            set_cell_border(cell)
            set_cell_margins(cell)
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            p = cell.paragraphs[0]
            set_para(p, after=0)
            set_font(p.add_run(value), size=8.45, bold=(i == 0))
    return table

doc = Document()
section = doc.sections[0]
section.top_margin = Cm(1.35)
section.bottom_margin = Cm(1.25)
section.left_margin = Cm(1.55)
section.right_margin = Cm(1.55)
normal = doc.styles['Normal']
normal.font.name = 'Aptos'
normal._element.rPr.rFonts.set(qn('w:ascii'), 'Aptos')
normal._element.rPr.rFonts.set(qn('w:hAnsi'), 'Aptos')
normal.font.size = Pt(9.3)
normal.font.color.rgb = RGBColor.from_string('1F2937')

title = doc.add_paragraph(style='Title')
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
set_para(title, after=2)
set_font(title.add_run('SecureShare Gereksinim Analiz Raporu'), size=18, bold=True, color='000000')
sub = doc.add_paragraph()
sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
set_para(sub, after=7)
set_font(sub.add_run('Güvenli dosya paylaşımı ve erişim kontrolü uygulaması'), size=10, color='4B5563')

for labels, values in [
    (['Proje', 'Hazırlayan', 'Kapsam'], ['SecureShare', 'Gamze Nur Aslan ve proje ekibi', 'Web ve mobil uygulama'])
]:
    meta = doc.add_table(rows=2, cols=3)
    meta.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta.autofit = False
    for row_i, vals in enumerate((labels, values)):
        for cell, text in zip(meta.rows[row_i].cells, vals):
            set_cell_shading(cell, 'EAF2F8' if row_i == 0 else 'FFFFFF')
            set_cell_border(cell, color='B8CCE4')
            set_cell_margins(cell, top=60, start=90, bottom=60, end=90)
            p = cell.paragraphs[0]
            set_para(p, after=0)
            set_font(p.add_run(text), size=8.35, bold=(row_i == 0), color='123B5D' if row_i == 0 else '1F2937')

add_heading(doc, '1. Amaç ve Kapsam')
add_body(doc, 'SecureShare; kullanıcıların dosyalarını güvenli biçimde yüklemesini, şifreli olarak saklamasını ve yalnızca yetkilendirilmiş kişilerle paylaşmasını sağlayan bir web ve mobil uygulamadır. Sistem; kimlik doğrulama, dosya şifreleme, dosya bazlı erişim kontrolü ve işlem kayıtlarını tek bir yapı altında sunacaktır.')
add_heading(doc, '2. Paydaşlar ve Kullanıcılar')
add_body(doc, 'Temel paydaşlar dosya sahibi kullanıcılar, kendileriyle dosya paylaşılan kullanıcılar, proje geliştirme ekibi ve dersi yürüten öğretim elemanıdır. Kullanıcıların sistemi web veya React Native mobil uygulaması üzerinden kullanması beklenmektedir.')
add_heading(doc, '3. Fonksiyonel Gereksinimler')
functional = [
    ('FR-01', 'Kullanıcı kayıt olabilmeli; parola Argon2id ile hashlenmelidir.'),
    ('FR-02', 'Kullanıcı giriş yapabilmeli; başarılı girişte JWT tabanlı oturum oluşturulmalıdır.'),
    ('FR-03', 'Kullanıcı dosya yükleyebilmeli ve dosya listesini görüntüleyebilmelidir.'),
    ('FR-04', 'Dosyalar AES-128-GCM ile şifrelenerek MinIO üzerinde saklanmalıdır.'),
    ('FR-05', 'Dosya sahibi erişim izni verebilmeli ve kaldırabilmelidir.'),
    ('FR-06', 'Yükleme, indirme, paylaşma ve yetki değişiklikleri audit log’a kaydedilmelidir.'),
]
add_req_table(doc, ['Kod', 'Gereksinim'], functional, [1.35, 15.9])
add_heading(doc, '4. Fonksiyonel Olmayan Gereksinimler')
nonfunctional = [
    ('Güvenlik', 'Yetkisiz kullanıcı dosya içeriğine erişememeli; API istekleri kimlik doğrulama ve yetkilendirmeden geçmelidir.'),
    ('Gizlilik', 'Parolalar ve dosya anahtarları düz metin tutulmamalı; ortam değişkenleri kullanılmalıdır.'),
    ('Kullanılabilirlik', 'Arayüz web ve mobil ekranlarda anlaşılır, erişilebilir ve farklı ekran boyutlarına uyumlu olmalıdır.'),
    ('Sürdürülebilirlik', 'Node.js REST API, PostgreSQL ve modüler istemci yapısı kullanılmalı; kod ekip çalışmasına uygun tutulmalıdır.'),
]
add_req_table(doc, ['Alan', 'Gereksinim'], nonfunctional, [2.55, 14.7])
add_heading(doc, '5. Kısıtlar, Varsayımlar ve Kabul Kriterleri')
add_body(doc, 'Proje eğitim amacıyla geliştirilmektedir ve ilk aşamada PostgreSQL Docker ortamında çalışacaktır. Gerçek e-posta gönderimi ve gelişmiş yönetici paneli ilk sürüm kapsamı dışındadır. Sistem; yeni kullanıcının kayıt olabilmesi, kayıtlı kullanıcının doğru bilgilerle giriş yapabilmesi, hatalı girişin engellenmesi, dosyanın yalnızca yetkili kullanıcıya açılması ve işlemlerin audit log’a yazılması durumunda temel gereksinimleri karşılamış kabul edilecektir.')

footer = section.footer.paragraphs[0]
footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
set_para(footer, before=2, after=0)
set_font(footer.add_run('SecureShare | Gereksinim Analizi'), size=8, color='6B7280')
doc.save(OUT)
print(OUT)
