# 4. Hafta Görev ve Test Planı

## Büşra’nın Görevleri

- [x] `files.js` içine dosya yükleme endpoint’i eklendi.
- [x] Dosya listeleme endpoint’i eklendi.
- [x] Dosya indirme endpoint’i eklendi.
- [x] JWT doğrulama middleware’i eklendi.
- [x] `/api/files` route’u `server.js` içinde bağlandı.
- [x] Yetkisiz istekler reddediliyor.

## Hava’nın Önceden Tamamladığı Çalışmalar

- [x] MinIO Docker servisi ve bucket yapısı hazırlandı.  
  **Sorumlu:** Hava
- [x] AES-128-GCM ile şifreleme ve MinIO depolama demosu hazırlandı.  
  **Sorumlu:** Hava
- [x] Dosyanın MinIO’dan geri alınıp çözülmesi sağlandı.  
  **Sorumlu:** Hava

## Hava’nın 4. Hafta Kalan Görevleri

- [ ] Mevcut şifreleme ve MinIO kodu gerçek dosya API’sine bağlandı.
- [ ] Şifreleme metadata’sı PostgreSQL `files` tablosuna aktarılıyor.
- [ ] MinIO’da düz metin dosya tutulmadığı API üzerinden doğrulandı.

## Gamze’nin Görevleri

- [x] `files` tablosundaki metadata alanları kontrol edildi.
- [x] Genel entegrasyon test planı hazırlandı.
- [x] Hava’nın MinIO demosu çalıştırılarak doğrulandı.
- [x] Orijinal ve çözülen dosyanın SHA-256 değerleri karşılaştırıldı.
- [x] Büşra’nın PR’ı incelenecek.
- [ ] Hava’nın API entegrasyon PR’ı incelenecek.
- [x] JWT ile dosya yükleme testi yapılacak.
- [x] Dosya indirme ve çözme testi yapılacak.
- [x] Test ekran görüntüleri toplanacak.
- [x] 4. hafta rapor notları hazırlanacak.

## Genel Entegrasyon Kontrolü

- [x] Kullanıcı kayıt oldu.
- [x] Kullanıcı giriş yaptı ve JWT aldı.
- [x] JWT ile dosya yüklenebildi.
- [x] Dosya PostgreSQL metadata kaydı oluşturuldu.
- [x] Dosya MinIO’ya şifreli olarak yazıldı.
- [x] Dosya geri indirilip doğru şekilde çözüldü.
- [x] MinIO demo dosyasının SHA-256 değeri orijinal dosyayla aynı çıktı.
- [x] JWT olmadan erişim reddedildi.
- [x] Başka kullanıcıya ait dosyaya izinsiz erişim reddedildi.
- [x] Test ekran görüntüleri rapora eklendi.

## 4. Hafta Sonuç

- [x] Gerçek dosya API’si üzerinden şifreli yükleme ve indirme tamamlandı.
- [x] MinIO şifreleme demosu doğrulandı.
- [x] Tespit edilen eksikler 5. hafta planına aktarıldı.
- [x] Bu hafta toplam test kısımlarında 19+ başarılı test yapıldı.