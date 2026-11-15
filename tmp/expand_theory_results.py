from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.shared import Pt


path = Path(r"C:\Users\Lenovo\OneDrive\Belgeler\ChatGPT\SecureShare\docs\Hafta1_Proje_Raporu_Tamamlanmis.docx")
doc = Document(str(path))
cell = doc.tables[8].cell(0, 0)

paragraphs = [
    "SecureShare'in teknik altyapısı; istemci, REST API, ilişkisel veritabanı ve nesne depolama katmanlarından oluşan katmanlı bir mimariye dayanmaktadır. İlk aşamada PostgreSQL şeması hazırlanmış; users, files, file_permissions ve audit_logs tabloları tanımlanmış, Docker Compose ile yerel PostgreSQL servisi çalıştırılmıştır. Node.js ve Express tabanlı backend'in /health ve /health/db uçları kullanılarak hem sunucu hem de gerçek SELECT 1 sorgusuyla veritabanı bağlantısı doğrulanmıştır.",
    "Güvenlik yaklaşımında kimlik doğrulama, yetkilendirme ve veri koruma birlikte ele alınmaktadır. Kullanıcı parolalarının Argon2id ile hashlenmesi, oturumların JWT ile yönetilmesi ve her dosya isteğinde kullanıcı izinlerinin kontrol edilmesi planlanmıştır. Dosyaların AES-128-GCM ile şifrelenmesi, dosya anahtarlarının DEK/KEK yaklaşımıyla korunması ve şifrelenmiş nesnelerin MinIO üzerinde saklanması hedeflenmiştir. Dosyanın adı, türü, boyutu, sahibi ve izinleri PostgreSQL'de tutulacak; yükleme, indirme, paylaşma ve yetki değişikliği gibi işlemler audit log'a yazılacaktır.",
    "Mobil istemcide React Native ve Expo kullanılarak giriş, kayıt, dashboard ve çıkış ekranları hazırlanmıştır. Web ve mobil istemcilerin ortak REST API üzerinden çalışması, böylece aynı iş kurallarının farklı platformlarda tutarlı biçimde uygulanması amaçlanmaktadır. Bu yapı, istemci katmanlarının birbirinden bağımsız geliştirilebilmesine ve ileride yeni bir istemcinin sisteme eklenebilmesine olanak sağlamaktadır.",
    "Büşra'nın backend ve PostgreSQL, Hava'nın ise şifreleme ve MinIO çalışmalarının entegrasyonundan sonra uçtan uca kayıt-giriş, dosya yükleme, paylaşma, yetki kaldırma ve indirme senaryoları test edilecektir. Testlerde yetkisiz erişim, hatalı kimlik bilgileri, uygun olmayan dosya türü ve veritabanı bağlantı hataları da kontrol edilecektir. Elde edilen sonuçlara göre sistemin temel kabul kriterlerini karşılayıp karşılamadığı değerlendirilecek ve eksik görülen noktalar sonraki geliştirme aşamasında düzeltilecektir.",
]

first = cell.paragraphs[0]
for run in list(first.runs):
    first._p.remove(run._r)
for extra in list(cell.paragraphs[1:]):
    extra._element.getparent().remove(extra._element)

for index, text in enumerate(paragraphs):
    paragraph = first if index == 0 else cell.add_paragraph()
    paragraph.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    paragraph.paragraph_format.line_spacing = 1.0
    paragraph.paragraph_format.space_after = Pt(3)
    run = paragraph.add_run(text)
    run.font.name = "Arial"
    run._element.get_or_add_rPr().rFonts.set(qn("w:ascii"), "Arial")
    run._element.get_or_add_rPr().rFonts.set(qn("w:hAnsi"), "Arial")
    run.font.size = Pt(8.5)

doc.save(str(path))
print(path)
