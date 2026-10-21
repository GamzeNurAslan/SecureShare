# SecureShare

SecureShare, dosyaların şifrelenerek saklanmasını ve yalnızca yetkili kullanıcılarla paylaşılmasını amaçlayan güvenli dosya paylaşım uygulamasıdır. Proje; kullanıcı kimlik doğrulama, dosya şifreleme, dosya bazlı izinler ve denetlenebilir işlem kayıtlarını tek bir mimaride birleştirmeyi hedefler.

## Proje amacı

Kullanıcıların sisteme güvenli biçimde kayıt olabilmesi, giriş yapabilmesi, dosyalarını şifreleyerek saklayabilmesi ve dosyalara verilen erişim izinlerini yönetebilmesi amaçlanmaktadır. Dosya içeriği ile dosya metadata bilgilerinin farklı katmanlarda tutulması, güvenlik ve ölçeklenebilirlik açısından temel tasarım yaklaşımıdır.

## Hedef özellikler

- Kullanıcı kayıt ve giriş sistemi
- Argon2id ile parola hashleme
- JWT tabanlı kimlik doğrulama
- Güçlü parola politikası
- AES-128-GCM ile dosya şifreleme
- DEK/KEK zarf şifreleme yaklaşımı
- Şifreli dosyaların MinIO üzerinde saklanması
- Dosya bazlı READ, DOWNLOAD, SHARE ve DELETE izinleri
- Süreli izin verme ve yetki iptali
- Audit log kayıtları ve ilerleyen aşamada hash zinciri
- React web istemcisi
- React Native + Expo mobil istemcisi

## Mevcut durum

### Tamamlanan

- PostgreSQL 16 Docker servisi ve temel veritabanı şeması
- "users", "files", "file_permissions" ve "audit_logs" tabloları
- Node.js/Express backend başlangıcı
- "/health" ve "/health/db" sağlık uçları
- Kullanıcı kayıt ve giriş uçları
- Argon2id parola hashleme
- JWT token üretimi
- Kayıt sırasında güçlü parola kontrolü
- AES-128-GCM ile dosya şifreleme ve çözme modülü
- DEK’in KEK ile sarılması ve açılması
- Şifreleme için 13 otomatik test
- React Native + Expo giriş, kayıt ve dashboard arayüzü

### Geliştirme aşamasında

- MinIO bağlantısı ve şifreli nesne yükleme/indirme API’leri
- Dosya paylaşımı, izin kontrolü ve yetki iptali API’leri
- Audit log üretiminin API işlemlerine bağlanması
- Hash zinciri ile log bütünlüğü doğrulaması
- React web istemcisi
- Uçtan uca entegrasyon ve performans testleri

## Teknoloji yığını

| Katman | Teknoloji | Kullanım |
|---|---|---|
| Web istemcisi | React | Planlanan web arayüzü |
| Mobil istemci | React Native + Expo | Giriş, kayıt ve dashboard arayüzü |
| Backend | Node.js + Express | REST API ve iş kuralları |
| Veritabanı | PostgreSQL 16 | Kullanıcı, dosya metadata, izin ve log bilgileri |
| Dosya depolama | MinIO | Geliştirme aşamasında; şifreli nesne depolama |
| Kimlik doğrulama | JWT | Oturum/token doğrulama |
| Parola güvenliği | Argon2id | Parolaları düz metin saklamadan hashleme |
| Dosya şifreleme | AES-128-GCM | Gizlilik ve bütünlük koruması |
| Anahtar yönetimi | DEK/KEK | Dosya anahtarlarının güvenli biçimde korunması |
| Geliştirme ortamı | Docker Compose | Yerel PostgreSQL çalıştırma |

## Mimari

~~~text
React / React Native + Expo
              |
              v
       Node.js REST API
          /          \
         v            v
   PostgreSQL       MinIO
  (metadata, izin,   (şifreli dosya
   audit kayıtları)   nesneleri)
~~~

Dosyanın içeriği AES-128-GCM ile şifrelenir. Her dosya için ayrı bir DEK üretilir ve bu DEK, KEK ile sarılarak PostgreSQL’de metadata ile birlikte tutulur. Şifreli dosya içeriğinin MinIO’ya, dosya adı/türü/boyutu/izin bilgilerinin ise PostgreSQL’e yazılması planlanmaktadır.

## Proje yapısı

~~~text
SecureShare/
├── backend/
│   ├── crypto/encryption.js       # AES-128-GCM ve DEK/KEK işlemleri
│   ├── scripts/demo-encrypt.js    # Yerel şifreleme/çözme demosu
│   ├── test/encryption.test.js    # Şifreleme testleri
│   ├── server.js                  # Express REST API
│   ├── package.json
│   └── package-lock.json
├── docs/
│   ├── database/schema.sql        # PostgreSQL tabloları ve indeksler
│   └── authentication.md          # Kimlik doğrulama notları
├── mobile/                        # React Native + Expo istemcisi
├── web/                           # React web istemcisi için ayrılmış klasör
├── docker-compose.yml             # Yerel PostgreSQL servisi
├── .env.example                   # Ortam değişkenleri şablonu
└── README.md
~~~

## Gereksinimler

- Git
- Node.js 18 veya üzeri
- Docker Desktop
- PowerShell (Windows kullanımı için)

## Yerel kurulum

### 1. Projeyi hazırlama

