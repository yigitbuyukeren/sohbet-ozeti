// Paylaşım görseli: 1080x1920 (hikaye boyutu). Mesaj içeriği değil, yalnızca sayılar ve unvanlar yer alır.
(function (root) {
  'use strict';

  const RENKLER = ['#2fc98a', '#f0a04a', '#5fa3e0', '#e06aae', '#a98ae8', '#e0c04a', '#5cc7c7', '#a4a99e'];
  const YAZI = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

  function sayi(n) { return Number(n).toLocaleString('tr-TR'); }

  function tarih(d) {
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function yuvarlak(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function sigdir(c, metin, genislik) {
    if (c.measureText(metin).width <= genislik) return metin;
    let m = metin;
    while (m.length > 1 && c.measureText(m + '…').width > genislik) m = m.slice(0, -1);
    return m + '…';
  }

  function kartCiz(canvas, s) {
    const W = 1080, H = 1920;
    canvas.width = W; canvas.height = H;
    const c = canvas.getContext('2d');

    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0f1f18'); g.addColorStop(1, '#121411');
    c.fillStyle = g; c.fillRect(0, 0, W, H);

    c.fillStyle = '#2fc98a';
    c.font = `700 40px ${YAZI}`;
    c.textBaseline = 'alphabetic';
    c.fillText('SOHBET ÖZETİ', 80, 130);

    c.fillStyle = '#9aa194';
    c.font = `400 34px ${YAZI}`;
    c.fillText(`${tarih(s.first)} – ${tarih(s.last)}`, 80, 185);

    c.fillStyle = '#ecefe9';
    c.font = `800 190px ${YAZI}`;
    c.fillText(sayi(s.total), 80, 400);
    c.fillStyle = '#9aa194';
    c.font = `400 44px ${YAZI}`;
    c.fillText(`mesaj, ${sayi(s.days)} günde`, 80, 465);

    const kutular = [
      [sayi(Math.round(s.perDay)), 'günde mesaj'],
      [sayi(s.streak), 'gün üst üste'],
      [sayi(s.mediaCount), 'medya'],
    ];
    kutular.forEach(([b, a], i) => {
      const x = 80 + i * 300;
      c.fillStyle = '#1f241e';
      yuvarlak(c, x, 520, 280, 150, 24); c.fill();
      c.fillStyle = '#ecefe9'; c.font = `700 60px ${YAZI}`; c.fillText(b, x + 24, 598);
      c.fillStyle = '#9aa194'; c.font = `400 28px ${YAZI}`; c.fillText(a, x + 24, 644);
    });

    c.fillStyle = '#ecefe9'; c.font = `700 46px ${YAZI}`;
    c.fillText('Kim ne kadar yazdı?', 80, 780);
    s.people.slice(0, 5).forEach((k, i) => {
      const y = 840 + i * 118;
      c.fillStyle = '#ecefe9'; c.font = `600 38px ${YAZI}`;
      c.fillText(sigdir(c, k.name, 520), 80, y);
      c.fillStyle = '#9aa194'; c.font = `400 34px ${YAZI}`;
      const yazi = `${sayi(k.messages)} · %${Math.round(k.share * 100)}`;
      c.fillText(yazi, W - 80 - c.measureText(yazi).width, y);
      c.fillStyle = '#242823'; yuvarlak(c, 80, y + 18, W - 160, 22, 11); c.fill();
      c.fillStyle = RENKLER[i % RENKLER.length];
      yuvarlak(c, 80, y + 18, Math.max(22, (W - 160) * k.share), 22, 11); c.fill();
    });

    const unvanlar = Object.entries(s.titles).slice(0, 4);
    if (unvanlar.length) {
      c.fillStyle = '#ecefe9'; c.font = `700 46px ${YAZI}`;
      c.fillText('Unvanlar', 80, 1480);
      unvanlar.forEach(([ad, unvan], i) => {
        const x = 80 + (i % 2) * 460;
        const y = 1520 + Math.floor(i / 2) * 130;
        c.fillStyle = '#1f241e'; yuvarlak(c, x, y, 440, 112, 22); c.fill();
        c.fillStyle = '#2fc98a'; c.font = `700 32px ${YAZI}`;
        c.fillText(sigdir(c, unvan, 400), x + 22, y + 46);
        c.fillStyle = '#ecefe9'; c.font = `400 30px ${YAZI}`;
        c.fillText(sigdir(c, ad, 400), x + 22, y + 88);
      });
    }

    c.fillStyle = '#6f766a'; c.font = `400 28px ${YAZI}`;
    c.fillText('Tarayıcıda hesaplandı, hiçbir şey gönderilmedi', 80, 1860);
  }

  const api = { kartCiz };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SohbetOzeti = Object.assign(root.SohbetOzeti || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this);
