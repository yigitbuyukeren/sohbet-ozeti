// WhatsApp'ın verdiği .zip içindeki ilk .txt dosyasını çıkarır. Bağımlılık yok:
// merkez dizini elle okur, sıkıştırmayı tarayıcının DecompressionStream'i açar.
(function (root) {
  'use strict';

  async function zipdenMetin(tampon) {
    const veri = new DataView(tampon);
    const bayt = new Uint8Array(tampon);

    let eocd = -1;
    for (let i = bayt.length - 22; i >= Math.max(0, bayt.length - 65557); i--) {
      if (veri.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('Geçerli bir zip dosyası değil.');

    const adet = veri.getUint16(eocd + 10, true);
    let konum = veri.getUint32(eocd + 16, true);
    const dec = new TextDecoder('utf-8');

    for (let n = 0; n < adet; n++) {
      if (veri.getUint32(konum, true) !== 0x02014b50) break;
      const yontem = veri.getUint16(konum + 10, true);
      const boyut = veri.getUint32(konum + 20, true);
      const adUzun = veri.getUint16(konum + 28, true);
      const ekUzun = veri.getUint16(konum + 30, true);
      const yorumUzun = veri.getUint16(konum + 32, true);
      const yerel = veri.getUint32(konum + 42, true);
      const ad = dec.decode(bayt.subarray(konum + 46, konum + 46 + adUzun));
      konum += 46 + adUzun + ekUzun + yorumUzun;

      if (!/\.txt$/i.test(ad) || ad.startsWith('__MACOSX')) continue;

      const yerelAdUzun = veri.getUint16(yerel + 26, true);
      const yerelEkUzun = veri.getUint16(yerel + 28, true);
      const bas = yerel + 30 + yerelAdUzun + yerelEkUzun;
      const ham = bayt.subarray(bas, bas + boyut);

      if (yontem === 0) return dec.decode(ham);
      if (yontem === 8) {
        const akis = new Blob([ham]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        return dec.decode(await new Response(akis).arrayBuffer());
      }
      throw new Error('Desteklenmeyen zip sıkıştırması.');
    }
    throw new Error('Zip içinde sohbet (.txt) dosyası bulunamadı.');
  }

  const api = { zipdenMetin };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SohbetOzeti = Object.assign(root.SohbetOzeti || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this);
