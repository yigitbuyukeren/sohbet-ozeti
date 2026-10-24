// Ayrıntılı analiz: konuşma ritmi, zaman çizgisi, ifadeler, ayırt edici kelimeler, bağlantılar, duygu, cevap ağı.
// hesapla()'dan bağımsızdır; aynı mesaj listesini alır. DOM'a dokunmaz.
(function (root) {
  'use strict';

  const ortak = typeof require === 'function' ? { ...require('./stats.js'), ...require('./duygu.js') } : root.SohbetOzeti;
  const { DURDURMA, duyguPuani } = ortak;

  const TUR_SINIRI = 10 * 60;          // aynı kişinin mesajları arasında bu kadar boşluk varsa yeni "tur"
  const CEVAP_SINIRI = 6 * 3600;
  const EN_FAZLA_KISI = 8;

  const CEVAP_ESIKLERI = [60, 300, 1800, 7200, CEVAP_SINIRI];
  const CEVAP_ETIKETLERI = ['1 dk içinde', '1–5 dk', '5–30 dk', '30 dk–2 sa', '2–6 sa'];
  const UZUNLUK_ESIKLERI = [1, 3, 7, 15, Infinity];
  const UZUNLUK_ETIKETLERI = ['1 kelime', '2–3', '4–7', '8–15', '16+'];

  const IFADELER = [
    ['Sevgi', /seni seviyorum|seviyorum|aşkım|canım|tatlım|bitanem|hayatım|kalbim/giu],
    ['Teşekkür', /teşekkür|sağ ?ol|eyvallah|mersi|eline sağlık/giu],
    ['Özür', /özür|pardon|kusura bakma|affet/giu],
    ['Selamlaşma', /günaydın|iyi geceler|iyi akşamlar|iyi günler|merhaba|\bselam\b|\bnaber\b|nasılsın/giu],
    ['Kahkaha', /(?:ha|he|ah|eh){2,}|\blol\b|\bxd+\b|[😂🤣😹]/giu],
  ];

  const BAGLANTI = /(?:https?:\/\/|www\.)[^\s<>"]+/giu;

  function bucket(deger, esikler) {
    for (let i = 0; i < esikler.length; i++) if (deger <= esikler[i]) return i;
    return esikler.length - 1;
  }

  function haftaBasi(d) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return x;
  }

  function anahtar(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function ayAnahtari(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  function alanAdi(url) {
    try {
      return new URL(/^https?:/i.test(url) ? url : 'https://' + url).hostname.replace(/^www\./, '').toLowerCase();
    } catch (e) { return null; }
  }

  function en(harita, n, alt) {
    return [...harita.entries()].filter(x => x[1] >= (alt || 1)).sort((a, b) => b[1] - a[1]).slice(0, n);
  }

  function yeni(ad) {
    return {
      name: ad,
      turns: 0, doubleTurns: 0, longestBurst: 0,
      replyBuckets: new Array(CEVAP_ETIKETLERI.length).fill(0),
      lengthBuckets: new Array(UZUNLUK_ETIKETLERI.length).fill(0),
      phrases: Object.fromEntries(IFADELER.map(([a]) => [a, 0])),
      questions: 0, exclaims: 0, links: 0,
      pos: 0, neg: 0, scored: 0,
      tokens: new Map(), tokenTotal: 0,
    };
  }

  function derinHesapla(mesajlar) {
    const msgs = mesajlar.filter(m => m.type !== 'system');
    if (!msgs.length) return null;

    const kisiler = new Map();
    const al = (ad) => { if (!kisiler.has(ad)) kisiler.set(ad, yeni(ad)); return kisiler.get(ad); };

    const cevapGenel = new Array(CEVAP_ETIKETLERI.length).fill(0);
    const uzunlukGenel = new Array(UZUNLUK_ETIKETLERI.length).fill(0);
    const baslangicSaatleri = new Array(24).fill(0);
    const alanlar = new Map();
    const ikililer = new Map();
    const agMap = new Map(); // "kim→kime" → sayı
    const haftalik = new Map();
    const duyguAylik = new Map();
    let toplamBaglanti = 0;

    let onceki = null;
    let turUzunlugu = 0;
    const turuKapat = () => {
      if (!onceki || !turUzunlugu) return;
      const k = al(onceki.sender);
      k.turns++;
      if (turUzunlugu >= 2) k.doubleTurns++;
      if (turUzunlugu > k.longestBurst) k.longestBurst = turUzunlugu;
    };

    msgs.forEach((m, i) => {
      const k = al(m.sender);
      const hb = anahtar(haftaBasi(m.t));
      haftalik.set(hb, (haftalik.get(hb) || 0) + 1);

      // tur (art arda yazma) hesabı
      if (onceki && onceki.sender === m.sender && (m.ms - onceki.ms) / 1000 <= TUR_SINIRI) {
        turUzunlugu++;
      } else {
        turuKapat();
        turUzunlugu = 1;
      }

      if (i === 0 || (m.ms - onceki.ms) / 1000 > CEVAP_SINIRI) baslangicSaatleri[m.t.getHours()]++;

      // cevap süresi dağılımı: konuşan kişi değişince
      if (onceki && onceki.sender !== m.sender) {
        const sn = (m.ms - onceki.ms) / 1000;
        if (sn <= CEVAP_SINIRI) {
          const b = bucket(sn, CEVAP_ESIKLERI);
          k.replyBuckets[b]++; cevapGenel[b]++;
          const anahtarAg = m.sender + '\u0000' + onceki.sender;
          agMap.set(anahtarAg, (agMap.get(anahtarAg) || 0) + 1);
        }
      }

      if (m.text) {
        const metin = m.text;
        const kucuk = metin.toLocaleLowerCase('tr');
        const kelimeler = kucuk.split(/[^\p{L}\p{N}']+/u).filter(Boolean);

        if (m.type === 'text') {
          const b = bucket(kelimeler.length, UZUNLUK_ESIKLERI);
          k.lengthBuckets[b]++; uzunlukGenel[b]++;
        }

        for (const [ad, re] of IFADELER) {
          const e = kucuk.match(re);
          if (e) k.phrases[ad] += e.length;
        }
        if (metin.includes('?')) k.questions++;
        if (metin.includes('!')) k.exclaims++;

        const baglantilar = metin.match(BAGLANTI);
        if (baglantilar) {
          for (const b of baglantilar) {
            k.links++; toplamBaglanti++;
            const alan = alanAdi(b.replace(/[).,;!?]+$/, ''));
            if (alan) alanlar.set(alan, (alanlar.get(alan) || 0) + 1);
          }
        }

        const temiz = kelimeler.filter(w => w.length >= 3 && !DURDURMA.has(w) && !/^\d+$/.test(w) && !/^(https?|www)/.test(w));
        for (const w of temiz) { k.tokens.set(w, (k.tokens.get(w) || 0) + 1); k.tokenTotal++; }
        for (let j = 0; j + 1 < kelimeler.length; j++) {
          const a = kelimeler[j], b = kelimeler[j + 1];
          if (a.length < 3 || b.length < 3 || DURDURMA.has(a) || DURDURMA.has(b) || /^\d+$/.test(a + b)) continue;
          const o = a + ' ' + b;
          ikililer.set(o, (ikililer.get(o) || 0) + 1);
        }

        const puan = duyguPuani(metin);
        const ay = ayAnahtari(m.t);
        const ayKaydi = duyguAylik.get(ay) || { pos: 0, neg: 0, n: 0 };
        ayKaydi.n++;
        k.scored++;
        if (puan > 0) { k.pos++; ayKaydi.pos++; } else if (puan < 0) { k.neg++; ayKaydi.neg++; }
        duyguAylik.set(ay, ayKaydi);
      }
      onceki = m;
    });
    turuKapat();

    // ilk 8 kişi, mesaj sayısına göre
    const mesajSayisi = new Map();
    msgs.forEach(m => mesajSayisi.set(m.sender, (mesajSayisi.get(m.sender) || 0) + 1));
    const kisiListesi = [...kisiler.values()].sort((a, b) => (mesajSayisi.get(b.name) || 0) - (mesajSayisi.get(a.name) || 0)).slice(0, EN_FAZLA_KISI);

    // ayırt edici kelimeler: kişinin diğerlerine göre fazladan kullandığı kelimeler (log oran)
    const genelToken = new Map();
    let genelToplam = 0;
    for (const k of kisiler.values()) {
      for (const [w, n] of k.tokens) genelToken.set(w, (genelToken.get(w) || 0) + n);
      genelToplam += k.tokenTotal;
    }
    kisiListesi.forEach((k) => {
      k.turnShare = k.turns ? k.doubleTurns / k.turns : 0;
      k.messagesPerTurn = k.turns ? (mesajSayisi.get(k.name) || 0) / k.turns : 0;
      k.distinctive = [];
      const digerToplam = genelToplam - k.tokenTotal;
      if (kisiler.size >= 2 && digerToplam > 0 && k.tokenTotal > 0) {
        const adaylar = [];
        for (const [w, n] of k.tokens) {
          if (n < 3) continue;
          const diger = (genelToken.get(w) || 0) - n;
          const skor = Math.log((n + 1) / (k.tokenTotal + 1)) - Math.log((diger + 1) / (digerToplam + 1));
          if (skor > 0) adaylar.push([w, skor, n]);
        }
        k.distinctive = adaylar.sort((a, b) => b[1] - a[1]).slice(0, 5).map(([w, , n]) => ({ w, n }));
      }
      k.positiveShare = k.scored ? k.pos / k.scored : 0;
      k.negativeShare = k.scored ? k.neg / k.scored : 0;
    });

    // haftalık seri (boş haftalar dahil)
    const ilkHafta = haftaBasi(msgs[0].t);
    const sonHafta = haftaBasi(msgs[msgs.length - 1].t);
    const haftalikSeri = [];
    for (const d = new Date(ilkHafta); d <= sonHafta; d.setDate(d.getDate() + 7)) {
      haftalikSeri.push({ key: anahtar(d), count: haftalik.get(anahtar(d)) || 0 });
    }
    let enYogun = haftalikSeri[0], enSessiz = null;
    for (const h of haftalikSeri) if (h.count > enYogun.count) enYogun = h;
    if (haftalikSeri.length > 2) {
      // ilk ve son hafta kısmi olabilir, bu yüzden sessiz hafta ararken dışarıda bırakılır
      enSessiz = haftalikSeri.slice(1, -1).reduce((a, b) => (b.count < a.count ? b : a));
    }

    const duyguSeri = [...duyguAylik.entries()].sort().map(([key, v]) => ({
      key, n: v.n, net: v.n ? (v.pos - v.neg) / v.n : 0, pos: v.pos, neg: v.neg,
    }));

    // cevap ağı (yalnızca görünen kişiler)
    const adlar = kisiListesi.map(k => k.name);
    const ag = adlar.map(a => adlar.map(b => (a === b ? 0 : (agMap.get(a + '\u0000' + b) || 0))));

    kisiListesi.forEach(k => { delete k.tokens; });

    return {
      people: kisiListesi,
      replyLabels: CEVAP_ETIKETLERI, replyAll: cevapGenel,
      lengthLabels: UZUNLUK_ETIKETLERI, lengthAll: uzunlukGenel,
      phraseNames: IFADELER.map(([a]) => a),
      startHours: baslangicSaatleri,
      weekly: haftalikSeri, busiestWeek: enYogun, quietestWeek: enSessiz,
      topBigrams: en(ikililer, 10, 3).map(([w, n]) => ({ w, n })),
      links: { total: toplamBaglanti, domains: en(alanlar, 8).map(([d, n]) => ({ d, n })) },
      sentiment: duyguSeri,
      network: { names: adlar, matrix: ag },
    };
  }

  const api = { derinHesapla };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SohbetOzeti = Object.assign(root.SohbetOzeti || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this);
