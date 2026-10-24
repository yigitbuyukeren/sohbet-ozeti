// Demo ve testler için uydurma bir grup sohbeti üretir (Android biçimi).
// Tohum sabit olduğundan her çağrıda aynı metni verir. Gerçek kimse, gerçek sohbet yoktur.
(function (root) {
  'use strict';

  function tohum(s) {
    return function () {
      s |= 0; s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const KISILER = [
    { ad: 'Defne', agirlik: 38, gece: 0.04, uzun: 0.35, emoji: 0.35, kahkaha: 0.1, ses: 0.02, foto: 0.05 },
    { ad: 'Kerem', agirlik: 34, gece: 0.22, uzun: 0.12, emoji: 0.1, kahkaha: 0.3, ses: 0.01, foto: 0.03 },
    { ad: 'Ela', agirlik: 28, gece: 0.06, uzun: 0.2, emoji: 0.25, kahkaha: 0.12, ses: 0.1, foto: 0.1 },
  ];

  const KISA = ['tamam', 'olur', 'geliyorum', 'bugün akşam müsait misin', 'ben de', 'yarın görüşürüz', 'harika olmuş',
    'nerede buluşuyoruz', 'az önce çıktım', 'çok yorgunum', 'film önerisi var mı', 'kahve içelim mi', 'bakıyorum şimdi',
    'haberin var mı', 'hafta sonu ne yapıyoruz', 'aynen öyle', 'sonra konuşuruz', 'iyi geceler', 'günaydın',
    'toplantı uzadı', 'kitabı bitirdim', 'yağmur başladı', 'eve geldim', 'sipariş verdim', 'yola çıktım'];
  const UZUN = ['Bu hafta sonu için bir plan yapalım, cumartesi sabah erken çıkıp kahvaltı yaparız, sonra deniz kenarında yürürüz, akşam da evde film izleriz.',
    'Dün gece o diziyi bitirdim ve sonu gerçekten beklediğimden çok daha iyiydi, kesinlikle izlemelisiniz, spoiler vermemek için daha fazla yazmıyorum.',
    'Arkadaşlar yarınki toplantıyı ikiye aldılar, sabah erkenden değil, öğleden sonra yapacağız, o yüzden planlarınızı ona göre ayarlayın lütfen.',
    'Geçen gün konuştuğumuz restoran var ya, orayı denedim, yemekler güzeldi ama biraz kalabalıktı, bir dahaki sefere rezervasyon yaptıralım.'];
  const MEDYA = ['<Medya dahil edilmedi>', 'görüntü dahil edilmedi', 'ses dahil edilmedi', 'çıkartma dahil edilmedi', 'video dahil edilmedi'];

  function ornekSohbet() {
    const r = tohum(2610);
    const secim = (d) => d[Math.floor(r() * d.length)];
    const toplam = KISILER.reduce((a, k) => a + k.agirlik, 0);
    const kisiSec = () => {
      let x = r() * toplam;
      for (const k of KISILER) { if ((x -= k.agirlik) < 0) return k; }
      return KISILER[0];
    };
    const iki = (n) => String(n).padStart(2, '0');
    const satirlar = ['01.03.2026 09:00 - Mesajlar ve aramalar uçtan uca şifrelidir. Bu sohbetteki kişiler dışında hiç kimse bunları okuyamaz veya dinleyemez.'];

    for (let gun = 0; gun < 230; gun++) {
      const d = new Date(2026, 2, 1 + gun);
      const hafta = (d.getDay() + 6) % 7;
      if (r() < 0.12) continue;
      const adet = Math.floor(8 + r() * 26 * (hafta > 4 ? 1.3 : 1));
      let dk = 8 * 60 + Math.floor(r() * 180);
      let onceki = null;
      for (let i = 0; i < adet; i++) {
        const kisi = kisiSec();
        dk += onceki && onceki !== kisi ? Math.floor(r() * 12) : Math.floor(r() * 40);
        let gecelik = false;
        if (r() < kisi.gece * 0.2) { dk = 24 * 60 + Math.floor(r() * 4 * 60); gecelik = true; }
        const g = new Date(d.getFullYear(), d.getMonth(), d.getDate() + Math.floor(dk / 1440));
        const mm = dk % 1440;
        const zaman = `${iki(g.getDate())}.${iki(g.getMonth() + 1)}.${g.getFullYear()} ${iki(Math.floor(mm / 60))}:${iki(mm % 60)}`;

        let metin;
        const x = r();
        if (x < kisi.ses) metin = MEDYA[2];
        else if (x < kisi.ses + kisi.foto) metin = MEDYA[r() < 0.7 ? 0 : 1];
        else if (x < kisi.ses + kisi.foto + 0.02) metin = MEDYA[3 + (r() < 0.5 ? 0 : 1)];
        else if (r() < kisi.uzun * 0.25) metin = secim(UZUN);
        else metin = secim(KISA);
        if (!metin.startsWith('<') && !/dahil edilmedi$/.test(metin)) {
          if (r() < kisi.kahkaha) metin += ' ' + secim(['hahaha', 'ahahah', 'hahahaha', 'lol', 'xd']);
          if (r() < kisi.emoji) metin += ' ' + secim(['😂', '❤️', '😍', '🙌', '😅', '🥹', '☕']);
        }
        if (r() < 0.01) metin = 'Bu mesaj silindi';
        satirlar.push(`${zaman} - ${kisi.ad}: ${metin}`);
        if (r() < 0.02) satirlar.push('ikinci satır da var,', 'bir mesaj birden fazla satır olabilir');
        onceki = kisi;
        if (gecelik) break;
      }
    }
    return satirlar.join('\n') + '\n';
  }

  const api = { ornekSohbet };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SohbetOzeti = Object.assign(root.SohbetOzeti || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this);
