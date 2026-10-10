# Kimlik Doğrulama

## Parola güvenliği

- Parolalar düz metin saklanmaz.
- Argon2id ile hashlenir.
- Parolalar loglara veya API yanıtlarına yazılmaz.
- E-posta adresi küçük harfe çevrilerek saklanır.

## API uçları

### POST /api/auth/register

Yeni kullanıcı oluşturur.

İstek alanları:

- email
- password
- fullName

Başarılı yanıt: `201 Created`

### POST /api/auth/login

Kullanıcı girişi yapar.

İstek alanları:

- email
- password

Başarılı yanıtta JWT token döner.

### GET /api/auth/me

Header:

Authorization: Bearer <jwt-token>

Oturum açmış kullanıcının bilgilerini döner.

## Hata kodları

- 400: Geçersiz istek
- 401: E-posta veya parola hatalı
- 409: E-posta zaten kayıtlı
- 500: Sunucu hatası