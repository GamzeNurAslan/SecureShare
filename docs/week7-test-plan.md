# 7. Hafta Görev ve Test Planı

## Hafta Amacı

Bu hafta dosya paylaşım izinlerinin süreli olarak yönetilmesi, indirme işlemlerinin istemcilere eklenmesi ve kritik işlemlerin audit log kayıtlarıyla izlenmesi hedeflenmektedir.

> Not: 6. hafta mobil ve web istemci–API bağlantıları tamamlanmadan bu haftaya geçilmemelidir.

## Gamze’nin Görevleri — Mobil Uygulama

- [x] Mobil dosya detay ekranı hazırlanacak.
- [x] Kullanıcının sahip olduğu veya kendisiyle paylaşılan dosyaları ayırt edebilmesi sağlanacak.
- [x] Yetkili kullanıcı için dosya indirme işlemi eklenecek.
- [x] İndirme sırasında yükleniyor, başarılı ve hata durumları gösterilecek.
- [x] Dosya erişim izni kaldırıldığında veya süresi dolduğunda kullanıcıya anlaşılır mesaj gösterilecek.
- [x] Mobil uygulamada oturum süresi dolduğunda giriş ekranına güvenli yönlendirme yapılacak.
- [x] Mobil indirme ve erişim senaryolarının ekran görüntüleri alınacak.

### Mobil — Gamze

- [x] Dosya detay ekranı
- [x] Dosya indirme butonu
- [x] Dosya sahibi ve dosya türü/boyutu bilgisini gösterme
- [x] Erişim izni kaldırılmış veya süresi dolmuş dosya için hata ekranı

## Büşra’nın Görevleri — Backend ve Web Uygulaması

- [x] Dosya paylaşım izni verilirken son geçerlilik tarihi seçilebilmesi sağlanacak.
- [x] Süresi geçmiş izinler dosya listeleme ve indirme işlemlerinde geçersiz kabul edilecek.
- [x] Dosya izinlerini görüntüleme endpoint’i tamamlanacak.
- [x] Dosya sahibinin verdiği izinleri güncelleyebilmesi veya kaldırabilmesi sağlanacak.
- [x] Dosya silme endpoint’i eklenecek.
- [x] Dosya silindiğinde PostgreSQL metadata kaydı ve MinIO nesnesi birlikte kaldırılacak.
- [x] Web arayüzüne dosya indirme, izin süresi görüntüleme ve izin kaldırma kontrolleri eklenecek.
- [x] Dosya sahibi dışındaki kullanıcıların dosyayı silmesi engellenecek.

### Web — Büşra

- [x] Dosya detay ekranı
- [x] Dosya indirme butonu
- [x] Dosya paylaşma penceresi
- [x] Kullanıcı seçme alanı
- [x] Okuma/indirme izni verme alanı
- [x] Yetki süresi seçme alanı
- [x] Verilmiş izinleri listeleme ve kaldırma alanı

## Hava’nın Görevleri — Audit Log ve Güvenlik Testleri

- [ ] Dosya yükleme, indirme, paylaşma, yetki kaldırma ve silme işlemleri `audit_logs` tablosuna kaydedilecek.
- [ ] Başarısız veya yetkisiz dosya erişim denemeleri audit log’a kaydedilecek.
- [ ] Audit log kayıtlarında parola, JWT, KEK, DEK veya dosya içeriği tutulmadığı kontrol edilecek.
- [ ] Dosya silme işleminde MinIO nesnesinin gerçekten silindiği test edilecek.
- [ ] Süresi dolmuş izinle yapılan indirme isteğinin reddedildiği test edilecek.
- [ ] Silinmiş dosyaya erişim denemesinin reddedildiği test edilecek.
- [ ] Audit log kayıtlarının doğru kullanıcı, dosya, işlem türü ve zaman bilgisi içerdiği doğrulanacak.

## Genel Kabul Kriterleri

- [x] Dosya sahibi kayıtlı kullanıcıya süreli erişim izni verebilir.
- [x] İzin süresi geçtikten sonra dosya listeleme ve indirme engellenir.
- [x] Dosya sahibi verdiği izni kaldırabilir.
- [x] Yetkili kullanıcı dosyayı web veya mobil uygulamadan indirebilir.
- [x] Yetkisi kaldırılan kullanıcı dosyaya tekrar erişemez.
- [x] Dosya yalnızca sahibi tarafından silinebilir.
- [x] Dosya silindiğinde MinIO’daki şifreli nesne de kaldırılır.
- [ ] Kritik dosya işlemleri audit log’da görünür.
- [ ] Audit log’da gizli bilgi veya dosya içeriği bulunmaz.

## Hafta Sonu Çıktıları

- [x] Süreli dosya paylaşım ve yetki kaldırma akışı.
- [x] Web ve mobil uygulamada dosya indirme desteği.
- [x] Dosya silme işlemi.
- [ ] Audit log kayıtlarının oluşturulması.
- [ ] Yetki süresi, silme ve audit log test ekran görüntüleri.
- [ ] 7. hafta rapor notları.
