# 8. Hafta Görev ve Test Planı

## Hafta Amacı

Bu hafta audit log kayıtlarının güvenilir hâle getirilmesi, hata durumlarında sistemin tutarlı davranması ve dosya işlemlerinin izlenebilirliğinin artırılması hedeflenmektedir.

## Büşra’nın Görevleri

- [x] Audit log kayıtlarında `previous_hash` ve `entry_hash` alanlarını kullanacak hash zinciri yapısını oluşturmak.
- [x] Her yeni audit kaydını önceki kayda bağlamak.
- [x] Dosya sahibi için kendi dosyalarına ait işlem geçmişini görüntüleme endpoint’i eklemek.
- [x] Veritabanı veya MinIO bağlantı hatalarında anlaşılır ve güvenli API hata cevapları döndürmek.
- [x] Dosya yükleme sırasında hata oluşursa yarım kalan MinIO nesnesi veya metadata kaydını temizlemek.

### Web — Büşra

- [ ] Dosya işlem geçmişi/audit log ekranı
- [x] Dosya silme onay penceresi
- [x] Bağlantı hatası ve sunucu hatası ekranları

## Hava’nın Görevleri

- [ ] Audit log kaydı değiştirilirse hash zincirinin bozulduğunu gösteren doğrulama fonksiyonu hazırlamak.
- [ ] MinIO erişilemez durumdayken dosya yükleme işlemini test etmek.
- [ ] Veritabanı bağlantısı kesildiğinde sistemin hata cevabını test etmek.
- [ ] Yarım kalan yükleme işlemlerinden sonra MinIO ve PostgreSQL’de gereksiz kayıt kalmadığını kontrol etmek.
- [ ] Hash zinciri ve hata senaryoları için otomatik testler eklemek.

## Gamze’nin Görevleri

- [x] Mobil uygulamada dosya detayına işlem geçmişi/audit kayıtları alanı eklemek.
- [x] Boş işlem geçmişi, bağlantı hatası ve erişim hatası ekranlarını hazırlamak.
- [ ] Audit log ve hata senaryolarının test ekran görüntülerini almak.
- [x] Hafta raporu için yapılan güvenlik kontrollerini not etmek.

### Mobil — Gamze

- [x] Dosya işlem geçmişi görünümü
- [x] Boş durum, bağlantı hatası ve erişim reddedildi ekranları
- [x] Oturum süresi dolduğunda giriş ekranına yönlendirme

### Gamze’nin Hafta Raporu Notları

- Mobil dosya kartları detay ekranına bağlandı; işlem geçmişi `/api/files/:id/audit-logs` endpoint’inden alınarak gösteriliyor.
- Boş işlem geçmişi, bağlantı kurulamadı, sunucu hatası ve erişim reddedildi durumları için ayrı ekranlar eklendi.
- API `401` döndürdüğünde güvenli oturum bilgisi siliniyor ve kullanıcı giriş ekranına yönlendiriliyor.
- `npx tsc --noEmit`, Expo web bundle kontrolü ve backend testleri çalıştırıldı; backend test sonucu 31/31 başarılı.

## Genel Kabul Kriterleri

- [ ] Dosya işlemleri audit log’a kaydedilir.
- [ ] Audit kaydı değiştirildiğinde hash zinciri doğrulaması başarısız olur.
- [x] MinIO veya PostgreSQL hatasında sistem kontrollü hata döndürür.
- [x] Başarısız yükleme sonrasında gereksiz MinIO nesnesi kalmaz.
- [x] Dosya sahibi yalnızca kendi dosyalarının işlem geçmişini görüntüleyebilir.

## Hafta Sonu Çıktıları

- [x] Hash zincirli audit log yapısı.
- [x] İşlem geçmişi endpoint’i ve mobil görünümü.
- [x] Hata temizleme mekanizması.
- [x] Audit log ve hata test sonuçları.
