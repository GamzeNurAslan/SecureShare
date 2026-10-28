# 7. Hafta Görev ve Test Planı

## Hafta Amacı

Bu hafta dosya paylaşım izinlerinin süreli olarak yönetilmesi, indirme işlemlerinin istemcilere eklenmesi ve kritik işlemlerin audit log kayıtlarıyla izlenmesi hedeflenmektedir.

> Not: 6. hafta mobil ve web istemci–API bağlantıları tamamlanmadan bu haftaya geçilmemelidir.

## Gamze’nin Görevleri — Mobil Uygulama

- [ ] Mobil dosya detay ekranı hazırlanacak.
- [ ] Kullanıcının sahip olduğu veya kendisiyle paylaşılan dosyaları ayırt edebilmesi sağlanacak.
- [ ] Yetkili kullanıcı için dosya indirme işlemi eklenecek.
- [ ] İndirme sırasında yükleniyor, başarılı ve hata durumları gösterilecek.
- [ ] Dosya erişim izni kaldırıldığında veya süresi dolduğunda kullanıcıya anlaşılır mesaj gösterilecek.
- [ ] Mobil uygulamada oturum süresi dolduğunda giriş ekranına güvenli yönlendirme yapılacak.
- [ ] Mobil indirme ve erişim senaryolarının ekran görüntüleri alınacak.

### Mobil — Gamze

- [ ] Dosya detay ekranı
- [ ] Dosya indirme butonu
- [ ] Dosya sahibi ve dosya türü/boyutu bilgisini gösterme
- [ ] Erişim izni kaldırılmış veya süresi dolmuş dosya için hata ekranı

## Büşra’nın Görevleri — Backend ve Web Uygulaması

- [ ] Dosya paylaşım izni verilirken son geçerlilik tarihi seçilebilmesi sağlanacak.
- [ ] Süresi geçmiş izinler dosya listeleme ve indirme işlemlerinde geçersiz kabul edilecek.
- [ ] Dosya izinlerini görüntüleme endpoint’i tamamlanacak.
- [ ] Dosya sahibinin verdiği izinleri güncelleyebilmesi veya kaldırabilmesi sağlanacak.
- [ ] Dosya silme endpoint’i eklenecek.
- [ ] Dosya silindiğinde PostgreSQL metadata kaydı ve MinIO nesnesi birlikte kaldırılacak.
- [ ] Web arayüzüne dosya indirme, izin süresi görüntüleme ve izin kaldırma kontrolleri eklenecek.
- [ ] Dosya sahibi dışındaki kullanıcıların dosyayı silmesi engellenecek.

### Web — Büşra

- [ ] Dosya detay ekranı
- [ ] Dosya indirme butonu
- [ ] Dosya paylaşma penceresi
- [ ] Kullanıcı seçme alanı
- [ ] Okuma/indirme izni verme alanı
- [ ] Yetki süresi seçme alanı
- [ ] Verilmiş izinleri listeleme ve kaldırma alanı

## Hava’nın Görevleri — Audit Log ve Güvenlik Testleri

- [ ] Dosya yükleme, indirme, paylaşma, yetki kaldırma ve silme işlemleri `audit_logs` tablosuna kaydedilecek.
- [ ] Başarısız veya yetkisiz dosya erişim denemeleri audit log’a kaydedilecek.
- [ ] Audit log kayıtlarında parola, JWT, KEK, DEK veya dosya içeriği tutulmadığı kontrol edilecek.
- [ ] Dosya silme işleminde MinIO nesnesinin gerçekten silindiği test edilecek.
- [ ] Süresi dolmuş izinle yapılan indirme isteğinin reddedildiği test edilecek.
- [ ] Silinmiş dosyaya erişim denemesinin reddedildiği test edilecek.
- [ ] Audit log kayıtlarının doğru kullanıcı, dosya, işlem türü ve zaman bilgisi içerdiği doğrulanacak.

## Genel Kabul Kriterleri

- [ ] Dosya sahibi kayıtlı kullanıcıya süreli erişim izni verebilir.
- [ ] İzin süresi geçtikten sonra dosya listeleme ve indirme engellenir.
- [ ] Dosya sahibi verdiği izni kaldırabilir.
- [ ] Yetkili kullanıcı dosyayı web veya mobil uygulamadan indirebilir.
- [ ] Yetkisi kaldırılan kullanıcı dosyaya tekrar erişemez.
- [ ] Dosya yalnızca sahibi tarafından silinebilir.
- [ ] Dosya silindiğinde MinIO’daki şifreli nesne de kaldırılır.
- [ ] Kritik dosya işlemleri audit log’da görünür.
- [ ] Audit log’da gizli bilgi veya dosya içeriği bulunmaz.

## Hafta Sonu Çıktıları

- [ ] Süreli dosya paylaşım ve yetki kaldırma akışı.
- [ ] Web ve mobil uygulamada dosya indirme desteği.
- [ ] Dosya silme işlemi.
- [ ] Audit log kayıtlarının oluşturulması.
- [ ] Yetki süresi, silme ve audit log test ekran görüntüleri.
- [ ] 7. hafta rapor notları.