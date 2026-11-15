from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.shared import Pt


PATH = Path(r"C:\Users\Lenovo\OneDrive\Belgeler\ChatGPT\SecureShare\docs\Hafta1_Proje_Raporu_Doldurulmus.docx")
doc = Document(str(PATH))


def font_run(run, size=9, bold=False):
    run.font.name = "Arial"
    rpr = run._element.get_or_add_rPr()
    rpr.rFonts.set(qn("w:ascii"), "Arial")
    rpr.rFonts.set(qn("w:hAnsi"), "Arial")
    run.font.size = Pt(size)
    run.bold = bold


def replace_para(paragraph, text, size=9, bold=False):
    for run in list(paragraph.runs):
        paragraph._p.remove(run._r)
    run = paragraph.add_run(text)
    font_run(run, size=size, bold=bold)


def replace_cell(cell, text, size=8.8):
    first = cell.paragraphs[0]
    for run in list(first.runs):
        first._p.remove(run._r)
    first.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    first.paragraph_format.line_spacing = 1.05
    first.paragraph_format.space_after = Pt(0)
    # Use explicit line breaks so the section remains readable without changing
    # the template's table structure.
    parts = text.split("\n")
    for index, part in enumerate(parts):
        run = first.add_run(part)
        font_run(run, size=size)
        if index < len(parts) - 1:
            run.add_break()
            run.add_break()
    for paragraph in list(cell.paragraphs[1:]):
        paragraph._element.getparent().remove(paragraph._element)


replace_cell(
    doc.tables[3].cell(0, 0),
    "SecureShare, kullanıcıların dosyalarını güvenli biçimde yüklemesini, şifreli olarak saklamasını ve yalnızca yetkilendirilmiş kişilerle paylaşmasını sağlayan web ve mobil tabanlı bir dosya paylaşım ve erişim kontrol sistemidir. Proje; kullanıcı hesaplarının korunması, dosyaların depolanmadan önce şifrelenmesi, dosya bazlı izinlerin yönetilmesi ve kritik işlemlerin kayıt altına alınması ihtiyaçlarına cevap vermek üzere tasarlanmıştır.\n\nSistem, kullanıcıların kendi dosyalarını yönetmesine ve kendileriyle paylaşılan dosyalara sahip oldukları izinler kapsamında erişmesine olanak tanır. Böylece dosya paylaşımı yalnızca gönderme işleminden ibaret kalmaz; kimlik doğrulama, yetkilendirme, veri gizliliği ve işlem izlenebilirliği birlikte sağlanır.",
    size=8.8,
)
replace_para(
    doc.paragraphs[21],
    "Projenin amacı ve hedefleri; güvenli dosya paylaşımını, erişim kontrolünü ve işlem izlenebilirliğini birlikte sağlamaktır.",
    size=9,
)
replace_cell(
    doc.tables[4].cell(0, 0),
    "Projenin temel amacı, kullanıcıların dosyalarını güvenli ve kontrollü bir ortamda yönetebilmesidir. Kullanıcılar sisteme kayıt olup giriş yaptıktan sonra dosya yükleyebilmeli, dosyalarının temel bilgilerini görüntüleyebilmeli ve dosyaları belirli kişilerle paylaşabilmelidir. Dosya sahibi, verdiği görüntüleme veya indirme izinlerini daha sonra değiştirebilmeli ya da kaldırabilmelidir.\n\nBu amaç doğrultusunda parolaların güvenli biçimde saklanması, oturumların JWT ile korunması, dosyaların AES-128-GCM ile şifrelenmesi ve şifreleme anahtarlarının DEK/KEK yaklaşımıyla yönetilmesi hedeflenmiştir. Ayrıca kayıt, giriş, yükleme, indirme, paylaşma ve başarısız erişim gibi işlemlerin audit log kayıtlarına yazılması amaçlanmıştır. Projenin sonunda kullanıcı verilerinin gizliliğini koruyan, web ve mobil istemcilerden erişilebilen, geliştirilebilir bir dosya paylaşım altyapısı elde edilmesi beklenmektedir.",
    size=8.8,
)
replace_para(
    doc.paragraphs[27],
    "Projede katmanlı mimari, görev paylaşımı ve iteratif geliştirme yöntemi birlikte kullanılmıştır.",
    size=9,
)
replace_cell(
    doc.tables[5].cell(0, 0),
    "Sistem mimarisinde istemci, API, veritabanı ve nesne depolama katmanları birbirinden ayrılmıştır. React web istemcisi ile React Native + Expo mobil istemcisi, Node.js tabanlı REST API üzerinden haberleşir. API katmanı kullanıcı doğrulama, dosya işlemleri ve erişim izinleri için merkezi kontrol noktası olarak çalışır. PostgreSQL; kullanıcı, dosya, izin ve audit log bilgilerini tutar. Şifrelenmiş dosyalar ise MinIO nesne depolama alanında saklanır. Yerel geliştirme ortamında PostgreSQL Docker Compose ile çalıştırılmıştır.\n\nGüvenlik için parolalarda Argon2id, oturum yönetiminde JWT, dosya içeriğinde AES-128-GCM ve anahtar yönetiminde DEK/KEK yaklaşımı esas alınmıştır. Dosya yükleme sürecinde dosya önce şifrelenir, ardından şifreli içerik MinIO’ya gönderilir; dosya meta verileri ve izinleri PostgreSQL’de tutulur. Dosya indirme sırasında kullanıcının JWT bilgisi ve dosya bazlı yetkisi kontrol edilir.\n\nGeliştirme süreci GitHub üzerinde branch ve Pull Request akışıyla yürütülmüştür. Gamze veritabanı, mobil arayüz, dokümantasyon ve koordinasyonu; Büşra backend ve PostgreSQL bağlantısını; Hava ise şifreleme ve MinIO depolama çalışmalarını üstlenmiştir. Her aşama ilgili test uçları ve yerel çalışma ortamı üzerinden doğrulanmıştır.",
    size=8.5,
)

doc.save(str(PATH))
print(PATH)
