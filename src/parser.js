// WhatsApp "sohbeti dışa aktar" metnini mesaj listesine çevirir.
// Android ve iOS biçimlerini, 12/24 saati ve gün/ay sırasını kendisi ayırt eder.
(function (root) {
  'use strict';

  const GORUNMEZ = /[‎‏‪-‮﻿]/g;
  const BOSLUK = /[  ]/g;

  // [24.10.2026 14:32:05] Ali: ...   |   24.10.2026 14:32 - Ali: ...   |   10/24/26, 2:32 PM - Ali: ...
  const BASLIK = new RegExp(
    '^\\[?(\\d{1,2})[./](\\d{1,2})[./](\\d{2,4}),?\\s+' +
    '(\\d{1,2})[:.](\\d{2})(?::(\\d{2}))?\\s*' +
    '([AaPp]\\.?[Mm]\\.?|ÖÖ|ÖS)?' +
    '(?:\\]\\s?|\\s[-–]\\s)' +
    '([\\s\\S]*)$'
  );
  const GONDEREN = /^([^:\n“"]{1,40}?):(?: ([\s\S]*)|\s*)$/;

  const SILINDI = /^(bu mesaj silindi|bu mesajı sildiniz|you deleted this message|this message was deleted)\.?$/i;
  const MEDYA_YER = /^<(?:medya|media) (?:dahil edilmedi|omitted)>$/i;
  const MEDYA_TUR = [
    ['photo', /(görüntü|fotoğraf|image|photo)\s+(dahil edilmedi|omitted)/i],
    ['video', /(video|gif)\s+(dahil edilmedi|omitted)/i],
    ['audio', /(ses|audio|sesli mesaj|voice message)\s+(dahil edilmedi|omitted)/i],
    ['sticker', /(çıkartma|sticker)\s+(dahil edilmedi|omitted)/i],
    ['other', /(belge|document|dosya|file|kişi kartı|contact card|konum|location)\s+(dahil edilmedi|omitted)$/i],
  ];

  // iOS, medyaya yazılan altyazıyı yer tutucudan önce yazar: "altyazı görüntü dahil edilmedi".
  // Dönüş: { tur, altyazi } ya da null
  function medyaTuru(metin) {
    const t = metin.trim();
    if (MEDYA_YER.test(t)) return { tur: 'other', altyazi: '' };
    for (const [tur, re] of MEDYA_TUR) {
      const e = re.exec(t);
      if (e && /(dahil edilmedi|omitted)$/i.test(t)) return { tur, altyazi: tur === 'other' ? '' : t.slice(0, e.index).trim() };
    }
    const ek = t.match(/^<attached: (.+)>$/i) || t.match(/^(.+?) \((?:dosya ekli|file attached)\)$/i);
    if (ek) {
      const ad = ek[1].toLowerCase();
      if (/\.(jpe?g|png|heic)$|photo/.test(ad)) return { tur: 'photo', altyazi: '' };
      if (/\.(mp4|mov|3gp)$|video|gif/.test(ad)) return { tur: 'video', altyazi: '' };
      if (/\.(opus|m4a|aac|mp3|ogg|amr)$|audio|ptt/.test(ad)) return { tur: 'audio', altyazi: '' };
      if (/\.webp$|sticker/.test(ad)) return { tur: 'sticker', altyazi: '' };
      return { tur: 'other', altyazi: '' };
    }
    return null;
  }

  function saat(ham) {
    let h = parseInt(ham.h, 10);
    if (ham.ap) {
      const ogleden_sonra = /^(p|ÖS)/i.test(ham.ap);
      if (ogleden_sonra && h < 12) h += 12;
      if (!ogleden_sonra && h === 12) h = 0;
    }
    return h;
  }

  // Tüm tarihlere bakıp gün/ay sırasına karar verir. Belirsizse Türkçe düzen (GG.AA).
  function tarihSirasi(hamlar) {
    let ilkBuyuk = 0, ikinciBuyuk = 0;
    for (const m of hamlar) {
      if (+m.a > 12) ilkBuyuk++;
      if (+m.b > 12) ikinciBuyuk++;
    }
    return ikinciBuyuk > 0 && ilkBuyuk === 0 ? 'AGY' : 'GAY';
  }

  function ayristir(metin) {
    const satirlar = String(metin)
      .replace(GORUNMEZ, '')
      .replace(BOSLUK, ' ')
      .split(/\r?\n/);

    const hamlar = [];
    let son = null;
    for (const satir of satirlar) {
      const m = BASLIK.exec(satir);
      if (m) {
        son = { a: m[1], b: m[2], y: m[3], h: m[4], mi: m[5], s: m[6] || '0', ap: m[7] || '', govde: m[8] };
        hamlar.push(son);
      } else if (son) {
        son.govde += '\n' + satir;
      }
    }

    const sira = tarihSirasi(hamlar);
    const mesajlar = [];
    let sistem = 0;

    for (const ham of hamlar) {
      const gun = +(sira === 'GAY' ? ham.a : ham.b);
      const ay = +(sira === 'GAY' ? ham.b : ham.a);
      let yil = +ham.y;
      if (yil < 100) yil += 2000;
      const t = new Date(yil, ay - 1, gun, saat(ham), +ham.mi, +ham.s);
      if (isNaN(t.getTime())) continue;

      const g = GONDEREN.exec(ham.govde);
      if (!g) { sistem++; continue; }

      const gonderen = g[1].trim();
      const govde = (g[2] || '').replace(/\s+$/, '');
      let tur = 'text';
      let medya = null;
      let metinKismi = '';
      if (SILINDI.test(govde.trim())) {
        tur = 'deleted';
      } else {
        const md = medyaTuru(govde);
        if (md) { tur = 'media'; medya = md.tur; metinKismi = md.altyazi; }
      }
      mesajlar.push({ t, ms: t.getTime(), sender: gonderen, text: tur === 'text' ? govde : metinKismi, type: tur, media: medya });
    }

    mesajlar.sort((x, y) => x.ms - y.ms);
    const kisiler = [...new Set(mesajlar.map(x => x.sender))];
    return { messages: mesajlar, participants: kisiler, dateOrder: sira, systemCount: sistem };
  }

  const api = { parseChat: ayristir };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SohbetOzeti = Object.assign(root.SohbetOzeti || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this);
