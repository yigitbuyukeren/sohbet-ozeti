// Ayrıştırılmış mesajlardan sohbet istatistiklerini çıkarır. Saf fonksiyon: DOM'a dokunmaz.
(function (root) {
  'use strict';

  const SESSIZLIK_SINIRI = 6 * 3600 * 1000; // bu kadar sessizlik yeni bir konuşma sayılır
  const CEVAP_SINIRI = SESSIZLIK_SINIRI;
  const EN_FAZLA_KISI = 8;

  const DURDURMA = new Set((
    've bir bu da de ki mi mı mu mü ne ya o şu ben sen biz siz onlar için ile ama çok daha gibi var yok ' +
    'evet hayır tamam şey bi bir hani işte sadece falan filan bn sn ben beni bana senin sana benim ' +
    'ne neden nasıl nerede kadar sonra önce her hiç ise mi diye olarak ben bunu şunu onu bunun ' +
    'the a an and is are to of in it you i that for on with this was but be have not me my so if at'
  ).split(/\s+/));

  const GULME = /(?:ha|he|ah|eh){2,}|\blol\b|\bxd+\b|[😂🤣😹]/giu;
  const EMOJI = /\p{Extended_Pictographic}/u;

  const BOLUCU = typeof Intl !== 'undefined' && Intl.Segmenter
    ? new Intl.Segmenter('tr', { granularity: 'grapheme' })
    : null;

  function medyan(dizi) {
    if (!dizi.length) return null;
    const s = [...dizi].sort((a, b) => a - b);
    const o = s.length >> 1;
    return s.length % 2 ? s[o] : (s[o - 1] + s[o]) / 2;
  }

  function gunAnahtari(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function ayAnahtari(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  function topla(harita, sayi) {
    return [...harita.entries()].sort((a, b) => b[1] - a[1]).slice(0, sayi);
  }

  function yeniKisi(ad) {
    return {
      name: ad, messages: 0, textMessages: 0, words: 0, chars: 0,
      media: { photo: 0, video: 0, audio: 0, sticker: 0, other: 0 }, mediaTotal: 0, deleted: 0,
      emojiCount: 0, laughs: 0, night: 0, starters: 0, enders: 0,
      replies: [], medianReply: null, longest: { len: 0, preview: '' },
      wordMap: new Map(), emojiMap: new Map(),
    };
  }

  function hesapla(mesajlar) {
    const msgs = mesajlar.filter(m => m.type !== 'system');
    if (!msgs.length) return null;

    const kisiler = new Map();
    const al = (ad) => { if (!kisiler.has(ad)) kisiler.set(ad, yeniKisi(ad)); return kisiler.get(ad); };

    const isi = Array.from({ length: 7 }, () => new Array(24).fill(0));
    const aylik = new Map();
    const gunluk = new Map();
    const kelimeler = new Map();
    const emojiler = new Map();
    let enUzunSessizlik = { ms: 0, from: null, to: null };
    let enUzun = { sender: '', len: 0, preview: '' };
    let metinSayisi = 0, medyaSayisi = 0, silinenSayisi = 0;

    let onceki = null;
    msgs.forEach((m, i) => {
      const k = al(m.sender);
      k.messages++;

      const saat = m.t.getHours();
      isi[(m.t.getDay() + 6) % 7][saat]++;
      if (saat < 5) k.night++;
      aylik.set(ayAnahtari(m.t), (aylik.get(ayAnahtari(m.t)) || 0) + 1);
      gunluk.set(gunAnahtari(m.t), (gunluk.get(gunAnahtari(m.t)) || 0) + 1);

      if (m.type === 'media') { k.media[m.media || 'other']++; k.mediaTotal++; medyaSayisi++; }
      else if (m.type === 'deleted') { k.deleted++; silinenSayisi++; }
      if (m.type === 'text') { metinSayisi++; k.textMessages++; }
      // altyazılı medyanın yazısı da kelime ve emoji sayımına girer
      if (m.text) {
        k.chars += m.text.length;
        if (m.text.length > k.longest.len) k.longest = { len: m.text.length, preview: m.text.slice(0, 140) };
        if (m.text.length > enUzun.len) enUzun = { sender: m.sender, len: m.text.length, preview: m.text.slice(0, 140) };

        const kucuk = m.text.toLocaleLowerCase('tr');
        for (const kelime of kucuk.split(/[^\p{L}\p{N}']+/u)) {
          if (!kelime) continue;
          k.words++;
          if (kelime.length < 3 || DURDURMA.has(kelime) || /^\d+$/.test(kelime) || /^(https?|www)/.test(kelime)) continue;
          kelimeler.set(kelime, (kelimeler.get(kelime) || 0) + 1);
          k.wordMap.set(kelime, (k.wordMap.get(kelime) || 0) + 1);
        }

        const gulme = m.text.match(GULME);
        if (gulme) k.laughs += gulme.length;

        if (BOLUCU) {
          for (const { segment } of BOLUCU.segment(m.text)) {
            if (!EMOJI.test(segment)) continue;
            k.emojiCount++;
            emojiler.set(segment, (emojiler.get(segment) || 0) + 1);
            k.emojiMap.set(segment, (k.emojiMap.get(segment) || 0) + 1);
          }
        }
      }

      if (i === 0) {
        k.starters++;
      } else {
        const aralik = m.ms - onceki.ms;
        if (aralik > enUzunSessizlik.ms) enUzunSessizlik = { ms: aralik, from: onceki.t, to: m.t };
        if (aralik > SESSIZLIK_SINIRI) {
          k.starters++;
          al(onceki.sender).enders++;
        } else if (onceki.sender !== m.sender && aralik <= CEVAP_SINIRI) {
          k.replies.push(aralik / 1000);
        }
      }
      onceki = m;
    });
    al(onceki.sender).enders++;

    const ilk = msgs[0].t;
    const son = msgs[msgs.length - 1].t;
    const gunSayisi = Math.max(1, Math.round((new Date(son.getFullYear(), son.getMonth(), son.getDate()) -
      new Date(ilk.getFullYear(), ilk.getMonth(), ilk.getDate())) / 86400000) + 1);

    // aylık seri, boş ayları da doldurur
    const aylikSeri = [];
    for (let y = ilk.getFullYear(), a = ilk.getMonth(); y < son.getFullYear() || (y === son.getFullYear() && a <= son.getMonth());) {
      const anahtar = y + '-' + String(a + 1).padStart(2, '0');
      aylikSeri.push({ key: anahtar, count: aylik.get(anahtar) || 0 });
      if (++a > 11) { a = 0; y++; }
    }

    const enYogunGun = topla(gunluk, 1)[0];
    const gunler = [...gunluk.keys()].sort();
    let seri = 1, enUzunSeri = 1;
    for (let i = 1; i < gunler.length; i++) {
      const fark = Math.round((new Date(gunler[i]) - new Date(gunler[i - 1])) / 86400000);
      seri = fark === 1 ? seri + 1 : 1;
      if (seri > enUzunSeri) enUzunSeri = seri;
    }

    const kisiListesi = [...kisiler.values()].sort((a, b) => b.messages - a.messages);
    kisiListesi.forEach((k) => {
      k.medianReply = medyan(k.replies);
      k.avgWords = k.textMessages ? k.words / k.textMessages : 0;
      k.share = k.messages / msgs.length;
      k.topWords = topla(k.wordMap, 5);
      k.topEmoji = topla(k.emojiMap, 5);
    });
    const gorunen = kisiListesi.slice(0, EN_FAZLA_KISI);

    return {
      total: msgs.length, textCount: metinSayisi, mediaCount: medyaSayisi, deletedCount: silinenSayisi,
      first: ilk, last: son, days: gunSayisi, activeDays: gunluk.size,
      perDay: msgs.length / gunSayisi,
      busiest: enYogunGun ? { date: enYogunGun[0], count: enYogunGun[1] } : null,
      streak: enUzunSeri,
      people: gorunen, otherPeople: kisiListesi.length - gorunen.length,
      heat: isi, monthly: aylikSeri,
      topWords: topla(kelimeler, 12).map(([w, n]) => ({ w, n })),
      topEmoji: topla(emojiler, 10).map(([e, n]) => ({ e, n })),
      longestSilence: enUzunSessizlik, longestMessage: enUzun,
      titles: unvanlar(gorunen),
    };
  }

  // Her unvan, ölçütte en yüksek olan kişiye gider; bir kişiye en fazla bir unvan verilir.
  function unvanlar(kisiler) {
    if (kisiler.length < 2) return {};
    const kurallar = [
      ['Gece Kuşu', k => k.night / Math.max(1, k.messages), k => k.night >= 5],
      ['Kahkaha Makinesi', k => k.laughs, k => k.laughs >= 3],
      ['Sesli Mesaj Ustası', k => k.media.audio, k => k.media.audio >= 3],
      ['Fotoğraf Arşivcisi', k => k.media.photo, k => k.media.photo >= 3],
      ['Emoji Tutkunu', k => k.emojiCount / Math.max(1, k.textMessages), k => k.emojiCount >= 5],
      ['Roman Yazarı', k => k.avgWords, k => k.textMessages >= 5],
      ['Konuşma Başlatıcı', k => k.starters, k => k.starters >= 2],
      ['Hızlı Cevap', k => (k.medianReply == null ? 0 : 1 / (k.medianReply + 1)), k => k.replies.length >= 5],
    ];
    const sonuc = {};
    for (const [unvan, olcut, uygun] of kurallar) {
      const adaylar = kisiler.filter(k => !sonuc[k.name] && uygun(k)).sort((a, b) => olcut(b) - olcut(a));
      if (adaylar.length && olcut(adaylar[0]) > 0) sonuc[adaylar[0].name] = unvan;
    }
    return sonuc;
  }

  const api = { hesapla };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SohbetOzeti = Object.assign(root.SohbetOzeti || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this);
