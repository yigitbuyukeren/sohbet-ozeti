(function () {
  'use strict';
  const { parseChat, hesapla, zipdenMetin, ornekSohbet, kartCiz } = window.SohbetOzeti;

  const GUNLER = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  const GUN_TAM = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
  const AYLAR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const SVG = 'http://www.w3.org/2000/svg';

  const $ = (id) => document.getElementById(id);
  const sayi = (n) => Number(n).toLocaleString('tr-TR');
  const tarih = (d) => d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

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

  function ozetKarti(s, kisiAdedi) {
    const kutu = (b, a) => h('div', { class: 'say' }, h('b', { text: b }), h('span', { text: a }));
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

  function kisiKartlari(s) {
    const cubuklar = s.people.map((k, i) =>
      h('div', { class: 'kisi' },
        h('span', { class: 'kisi-ad', text: k.name }),
        h('div', { class: 'kisi-cubuk' }, (() => {
          const c = h('i', { class: 'b' + i });
          c.style.width = Math.max(1, k.share * 100).toFixed(1) + '%';
          return c;
        })()),
        h('span', { class: 'kisi-sayi', text: `${sayi(k.messages)} · %${Math.round(k.share * 100)}` })));

    const kartlar = s.people.map((k, i) => {
      const satirlar = [
        ['Kelime', sayi(k.words)],
        ['Mesaj başına kelime', k.avgWords.toFixed(1).replace('.', ',')],
        ['Ortalama cevap süresi', sure(k.medianReply)],
        ['Konuşmayı başlatma', sayi(k.starters)],
        ['Fotoğraf / ses', `${sayi(k.media.photo)} / ${sayi(k.media.audio)}`],
        ['Emoji', sayi(k.emojiCount)],
        ['Gece (00-05) mesajı', sayi(k.night)],
      ];
      return h('div', { class: 'kisi-kart r' + i },
        h('h3', { text: k.name }),
        s.titles[k.name] ? h('span', { class: 'unvan', text: s.titles[k.name] }) : null,
        h('dl', {}, satirlar.map(([a, b]) => [h('dt', { text: a }), h('dd', { text: b })]).flat()));
    });

    return kart('Kim ne kadar yazıyor?', s.otherPeople > 0 ? `En çok yazan ${s.people.length} kişi gösteriliyor (+${s.otherPeople} kişi daha).` : null,
      cubuklar, h('div', { class: 'kisi-kartlar' }, kartlar));
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

  function aylikGrafik(s) {
    const en = 720, boy = 170, alt = 22;
    const n = s.monthly.length;
    const enCok = Math.max(1, ...s.monthly.map(m => m.count));
    const genislik = (en - 8) / n;
    const svg = hs('svg', { viewBox: `0 0 ${en} ${boy}`, role: 'img', 'aria-label': 'Aylara göre mesaj sayısı' });
    const adim = Math.ceil(n / 12);
    s.monthly.forEach((m, i) => {
      const yuk = (boy - alt - 6) * (m.count / enCok);
      const [yil, ay] = m.key.split('-');
      svg.append(hs('rect', {
        x: 4 + i * genislik + genislik * 0.12, y: boy - alt - yuk, width: Math.max(2, genislik * 0.76), height: Math.max(m.count ? 2 : 0, yuk),
        rx: 3, class: 'cubuk',
      }, hs('title', { text: `${AYLAR[+ay - 1]} ${yil}: ${sayi(m.count)} mesaj` })));
      if (i % adim === 0) svg.append(hs('text', { x: 4 + i * genislik, y: boy - 6, text: `${AYLAR[+ay - 1]} ${yil.slice(2)}` }));
    });
    return kart('Aylara göre mesajlar', null, svg);
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

  function emojiKarti(s) {
    return kart('En sevilen emojiler', null,
      s.topEmoji.length
        ? h('div', { class: 'emojiler' }, s.topEmoji.map(x => h('span', {}, x.e, h('small', { text: sayi(x.n) }))))
        : h('p', { class: 'not', text: 'Bu sohbette emoji bulunamadı.' }));
  }

  function ilginc(s) {
    const maddeler = [];
    const sessiz = s.longestSilence;
    if (sessiz.from) {
      maddeler.push(['En uzun sessizlik', `${sure(sessiz.ms / 1000)} · ${tarih(sessiz.from)} ile ${tarih(sessiz.to)} arası`]);
    }
    if (s.busiest) {
      const [y, a, g] = s.busiest.date.split('-').map(Number);
      maddeler.push(['En yoğun gün', `${tarih(new Date(y, a - 1, g))} · ${sayi(s.busiest.count)} mesaj`]);
    }
    if (s.longestMessage.len) {
      maddeler.push(['En uzun mesaj', `${s.longestMessage.sender} · ${sayi(s.longestMessage.len)} karakter`]);
    }
    const hizli = s.people.filter(k => k.medianReply != null).sort((a, b) => a.medianReply - b.medianReply)[0];
    if (hizli) maddeler.push(['En hızlı cevap veren', `${hizli.name} · ortalama ${sure(hizli.medianReply)}`]);
    return kart('Küçük ayrıntılar', null,
      h('ul', { class: 'maddeler' }, maddeler.map(([b, a]) => h('li', {}, h('b', { text: b }), h('span', { text: a })))));
  }

  function paylasimKarti(s, ag) {
    const tuval = h('canvas', {});
    kartCiz(tuval, s);
    const indir = h('button', { type: 'button', class: 'dugme', text: 'Görseli indir (PNG)' });
    indir.addEventListener('click', () => {
      tuval.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = h('a', { href: url, download: 'sohbet-ozeti.png' });
        document.body.append(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }, 'image/png');
    });
    const yeni = h('button', { type: 'button', class: 'dugme ikincil', text: 'Başka sohbet' });
    yeni.addEventListener('click', sifirla);
    return kart('Paylaşım görseli', 'Mesaj içeriği yok; yalnızca sayılar ve unvanlar. Hikâye boyutunda (1080×1920).',
      h('div', { class: 'kart-onizleme' }, tuval),
      h('div', { class: 'eylemler' }, indir, yeni),
      h('p', { class: 'gizlilik-notu', text: ag === 0 ? 'Analiz sırasında yapılan ağ isteği: 0. Sohbetin cihazından çıkmadı.' : `Analiz sırasında yapılan ağ isteği: ${ag}.` }));
  }

  function goster(metin) {
    const agOnce = performance.getEntriesByType('resource').length;
    const r = parseChat(metin);
    const s = hesapla(r.messages);
    if (!s) throw new Error('Bu dosyada tanıdığım bir WhatsApp sohbeti bulamadım. "Sohbeti dışa aktar" ile aldığın .txt dosyası olduğundan emin ol.');

    const kap = $('sonuc');
    kap.replaceChildren(
      ozetKarti(s, r.participants.length),
      kisiKartlari(s),
      isiHaritasi(s),
      aylikGrafik(s),
      h('div', { class: 'iki-sutun' }, kelimeKarti(s), h('div', {}, emojiKarti(s), ilginc(s))),
      paylasimKarti(s, performance.getEntriesByType('resource').length - agOnce));
    $('yukle').hidden = true;
    kap.hidden = false;
    window.scrollTo({ top: 0 });
  }

  function sifirla() {
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
