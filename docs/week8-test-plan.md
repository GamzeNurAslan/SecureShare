# 8. Hafta Görev ve Test Planı

## Hafta Amacı

Bu hafta audit log kayıtlarının güvenilir hâle getirilmesi, hata durumlarında sistemin tutarlı davranması ve dosya işlemlerinin izlenebilirliğinin artırılması hedeflenmektedir.

## Büşra’nın Görevleri

- [ ] Audit log kayıtlarında `previous_hash` ve `entry_hash` alanlarını kullanacak hash zinciri yapısını oluşturmak.
- [ ] Her yeni audit kaydını önceki kayda bağlamak.
- [ ] Dosya sahibi için kendi dosyalarına ait işlem geçmişini görüntüleme endpoint’i eklemek.
- [ ] Veritabanı veya MinIO bağlantı hatalarında anlaşılır ve güvenli API hata cevapları döndürmek.
- [ ] Dosya yükleme sırasında hata oluşursa yarım kalan MinIO nesnesi veya metadata kaydını temizlemek.

### Web — Büşra

- [ ] Dosya işlem geçmişi/audit log ekranı
- [ ] Dosya silme onay penceresi
- [ ] Bağlantı hatası ve sunucu hatası ekranları

## Hava’nın Görevleri

- [ ] Audit log kaydı değiştirilirse hash zincirinin bozulduğunu gösteren doğrulama fonksiyonu hazırlamak.
- [ ] MinIO erişilemez durumdayken dosya yükleme işlemini test etmek.
- [ ] Veritabanı bağlantısı kesildiğinde sistemin hata cevabını test etmek.
- [ ] Yarım kalan yükleme işlemlerinden sonra MinIO ve PostgreSQL’de gereksiz kayıt kalmadığını kontrol etmek.
- [ ] Hash zinciri ve hata senaryoları için otomatik testler eklemek.

## Gamze’nin Görevleri

- [ ] Mobil uygulamada dosya detayına işlem geçmişi/audit kayıtları alanı eklemek.
- [ ] Boş işlem geçmişi, bağlantı hatası ve erişim hatası ekranlarını hazırlamak.
- [ ] Audit log ve hata senaryolarının test ekran görüntülerini almak.
- [ ] Hafta raporu için yapılan güvenlik kontrollerini not etmek.

### Mobil — Gamze

- [ ] Dosya işlem geçmişi görünümü
- [ ] Boş durum, bağlantı hatası ve erişim reddedildi ekranları
- [ ] Oturum süresi dolduğunda giriş ekranına yönlendirme

## Genel Kabul Kriterleri

- [ ] Dosya işlemleri audit log’a kaydedilir.
- [ ] Audit kaydı değiştirildiğinde hash zinciri doğrulaması başarısız olur.
- [ ] MinIO veya PostgreSQL hatasında sistem kontrollü hata döndürür.
- [ ] Başarısız yükleme sonrasında gereksiz MinIO nesnesi kalmaz.
- [ ] Dosya sahibi yalnızca kendi dosyalarının işlem geçmişini görüntüleyebilir.

## Hafta Sonu Çıktıları

- [ ] Hash zincirli audit log yapısı.
- [ ] İşlem geçmişi endpoint’i ve mobil görünümü.
- [ ] Hata temizleme mekanizması.
- [ ] Audit log ve hata test sonuçları.