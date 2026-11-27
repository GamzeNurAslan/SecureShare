# SecureShare Final Demo Senaryosu

## Demo öncesi hazırlık

```powershell
docker compose up -d
docker compose ps
cd backend
node server.js
```

Web için yeni terminalde `cd web; npm run dev` çalıştırılır. Mobil testte `mobile/.env` içindeki API adresi bilgisayarın yerel IP’sini göstermelidir; telefon ve bilgisayar aynı ağda olmalıdır.

## Gösterilecek akış

1. **Kayıt:** Yeni kullanıcı adı, e-posta ve parola ile hesap oluşturulur.
2. **Giriş:** Aynı bilgilerle giriş yapılır; JWT istemci oturumunda tutulur.
3. **Yükleme:** `week11-demo.txt` gibi küçük bir dosya seçilir ve yükleme sonucu beklenir.
4. **Listeleme:** Dosyanın dosya listesinde göründüğü gösterilir.
5. **Paylaşma:** İkinci test kullanıcısı seçilir; `READ` ve `DOWNLOAD` izinleri verilir.
6. **İkinci kullanıcı:** Alıcı hesapla giriş yapılır ve paylaşılan dosyanın listelendiği gösterilir.
7. **İndirme:** Alıcı dosyayı indirir; dosyanın içeriğinin kaynak dosyayla aynı olduğu doğrulanır.
8. **İşlem geçmişi:** Dosya sahibi geçmiş ekranında yükleme, paylaşma ve indirme olaylarını gösterir.
9. **Erişim kontrolü:** Alıcıdan işlem geçmişi istenir; sahip olmadığı için erişimin reddedildiği gösterilir.
10. **Kapanış:** İzin kaldırma veya dosya silme işlemi gösterilir ve sonucun listede yansıtıldığı doğrulanır.

## Beklenen mesajlar

- Başarılı işlemlerde kullanıcıya başarı mesajı gösterilir.
- Yetkisiz erişimde hassas bilgi içermeyen hata mesajı gösterilir.
- Yükleme sırasında yükleniyor durumu, hata durumunda tekrar denenebilir mesajı görünür.

## Sunum notu

Demo sırasında gerçek parola, JWT, KEK veya kişisel e-posta paylaşılmaz. Ekran görüntülerinde yalnızca test verileri kullanılmalıdır.
