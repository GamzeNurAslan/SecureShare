# İstemci – REST API sınırı denetimi (2026-11-14)

**Sonuç: GEÇTİ** — 0 hata, 0 uyarı.
Taranan istemci klasörleri: mobile, web · taranan dosya: 20 · ağ çağrısı: 14 (çözümlenemeyen: 1).

## Denetlenen kurallar
1. İstemci `package.json` dosyalarında veritabanı, nesne depolama ve sunucu tarafı paketleri yok.
2. İstemci kodu bu paketleri import/require etmiyor.
3. Bağlantı dizesi ve doğrudan servis portu (5432, 9000, 9001) yok.
4. Sunucu sırları (KEK, MinIO/Postgres parolası, JWT secret) istemcide geçmiyor.
5. Ağ çağrıları `/api/...` uçlarına gidiyor; dış adres ve `/api/` dışı yol uyarı verir.
6. `docker-compose.yml` içinde veritabanı ve MinIO yalnızca `127.0.0.1` üzerinden erişilebilir.
7. İstemci kodunda anahtar malzemesi (KEK/DEK, şifreli anahtar, nesne yolu) ve depolama iç ayrıntısı (presigned URL, getObject...) yok; istemci tarafı şifreleme kütüphanesi uyarı verir.
8. Backend API yanıtlarında (res.json/res.send) anahtar malzemesi, nonce/AAD, nesne yolu ve parola özeti dönmüyor.
9. `.env` dosyası `.gitignore` içinde; `.env.example` içinde KEK, MinIO parolası, HMAC anahtarı ve JWT secret boş.

## İstemcilerin çağırdığı uç noktalar
- `/api/auth/:param`
- `/api/auth/login`
- `/api/auth/register`
- `/api/files`
- `/api/files/:param`
- `/api/files/:param/permissions`
- `/api/files/:param/permissions/:param`
- `/api/files/users/search`

## Çözümlenemeyen çağrılar (elle kontrol edilmeli)
- yok

## Elle doğrulanan çağrılar
- `mobile/App.tsx:555` → `fetch(asset.uri)` — Web'de dosya seçiciden gelen yerel blob:/data: adresinden Blob okur; ağ çağrısı değildir. Dosya sonra FormData ile /api/files'a gönderilir (doğrulayan: Hava Şener, 2026-11-07).

## İstemcinin kodunda geçen adresler
- `localhost:3001` (`mobile/App.tsx:31`)
- `localhost:3000` (`web/src/services/api.js:5`)
- `vite.dev` (`web/vite.config.js:4`)

## Taranan dosyalar
- `mobile/.claude/settings.json`
- `mobile/app.json`
- `mobile/App.tsx`
- `mobile/index.ts`
- `mobile/tsconfig.json`
- `web/eslint.config.js`
- `web/index.html`
- `web/src/App.jsx`
- `web/src/context/AuthContext.jsx`
- `web/src/context/AuthContextValue.js`
- `web/src/context/useAuth.js`
- `web/src/main.jsx`
- `web/src/pages/Dashboard.jsx`
- `web/src/pages/Login.jsx`
- `web/src/pages/MyFiles.jsx`
- `web/src/pages/Register.jsx`
- `web/src/pages/ShareFile.jsx`
- `web/src/pages/UploadFile.jsx`
- `web/src/services/api.js`
- `web/vite.config.js`

## Bulgular
Bulgu yok.
