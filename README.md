<div align="center">

# 💬 Sohbet Özeti

**WhatsApp sohbetini sürükle bırak: kim ne kadar yazıyor, en çok ne zaman konuşuyorsunuz, kim geç cevap veriyor?**

[![Lisans: MIT](https://img.shields.io/badge/lisans-MIT-139a63?style=flat-square&labelColor=121411)](LICENSE)
![Bağımlılık](https://img.shields.io/badge/ba%C4%9F%C4%B1ml%C4%B1l%C4%B1k-0-139a63?style=flat-square&labelColor=121411)
![Ağ isteği](https://img.shields.io/badge/a%C4%9F%20iste%C4%9Fi-0-139a63?style=flat-square&labelColor=121411)
[![Testler](https://img.shields.io/github/actions/workflow/status/yigitbuyukeren/sohbet-ozeti/test.yml?style=flat-square&labelColor=121411&label=testler)](https://github.com/yigitbuyukeren/sohbet-ozeti/actions)

🇹🇷 [Türkçe](#-türkçe) &nbsp;·&nbsp; 🇬🇧 [English](#-english)

</div>

<details open>
<summary><h2>🇹🇷 Türkçe</h2></summary>

Dışa aktardığın WhatsApp sohbet dosyasını (`.txt` ya da `.zip`) sayfaya bırakırsın, tarayıcın analiz eder ve sonucu gösterir. **Sunucu, hesap, yükleme yok; sohbetin cihazından çıkmaz.**

| 🔒 **%100 yerel** | 📊 **Zengin özet** | 🖼️ **Paylaşılabilir** | 🧩 **Bağımlılıksız** |
|:---:|:---:|:---:|:---:|
| Sayfa ağa bağlanamaz, güvenlik politikasıyla kilitli | Yoğunluk haritası, cevap süresi, kelimeler, emojiler | Hikâye boyutunda görsel, içinde mesaj yok | Saf JavaScript, kütüphane yok |

### 🚀 Nasıl kullanılır
1. 📱 WhatsApp'ta sohbeti aç → **Sohbeti dışa aktar** → **Medyasız**.
2. 🌐 Sayfayı aç (aşağıya bak) ve dosyayı üstüne bırak. İstersen önce **Örnek sohbetle dene** düğmesine bas.
3. 🖼️ Beğendiğin özeti **PNG** olarak indir.

Sayfayı kendi bilgisayarında açmak için:

```bash
python3 -m http.server 8000
```

Sonra tarayıcıda `http://localhost:8000` adresini aç. (`index.html`'e çift tıklamak da çoğu tarayıcıda çalışır; bazıları dosya kaynaklı sayfalarda güvenlik politikasını farklı uygular.)

### 📊 Neler çıkıyor
- Toplam mesaj, gün sayısı, günde ortalama, art arda konuşulan gün serisi
- Kişi başına mesaj payı, kelime sayısı, mesaj başına kelime, **ortalama cevap süresi**
- **Haftanın günü × saat ısı haritası** ve aylık mesaj grafiği
- En sık kelimeler (Türkçe bağlaçlar elenir) ve en sevilen emojiler
- Konuşmayı kimin başlattığı, en uzun sessizlik, en yoğun gün, medya ve silinen mesaj sayıları
- Kişiye göre eğlenceli unvanlar: *Gece Kuşu, Kahkaha Makinesi, Sesli Mesaj Ustası, Roman Yazarı…*

### 🔧 Nasıl çalışıyor
- **Ayrıştırıcı** ([`src/parser.js`](src/parser.js)): Android (`24.10.2026 14:32 - Ali: …`) ve iOS (`[24.10.26 14:32:05] Ali: …`) biçimlerini, 12/24 saati ve gün/ay sırasını kendisi ayırt eder. Gün/ay sırası tüm dosyadaki 12'den büyük sayılara bakılarak seçilir, belirsizse Türkçe düzen (gün önce) varsayılır. Çok satırlı mesajları birleştirir; medya, silinen ve sistem mesajlarını ayırır.
- **Zip okuyucu** ([`src/zip.js`](src/zip.js)): `.zip` içindeki sohbeti, tarayıcının `DecompressionStream`'i ile açar; kütüphane gerekmez.
- **İstatistikler** ([`src/stats.js`](src/stats.js)): DOM'a dokunmayan saf fonksiyon, bu yüzden Node ile test edilir.
- **Cevap süresi:** konuşan kişi değiştiğinde ve aradaki süre 6 saatten kısaysa ölçülür; ortalama yerine **medyan** alınır, bir kez uzun beklemek sonucu bozmaz. 6 saatten uzun sessizlikten sonraki mesaj yeni bir konuşma sayılır.
- **Grafikler** elle yazılmış SVG; paylaşım görseli canvas ile çizilir.

### 🔒 Gizlilik
- `index.html` bir **içerik güvenlik politikası** taşır (`connect-src 'none'`): sayfa, sen istesen bile dışarıya istek atamaz.
- Hiçbir analitik, font ya da CDN yoktur; her şey bu depodaki dosyalardan yüklenir.
- Analizden sonra sayfa, bu sırada yapılan ağ isteği sayısını gösterir (olması gereken: 0).
- Örnek sohbet ve testlerdeki veriler uydurmadır; gerçek bir sohbet depoda bulunmaz.

### 🛠️ Geliştirme
```bash
npm test        # node --test, bağımlılık kurmak gerekmez (Node 18+)
```
Testler ayrıştırıcıyı (iki biçim, saat dilimi, belirsiz tarih, çok satır, medya), zip okuyucuyu ve istatistikleri kapsar.

### 📜 Lisans
[MIT](LICENSE): kullanabilir, değiştirebilir, dağıtabilirsin. ⭐ İşine yaradıysa yıldız vermeyi unutma!

</details>

<details>
<summary><h2>🇬🇧 English</h2></summary>

Drop an exported WhatsApp chat (`.txt` or `.zip`) on the page and your browser turns it into a summary: who writes how much, when you talk, who replies slowly. **No server, no account, no upload; the chat never leaves your device.** The interface is in Turkish.

**What you get:** message totals and streaks, per-person share, words per message and median reply time, a weekday × hour heatmap, monthly chart, top words and emoji, who starts conversations, longest silence, and playful titles. A story-sized PNG (numbers only, no message text) can be downloaded.

**Run it:** `python3 -m http.server 8000`, then open `http://localhost:8000`. Try **"Örnek sohbetle dene"** for a fake demo chat.

**How it works:** a parser for the Android and iOS export formats (12/24-hour clocks, day/month order inferred from the data, multi-line messages), a dependency-free zip reader built on `DecompressionStream`, and a pure statistics module covered by `node --test`. Charts are hand-written SVG.

**Privacy:** `index.html` ships a Content-Security-Policy with `connect-src 'none'`, so the page cannot make network requests. No analytics, fonts or CDNs. After analysis the page shows the number of requests made during it (expected: 0).

Run the tests with `npm test` (Node 18+, nothing to install). Released under the [MIT License](LICENSE).

</details>
