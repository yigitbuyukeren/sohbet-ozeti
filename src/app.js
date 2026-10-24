(function () {
  'use strict';
  const { parseChat, hesapla, derinHesapla, zipdenMetin, ornekSohbet, kartCiz, kartCiz2 } = window.SohbetOzeti;

  const GUNLER = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  const GUN_TAM = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
  const AYLAR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const SVG = 'http://www.w3.org/2000/svg';

  const $ = (id) => document.getElementById(id);
  const sayi = (n) => Number(n).toLocaleString('tr-TR');
  const yuzde = (x) => '%' + Math.round(x * 100);
  const ondalik = (x) => x.toFixed(1).replace('.', ',');
  const tarih = (d) => d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  const tarihKisa = (d) => d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
  const gunKodu = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const gunKodundan = (k) => { const [y, a, g] = k.split('-').map(Number); return new Date(y, a - 1, g); };

  function sure(sn) {
    if (sn == null) return '–';
    if (sn < 60) return Math.round(sn) + ' sn';
    if (sn < 3600) return Math.round(sn / 60) + ' dk';
    if (sn < 86400) return Math.floor(sn / 3600) + ' sa ' + Math.round((sn % 3600) / 60) + ' dk';
    return Math.floor(sn / 86400) + ' gün ' + Math.floor((sn % 86400) / 3600) + ' sa';
  }

  function h(etiket, ozellik, ...cocuklar) {
    const e = document.createElement(etiket);
    for (const [k, v] of Object.entries(ozellik || {})) {
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else e.setAttribute(k, v);
    }
    for (const c of cocuklar.flat()) if (c != null) e.append(c);
    return e;
  }

  function hs(etiket, ozellik, ...cocuklar) {
    const e = document.createElementNS(SVG, etiket);
    for (const [k, v] of Object.entries(ozellik || {})) {
      if (k === 'text') e.textContent = v; else e.setAttribute(k, v);
    }
    for (const c of cocuklar.flat()) if (c != null) e.append(c);
    return e;
  }

  function kart(baslik, not, ...icerik) {
    return h('section', { class: 'kart' }, h('h2', { text: baslik }), not ? h('p', { class: 'not', text: not }) : null, ...icerik);
  }

  function kutu(b, a) {
    return h('div', { class: 'say' }, h('b', { text: b }), h('span', { text: a }));
  }

  // ---------- durum ----------
  const durum = { ham: null, secili: new Set(), bas: null, bit: null, ag: 0, son: null };

  // ---------- genel grafikler ----------
  function cubukGrafik(seri, etiketle, adim, ipucu) {
    const en = 720, boy = 170, alt = 22;
    const n = seri.length;
    const enCok = Math.max(1, ...seri.map(x => x.count));
    const genislik = (en - 8) / n;
    const svg = hs('svg', { viewBox: `0 0 ${en} ${boy}`, role: 'img' });
    seri.forEach((m, i) => {
      const yuk = (boy - alt - 6) * (m.count / enCok);
      svg.append(hs('rect', {
        x: 4 + i * genislik + genislik * 0.12, y: boy - alt - yuk, width: Math.max(1.5, genislik * 0.76), height: Math.max(m.count ? 2 : 0, yuk),
        rx: Math.min(3, genislik * 0.2), class: 'cubuk',
      }, hs('title', { text: ipucu(m) })));
      if (i % adim === 0) svg.append(hs('text', { x: 4 + i * genislik, y: boy - 6, text: etiketle(m, i) }));
    });
    return svg;
  }

  function farkGrafik(seri, etiketle, adim) {
    const en = 720, boy = 190, orta = 85;
    const n = seri.length;
    const sinir = Math.max(0.05, ...seri.map(x => Math.abs(x.net)));
    const genislik = (en - 8) / n;
    const svg = hs('svg', { viewBox: `0 0 ${en} ${boy}`, role: 'img', 'aria-label': 'Aylara göre duygu dengesi' });
    svg.append(hs('line', { x1: 4, x2: en - 4, y1: orta, y2: orta, stroke: 'currentColor', 'stroke-opacity': '0.25' }));
    seri.forEach((m, i) => {
      const yuk = (orta - 8) * (Math.abs(m.net) / sinir);
      svg.append(hs('rect', {
        x: 4 + i * genislik + genislik * 0.12, y: m.net >= 0 ? orta - yuk : orta, width: Math.max(2, genislik * 0.76), height: Math.max(1, yuk),
        rx: 3, class: m.net >= 0 ? 'cubuk' : 'cubuk-eksi',
      }, hs('title', { text: `${etiketle(m)}: olumlu ${sayi(m.pos)}, olumsuz ${sayi(m.neg)} (${sayi(m.n)} mesaj)` })));
      if (i % adim === 0) svg.append(hs('text', { x: 4 + i * genislik, y: boy - 6, text: etiketle(m) }));
    });
    return svg;
  }

  function yigilmisSatirlar(kisiler, deger, etiketler) {
    const lejant = h('div', { class: 'lejant' }, etiketler.map((e, j) => h('span', {}, h('i', { class: 'sw bk' + j }), e)));
    const satirlar = kisiler.map((k, i) => {
      const dizi = deger(k);
      const toplam = dizi.reduce((a, b) => a + b, 0);
      const svg = hs('svg', { viewBox: '0 0 720 22', role: 'img', 'aria-label': `${k.name} dağılımı` });
      let x = 0;
      dizi.forEach((n, j) => {
        const w = toplam ? 720 * n / toplam : 0;
        if (w <= 0) return;
        svg.append(hs('rect', { x: x.toFixed(2), y: 0, width: w.toFixed(2), height: 22, class: 'k' + j },
          hs('title', { text: `${etiketler[j]}: ${sayi(n)} (${yuzde(n / toplam)})` })));
        x += w;
      });
      return h('div', { class: 'yigin' }, h('span', { class: 'kisi-ad', text: k.name }), svg);
    });
    return [lejant, ...satirlar];
  }

  // ---------- kartlar ----------
  function ozetKarti(s, kisiAdedi) {
    return h('section', { class: 'kart' },
      h('div', { class: 'ozet-ust' },
        h('div', {}, h('h2', { text: `${kisiAdedi} kişi, ${sayi(s.total)} mesaj` }),
          h('p', { text: `${tarih(s.first)} – ${tarih(s.last)}` }))),
      h('div', { class: 'say-izgara' },
        kutu(sayi(s.days), 'günlük süre'),
        kutu(sayi(Math.round(s.perDay)), 'günde ortalama mesaj'),
        kutu(sayi(s.activeDays), 'konuşulan gün'),
        kutu(sayi(s.streak), 'gün üst üste konuşma'),
        kutu(sayi(s.mediaCount), 'medya (foto, ses…)'),
        kutu(sayi(s.deletedCount), 'silinen mesaj')));
  }

  function kisiKartlari(s, d) {
    const dMap = new Map(d.people.map(k => [k.name, k]));
    const cubuklar = s.people.map((k, i) =>
      h('div', { class: 'kisi' },
        h('span', { class: 'kisi-ad', text: k.name }),
        h('div', { class: 'kisi-cubuk' }, (() => {
          const c = h('i', { class: 'b' + i });
          c.style.width = Math.max(1, k.share * 100).toFixed(1) + '%';
          return c;
        })()),
        h('span', { class: 'kisi-sayi', text: `${sayi(k.messages)} · ${yuzde(k.share)}` })));

    const kartlar = s.people.map((k, i) => {
      const dk = dMap.get(k.name);
      const satirlar = [
        ['Kelime', sayi(k.words)],
        ['Mesaj başına kelime', ondalik(k.avgWords)],
        ['Ortalama cevap süresi', sure(k.medianReply)],
        ['Konuşmayı başlatma', sayi(k.starters)],
        ['Fotoğraf / ses', `${sayi(k.media.photo)} / ${sayi(k.media.audio)}`],
        ['Emoji', sayi(k.emojiCount)],
        ['Gece (00-05) mesajı', sayi(k.night)],
      ];
      if (dk) {
        satirlar.push(['Art arda yazma', `${yuzde(dk.turnShare)} (en uzun ${sayi(dk.longestBurst)})`]);
        satirlar.push(['Soru içeren mesaj', sayi(dk.questions)]);
      }
      return h('div', { class: 'kisi-kart r' + i },
        h('h3', { text: k.name }),
        s.titles[k.name] ? h('span', { class: 'unvan', text: s.titles[k.name] }) : null,
        h('dl', {}, satirlar.map(([a, b]) => [h('dt', { text: a }), h('dd', { text: b })]).flat()),
        dk && dk.distinctive.length
          ? h('p', { class: 'ayirt' }, h('b', { text: 'Ona özgü kelimeler: ' }), dk.distinctive.map(x => x.w).join(', '))
          : null);
    });

    return kart('Kim ne kadar yazıyor?', s.otherPeople > 0 ? `En çok yazan ${s.people.length} kişi gösteriliyor (+${s.otherPeople} kişi daha).` : null,
      cubuklar, h('div', { class: 'kisi-kartlar' }, kartlar));
  }

  function ritimKarti(s, d) {
    const kisiler = d.people;
    const saatSeri = d.startHours.map((n, i) => ({ count: n, label: String(i).padStart(2, '0') }));
    const enSaat = d.startHours.indexOf(Math.max(...d.startHours));
    const cift = [...kisiler].sort((a, b) => b.turnShare - a.turnShare)[0];
    return kart('Konuşma ritmi',
      'Cevap hızı, mesaj uzunluğu ve konuşmayı ne zaman başlattığınız.',
      h('h3', { class: 'alt-baslik', text: 'Cevap ne kadar sürede geliyor?' }),
      yigilmisSatirlar(kisiler, k => k.replyBuckets, d.replyLabels),
      h('h3', { class: 'alt-baslik', text: 'Mesajlar kaç kelime?' }),
      yigilmisSatirlar(kisiler, k => k.lengthBuckets, d.lengthLabels),
      h('h3', { class: 'alt-baslik', text: 'Yeni konuşma hangi saatte başlıyor?' }),
      (() => {
        const svg = cubukGrafik(saatSeri, x => x.label, 3, x => `${x.label}:00 – ${sayi(x.count)} konuşma`);
        svg.setAttribute('aria-label', 'Saate göre konuşma başlangıçları');
        return svg;
      })(),
      h('ul', { class: 'maddeler' },
        h('li', {}, h('b', { text: 'En sık başlangıç saati' }), h('span', { text: `${String(enSaat).padStart(2, '0')}:00 civarı (6 saatten uzun sessizlikten sonra)` })),
        cift && cift.turns ? h('li', {}, h('b', { text: 'En çok art arda yazan' }), h('span', { text: `${cift.name} · mesajlarının ${yuzde(cift.turnShare)} turunda arka arkaya yazıyor` })) : null));
  }

  function isiHaritasi(s) {
    const hucre = 26, solBosluk = 36, ustBosluk = 18;
    const en = solBosluk + 24 * hucre, boy = ustBosluk + 7 * hucre;
    const enCok = Math.max(1, ...s.heat.flat());
    const svg = hs('svg', { viewBox: `0 0 ${en} ${boy}`, role: 'img', 'aria-label': 'Haftanın günü ve saate göre mesaj yoğunluğu' });
    for (let sa = 0; sa < 24; sa += 3) svg.append(hs('text', { x: solBosluk + sa * hucre + 2, y: 11, text: String(sa).padStart(2, '0') }));
    GUNLER.forEach((g, gi) => {
      svg.append(hs('text', { x: 0, y: ustBosluk + gi * hucre + 17, text: g }));
      for (let sa = 0; sa < 24; sa++) {
        const n = s.heat[gi][sa];
        const r = hs('rect', {
          x: solBosluk + sa * hucre + 1, y: ustBosluk + gi * hucre + 1, width: hucre - 2, height: hucre - 2, rx: 5,
          class: n ? 'hucre' : 'hucre-bos',
        }, hs('title', { text: `${GUN_TAM[gi]} ${String(sa).padStart(2, '0')}:00 – ${sayi(n)} mesaj` }));
        if (n) r.setAttribute('fill-opacity', (0.12 + 0.88 * Math.sqrt(n / enCok)).toFixed(2));
        svg.append(r);
      }
    });
    const [gi, sa] = s.heat.reduce((en, satir, g) => satir.reduce((e, n, i) => (n > e[2] ? [g, i, n] : e), en), [0, 0, -1]);
    return kart('Ne zaman konuşuyorsunuz?', `En yoğun an: ${GUN_TAM[gi]} günleri ${String(sa).padStart(2, '0')}:00 civarı.`, svg);
  }

  function zamanKarti(s, d) {
    const aySeri = s.monthly;
    const haftaSeri = d.weekly;
    const haftaEtiket = (m) => { const t = gunKodundan(m.key); return `${t.getDate()} ${AYLAR[t.getMonth()]}`; };
    const ayEtiket = (m) => { const [y, a] = m.key.split('-'); return `${AYLAR[+a - 1]} ${y.slice(2)}`; };
    const haftaAralik = (m) => { const t = gunKodundan(m.key); const b = new Date(t); b.setDate(b.getDate() + 6); return `${tarihKisa(t)} – ${tarihKisa(b)}`; };
    const maddeler = [h('li', {}, h('b', { text: 'En yoğun hafta' }), h('span', { text: `${haftaAralik(d.busiestWeek)} · ${sayi(d.busiestWeek.count)} mesaj` }))];
    if (d.quietestWeek) maddeler.push(h('li', {}, h('b', { text: 'En sessiz hafta' }), h('span', { text: `${haftaAralik(d.quietestWeek)} · ${sayi(d.quietestWeek.count)} mesaj` })));
    return kart('Zaman çizgisi', 'Ay ve hafta bazında mesaj yoğunluğu. Çubuğun üstüne gelirsen sayı görünür.',
      h('h3', { class: 'alt-baslik', text: 'Aylık' }),
      cubukGrafik(aySeri, ayEtiket, Math.ceil(aySeri.length / 10), m => `${ayEtiket(m)}: ${sayi(m.count)} mesaj`),
      aySeri.length > 2 ? [
        h('h3', { class: 'alt-baslik', text: 'Haftalık' }),
        cubukGrafik(haftaSeri, haftaEtiket, Math.ceil(haftaSeri.length / 10), m => `${haftaAralik(m)}: ${sayi(m.count)} mesaj`),
      ] : null,
      h('ul', { class: 'maddeler' }, maddeler));
  }

  function ifadeKarti(s, d) {
    const toplamlar = d.phraseNames.map(a => d.people.reduce((t, k) => t + k.phrases[a], 0));
    if (!toplamlar.some(Boolean)) return null;
    const tablo = h('table', { class: 'tablo' },
      h('thead', {}, h('tr', {}, h('th', { text: '' }), d.people.map(k => h('th', { text: k.name })))),
      h('tbody', {}, d.phraseNames.map((a, i) => (toplamlar[i]
        ? h('tr', {}, h('th', { text: a }), d.people.map(k => h('td', { text: sayi(k.phrases[a]) })))
        : null))));
    return kart('Sık söylenenler', 'Sevgi, teşekkür, özür, selamlaşma ve kahkaha sözcüklerinin sayısı.', h('div', { class: 'tablo-kap' }, tablo));
  }

  function kelimeKarti(s) {
    const en = Math.max(1, ...s.topWords.map(x => x.n));
    const satirlar = s.topWords.map(x => {
      const cubuk = h('i');
      cubuk.style.width = (x.n / en * 100).toFixed(0) + '%';
      return h('div', { class: 'kelime' }, h('span', { text: x.w }), h('div', {}, cubuk), h('em', { text: sayi(x.n) }));
    });
    return kart('En sık kelimeler', 'Bağlaçlar ve çok kısa kelimeler sayılmadı.', satirlar);
  }

  function ikiliKarti(d) {
    if (!d.topBigrams.length) return null;
    const en = Math.max(1, ...d.topBigrams.map(x => x.n));
    return kart('Sık geçen kelime çiftleri', 'En az 3 kez geçen ikili öbekler.', d.topBigrams.map(x => {
      const cubuk = h('i');
      cubuk.style.width = (x.n / en * 100).toFixed(0) + '%';
      return h('div', { class: 'kelime' }, h('span', { text: x.w }), h('div', {}, cubuk), h('em', { text: sayi(x.n) }));
    }));
  }

  function emojiKarti(s) {
    return kart('En sevilen emojiler', null,
      s.topEmoji.length
        ? h('div', { class: 'emojiler' }, s.topEmoji.map(x => h('span', {}, x.e, h('small', { text: sayi(x.n) }))))
        : h('p', { class: 'not', text: 'Bu sohbette emoji bulunamadı.' }));
  }

  function baglantiKarti(d) {
    if (!d.links.total) return null;
    const en = Math.max(1, ...d.links.domains.map(x => x.n));
    return kart('Paylaşılan bağlantılar', `Toplam ${sayi(d.links.total)} bağlantı. Adresler değil, yalnızca alan adları sayıldı.`,
      d.links.domains.map(x => {
        const cubuk = h('i');
        cubuk.style.width = (x.n / en * 100).toFixed(0) + '%';
        return h('div', { class: 'kelime' }, h('span', { text: x.d }), h('div', {}, cubuk), h('em', { text: sayi(x.n) }));
      }));
  }

  function duyguKarti(d) {
    const puanli = d.people.filter(k => k.scored > 0);
    if (!puanli.length) return null;
    const satirlar = puanli.map((k, i) => {
      const svg = hs('svg', { viewBox: '0 0 720 22', role: 'img', 'aria-label': `${k.name} duygu dağılımı` });
      const n = k.scored;
      const yok = n - k.pos - k.neg;
      let x = 0;
      [[k.pos, 'k0', 'olumlu'], [yok, 'k-notr', 'nötr'], [k.neg, 'k4', 'olumsuz']].forEach(([v, sinif, ad]) => {
        const w = 720 * v / n;
        if (w <= 0) return;
        svg.append(hs('rect', { x: x.toFixed(2), y: 0, width: w.toFixed(2), height: 22, class: sinif }, hs('title', { text: `${ad}: ${sayi(v)} (${yuzde(v / n)})` })));
        x += w;
      });
      return h('div', { class: 'yigin' }, h('span', { class: 'kisi-ad', text: k.name }), svg);
    });
    const ayAd = (m) => { const [y, a] = m.key.split('-'); return `${AYLAR[+a - 1]} ${y.slice(2)}`; };
    return kart('Duygu dengesi (eğlence amaçlı)',
      'Küçük bir Türkçe sözlükle ve emojilerle yapılan kaba bir ölçüm. İroniyi, bağlamı ve kısaltmaları anlamaz; kesin bir sonuç olarak alma.',
      h('div', { class: 'lejant' },
        h('span', {}, h('i', { class: 'sw bk0' }), 'olumlu'), h('span', {}, h('i', { class: 'sw bk-notr' }), 'nötr'), h('span', {}, h('i', { class: 'sw bk4' }), 'olumsuz')),
      satirlar,
      d.sentiment.length > 1 ? [
        h('h3', { class: 'alt-baslik', text: 'Aylara göre denge (üstte olumlu, altta olumsuz ağırlıklı)' }),
        farkGrafik(d.sentiment, ayAd, Math.ceil(d.sentiment.length / 10)),
      ] : null);
  }

  function agKarti(d) {
    const adlar = d.network.names;
    if (adlar.length < 3) return null;
    const m = d.network.matrix;
    const enCok = Math.max(1, ...m.flat());
    const hucre = 40, sol = 110, ust = 96;
    const svg = hs('svg', { viewBox: `0 0 ${sol + adlar.length * hucre + 8} ${ust + adlar.length * hucre + 8}`, role: 'img', 'aria-label': 'Kim kime cevap veriyor' });
    adlar.forEach((a, j) => {
      const kisalt = (t) => (t.length > 12 ? t.slice(0, 11) + '…' : t);
      svg.append(hs('text', { x: sol - 6, y: ust + j * hucre + 25, 'text-anchor': 'end', text: kisalt(a) }));
      svg.append(hs('text', { x: sol + j * hucre + 12, y: ust - 8, transform: `rotate(-45 ${sol + j * hucre + 12} ${ust - 8})`, text: kisalt(a) }));
    });
    m.forEach((satir, i) => satir.forEach((n, j) => {
      const r = hs('rect', {
        x: sol + j * hucre + 1, y: ust + i * hucre + 1, width: hucre - 2, height: hucre - 2, rx: 6,
        class: n ? 'hucre' : 'hucre-bos',
      }, hs('title', { text: `${adlar[i]} → ${adlar[j]}: ${sayi(n)} cevap` }));
      if (n) r.setAttribute('fill-opacity', (0.15 + 0.85 * (n / enCok)).toFixed(2));
      svg.append(r);
    }));
    return kart('Kim kime cevap veriyor?', 'Satırdaki kişinin, sütundaki kişinin mesajından hemen sonra yazdığı sayı.', svg);
  }

  function ilginc(s) {
    const maddeler = [];
    const sessiz = s.longestSilence;
    if (sessiz.from) {
      maddeler.push(['En uzun sessizlik', `${sure(sessiz.ms / 1000)} · ${tarih(sessiz.from)} ile ${tarih(sessiz.to)} arası`]);
    }
    if (s.busiest) {
      maddeler.push(['En yoğun gün', `${tarih(gunKodundan(s.busiest.date))} · ${sayi(s.busiest.count)} mesaj`]);
    }
    if (s.longestMessage.len) {
      maddeler.push(['En uzun mesaj', `${s.longestMessage.sender} · ${sayi(s.longestMessage.len)} karakter`]);
    }
    const hizli = s.people.filter(k => k.medianReply != null).sort((a, b) => a.medianReply - b.medianReply)[0];
    if (hizli) maddeler.push(['En hızlı cevap veren', `${hizli.name} · ortalama ${sure(hizli.medianReply)}`]);
    return kart('Küçük ayrıntılar', null,
      h('ul', { class: 'maddeler' }, maddeler.map(([b, a]) => h('li', {}, h('b', { text: b }), h('span', { text: a })))));
  }

  // ---------- dışa aktarma ----------
  function indir(icerik, ad, tur) {
    const url = URL.createObjectURL(new Blob([icerik], { type: tur }));
    const a = h('a', { href: url, download: ad });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function jsonHazirla(s, d) {
    const dMap = new Map(d.people.map(k => [k.name, k]));
    return JSON.stringify({
      aralik: { bas: gunKodu(s.first), bit: gunKodu(s.last), gun: s.days },
      ozet: { mesaj: s.total, metin: s.textCount, medya: s.mediaCount, silinen: s.deletedCount, aktifGun: s.activeDays, enUzunSeri: s.streak },
      kisiler: s.people.map(k => {
        const dk = dMap.get(k.name) || {};
        return {
          ad: k.name, mesaj: k.messages, kelime: k.words, mesajBasinaKelime: +k.avgWords.toFixed(2),
          medyanCevapSn: k.medianReply, konusmaBaslatma: k.starters, emoji: k.emojiCount, medya: k.media,
          artArdaYazmaOrani: dk.turnShare != null ? +dk.turnShare.toFixed(3) : null,
          olumluOran: dk.positiveShare != null ? +dk.positiveShare.toFixed(3) : null,
          olumsuzOran: dk.negativeShare != null ? +dk.negativeShare.toFixed(3) : null,
          unvan: s.titles[k.name] || null,
        };
      }),
      yogunlukHaritasi: s.heat,
      aylik: s.monthly, haftalik: d.weekly,
      cevapSuresiDagilimi: { etiketler: d.replyLabels, hepsi: d.replyAll },
      enSikKelimeler: s.topWords, enSikEmojiler: s.topEmoji, kelimeCiftleri: d.topBigrams,
      baglantiAlanlari: d.links,
    }, null, 2);
  }

  // Excel'in formül sayacağı hücreleri (=, +, -, @) etkisizleştirir
  function csvHucre(v) {
    let t = v == null ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;
    return /[;"\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
  }

  function csvHazirla(s, d) {
    const dMap = new Map(d.people.map(k => [k.name, k]));
    const baslik = ['Kişi', 'Mesaj', 'Pay', 'Kelime', 'Mesaj başına kelime', 'Medyan cevap (sn)', 'Konuşma başlatma', 'Emoji', 'Fotoğraf', 'Ses', 'Art arda yazma oranı', 'Unvan'];
    const satirlar = s.people.map(k => {
      const dk = dMap.get(k.name) || {};
      return [k.name, k.messages, k.share.toFixed(3), k.words, k.avgWords.toFixed(2), k.medianReply == null ? '' : Math.round(k.medianReply),
        k.starters, k.emojiCount, k.media.photo, k.media.audio, dk.turnShare != null ? dk.turnShare.toFixed(3) : '', s.titles[k.name] || ''];
    });
    return '﻿' + [baslik, ...satirlar].map(r => r.map(csvHucre).join(';')).join('\r\n') + '\r\n';
  }

  // ---------- paylaşım kartları ----------
  function paylasimKarti(s, d) {
    const tuvalOzet = h('canvas', {});
    const tuvalRitim = h('canvas', { hidden: '' });
    kartCiz(tuvalOzet, s);
    kartCiz2(tuvalRitim, s, d);
    let aktif = tuvalOzet;

    const sekmeOzet = h('button', { type: 'button', class: 'sekme etkin', text: 'Özet kartı' });
    const sekmeRitim = h('button', { type: 'button', class: 'sekme', text: 'Ritim kartı' });
    const sec = (tuval, dugme) => {
      tuvalOzet.hidden = tuval !== tuvalOzet; tuvalRitim.hidden = tuval !== tuvalRitim;
      sekmeOzet.classList.toggle('etkin', dugme === sekmeOzet); sekmeRitim.classList.toggle('etkin', dugme === sekmeRitim);
      aktif = tuval;
    };
    sekmeOzet.addEventListener('click', () => sec(tuvalOzet, sekmeOzet));
    sekmeRitim.addEventListener('click', () => sec(tuvalRitim, sekmeRitim));

    const gorsel = h('button', { type: 'button', class: 'dugme', text: 'Görseli indir (PNG)' });
    gorsel.addEventListener('click', () => {
      aktif.toBlob((blob) => indir(blob, aktif === tuvalOzet ? 'sohbet-ozeti.png' : 'sohbet-ritmi.png', 'image/png'), 'image/png');
    });
    const jsonDugme = h('button', { type: 'button', class: 'dugme ikincil', text: 'JSON indir' });
    jsonDugme.addEventListener('click', () => indir(jsonHazirla(s, d), 'sohbet-ozeti.json', 'application/json'));
    const csvDugme = h('button', { type: 'button', class: 'dugme ikincil', text: 'CSV indir (kişi tablosu)' });
    csvDugme.addEventListener('click', () => indir(csvHazirla(s, d), 'sohbet-ozeti.csv', 'text/csv;charset=utf-8'));

    return kart('Paylaşım ve dışa aktarma', 'Görsellerde mesaj içeriği yok; yalnızca sayılar ve unvanlar. Hikâye boyutunda (1080×1920). JSON ve CSV de yalnızca istatistikleri içerir, mesajları değil.',
      h('div', { class: 'sekmeler' }, sekmeOzet, sekmeRitim),
      h('div', { class: 'kart-onizleme' }, tuvalOzet, tuvalRitim),
      h('div', { class: 'eylemler' }, gorsel, jsonDugme, csvDugme),
      h('p', { class: 'gizlilik-notu', text: agNotu() }));
  }

  function agNotu() {
    return durum.ag === 0 ? 'Analiz sırasında yapılan ağ isteği: 0. Sohbetin cihazından çıkmadı.' : `Analiz sırasında yapılan ağ isteği: ${durum.ag}.`;
  }

  function agNotunuGuncelle() {
    document.querySelectorAll('.gizlilik-notu').forEach(e => { e.textContent = agNotu(); });
  }

  // ---------- filtre ----------
  function filtreKarti() {
    const ham = durum.ham;
    const ilk = ham.messages[0].t, son = ham.messages[ham.messages.length - 1].t;
    const bas = h('input', { type: 'date', id: 'f-bas', min: gunKodu(ilk), max: gunKodu(son), value: gunKodu(durum.bas) });
    const bit = h('input', { type: 'date', id: 'f-bit', min: gunKodu(ilk), max: gunKodu(son), value: gunKodu(durum.bit) });
    const degisti = () => {
      const b = bas.value ? gunKodundan(bas.value) : ilk;
      const e = bit.value ? gunKodundan(bit.value) : son;
      durum.bas = b <= e ? b : e;
      durum.bit = b <= e ? e : b;
      icerigiCiz();
    };
    bas.addEventListener('change', degisti);
    bit.addEventListener('change', degisti);

    const onayAyar = (gun) => () => {
      const bitis = gunKodundan(gunKodu(son));
      const baslangic = new Date(bitis);
      if (gun) baslangic.setDate(baslangic.getDate() - (gun - 1));
      const alt = gunKodundan(gunKodu(ilk));
      durum.bas = gun && baslangic > alt ? baslangic : alt;
      durum.bit = bitis;
      bas.value = gunKodu(durum.bas); bit.value = gunKodu(durum.bit);
      icerigiCiz();
    };
    const hazirlar = [['Tümü', 0], ['Son 30 gün', 30], ['Son 90 gün', 90], ['Son 1 yıl', 365]].map(([ad, gun]) => {
      const b = h('button', { type: 'button', class: 'sekme', text: ad });
      b.addEventListener('click', onayAyar(gun));
      return b;
    });

    const kisiler = ham.participants.map(ad => {
      const kutuEl = h('input', { type: 'checkbox' });
      kutuEl.checked = durum.secili.has(ad);
      kutuEl.addEventListener('change', () => {
        if (kutuEl.checked) durum.secili.add(ad); else durum.secili.delete(ad);
        if (!durum.secili.size) { durum.secili.add(ad); kutuEl.checked = true; }
        icerigiCiz();
      });
      return h('label', { class: 'onay' }, kutuEl, h('span', { text: ad }));
    });

    const yeni = h('button', { type: 'button', class: 'dugme ikincil', text: 'Başka sohbet' });
    yeni.addEventListener('click', sifirla);

    return h('section', { class: 'kart filtre' },
      h('div', { class: 'filtre-satir' }, h('label', { for: 'f-bas', text: 'Başlangıç' }), bas, h('label', { for: 'f-bit', text: 'Bitiş' }), bit, h('span', { class: 'sekmeler' }, hazirlar)),
      ham.participants.length > 1 ? h('div', { class: 'filtre-satir' }, h('span', { class: 'etiket', text: 'Kişiler' }), kisiler) : null,
      h('div', { class: 'filtre-satir' }, yeni));
  }

  // ---------- akış ----------
  function icerigiCiz() {
    const ham = durum.ham;
    const msgs = ham.messages.filter(m =>
      durum.secili.has(m.sender) && m.ms >= durum.bas.getTime() && m.ms < durum.bit.getTime() + 86400000);
    const kap = $('icerik');
    const s = hesapla(msgs);
    if (!s) {
      kap.replaceChildren(h('section', { class: 'kart' }, h('p', { class: 'not', text: 'Bu filtreyle eşleşen mesaj yok. Tarih aralığını genişlet ya da kişi seç.' })));
      return;
    }
    const d = derinHesapla(msgs);
    kap.replaceChildren(...[
      ozetKarti(s, new Set(msgs.map(m => m.sender)).size),
      kisiKartlari(s, d),
      ritimKarti(s, d),
      isiHaritasi(s),
      zamanKarti(s, d),
      ifadeKarti(s, d),
      h('div', { class: 'iki-sutun' }, h('div', { class: 'sutun' }, kelimeKarti(s), ikiliKarti(d)), h('div', { class: 'sutun' }, emojiKarti(s), baglantiKarti(d), ilginc(s))),
      duyguKarti(d),
      agKarti(d),
      paylasimKarti(s, d),
    ].filter(Boolean));
  }

  function goster(metin) {
    durum.ag = 0;
    const agOnce = performance.getEntriesByType('resource').length;
    const r = parseChat(metin);
    if (!r.messages.length) throw new Error('Bu dosyada tanıdığım bir WhatsApp sohbeti bulamadım. "Sohbeti dışa aktar" ile aldığın .txt dosyası olduğundan emin ol.');

    durum.ham = r;
    durum.secili = new Set(r.participants);
    durum.bas = gunKodundan(gunKodu(r.messages[0].t));
    durum.bit = gunKodundan(gunKodu(r.messages[r.messages.length - 1].t));

    const kap = $('sonuc');
    kap.replaceChildren(filtreKarti(), h('div', { id: 'icerik', class: 'icerik' }));
    icerigiCiz();
    durum.ag = performance.getEntriesByType('resource').length - agOnce;
    agNotunuGuncelle();
    $('yukle').hidden = true;
    kap.hidden = false;
    window.scrollTo({ top: 0 });
  }

  function sifirla() {
    durum.ham = null;
    $('sonuc').hidden = true;
    $('sonuc').replaceChildren();
    $('yukle').hidden = false;
    $('dosya').value = '';
    hataYaz('');
  }

  function hataYaz(m) {
    const e = $('hata');
    e.textContent = m;
    e.hidden = !m;
  }

  async function dosyaAc(dosya) {
    hataYaz('');
    try {
      const zip = /\.zip$/i.test(dosya.name) || dosya.type === 'application/zip';
      const metin = zip ? await zipdenMetin(await dosya.arrayBuffer()) : await dosya.text();
      goster(metin);
    } catch (e) {
      hataYaz(e.message || 'Dosya okunamadı.');
    }
  }

  const birak = $('birak');
  $('dosya').addEventListener('change', (e) => { if (e.target.files[0]) dosyaAc(e.target.files[0]); });
  ['dragenter', 'dragover'].forEach(o => birak.addEventListener(o, (e) => { e.preventDefault(); birak.classList.add('uzerinde'); }));
  ['dragleave', 'drop'].forEach(o => birak.addEventListener(o, (e) => { e.preventDefault(); birak.classList.remove('uzerinde'); }));
  birak.addEventListener('drop', (e) => { if (e.dataTransfer.files[0]) dosyaAc(e.dataTransfer.files[0]); });
  birak.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('dosya').click(); } });
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => e.preventDefault());
  $('ornek').addEventListener('click', () => {
    try { goster(ornekSohbet()); } catch (e) { hataYaz(e.message); }
  });
})();
