# 4. Hafta Görev ve Test Planı

## Büşra’nın Görevleri

- [ ] `files.js` içine dosya yükleme endpoint’i eklendi.
- [ ] Dosya listeleme endpoint’i eklendi.
- [ ] Dosya indirme endpoint’i eklendi.
- [ ] JWT doğrulama middleware’i eklendi.
- [ ] `/api/files` route’u `server.js` içinde bağlandı.
- [ ] Yetkisiz istekler reddediliyor.

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
- [ ] Büşra’nın PR’ı incelenecek.
- [ ] Hava’nın API entegrasyon PR’ı incelenecek.
- [ ] JWT ile dosya yükleme testi yapılacak.
- [ ] Dosya indirme ve çözme testi yapılacak.
- [ ] Test ekran görüntüleri toplanacak.
- [ ] 4. hafta rapor notları hazırlanacak.

## Genel Entegrasyon Kontrolü

- [ ] Kullanıcı kayıt oldu.
- [ ] Kullanıcı giriş yaptı ve JWT aldı.
- [ ] JWT ile dosya yüklenebildi.
- [ ] Dosya PostgreSQL metadata kaydı oluşturuldu.
- [ ] Dosya MinIO’ya şifreli olarak yazıldı.
- [ ] Dosya geri indirilip doğru şekilde çözüldü.
- [x] MinIO demo dosyasının SHA-256 değeri orijinal dosyayla aynı çıktı.
- [ ] JWT olmadan erişim reddedildi.
- [ ] Başka kullanıcıya ait dosyaya izinsiz erişim reddedildi.
- [ ] Test ekran görüntüleri rapora eklendi.

## 4. Hafta Sonuç

- [ ] Gerçek dosya API’si üzerinden şifreli yükleme ve indirme tamamlandı.
- [x] MinIO şifreleme demosu doğrulandı.
- [ ] Tespit edilen eksikler 5. hafta planına aktarıldı.