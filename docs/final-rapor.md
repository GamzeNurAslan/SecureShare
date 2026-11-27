# SecureShare Final Teknik Raporu

## 1. Proje özeti

SecureShare, dosyaları istemciden bağımsız biçimde şifreleyerek saklayan ve dosya sahibinin belirlediği kullanıcılarla süreli veya süresiz paylaşan güvenli dosya platformudur. Web ve mobil istemciler yalnızca REST API ile haberleşir; PostgreSQL, MinIO ve anahtar malzemesi istemcilere açılmaz.

## 2. Mimari

```text
React + Vite (web) / React Native + Expo (mobil)
                         |
                    REST API + JWT
                         v
                  Node.js + Express
                    |            |
                    v            v
             PostgreSQL        MinIO
       metadata, izinler,   yalnızca şifreli
          audit kayıtları       nesneler
```

- Web istemcisi: React, Vite, Axios.
- Mobil istemci: React Native, Expo, SecureStore ve DocumentPicker.
- Backend: Node.js ve Express.
- Veri katmanı: PostgreSQL 16 ve MinIO.

## 3. Güvenlik modeli

- Parolalar Argon2id ile hashlenir; düz metin parola saklanmaz.
- Her dosya için ayrı DEK üretilir ve dosya AES-128-GCM ile şifrelenir.
- DEK, KEK ile sarılır; MinIO’da yalnızca şifreli nesne tutulur.
- JWT ile korunan dosya endpoint’lerinde sahiplik, `READ`, `DOWNLOAD` ve süre kontrolleri uygulanır.
- Audit kayıtları `previous_hash` ve `entry_hash` ile zincirlenir.
- Audit kayıtlarına parola, JWT, KEK, DEK veya dosya içeriği yazılmaz.

## 4. Görev dağılımı

| Takım üyesi | Sorumluluk |
|---|---|
| Gamze Nur Aslan | Veritabanı, kimlik doğrulama ve mobil uygulama |
| Büşra Özer | Backend, REST API, erişim kontrolü ve web uygulaması |
| Hava Şener | Şifreleme, güvenli depolama, entegrasyon ve testler |

## 5. Uygulama akışı

1. Kullanıcı kayıt olur ve giriş yapar.
2. JWT istemci tarafında güvenli biçimde saklanır.
3. Dosya seçilir ve JWT ile API’ye yüklenir.
4. Backend dosyayı şifreler, MinIO’ya kaydeder ve metadata’yı PostgreSQL’e yazar.
5. Dosya sahibi kayıtlı bir kullanıcıya `READ` ve `DOWNLOAD` izni verebilir.
6. Yetkili kullanıcı dosyayı listeler, detayını görür ve indirme izni varsa indirir.
7. İşlem geçmişi yalnızca dosya sahibi tarafından görüntülenebilir.

## 6. Test sonuçları

Detaylı uçtan uca sonuçlar [week11-e2e-test-result.md](week11-e2e-test-result.md) dosyasındadır.

- Kayıt, giriş, yükleme, paylaşma, listeleme, detay, indirme, işlem geçmişi ve silme akışı başarılıdır.
- Dosya sahibi olmayan kullanıcının işlem geçmişi isteği `404` ile reddedilmiştir.
- Web production build başarılıdır.
- Web lint 0 hata ile tamamlanmış, 1 mevcut hook uyarısı raporlanmıştır.
- Mobil TypeScript kontrolü başarılıdır.
- Backend testlerinde 94 testten 93’ü başarılıdır. Kalan test, birim testte PostgreSQL Pool bağlantısı beklediği için başarısızdır; gerçek PostgreSQL audit entegrasyon testleri başarılıdır.

## 7. Görsel kanıtlar

- [Mobil giriş ekranı](week10-mobile-login.png)
- [Mobil kayıt ekranı](week10-mobile-register.png)
- [Boş dosya listesi](week10-mobile-dashboard-empty.png)
- [Mobil dosya listesi](week10-mobile-files.png)
- [Mobil dosya detay ve işlem geçmişi](week10-mobile-detail.png)
- [Kullanıcı rehberi](week10-mobile-user-guide.md)

## 8. Çalıştırma

```powershell
docker compose up -d
cd backend
npm install
node server.js
```

Web ve mobil istemci kurulumları için [README.md](../README.md) ve [yedekleme/geri yükleme prosedürü](backup-restore.md) izlenmelidir.

## 9. Kalan teknik notlar

- Bir backend birim testi gerçek Pool bağlantısı beklediği için test izolasyonu iyileştirilmelidir.
- Canlı kullanım öncesinde TLS, merkezi secret yönetimi, rate limiting, anahtar rotasyonu ve antivirüs taraması eklenmelidir.
