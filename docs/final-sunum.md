# SecureShare Sunum Taslağı

## Slayt 1 — SecureShare

Güvenli dosya saklama ve yetkili paylaşım platformu.

## Slayt 2 — Problem ve hedef

- Dosyalar istemciye açık olmadan şifreli saklanır.
- Dosya sahibi, erişimi kullanıcı ve izin türü bazında yönetir.
- Web ve mobil istemciler aynı REST API’yi kullanır.

## Slayt 3 — Mimari

React/Vite web ve React Native/Expo mobil istemci → Node.js/Express REST API → PostgreSQL + MinIO.

## Slayt 4 — Güvenlik

- Argon2id parola hashleme.
- JWT oturumu.
- Dosya başına AES-128-GCM DEK.
- KEK ile DEK sarma.
- Hash zincirli audit log.

## Slayt 5 — Kullanıcı akışı

Kayıt → giriş → dosya seçme → şifreli yükleme → dosya listesi → dosya detayı.

## Slayt 6 — Paylaşım ve yetkilendirme

Dosya sahibi alıcıyı seçer, `READ`/`DOWNLOAD` izni ve süre tanımlar. Süresi dolan veya kaldırılan izin erişimi engeller.

## Slayt 7 — Test kanıtı

- Uçtan uca kayıt, giriş, yükleme, paylaşma ve indirme akışı başarılı.
- Sahip olmayan kullanıcının işlem geçmişi erişimi reddedildi.
- Web build ve mobil TypeScript kontrolleri başarılı.
- Audit olayları: `FILE_UPLOADED`, `FILE_SHARED`, `FILE_DOWNLOADED`.

## Slayt 8 — Demo ve kapanış

Demo akışı [final-demo-senaryosu.md](final-demo-senaryosu.md) dosyasındaki sırayla gösterilir. Son olarak güvenlik kazanımları ve canlı ortam için kalan iyileştirmeler özetlenir.
