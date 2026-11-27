# 11. Hafta Görev ve Test Planı

## Hafta Amacı

Bu hafta proje teslimi öncesinde tüm modüllerin son kez test edilmesi, raporun tamamlanması ve proje sunumunun hazırlanması hedeflenmektedir.

## Büşra’nın Görevleri

- [ ] Backend, web uygulaması ve API endpoint’lerini son kez kontrol etmek.
- [ ] Açık kalan hata veya eksikleri düzeltmek.
- [ ] Kod tekrarlarını ve kullanılmayan dosyaları temizlemek.
- [ ] README dosyasındaki endpoint, kurulum ve teknoloji bilgilerini son hâline getirmek.

## Hava’nın Görevleri

- [ ] Şifreleme, MinIO, audit log ve erişim kontrolü testlerini son kez çalıştırmak.
- [ ] Tüm backend testlerinin başarılı olduğunu doğrulamak.
- [ ] Güvenlik açısından parola, JWT, KEK, DEK ve `.env` bilgilerinin repoda bulunmadığını kontrol etmek.
- [ ] Final test sonuçlarını kısa bir teknik değerlendirme notuna dönüştürmek.

## Gamze’nin Görevleri

- [x] Web ve mobil uygulamanın uçtan uca kullanıcı senaryosunu test etmek. Kanıt: [week11-e2e-test-result.md](week11-e2e-test-result.md)
- [x] Final raporunu düzenlemek. Çıktı: [final-rapor.md](final-rapor.md)
- [x] Mimari, görev dağılımı, test sonuçları ve ekran görüntülerini rapora eklemek. Çıktı: [final-rapor.md](final-rapor.md)
- [x] Sunum slaytlarını hazırlamak. Çıktı: [final-sunum.md](final-sunum.md)
- [x] Demo sırasında izlenecek kayıt → giriş → yükleme → paylaşma → indirme senaryosunu hazırlamak. Çıktı: [final-demo-senaryosu.md](final-demo-senaryosu.md)

## Genel Kabul Kriterleri

- [x] Kullanıcı kayıt olabilir ve giriş yapabilir. Uçtan uca testte doğrulandı.
- [x] JWT ile korunan işlemler çalışır. Yetkili istekler ve sahip olmayan kullanıcının geçmiş erişimi doğrulandı.
- [x] Dosya şifreli olarak MinIO’ya kaydedilir. Backend şifreleme ve MinIO entegrasyon testleri başarılıdır.
- [x] Dosya metadata bilgileri PostgreSQL’de bulunur. Uçtan uca yükleme ve silme akışında doğrulandı.
- [x] Yetkili kullanıcı dosyayı indirebilir. İndirilen içerik kaynak içerikle eşleşti.
- [x] Yetki kaldırıldığında erişim engellenir. Önceki hafta izin kaldırma testiyle doğrulandı.
- [x] Kritik işlemler audit log’a yazılır. `FILE_UPLOADED`, `FILE_SHARED` ve `FILE_DOWNLOADED` görüldü.
- [ ] Otomatik testler başarılıdır. 94 testten 93’ü başarılı; birim testte Pool bağımlılığı nedeniyle 1 açık bulunmaktadır.
- [x] Rapor, README ve sunum günceldir. Final çıktıları bu hafta eklendi.

## Hafta Sonu Çıktıları

- [x] Teslime hazır SecureShare uygulaması için çalıştırma ve test akışı.
- [x] Final teknik raporu: [final-rapor.md](final-rapor.md)
- [x] Sunum taslağı: [final-sunum.md](final-sunum.md)
- [x] Demo senaryosu: [final-demo-senaryosu.md](final-demo-senaryosu.md)
- [x] Son test sonuçları ve ekran görüntüleri: [week11-e2e-test-result.md](week11-e2e-test-result.md)
