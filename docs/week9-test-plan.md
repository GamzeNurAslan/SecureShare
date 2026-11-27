# 9. Hafta Görev ve Test Planı

## Hafta Amacı

Bu hafta sistemin güvenlik kontrolleri, giriş koruması, performansı ve otomatik test kapsamı geliştirilecektir.

## Büşra’nın Görevleri

- [x] Kayıt ve giriş endpoint’lerine istek sınırlandırma (rate limiting) eklemek.
- [x] Aynı hesap için art arda başarısız giriş denemelerini sınırlandırmak.
- [x] Dosya türü, boyutu ve zorunlu alan doğrulamalarını backend tarafında güçlendirmek.
- [x] API hata cevaplarında JWT, parola, anahtar veya sistem detayı bulunmadığını kontrol etmek.
- [x] CORS ayarlarını yalnızca kullanılacak web ve mobil istemcileri destekleyecek şekilde düzenlemek.

### Web — Büşra

- [x] Masaüstü, tablet ve mobil tarayıcı görünümünü düzenleme
- [x] Form doğrulama mesajlarını iyileştirme
- [x] Buton, renk, yazı boyutu ve boşlukları tutarlı hâle getirme

## Hava’nın Görevleri

- [ ] Kayıt, giriş, yükleme, indirme, paylaşma, izin kaldırma ve silme işlemleri için otomatik entegrasyon testleri eklemek.
- [ ] Hatalı JWT, eksik JWT, süresi geçmiş izin ve bozuk dosya senaryolarını test etmek.
- [ ] Temel API performans ölçümü yapmak.
- [ ] Test sonuçlarını ve başarısız olabilecek durumları raporlamak.
- [ ] `npm test` çıktısının tüm testlerde başarılı olduğunu doğrulamak.

## Gamze’nin Görevleri

- [x] Mobil uygulamada geçersiz parola, hatalı giriş ve geçersiz dosya türü mesajlarını test etmek.
- [x] Mobil ve web arayüzlerinde hata mesajlarının anlaşılır olduğunu kontrol etmek.
- [x] Giriş, yükleme ve dosya listeleme işlemlerinin kullanıcı deneyimini gözden geçirmek.
- [x] Performans ve güvenlik test ekran görüntülerini toplamak. Kanıt: `docs/week9-test-evidence.html`
- [x] 9. hafta rapor notlarını hazırlamak.

### Mobil — Gamze

- [x] Farklı telefon ekranlarında görünümü kontrol etme (360 px, 390 px ve 768 px görünümleri doğrulandı)
- [x] Uzun dosya adlarının taşmasını düzenleme
- [x] Yükleme/indirme durum göstergelerini iyileştirme
- [x] Erişilebilir renk ve metin boyutlarını kontrol etme

## Genel Kabul Kriterleri

- [x] Art arda başarısız giriş denemeleri sınırlandırılır.
- [x] Geçersiz JWT ile istek yapılamaz.
- [x] Uygun olmayan dosya türü veya 50 MB üzerindeki dosya reddedilir.
- [x] API hata mesajları gizli bilgi içermez.
- [ ] Otomatik testler başarılı şekilde çalışır.
- [x] Temel API işlemleri hedeflenen sürelerde tamamlanır. Kanıt: `docs/week9-test-evidence.html` (10/10 `/health` isteği, ortalama 9,51 ms)

## Hafta Sonu Çıktıları

- [x] Rate limiting ve giriş koruması.
- [x] Güçlendirilmiş doğrulama kontrolleri.
- [ ] Entegrasyon ve güvenlik testleri.
- [x] Performans ölçüm notları. Kanıt: `docs/week9-test-evidence.html`
