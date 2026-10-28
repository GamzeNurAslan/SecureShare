# 5. Hafta Görev ve Test Planı

## Hafta Amacı

Dosya sahiplerinin kayıtlı kullanıcılarla dosya paylaşabilmesini, verilen izinleri kaldırabilmesini, süreli izin tanımlayabilmesini ve bu işlemlerin audit log kayıtlarına yazılmasını sağlamak.

## Teknik Kararlar

- Dosya sahibi, dosya üzerindeki tüm işlemleri yapabilir.
- İlk sürümde dosya paylaşma ve izin kaldırma işlemini yalnızca dosya sahibi yapabilir.
- `READ` izni, kullanıcının kendisiyle paylaşılmış dosyanın bilgilerini listeleyebilmesini sağlar.
- `DOWNLOAD` izni, kullanıcının şifresi çözülmüş dosyayı indirebilmesini sağlar.
- İzin süresi boş bırakılırsa izin süresiz kabul edilir.
- İzin süresi dolduğunda sistem erişimi otomatik olarak reddeder.
- Yetkisiz veya bulunamayan dosya erişimlerinde aynı 404 yanıtı döndürülür.
- JWT, parola, şifreleme anahtarı ve dosya içeriği audit log’a yazılmaz.

## Büşra’nın Görevleri

- [ ] `backend/routes/files.js` içinde ortak JWT middleware’i kullanılacak.
- [ ] `POST /api/files/:id/permissions` paylaşım endpoint’i eklenecek.
- [ ] Paylaşım yapılacak kullanıcının e-posta adresiyle sistemde kayıtlı olup olmadığı kontrol edilecek.
- [ ] `can_read`, `can_download` ve `expires_at` bilgileri `file_permissions` tablosuna yazılacak.
- [ ] Aynı kullanıcıya tekrar izin verildiğinde mevcut izin kaydı güncellenecek.
- [ ] `GET /api/files/:id/permissions` endpoint’i ile dosya sahibinin verdiği izinler listelenecek.
- [ ] `DELETE /api/files/:id/permissions/:userId` endpoint’i ile izin kaldırılacak.
- [ ] Geçmiş veya geçersiz tarih içeren izin istekleri reddedilecek.

## Hava’nın Görevleri

- [ ] `audit_logs` tablosuna kayıt ekleyen ortak bir audit log modülü hazırlanacak.
- [ ] Dosya paylaşımı işlemi `FILE_SHARED` olarak loglanacak.
- [ ] İzin kaldırma işlemi `FILE_PERMISSION_REVOKED` olarak loglanacak.
- [ ] Başarılı dosya indirme işlemi `FILE_DOWNLOADED` olarak loglanacak.
- [ ] Yetkisiz veya süresi dolmuş izinle yapılan erişimler `FILE_ACCESS_DENIED` olarak loglanacak.
- [ ] Log kayıtlarında işlem yapan kullanıcı, ilgili dosya, işlem türü, sonuç ve gerekli sınırlı detaylar tutulacak.
- [ ] Audit log hash zinciri için `previous_hash` ve `entry_hash` alanlarının üretim yöntemi belirlenecek ve test edilecek.

## Gamze’nin Görevleri

- [ ] Dosya sahibi ile ikinci test kullanıcısı oluşturulacak.
- [ ] Dosya sahibinin ikinci kullanıcıya `READ` izni vermesi test edilecek.
- [ ] `READ` izni olan kullanıcının dosyayı listede görebildiği doğrulanacak.
- [ ] `DOWNLOAD` izni olmayan kullanıcının dosyayı indirmesinin reddedildiği test edilecek.
- [ ] `DOWNLOAD` izni verildiğinde dosyanın başarıyla indirildiği test edilecek.
- [ ] İzin kaldırıldıktan sonra kullanıcının dosyaya tekrar erişemediği doğrulanacak.
- [ ] Süresi geçmiş izinle erişimin reddedildiği test edilecek.
- [ ] PostgreSQL üzerindeki `file_permissions` ve `audit_logs` kayıtları kontrol edilecek.
- [ ] Test ekran görüntüleri ve 5. hafta rapor notları hazırlanacak.

## Genel Kabul Kriterleri

- [ ] Dosya sahibi, kayıtlı bir kullanıcıya dosya izni verebiliyor.
- [ ] Paylaşılan kullanıcı yalnızca kendisine verilen izin kapsamındaki işlemleri yapabiliyor.
- [ ] İzin süresi dolduğunda erişim otomatik engelleniyor.
- [ ] İzin kaldırıldığında kullanıcı dosyaya tekrar erişemiyor.
- [ ] Paylaşma, indirme, izin kaldırma ve reddedilen erişim işlemleri audit log’a yazılıyor.
- [ ] Audit log kayıtlarında parola, JWT veya şifreleme anahtarı bulunmuyor.
- [ ] Paylaşım ve yetkilendirme testleri başarıyla tamamlanıyor.

## Kapsam Dışı

- Mobil dosya paylaşım ekranları
- Web dosya paylaşım ekranları
- Harici bağlantı ile dosya paylaşımı
- Yönetici paneli
- `SHARE` ve `DELETE` izinlerinin başka kullanıcılara devredilmesi