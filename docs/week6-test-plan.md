# 6. Hafta Görev ve Test Planı

## Hafta Amacı

Bu hafta SecureShare’in web ve mobil istemcilerinin gerçek REST API ile çalışması sağlanacaktır. Kullanıcıların kayıt olması, giriş yapması, dosyalarını listelemesi ve dosya yüklemesi arayüz üzerinden gerçekleştirilecektir.

> Not: İzin paylaşımı ekranlarının çalışabilmesi için 5. hafta erişim izni API’lerinin `main` dalına alınmış olması gerekir.

## Gamze’nin Görevleri — Mobil Uygulama

- [ ] Mobil uygulamadaki demo giriş ekranı gerçek `/api/auth/login` endpoint’ine bağlanacak.
- [ ] Kayıt ekranı `/api/auth/register` endpoint’ine bağlanacak.
- [ ] Başarılı girişte alınan JWT güvenli biçimde cihazda saklanacak.
- [ ] Çıkış işleminde token cihazdan silinecek ve giriş ekranına dönülecek.
- [ ] Dashboard’daki sabit örnek dosya listesi kaldırılacak.
- [ ] Dosya listesi `/api/files` endpoint’inden alınarak gösterilecek.
- [ ] `expo-document-picker` ile cihazdan dosya seçme işlemi eklenecek.
- [ ] Seçilen dosya JWT ile `/api/files` endpoint’ine yüklenecek.
- [ ] Yükleme, listeleme ve giriş işlemlerinde yükleniyor, başarılı ve hata durumları kullanıcıya gösterilecek.
- [ ] Telefon üzerinden test yapılacaksa `localhost` yerine bilgisayarın yerel IP adresi kullanılacak.

### Mobil — Gamze

- [ ] Giriş ekranını gerçek API’ye bağlama
- [ ] Kayıt ekranını gerçek API’ye bağlama
- [ ] Dashboard’daki örnek dosyaları gerçek API listesinden gösterme
- [ ] Dosya yükleme butonu ve dosya seçme ekranı
- [ ] Yükleniyor, başarılı ve hata mesajları


## Büşra’nın Görevleri — Web Uygulaması

- [ ] `web/` klasöründe React web uygulaması başlatılacak.
- [ ] Web giriş ve kayıt ekranları hazırlanacak.
- [ ] JWT ile oturum yönetimi eklenecek.
- [ ] Kullanıcının dosya listesi gösterilecek.
- [ ] Dosya yükleme formu hazırlanacak.
- [ ] Dosya sahibi için paylaşım/yetki ekranı hazırlanacak.
- [ ] Kayıtlı kullanıcıya okuma veya indirme izni verme işlemi eklenecek.
- [ ] Verilmiş bir izni kaldırma işlemi eklenecek.
- [ ] API hata mesajları kullanıcıya anlaşılır biçimde gösterilecek.

### Web — Büşra

- [ ] Giriş ekranı
- [ ] Kayıt ekranı
- [ ] Ana dashboard
- [ ] Dosya listesi
- [ ] Dosya yükleme alanı
- [ ] Boş dosya listesi, yükleniyor ve hata durumları


## Hava’nın Görevleri — Entegrasyon ve Test

- [ ] Mobil ve web istemcilerinin yalnızca REST API üzerinden çalıştığı kontrol edilecek.
- [ ] İstemcilerin MinIO, PostgreSQL, KEK veya şifreleme anahtarlarına doğrudan erişmediği doğrulanacak.
- [ ] Mobil dosya seçme ve yükleme akışı test edilecek.
- [ ] Web dosya yükleme ve listeleme akışı test edilecek.
- [ ] Token geçersiz veya süresi dolmuş olduğunda kullanıcıya uygun hata mesajı gösterildiği kontrol edilecek.
- [ ] Dosya türü veya boyutu uygun değilse arayüzün hata mesajı gösterdiği test edilecek.
- [ ] Web ve mobil uygulamadaki sonuçlar karşılaştırılarak entegrasyon notları hazırlanacak.

## Genel Kabul Kriterleri

- [ ] Kullanıcı mobil uygulama üzerinden kayıt olabilir.
- [ ] Kullanıcı mobil uygulama üzerinden giriş yapabilir.
- [ ] Başarılı girişten sonra kullanıcı dosya listesini görebilir.
- [ ] Kullanıcı cihazından seçtiği uygun dosyayı yükleyebilir.
- [ ] Yeni yüklenen dosya liste ekranında görüntülenir.
- [ ] Kullanıcı çıkış yaptığında korumalı ekranlara tekrar erişemez.
- [ ] Kullanıcı web uygulaması üzerinden giriş yapabilir.
- [ ] Dosya sahibi web uygulamasından başka kayıtlı kullanıcıya izin verebilir.
- [ ] Kaldırılan izin arayüzde güncellenir.
- [ ] Web ve mobil uygulama hata durumlarında uygulamayı kapatmadan mesaj gösterir.

## Hafta Sonu Çıktıları

- [ ] Gerçek API’ye bağlı mobil giriş, kayıt ve dosya listeleme ekranları.
- [ ] Mobil dosya seçme ve yükleme akışı.
- [ ] Temel React web uygulaması.
- [ ] Web üzerinden dosya listeleme, yükleme ve izin yönetimi arayüzü.
- [ ] Web ve mobil entegrasyon test ekran görüntüleri.
- [ ] 6. hafta rapor notları.