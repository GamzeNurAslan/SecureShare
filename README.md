# SecureShare

SecureShare, dosyaların şifrelenerek saklandığı ve yalnızca yetkilendirilmiş kullanıcılarla paylaşılabildiği güvenli dosya paylaşım ve erişim kontrolü uygulamasıdır.

## Proje Amacı

Kullanıcıların dosyalarını güvenli biçimde yükleyebilmesi, şifreli olarak depolayabilmesi, belirli kullanıcılarla paylaşabilmesi ve erişim izinlerini yönetebilmesi amaçlanmaktadır.

## Temel Özellikler

- Kullanıcı kayıt ve giriş sistemi
- JWT ile kimlik doğrulama
- Argon2id ile parola hashleme
- AES-128-GCM ile dosya şifreleme
- DEK ve KEK ile zarf şifreleme
- MinIO üzerinde şifreli dosya depolama
- Dosya bazlı erişim kontrolü
- Yetki verme ve yetki kaldırma
- Audit log kayıtları
- React web uygulaması
- React Native + Expo mobil uygulaması

## Teknolojiler

| Katman | Teknoloji |
|---|---|
| Web Uygulaması | React |
| Mobil Uygulama | React Native + Expo |
| Backend | Node.js, REST API |
| Veritabanı | PostgreSQL |
| Dosya Depolama | MinIO |
| Kimlik Doğrulama | JWT, Argon2id |
| Şifreleme | AES-128-GCM, DEK/KEK |
| Erişim Kaydı | PostgreSQL audit log tablosu |

## Takım

- Gamze Nur Aslan
- Büşra Özer
- Hava Şener

## Lisans

Bu proje eğitim amacıyla geliştirilmiştir.
