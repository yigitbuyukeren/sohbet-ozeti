# Sohbet Özeti
- Sohbet verileri tarayıcıdan dışarı gönderilmez. Ağ isteği, analitik ve CDN ekleme; CSP korunsun.
- Gerçek sohbet verisi kullanma; yalnızca üretilmiş örnekler.
- Kullanıcı girdisini HTML olarak işleme; CSV formül enjeksiyonu korumasını sürdür.
- Bağımlılıksız yapıyı koru. Kontrol: `npm test`.
- `main` dalına push GitHub Pages yayınıdır.