~~~powershell
git clone https://github.com/GamzeNurAslan/SecureShare.git
cd SecureShare
Copy-Item .env.example .env
~~~

.env dosyası yerel ve gizlidir; Git’e gönderilmemelidir. POSTGRES_* değerlerini yerel PostgreSQL ayarlarınıza göre düzenleyin.

AES-128-GCM için 128 bit bir KEK üretin:

~~~powershell
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
~~~

Üretilen 32 karakterlik değeri .env dosyasındaki KEK_HEX değişkenine yazın.

### 2. PostgreSQL’i başlatma

Proje kök klasöründe:

~~~powershell
docker compose up -d
docker compose ps
~~~

Konteynerin bağlantı kabul ettiğini kontrol edin:

~~~powershell
docker exec secureshare-postgres pg_isready -U secureshare -d secureshare
~~~

Beklenen sonuç accepting connections ifadesidir.

Yeni bir veritabanında şemayı uygulamak için:

~~~powershell
Get-Content -Raw docs/database/schema.sql |
  docker exec -i secureshare-postgres psql -U secureshare -d secureshare
~~~

### 3. Backend’i çalıştırma

~~~powershell
cd backend
npm install
npm test
node server.js
~~~

Backend varsayılan olarak http://localhost:3000 adresinde çalışır.

Sağlık kontrolleri:

~~~powershell
Invoke-RestMethod http://localhost:3000/health
Invoke-RestMethod http://localhost:3000/health/db
~~~

### 4. Mobil istemciyi çalıştırma

Backend açık kalırken ikinci bir terminalde:

~~~powershell
cd mobile
npm install
npm run web
~~~

Expo’nun terminalde gösterdiği web adresini tarayıcıda açın. Mobil cihazda çalıştırırken mobile/App.tsx içindeki API_URL değerini bilgisayarın yerel IP adresine göre güncellemeniz gerekebilir; localhost fiziksel cihazın kendisini ifade eder.

## REST API uçları

### Sağlık uçları

| Method | Uç | Açıklama |
|---|---|---|
| GET | /health | Backend’in çalıştığını kontrol eder |
| GET | /health/db | PostgreSQL’e SELECT 1 sorgusu gönderir |

### Kimlik doğrulama uçları

| Method | Uç | Açıklama |
|---|---|---|
| POST | /api/auth/register | Kullanıcı oluşturur ve JWT döndürür |
| POST | /api/auth/login | Kullanıcıyı doğrular ve JWT döndürür |

Kayıt isteğinde fullName, email ve password; giriş isteğinde email ve password alanları kullanılır. Parolalar API yanıtında veya loglarda düz metin olarak tutulmaz.

## Şifreleme demosu

.env içinde KEK_HEX tanımlandıktan sonra backend klasöründe:

~~~powershell
node scripts/demo-encrypt.js "C:\ornek\dosya.txt"
~~~

Demo, dosyanın .enc biçiminde şifrelenmiş kopyasını ve .dec biçiminde çözülmüş kopyasını oluşturur. SHA-256 değerlerini karşılaştırarak çözme işleminin başarılı olup olmadığını gösterir. Oluşturulan .enc ve .dec dosyaları repoya eklenmemelidir.

## Testler

Backend klasöründe:

~~~powershell
npm test
~~~

Testler; şifreleme/çözme, yanlış KEK, değiştirilmiş veri, değiştirilmiş authentication tag, yanlış AAD/nonce ve DEK sarma-açma senaryolarını kontrol eder.

## Git çalışma düzeni

Her özellik ayrı bir branch üzerinde geliştirilmelidir:

~~~text
feature/backend
feature/auth
feature/encryption
feature/web
feature/mobile
~~~

Örnek akış:

~~~powershell
git switch main
git pull origin main
git switch -c feature/ornek-ozellik
git add <yalnızca ilgili dosyalar>
git commit -m "feat: açıklayıcı mesaj"
git push -u origin feature/ornek-ozellik
~~~

Değişiklikler Pull Request üzerinden incelenip main branch’ine birleştirilir. .env, parolalar, JWT/KEK anahtarları, node_modules, yüklenen dosyalar ve yerel .enc/.dec çıktıları commit edilmemelidir. git add . kullanmadan önce git status ile hangi dosyaların ekleneceğini kontrol edin.

## Takım görevleri

- **Gamze Nur Aslan:** PostgreSQL şeması, kayıt/giriş, Argon2id, JWT ve mobil istemci akışları
- **Büşra Özer:** Node.js backend altyapısı, REST API ve erişim kontrolü
- **Hava Şener:** AES-128-GCM, DEK/KEK, MinIO entegrasyonu ve entegrasyon testleri

## Sorun giderme

- Cannot GET /: Backend’in kök adresinde (/) sayfa yoktur. /health uç noktasını kullanın.
- Failed to fetch: Backend çalışmıyor olabilir veya mobil istemcinin API_URL değeri yanlış olabilir.
- /health/db 500 döndürüyorsa Docker Desktop’ı açıp docker compose up -d çalıştırın.
- Giriş/kayıt 500 döndürüyorsa backend terminalindeki hata logunu kontrol edin.
- docker compose yapılandırması bulunamıyorsa komutu proje kök klasöründe çalıştırın.

## Lisans

Bu proje eğitim ve akademik geliştirme amacıyla hazırlanmaktadır.

