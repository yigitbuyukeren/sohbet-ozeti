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


  function sure(sn) {
    if (sn == null) return '–';
    if (sn < 60) return Math.round(sn) + ' sn';
    if (sn < 3600) return Math.round(sn / 60) + ' dk';
    return Math.floor(sn / 3600) + ' sa ' + Math.round((sn % 3600) / 60) + ' dk';
  }

  const GUNLER = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  const GUN_TAM = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

  // İkinci kart: ritim (yoğunluk haritası, cevap süresi, çift mesaj). Yine yalnızca sayılar.
  function kartCiz2(canvas, s, d) {
    const W = 1080, H = 1920;
    canvas.width = W; canvas.height = H;
    const c = canvas.getContext('2d');

    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#101a24'); g.addColorStop(1, '#121411');
    c.fillStyle = g; c.fillRect(0, 0, W, H);

    c.fillStyle = '#5fa3e0'; c.font = `700 40px ${YAZI}`; c.textBaseline = 'alphabetic';
    c.fillText('SOHBETİN RİTMİ', 80, 130);
    c.fillStyle = '#9aa194'; c.font = `400 34px ${YAZI}`;
    c.fillText(`${tarih(s.first)} – ${tarih(s.last)}`, 80, 185);

    const enCok = Math.max(1, ...s.heat.flat());
    let gi = 0, sa = 0, tepe = -1;
    s.heat.forEach((satir, y) => satir.forEach((n, x) => { if (n > tepe) { tepe = n; gi = y; sa = x; } }));
    c.fillStyle = '#ecefe9'; c.font = `800 84px ${YAZI}`;
    c.fillText(`${GUN_TAM[gi]} ${String(sa).padStart(2, '0')}:00`, 80, 320);
    c.fillStyle = '#9aa194'; c.font = `400 40px ${YAZI}`;
    c.fillText('en çok konuştuğunuz an', 80, 378);

    const hx = 130, hy = 450, hucre = 38;
    GUNLER.forEach((ad, y) => {
      c.fillStyle = '#9aa194'; c.font = `400 26px ${YAZI}`; c.fillText(ad, 60, hy + y * hucre + 27);
      for (let x = 0; x < 24; x++) {
        const n = s.heat[y][x];
        c.fillStyle = n ? `rgba(95, 163, 224, ${(0.12 + 0.88 * Math.sqrt(n / enCok)).toFixed(2)})` : '#1f241e';
        yuvarlak(c, hx + x * hucre, hy + y * hucre, hucre - 4, hucre - 4, 8); c.fill();
      }
    });
    c.fillStyle = '#9aa194'; c.font = `400 24px ${YAZI}`;
    [0, 6, 12, 18].forEach(x => c.fillText(String(x).padStart(2, '0'), hx + x * hucre, hy + 7 * hucre + 32));

    const dMap = new Map(d.people.map(k => [k.name, k]));
    c.fillStyle = '#ecefe9'; c.font = `700 46px ${YAZI}`;
    c.fillText('Cevap ve ritim', 80, 880);
    s.people.slice(0, 4).forEach((k, i) => {
      const y = 950 + i * 190;
      const dk = dMap.get(k.name);
      c.fillStyle = '#ecefe9'; c.font = `600 38px ${YAZI}`;
      c.fillText(sigdir(c, k.name, 420), 80, y);
      c.fillStyle = '#9aa194'; c.font = `400 32px ${YAZI}`;
      const sag = `ort. cevap ${sure(k.medianReply)}`;
      c.fillText(sag, W - 80 - c.measureText(sag).width, y);
      if (dk) {
        const toplam = dk.replyBuckets.reduce((a, b) => a + b, 0) || 1;
        const renk = ['#2fc98a', '#5cc7c7', '#5fa3e0', '#e0c04a', '#f0a04a'];
        let x = 80;
        dk.replyBuckets.forEach((n, j) => {
          const w = (W - 160) * n / toplam;
          if (w < 1) return;
          c.fillStyle = renk[j]; c.fillRect(x, y + 20, w, 24); x += w;
        });
        c.fillStyle = '#9aa194'; c.font = `400 30px ${YAZI}`;
        c.fillText(`art arda yazma %${Math.round(dk.turnShare * 100)} · tur başına ${dk.messagesPerTurn.toFixed(1).replace('.', ',')} mesaj`, 80, y + 92);
      }
    });
    c.fillStyle = '#9aa194'; c.font = `400 26px ${YAZI}`;
    c.fillText('çubuk: cevap hızı  (yeşil hızlı → turuncu yavaş)', 80, 1760);

    c.fillStyle = '#6f766a'; c.font = `400 28px ${YAZI}`;
    c.fillText('Tarayıcıda hesaplandı, hiçbir şey gönderilmedi', 80, 1860);
  }

  const api = { kartCiz, kartCiz2 };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SohbetOzeti = Object.assign(root.SohbetOzeti || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this);
