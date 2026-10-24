// Küçük, sözlük tabanlı Türkçe duygu ölçümü. Tamamen yerel çalışır, model ya da indirme gerektirmez.
// Kaba bir ölçüdür (ironi, bağlam ve ek zincirlerini anlamaz); arayüzde "eğlence amaçlı" diye sunulur.
(function (root) {
  'use strict';

  // Kök listeleri: kelime bu köklerden biriyle başlıyorsa sayılır (en az 4 harf).
  const OLUMLU = [
    'güzel', 'harika', 'mükemmel', 'süper', 'muhteşem', 'mutlu', 'sevin', 'seviyor', 'sevdi', 'sevgi', 'aşk',
    'canım', 'tatlı', 'teşekkür', 'sağol', 'bravo', 'başarı', 'keyif', 'eğlen', 'şahane', 'nefis', 'iyi',
    'tebrik', 'kutlu', 'yaşasın', 'rahat', 'huzur', 'efsane', 'gülümse', 'neşe', 'umut', 'şanslı', 'afferin',
    'helal', 'bayıl', 'bayılıyorum', 'sevinç', 'hoş', 'tebrikler', 'aferin', 'mükemmel', 'kıymetli', 'değerli',
  ];
  const OLUMSUZ = [
    'kötü', 'berbat', 'üzgün', 'üzül', 'üzücü', 'sinir', 'kızgın', 'nefret', 'öfke', 'yorgun', 'yoruldum',
    'sıkıl', 'sıkıcı', 'bıktım', 'korku', 'korkunç', 'endişe', 'stres', 'kaygı', 'ağla', 'hasta', 'acı',
    'pişman', 'rezalet', 'rezil', 'saçma', 'aptal', 'salak', 'lanet', 'siktir', 'yalan', 'kavga', 'tartış',
    'dert', 'sorun', 'problem', 'maalesef', 'yazık', 'bozuk', 'kırıl', 'darıl', 'küs', 'mutsuz', 'moral',
  ];
  const OLUMLU_EMOJI = /[❤💕💖💗😍🥰😊😁😄😃🙌👏😘🥹😂🤣🎉✨👍☺😀😇💯🔥]/u;
  const OLUMSUZ_EMOJI = /[😢😭😡😠😞😔💔🤬😤😩😫😖👎😒🙄😰😨]/u;

  const OLUMLU_ESIK = OLUMLU.filter(k => k.length >= 4);
  const OLUMSUZ_ESIK = OLUMSUZ.filter(k => k.length >= 4);

  // 4 harften kısa kökler yanlış eşleşir; bunlar yalnızca tam kelime olarak sayılır.
  const KISA_OLUMLU = new Set(['iyi', 'iyiyim', 'iyiydi', 'aşk', 'aşkım', 'hoş', 'çok iyi']);

  function baslar(kelime, kokler) {
    for (const k of kokler) if (kelime.startsWith(k)) return true;
    return false;
  }

  // Dönüş: >0 olumlu, <0 olumsuz, 0 nötr. Basit olumsuzlama: kelimeden sonra "değil" gelirse işaret çevrilir.
  function duyguPuani(metin) {
    const kelimeler = metin.toLocaleLowerCase('tr').split(/[^\p{L}\p{N}']+/u).filter(Boolean);
    let puan = 0;
    for (let i = 0; i < kelimeler.length; i++) {
      const w = kelimeler[i];
      let isaret = 0;
      if (KISA_OLUMLU.has(w) || baslar(w, OLUMLU_ESIK)) isaret = 1;
      else if (baslar(w, OLUMSUZ_ESIK)) isaret = -1;
      if (isaret && kelimeler[i + 1] === 'değil') isaret = -isaret;
      puan += isaret;
    }
    for (const ch of metin) {
      if (OLUMLU_EMOJI.test(ch)) puan += 1;
      else if (OLUMSUZ_EMOJI.test(ch)) puan -= 1;
    }
    return puan;
  }

  const api = { duyguPuani };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SohbetOzeti = Object.assign(root.SohbetOzeti || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this);
