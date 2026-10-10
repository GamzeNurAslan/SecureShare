# SecureShare

SecureShare, dosyaların şifrelenerek saklandığı ve yalnızca yetkilendirilmiş kullanıcılarla paylaşılabildiği güvenli dosya paylaşım ve erişim kontrolü uygulamasıdır.

## Proje amacı

Kullanıcıların dosyalarını güvenli biçimde yükleyebilmesi, şifreli olarak depolayabilmesi, belirli kullanıcılarla paylaşabilmesi ve erişim izinlerini yönetebilmesi amaçlanmaktadır.

## Hedef özellikler

- Kullanıcı kayıt ve giriş sistemi
- JWT ile kimlik doğrulama
- Argon2id ile parola hashleme
- AES-128-GCM ile dosya şifreleme
- DEK/KEK ile zarf şifreleme
- MinIO üzerinde yalnızca şifreli dosya depolama
- Dosya bazlı erişim kontrolü ve yetki iptali
- Süreli READ, DOWNLOAD, SHARE ve DELETE izinleri
- Hash zinciri ile audit log kayıtları
- React web uygulaması
- React Native + Expo mobil uygulaması

## Teknolojiler

| Katman | Teknoloji |
|---|---|
| Web uygulaması | React |
| Mobil uygulama | React Native + Expo |
| Backend | Node.js, REST API |
| Veritabanı | PostgreSQL 16 |
| Dosya depolama | MinIO (S3 uyumlu) |
| Kimlik doğrulama | JWT, Argon2id |
| Şifreleme | AES-128-GCM, DEK/KEK |
| Erişim kaydı | PostgreSQL audit log tablosu |

## Proje yapısı

    SecureShare/
    ├── backend/                 # Node.js REST API
    ├── web/                     # React web uygulaması
    ├── mobile/                  # React Native + Expo uygulaması
    ├── docs/database/schema.sql # PostgreSQL tablo ve indeks tanımları
    ├── docker-compose.yml       # Yerel PostgreSQL servisi
    └── .env                     # Yerel ayarlar; Git'e gönderilmez

## Yerel kurulum

Gerekli araçlar:

- Git
- Node.js
- Docker Desktop

Projeyi klonladıktan sonra proje kökünde bir .env dosyası oluşturun. Bu dosya gizlidir ve repoya gönderilmemelidir:

    POSTGRES_DB=secureshare
    POSTGRES_USER=secureshare
    POSTGRES_PASSWORD=yerel_gelistirme_parolasi
    POSTGRES_PORT=5432

PostgreSQL'i başlatın:

    docker compose up -d
    docker compose ps

Bağlantıyı kontrol edin:

    docker exec secureshare-postgres pg_isready -U secureshare -d secureshare

Yeni bir veritabanında şemayı uygulayın:

    Get-Content -Raw docs/database/schema.sql |
      docker exec -i secureshare-postgres psql -U secureshare -d secureshare

Beklenen tablolar users, files, file_permissions ve audit_logs tablolarıdır.

## Geliştirme durumu

Tamamlanan altyapı:

- Yerel PostgreSQL 16 Docker servisi
- Yalnızca 127.0.0.1 üzerinden veritabanı erişimi
- Kullanıcı, dosya, izin ve audit log tabloları
- Temel indeksler ve veritabanı şeması

Sıradaki geliştirmeler:

- Backend başlangıcı ve PostgreSQL bağlantısı
- Kayıt/giriş ve JWT akışı
- AES-GCM şifreleme ve MinIO entegrasyonu
- Dosya izinleri, revoke ve audit log API'leri
- Web ve mobil istemci akışları

## Git çalışma düzeni

Her geliştirici kendi dalında çalışmalıdır:

    feature/backend
    feature/database
    feature/encryption
    feature/web
    feature/mobile

Değişiklikler main dalına doğrudan gönderilmez. Her iş için commit oluşturulmalı, ardından Pull Request açılmalıdır. .env, parola, anahtar ve yüklenen dosyalar commit edilmemelidir.

## Takım

- Gamze Nur Aslan — veritabanı, kimlik doğrulama ve mobil uygulama
- Büşra Özer — backend, REST API, erişim kontrolü ve web uygulaması
- Hava Şener — dosya şifreleme, güvenli depolama, entegrasyon ve testler

## Lisans

Bu proje eğitim amacıyla geliştirilmektedir.
