# 6. Hafta Görev ve Test Planı

## Hafta Amacı

Bu hafta SecureShare’in web ve mobil istemcilerinin gerçek REST API ile çalışması sağlanacaktır. Kullanıcıların kayıt olması, giriş yapması, dosyalarını listelemesi ve dosya yüklemesi arayüz üzerinden gerçekleştirilecektir.

> Not: İzin paylaşımı ekranlarının çalışabilmesi için 5. hafta erişim izni API’lerinin `main` dalına alınmış olması gerekir.

## Gamze’nin Görevleri — Mobil Uygulama

- [x] Mobil uygulamadaki demo giriş ekranı gerçek `/api/auth/login` endpoint’ine bağlanacak.
- [x] Kayıt ekranı `/api/auth/register` endpoint’ine bağlanacak.
- [x] Başarılı girişte alınan JWT güvenli biçimde cihazda saklanacak.
- [x] Çıkış işleminde token cihazdan silinecek ve giriş ekranına dönülecek.
- [x] Dashboard’daki sabit örnek dosya listesi kaldırılacak.
- [x] Dosya listesi `/api/files` endpoint’inden alınarak gösterilecek.
- [x] `expo-document-picker` ile cihazdan dosya seçme işlemi eklenecek.
- [x] Seçilen dosya JWT ile `/api/files` endpoint’ine yüklenecek.
- [x] Yükleme, listeleme ve giriş işlemlerinde yükleniyor, başarılı ve hata durumları kullanıcıya gösterilecek.
- [ ] Telefon üzerinden test yapılacaksa `localhost` yerine bilgisayarın yerel IP adresi kullanılacak. (şu anda yapılamıyor.)

### Mobil — Gamze

- [x] Giriş ekranını gerçek API’ye bağlama
- [x] Kayıt ekranını gerçek API’ye bağlama
- [x] Dashboard’daki örnek dosyaları gerçek API listesinden gösterme
- [x] Dosya yükleme butonu ve dosya seçme ekranı
- [x] Yükleniyor, başarılı ve hata mesajları


## Büşra’nın Görevleri — Web Uygulaması

- [x] `web/` klasöründe React web uygulaması başlatılacak.
- [x] Web giriş ve kayıt ekranları hazırlanacak.
- [x] JWT ile oturum yönetimi eklenecek.
- [x] Kullanıcının dosya listesi gösterilecek.
- [x] Dosya yükleme formu hazırlanacak.
- [x] Dosya sahibi için paylaşım/yetki ekranı hazırlanacak.
- [x] Kayıtlı kullanıcıya okuma veya indirme izni verme işlemi eklenecek.
- [x] Verilmiş bir izni kaldırma işlemi eklenecek.
- [x] API hata mesajları kullanıcıya anlaşılır biçimde gösterilecek.

### Web — Büşra

- [x] Giriş ekranı
- [x] Kayıt ekranı
- [x] Ana dashboard
- [x] Dosya listesi
- [x] Dosya yükleme alanı
- [x] Boş dosya listesi, yükleniyor ve hata durumları


## Hava’nın Görevleri — Entegrasyon ve Test

- [x] Mobil ve web istemcilerinin yalnızca REST API üzerinden çalıştığı kontrol edilecek.
- [x] İstemcilerin MinIO, PostgreSQL, KEK veya şifreleme anahtarlarına doğrudan erişmediği doğrulanacak.
- [x] Mobil dosya seçme ve yükleme akışı test edilecek.
- [x] Web dosya yükleme ve listeleme akışı test edilecek.
- [x] Token geçersiz veya süresi dolmuş olduğunda kullanıcıya uygun hata mesajı gösterildiği kontrol edilecek.
- [x] Dosya türü veya boyutu uygun değilse arayüzün hata mesajı gösterdiği test edilecek.
- [x] Web ve mobil uygulamadaki sonuçlar karşılaştırılarak entegrasyon notları hazırlanacak.

## Genel Kabul Kriterleri

- [x] Kullanıcı mobil uygulama üzerinden kayıt olabilir.
- [x] Kullanıcı mobil uygulama üzerinden giriş yapabilir.
- [x] Başarılı girişten sonra kullanıcı dosya listesini görebilir.
- [x] Kullanıcı cihazından seçtiği uygun dosyayı yükleyebilir.
- [x] Yeni yüklenen dosya liste ekranında görüntülenir.
- [x] Kullanıcı çıkış yaptığında korumalı ekranlara tekrar erişemez.
- [x] Kullanıcı web uygulaması üzerinden giriş yapabilir.
- [x] Dosya sahibi web uygulamasından başka kayıtlı kullanıcıya izin verebilir.
- [x] Kaldırılan izin arayüzde güncellenir.
- [x] Web ve mobil uygulama hata durumlarında uygulamayı kapatmadan mesaj gösterir.

## Hafta Sonu Çıktıları

- [x] Gerçek API’ye bağlı mobil giriş, kayıt ve dosya listeleme ekranları.
- [x] Mobil dosya seçme ve yükleme akışı.
- [x] Temel React web uygulaması.
- [x] Web üzerinden dosya listeleme, yükleme ve izin yönetimi arayüzü.
- [x] Web ve mobil entegrasyon test ekran görüntüleri.
- [x] 6. hafta rapor notları.

## 6. Hafta Rapor Notları - Entegrasyon Notları

- Mobil giriş, kayıt, JWT saklama ve dosya listeleme akışları başarıyla test edildi.
- Mobil dosya seçme ve yükleme işlemi başarılı oldu.
- React web uygulamasında giriş, kayıt, dosya listeleme ve yükleme çalışıyor.
- Web üzerinden dosya paylaşma, izin verme ve izin kaldırma arayüzleri doğrulandı.
- Mobil ve web istemcileri yalnızca REST API üzerinden çalışıyor.
- Client boundary kontrolü 0 hata ve 0 uyarı ile tamamlandı.
- Geçersiz token durumunda kullanıcıya hata mesajı gösterildi.
- Telefon üzerinden yerel IP testi yapılamadı.
- Dosya türü doğrulaması sonraki geliştirme olarak bırakıldı.