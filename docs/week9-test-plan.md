# 9. Hafta Görev ve Test Planı

## Hafta Amacı

Bu hafta sistemin güvenlik kontrolleri, giriş koruması, performansı ve otomatik test kapsamı geliştirilecektir.

## Büşra’nın Görevleri

- [ ] Kayıt ve giriş endpoint’lerine istek sınırlandırma (rate limiting) eklemek.
- [ ] Aynı hesap için art arda başarısız giriş denemelerini sınırlandırmak.
- [ ] Dosya türü, boyutu ve zorunlu alan doğrulamalarını backend tarafında güçlendirmek.
- [ ] API hata cevaplarında JWT, parola, anahtar veya sistem detayı bulunmadığını kontrol etmek.
- [ ] CORS ayarlarını yalnızca kullanılacak web ve mobil istemcileri destekleyecek şekilde düzenlemek.

### Web — Büşra

- [ ] Masaüstü, tablet ve mobil tarayıcı görünümünü düzenleme
- [ ] Form doğrulama mesajlarını iyileştirme
- [ ] Buton, renk, yazı boyutu ve boşlukları tutarlı hâle getirme

## Hava’nın Görevleri

- [ ] Kayıt, giriş, yükleme, indirme, paylaşma, izin kaldırma ve silme işlemleri için otomatik entegrasyon testleri eklemek.
- [ ] Hatalı JWT, eksik JWT, süresi geçmiş izin ve bozuk dosya senaryolarını test etmek.
- [ ] Temel API performans ölçümü yapmak.
- [ ] Test sonuçlarını ve başarısız olabilecek durumları raporlamak.
- [ ] `npm test` çıktısının tüm testlerde başarılı olduğunu doğrulamak.

## Gamze’nin Görevleri

- [ ] Mobil uygulamada geçersiz parola, hatalı giriş ve geçersiz dosya türü mesajlarını test etmek.
- [ ] Mobil ve web arayüzlerinde hata mesajlarının anlaşılır olduğunu kontrol etmek.
- [ ] Giriş, yükleme ve dosya listeleme işlemlerinin kullanıcı deneyimini gözden geçirmek.
- [ ] Performans ve güvenlik test ekran görüntülerini toplamak.
- [ ] 9. hafta rapor notlarını hazırlamak.

### Mobil — Gamze

- [ ] Farklı telefon ekranlarında görünümü kontrol etme
- [ ] Uzun dosya adlarının taşmasını düzenleme
- [ ] Yükleme/indirme durum göstergelerini iyileştirme
- [ ] Erişilebilir renk ve metin boyutlarını kontrol etme

## Genel Kabul Kriterleri

- [ ] Art arda başarısız giriş denemeleri sınırlandırılır.
- [ ] Geçersiz JWT ile istek yapılamaz.
- [ ] Uygun olmayan dosya türü veya 50 MB üzerindeki dosya reddedilir.
- [ ] API hata mesajları gizli bilgi içermez.
- [ ] Otomatik testler başarılı şekilde çalışır.
- [ ] Temel API işlemleri hedeflenen sürelerde tamamlanır.

## Hafta Sonu Çıktıları

- [ ] Rate limiting ve giriş koruması.
- [ ] Güçlendirilmiş doğrulama kontrolleri.
- [ ] Entegrasyon ve güvenlik testleri.
- [ ] Performans ölçüm notları.