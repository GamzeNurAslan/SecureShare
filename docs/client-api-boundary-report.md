# İstemci – REST API sınırı denetimi (2026-11-07)

**Sonuç: GEÇTİ** — 0 hata, 0 uyarı.
Taranan istemci klasörleri: mobile, web · taranan dosya: 5 · ağ çağrısı: 3 (çözümlenemeyen: 1).

## Denetlenen kurallar
1. İstemci `package.json` dosyalarında veritabanı, nesne depolama ve sunucu tarafı paketleri yok.
2. İstemci kodu bu paketleri import/require etmiyor.
3. Bağlantı dizesi ve doğrudan servis portu (5432, 9000, 9001) yok.
4. Sunucu sırları (KEK, MinIO/Postgres parolası, JWT secret) istemcide geçmiyor.
5. Ağ çağrıları `/api/...` uçlarına gidiyor; dış adres ve `/api/` dışı yol uyarı verir.
6. `docker-compose.yml` içinde veritabanı ve MinIO yalnızca `127.0.0.1` üzerinden erişilebilir.

## İstemcilerin çağırdığı uç noktalar
- `/api/auth/:param`
- `/api/files`

## Çözümlenemeyen çağrılar (elle kontrol edilmeli)
- yok

## Elle doğrulanan çağrılar
- `mobile/App.tsx:555` → `fetch(asset.uri)` — Web'de dosya seçiciden gelen yerel blob:/data: adresinden Blob okur; ağ çağrısı değildir. Dosya sonra FormData ile /api/files'a gönderilir (doğrulayan: Hava Şener, 2026-11-07).

## İstemcinin kodunda geçen adresler
- `localhost:3000` (`mobile/App.tsx:31`)

## Taranan dosyalar
- `mobile/.claude/settings.json`
- `mobile/app.json`
- `mobile/App.tsx`
- `mobile/index.ts`
- `mobile/tsconfig.json`

## Bulgular
Bulgu yok.
