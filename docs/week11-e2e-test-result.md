# 11. Hafta Uçtan Uca Test Sonucu

## Test kapsamı

Web ve mobil istemcilerin kullandığı REST API üzerinden kayıt → giriş → yükleme → paylaşma → listeleme → indirme akışı doğrulandı. Test, yerel PostgreSQL ve MinIO servisleri çalışırken, çakışan geliştirme sunucularını etkilememek için geçici `3010` portunda yürütüldü.

## Sonuçlar

| Adım | Beklenen sonuç | Sonuç |
|---|---|---|
| İki test kullanıcısının kaydı | Kullanıcılar JWT ile oluşturulur | Başarılı |
| Kullanıcı girişi | Geçerli JWT alınır | Başarılı |
| Dosya yükleme | Dosya API tarafından kabul edilir | Başarılı |
| Dosya paylaşma | Alıcıya `READ` ve `DOWNLOAD` izni verilir | Başarılı |
| Dosya listeleme | Alıcı paylaşılan dosyayı görür | Başarılı |
| Dosya detayını görüntüleme | Yetkili alıcı detay endpoint’ine erişir | Başarılı |
| Dosya indirme | İndirilen içerik kaynak içerikle aynı olur | Başarılı |
| İşlem geçmişi | Dosya sahibi geçmişi görür | Başarılı |
| Sahip olmayan kullanıcının geçmişi | Erişim `404` ile reddedilir | Başarılı |
| Test dosyasını silme | Dosya sahibi dosyayı kaldırır | Başarılı |

## Audit kanıtı

Dosya sahibi geçmişinde şu olaylar görüldü:

- `FILE_UPLOADED`
- `FILE_SHARED`
- `FILE_DOWNLOADED`

Testte kullanılan dosya silinerek MinIO ve metadata temizliği de kontrol edildi. Parola ve JWT değerleri rapora yazılmadı.

## Diğer kalite kontrolleri

- Web production build: başarılı.
- Web lint: 0 hata, `ShareFile.jsx` içinde 1 mevcut React hook uyarısı.
- Mobil TypeScript kontrolü: başarılı.
- Backend testleri: 94 testten 93 başarılı, 1 test `auditLogService` birim testinde geçerli PostgreSQL Pool beklediği için başarısız. Gerçek PostgreSQL entegrasyon audit testleri başarılı.
