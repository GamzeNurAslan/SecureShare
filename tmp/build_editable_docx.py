from pathlib import Path
from zipfile import ZipFile

from PIL import Image
from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Mm, Pt


ROOT = Path(r"C:\Users\Lenovo\OneDrive\Belgeler\ChatGPT\SecureShare")
SOURCE_PAGE5 = ROOT / "tmp" / "pdf_source_render_200" / "page-5.png"
FIG_DIR = ROOT / "tmp" / "editable_figures"
OUTPUT = ROOT / "output" / "Hafta2_Proje_Raporu_SecureShare.docx"


def set_cell_shading(cell, fill="D9D9D9"):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_margins(cell, top=80, start=90, bottom=80, end=90):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for margin, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{margin}"))
        if node is None:
            node = OxmlElement(f"w:{margin}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def set_table_borders(table, color="808080", size="6"):
    tbl = table._tbl
    tbl_pr = tbl.tblPr
    borders = tbl_pr.first_child_found_in("w:tblBorders")
    if borders is None:
        borders = OxmlElement("w:tblBorders")
        tbl_pr.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        tag = f"w:{edge}"
        element = borders.find(qn(tag))
        if element is None:
            element = OxmlElement(tag)
            borders.append(element)
        element.set(qn("w:val"), "single")
        element.set(qn("w:sz"), size)
        element.set(qn("w:space"), "0")
        element.set(qn("w:color"), color)


def set_run_font(run, size=10, bold=False, italic=False):
    run.font.name = "Arial"
    run._element.rPr.rFonts.set(qn("w:eastAsia"), "Arial")
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic


def set_paragraph(paragraph, size=10, bold=False, italic=False, align=None, before=0, after=4):
    paragraph.paragraph_format.space_before = Pt(before)
    paragraph.paragraph_format.space_after = Pt(after)
    paragraph.paragraph_format.line_spacing = 1.05
    if align is not None:
        paragraph.alignment = align
    for run in paragraph.runs:
        set_run_font(run, size=size, bold=bold, italic=italic)


def add_text(doc, text, size=10, bold=False, italic=False, align=None, after=5):
    p = doc.add_paragraph()
    r = p.add_run(text)
    set_run_font(r, size=size, bold=bold, italic=italic)
    set_paragraph(p, size=size, align=align, after=after)
    return p


def add_heading(doc, text, level=1):
    p = doc.add_paragraph()
    r = p.add_run(text)
    set_run_font(r, size=13 if level == 1 else 11, bold=True)
    set_paragraph(p, size=13 if level == 1 else 11, before=7, after=5)
    return p


def add_bullet(doc, text):
    p = doc.add_paragraph(style="List Bullet")
    r = p.add_run(text)
    set_run_font(r, size=10)
    set_paragraph(p, size=10, after=2)
    return p


def add_table(doc, rows, widths=None, header=True, font_size=9.5):
    table = doc.add_table(rows=len(rows), cols=len(rows[0]))
    table.style = "Table Grid"
    table.autofit = True
    set_table_borders(table)
    for i, row in enumerate(rows):
        for j, value in enumerate(row):
            cell = table.cell(i, j)
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            set_cell_margins(cell)
            if header and i == 0:
                set_cell_shading(cell)
            cell.text = ""
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER if (header and i == 0) or j == 0 else WD_ALIGN_PARAGRAPH.LEFT
            r = p.add_run(str(value))
            set_run_font(r, size=font_size, bold=(header and i == 0))
            set_paragraph(p, size=font_size, after=0, align=p.alignment)
            if widths and j < len(widths):
                cell.width = Inches(widths[j])
    doc.add_paragraph().paragraph_format.space_after = Pt(1)
    return table


def add_page_break(doc):
    doc.add_page_break()


def prepare_figures():
    FIG_DIR.mkdir(parents=True, exist_ok=True)
    image = Image.open(SOURCE_PAGE5)
    crops = {
        "figure1.png": (125, 245, 1630, 807),
        "figure2.png": (125, 913, 1630, 1228),
        "figure3.png": (125, 1277, 1630, 2107),
    }
    for name, box in crops.items():
        image.crop(box).save(FIG_DIR / name, optimize=True)


def configure_document(doc):
    section = doc.sections[0]
    section.page_width = Mm(210)
    section.page_height = Mm(297)
    section.top_margin = Mm(18)
    section.bottom_margin = Mm(16)
    section.left_margin = Mm(18)
    section.right_margin = Mm(18)
    for style_name in ("Normal", "List Bullet"):
        style = doc.styles[style_name]
        style.font.name = "Arial"
        style._element.rPr.rFonts.set(qn("w:eastAsia"), "Arial")
        style.font.size = Pt(10)


def build():
    prepare_figures()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = Document()
    configure_document(doc)

    add_text(doc, "TAKIM KAPTANI GERİ BİLDİRİM FORMU", size=14, bold=True, after=8)
    add_heading(doc, "Bölüm 1 - Takım Bilgileri", level=2)
    add_table(doc, [
        ["Alan", "Bilgi"],
        ["Ekip Adı", "SecureShare"],
        ["Takım Kaptanı", "Gamze Nur Aslan"],
        ["Ekip Üyeleri", "Gamze Nur Aslan, Büşra Özer, Hava Şener"],
        ["Proje Başlığı", "Şifreli Dosya Paylaşımı ve Erişim Kontrolü Uygulaması"],
    ], widths=[2.1, 4.9], font_size=9)

    add_heading(doc, "Bölüm 2 - Ekip İçi Çalışma Süreci", level=2)
    criteria1 = ["Ekip içi iletişim düzenliydi", "Görev dağılımı netti", "Tüm üyeler sürece aktif katıldı", "Toplantılar planlandığı şekilde yapıldı", "Zaman yönetimi yeterliydi", "Ekip içi anlaşmazlıklar uygun şekilde çözüldü"]
    add_table(doc, [["Kriter", "√", "X"]] + [[x, "■", "□"] for x in criteria1], widths=[5.8, .5, .5], font_size=8.5)
    add_heading(doc, "Bölüm 3 - Projenin İlerleme Durumu", level=2)
    criteria2 = ["Problem tanımı netleşti", "İş paketleri tanımlandı", "Sorumlular belirlendi", "Proje başlangıç çıktıları oluşturuldu"]
    add_table(doc, [["Kriter", "√", "X"]] + [[x, "■", "□"] for x in criteria2], widths=[5.8, .5, .5], font_size=8.5)

    add_text(doc, "T. C.\nFIRAT ÜNİVERSİTESİ\nMÜHENDİSLİK FAKÜLTESİ\nBİLGİSAYAR MÜHENDİSLİĞİ\nBİLGİSAYAR MÜHENDİSLİĞİ TASARIM DERSİ PROJESİ KAPSAMINDA\nTAKIM ÇALIŞMASI PROJESİ", size=10, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, after=7)
    add_heading(doc, "1. GİRİŞ", level=1)
    add_text(doc, "Günümüzde dosyaların internet ve farklı cihazlar üzerinden paylaşılması, bilgi güvenliği açısından önemli riskler oluşturmaktadır. Dosyaların yetkisiz kişiler tarafından görüntülenmesi, indirilmesi veya değiştirilmesi; kişisel bilgilerin ve kurumsal verilerin gizliliğini tehlikeye atabilmektedir. Bu nedenle dosya paylaşım sistemlerinde yalnızca dosya aktarımı değil, kullanıcı kimliğinin doğrulanması, erişim izinlerinin yönetilmesi ve yapılan işlemlerin kayıt altına alınması da önem taşımaktadır.")
    add_text(doc, "Bu ihtiyaçtan yola çıkılarak geliştirilen SecureShare, kullanıcıların dosyalarını güvenli biçimde yüklemesini, şifreleyerek saklamasını ve yalnızca yetkilendirilmiş kişilerle paylaşmasını sağlayan web ve mobil tabanlı bir uygulamadır. Sistem; kullanıcı kayıt ve giriş işlemleri, JWT tabanlı kimlik doğrulama, dosya bazlı yetkilendirme, şifreli depolama ve audit log kayıtlarını aynı yapı içerisinde birleştirmektedir.")
    add_text(doc, "SecureShare’de kullanıcılar kendi dosyalarını yönetebilir, belirli kişilere görüntüleme veya indirme izni verebilir ve daha önce verdikleri yetkileri kaldırabilir. Bu yapı sayesinde dosya paylaşım sürecinin daha güvenli, kontrollü ve izlenebilir hale getirilmesi amaçlanmaktadır. Proje, hassas dosyaların korunmasına yönelik temel güvenlik ihtiyaçlarını karşılayan geliştirilebilir ve ekip çalışmasına uygun bir altyapı sunmaktadır.")

    add_heading(doc, "1.1. Amaç ve Hedefler", level=2)
    add_text(doc, "SecureShare projesinin amacı, dosya paylaşım sürecini güvenlik ve erişim kontrolü merkezli bir yazılım mimarisiyle yönetmektir. Sistem, bir dosyanın yüklenmesinden saklanmasına, başka bir kullanıcıyla paylaşılmasından erişim yetkisinin kaldırılmasına kadar geçen tüm süreci kontrollü hâle getirecek şekilde tasarlanmıştır.")
    add_text(doc, "Bu amaç doğrultusunda aşağıdaki hedeflere ulaşılması planlanmaktadır:")
    for item in [
        "Kullanıcı kimliğini güvenilir biçimde doğrulayan ve oturumları güvenli şekilde yöneten bir yapı oluşturmak.",
        "Dosya içeriği ile dosya meta verilerini ayrı katmanlarda saklayarak veri güvenliğini artırmak.",
        "Şifreleme anahtarlarının dosya içeriğinden bağımsız yönetilmesini sağlayan DEK/KEK yapısını uygulamak.",
        "Dosya sahiplerine kullanıcı bazlı görüntüleme ve indirme izinleri verme, değiştirme ve kaldırma imkânı sunmak.",
        "Yetkisi olmayan kullanıcıların dosya içeriğine ve dosya anahtarlarına erişmesini engellemek.",
        "Kritik kullanıcı ve dosya işlemlerini audit log kayıtlarıyla izlenebilir hâle getirmek.",
        "Web ve mobil istemcilerin aynı REST API üzerinden tutarlı biçimde çalışmasını sağlamak.",
        "PostgreSQL ve MinIO bileşenlerini modüler, test edilebilir ve ileride geliştirilebilir bir yapıda kullanmak.",
        "Temel kayıt, giriş, dosya yükleme, paylaşma, yetki kaldırma ve indirme senaryolarını test ederek beklenen davranışları doğrulamak.",
    ]:
        add_bullet(doc, item)

    add_heading(doc, "2. YÖNTEM", level=1)
    add_text(doc, "SecureShare, uygulamalı yazılım geliştirme yöntemi kullanılarak ve aşamalı geliştirme yaklaşımı izlenerek hazırlanmıştır. İlk aşamada projenin amacı, hedef kullanıcıları ve temel kullanım senaryoları belirlenmiştir. Kullanıcıların kayıt olması, sisteme giriş yapması, dosya yüklemesi, dosyalarını paylaşması, erişim izinlerini değiştirmesi ve yapılan işlemleri takip edebilmesi temel işlevler olarak tanımlanmıştır. Ayrıca dosyaların yetkisiz kişiler tarafından görüntülenmesini önlemek için güvenlik gereksinimleri ayrı bir başlık altında incelenmiştir.")
    add_text(doc, "Gereksinim analizi tamamlandıktan sonra sistemin genel mimarisi oluşturulmuştur. Uygulama; istemci, REST API, veritabanı ve dosya depolama katmanlarından meydana gelecek şekilde tasarlanmıştır. Web istemcisi React, mobil istemci React Native ve Expo, backend katmanı ise Node.js ve Express kullanılarak geliştirilmiştir. İstemciler ile sunucu arasındaki iletişim REST API üzerinden sağlanmaktadır.")
    add_text(doc, "Veri yönetimi için PostgreSQL tercih edilmiştir. Kullanıcılar, dosyalar, dosya izinleri ve audit log kayıtları için ilişkisel veritabanı tabloları oluşturulmuştur. PostgreSQL yerel geliştirme ortamında Docker Compose ile çalıştırılmıştır. Dosya içeriklerinin nesne depolama alanında tutulması için MinIO kullanılmış, dosyaya ait ad, tür, boyut, sahiplik ve izin bilgileri PostgreSQL’de saklanmıştır. Bu ayrım, dosya içeriği ile dosya meta verilerinin birbirinden bağımsız yönetilmesini sağlamaktadır.")
    add_text(doc, "Güvenlik yönteminde birden fazla koruma katmanı uygulanmıştır. Kullanıcı parolalarının doğrudan saklanması yerine Argon2id ile hashlenmesi, oturum bilgilerinin JWT ile doğrulanması ve API isteklerinin yetkilendirme kontrolünden geçirilmesi planlanmıştır. Dosyalar depolama alanına gönderilmeden önce AES-128-GCM yöntemiyle şifrelenmiştir. İlk prototipte AES-128-GCM, yeterli güvenlik düzeyi ile düşük işlem maliyeti arasında denge sağladığı için tercih edilmiştir. Üretim ortamına geçilmesi durumunda AES-256-GCM kullanımı ayrıca değerlendirilecektir. Dosya şifreleme anahtarlarının korunması için DEK/KEK yaklaşımı kullanılmıştır.")
    add_text(doc, "Geliştirme süreci GitHub üzerindeki branch ve Pull Request yapısıyla yürütülmüştür. Görevler takım üyeleri arasında veritabanı ve mobil arayüz, backend ve PostgreSQL, şifreleme ve MinIO depolama şeklinde paylaştırılmıştır. Her modül ayrı olarak geliştirilmiş, daha sonra ana proje yapısına eklenmiştir.")
    add_text(doc, "Doğrulama aşamasında öncelikle backend’in çalışıp çalışmadığı /health endpoint’i ile kontrol edilmiştir. PostgreSQL bağlantısı ise /health/db endpoint’i üzerinden gerçek bir SELECT 1 sorgusu çalıştırılarak test edilmiştir. Mobil uygulamada kayıt, giriş, dashboard ve çıkış ekranları kontrol edilmiştir. Dosya şifreleme, yetkilendirme, dosya paylaşımı, yetki kaldırma ve audit log işlemleri temel kullanım senaryoları üzerinden test edilecektir. Proje bir yazılım prototipi olduğu için değerlendirme, istatistiksel deneyler yerine temel kullanım senaryolarının test edilmesiyle yapılmaktadır.")

    add_heading(doc, "2.1 Sistem Mimarisi ve Teknolojiler", level=2)
    add_table(doc, [
        ["KATMAN", "TEKNOLOJİ"],
        ["Backend", "Node.js, REST API"],
        ["Frontend", "React"],
        ["Veritabanı", "PostgreSQL (kullanıcı, dosya bilgisi, izin, kayıt)"],
        ["Nesne Depolama", "MinIO (S3 uyumlu; yalnızca şifreli dosyalar)"],
        ["Kimlik Doğrulama", "JWT"],
        ["Şifreleme", "AES-128-GCM, zarf şifreleme (DEK/KEK)"],
        ["Erişim Kaydı", "Veritabanı log tablosu + hash zinciri"],
        ["Mobil İstemci", "React Native + Expo"],
        ["Parola Güvenliği", "Argon2id"],
    ], widths=[2.2, 4.8], font_size=9)

    add_heading(doc, "3. PROJE YÖNETİMİ", level=1)
    add_heading(doc, "3.1. Takım Üyeleri Tanımı", level=2)
    add_table(doc, [
        ["Üye No", "Numara", "Adı Soyadı", "Görevi"],
        ["1", "230260092", "Gamze Nur Aslan", "Veritabanı ve Kimlik Doğrulama, Mobil Uygulama"],
        ["2", "250260119", "Büşra Özer", "Backend ve REST API, Erişim Kontrolü ve Dosya Paylaşımı, Web Uygulaması"],
        ["3", "230260153", "Hava Şener", "Dosya Şifreleme ve Güvenli Depolama, Sistem Entegrasyonu"],
    ], widths=[.6, 1.1, 1.8, 3.5], font_size=8.5)

    add_heading(doc, "3.2. Görev Dağılımı", level=2)
    add_table(doc, [
        ["İP No", "İş Paketinin Adı ve Hedefleri", "Görevlendirilen Takım Üyesi"],
        ["1", "Gereksinim analizi ve proje planı", "Gamze Nur Aslan"],
        ["2", "PostgreSQL şeması ve Docker kurulumu", "Gamze Nur Aslan"],
        ["3", "Node.js backend ve PostgreSQL bağlantısı", "Büşra Özer"],
        ["4", "AES-128-GCM ile DEK/KEK şifreleme", "Hava Şener"],
        ["5", "MinIO üzerinde şifreli dosya depolama", "Hava Şener"],
        ["6", "React Native giriş, kayıt ve dashboard ekranları", "Gamze Nur Aslan"],
        ["7", "Entegrasyon ve test", "Tüm Ekip"],
    ], widths=[.6, 4.6, 1.8], font_size=8.5)

    add_heading(doc, "4. TEORİ VE SONUÇLAR", level=1)
    add_text(doc, "SecureShare'in teknik altyapısı; istemci, REST API, ilişkisel veritabanı ve nesne depolama katmanlarından oluşan katmanlı bir mimariye dayanmaktadır. İlk aşamada PostgreSQL şeması hazırlanmış; users, files, file_permissions ve audit_logs tabloları tanımlanmış, Docker Compose ile yerel PostgreSQL servisi çalıştırılmıştır. Node.js ve Express tabanlı backend'in /health ve /health/db uçları kullanılarak hem sunucu hem de gerçek SELECT 1 sorgusuyla veritabanı bağlantısı doğrulanmıştır.")
    add_text(doc, "Güvenlik yaklaşımında kimlik doğrulama, yetkilendirme ve veri koruma birlikte ele alınmaktadır. Kullanıcı parolalarının Argon2id ile hashlenmesi, oturumların JWT ile yönetilmesi ve her dosya isteğinde kullanıcı izinlerinin kontrol edilmesi planlanmıştır. Dosyaların AES-128-GCM ile şifrelenmesi, dosya anahtarlarının DEK/KEK yaklaşımıyla korunması ve şifrelenmiş nesnelerin MinIO üzerinde saklanması hedeflenmiştir. Dosyanın adı, türü, boyutu, sahibi ve izinleri PostgreSQL'de tutulacak; yükleme, indirme, paylaşma ve yetki değişikliği gibi işlemler audit log'a yazılacaktır.")
    add_text(doc, "Mobil istemcide React Native ve Expo kullanılarak giriş, kayıt, dashboard ve çıkış ekranları hazırlanmıştır. Web ve mobil istemcilerin ortak REST API üzerinden çalışması, aynı iş kurallarının farklı platformlarda tutarlı biçimde uygulanmasını sağlamaktadır.")
    add_text(doc, "Büşra'nın backend ve PostgreSQL, Hava'nın ise şifreleme ve MinIO çalışmalarının entegrasyonundan sonra uçtan uca kayıt-giriş, dosya yükleme, paylaşma, yetki kaldırma ve indirme senaryoları test edilecektir. Testlerde yetkisiz erişim, hatalı kimlik bilgileri, uygun olmayan dosya türü ve veritabanı bağlantı hataları da kontrol edilecektir.")

    add_page_break(doc)
    add_heading(doc, "Şekiller ve Proje Bağlantısı", level=1)
    figures = [
        ("Şekil 1. PostgreSQL Docker konteynerinin ve veritabanı bağlantısının doğrulanması", "figure1.png"),
        ("Şekil 2. Backend kayıt ve JWT tabanlı giriş işlemlerinin test edilmesi", "figure2.png"),
        ("Şekil 3. SecureShare mobil giriş ve kayıt arayüzünün mevcut prototip görünümü", "figure3.png"),
    ]
    for caption, filename in figures:
        add_text(doc, caption, size=10, after=2)
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.add_run().add_picture(str(FIG_DIR / filename), width=Inches(6.55))
        set_paragraph(p, after=6, align=WD_ALIGN_PARAGRAPH.CENTER)
    add_heading(doc, "5. PROJE DOSYALARININ BULUNDUĞU LİNK (DRIVE, GITHUB VB.)", level=1)
    add_text(doc, "Github Linki: https://github.com/GamzeNurAslan/SecureShare", size=10)

    add_page_break(doc)
    add_heading(doc, "KAYNAKLAR", level=1)
    refs = [
        "Docker. (2026). Docker Compose Documentation. https://docs.docker.com/compose/",
        "PostgreSQL Global Development Group. (2026). PostgreSQL 16 Documentation. https://www.postgresql.org/docs/16/",
        "MinIO. (2026). MinIO AIStor Documentation. https://docs.min.io/aistor/",
        "OWASP Foundation. (2026). Authorization Cheat Sheet. https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html",
        "OWASP Foundation. (2026). Enforce Access Controls. https://devguide.owasp.org/en/04-design/02-web-app-checklist/07-access-controls/",
        "Sandhu, R. S., Coyne, E. J., Feinstein, H. L. ve Youman, C. E. (1996). Role-Based Access Control Models. IEEE Computer, 29(2), 38–47. https://csrc.nist.gov/csrc/media/projects/role-based-access-control/documents/sandhu96.pdf",
        "Dworkin, M. (2007). Recommendation for Block Cipher Modes of Operation: Galois/Counter Mode (GCM) and GMAC. NIST SP 800-38D. https://csrc.nist.gov/pubs/sp/800/38/d/final",
        "Jones, M., Bradley, J. ve Sakimura, N. (2015). JSON Web Token (JWT). RFC 7519. https://datatracker.ietf.org/doc/html/rfc7519",
        "Biryukov, A., Dinu, D., Khovratovich, D. ve Josefsson, S. (2021). Argon2 Memory-Hard Function for Password Hashing and Proof-of-Work Applications. RFC 9106. https://datatracker.ietf.org/doc/html/rfc9106",
        "Hu, V. C. ve diğerleri. (2014). Guide to Attribute Based Access Control (ABAC) Definition and Considerations. NIST SP 800-162. https://csrc.nist.gov/pubs/sp/800/162/upd2/final",
    ]
    for ref in refs:
        add_bullet(doc, ref)

    doc.core_properties.title = "Hafta2 Proje Raporu SecureShare"
    doc.core_properties.subject = "Düzenlenebilir SecureShare proje raporu"
    doc.core_properties.author = "SecureShare"
    doc.save(OUTPUT)
    print(OUTPUT)


if __name__ == "__main__":
    build()
