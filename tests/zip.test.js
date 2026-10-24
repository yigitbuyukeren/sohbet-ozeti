const test = require('node:test');
const assert = require('node:assert/strict');
const zlib = require('node:zlib');
const { zipdenMetin } = require('../src/zip.js');

// Tek dosyalık küçük bir zip kurar (yöntem 0: saklı, 8: deflate)
function zipKur(ad, icerik, yontem) {
  const adB = Buffer.from(ad);
  const ham = Buffer.from(icerik);
  const veri = yontem === 8 ? zlib.deflateRawSync(ham) : ham;

  const yerel = Buffer.alloc(30);
  yerel.writeUInt32LE(0x04034b50, 0);
  yerel.writeUInt16LE(yontem, 8);
  yerel.writeUInt32LE(veri.length, 18);
  yerel.writeUInt32LE(ham.length, 22);
  yerel.writeUInt16LE(adB.length, 26);
  const yerelParca = Buffer.concat([yerel, adB, veri]);

  const merkez = Buffer.alloc(46);
  merkez.writeUInt32LE(0x02014b50, 0);
  merkez.writeUInt16LE(yontem, 10);
  merkez.writeUInt32LE(veri.length, 20);
  merkez.writeUInt32LE(ham.length, 24);
  merkez.writeUInt16LE(adB.length, 28);
  merkez.writeUInt32LE(0, 42);
  const merkezParca = Buffer.concat([merkez, adB]);

  const son = Buffer.alloc(22);
  son.writeUInt32LE(0x06054b50, 0);
  son.writeUInt16LE(1, 8);
  son.writeUInt16LE(1, 10);
  son.writeUInt32LE(merkezParca.length, 12);
  son.writeUInt32LE(yerelParca.length, 16);

  const b = Buffer.concat([yerelParca, merkezParca, son]);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.length);
}

const METIN = '24.10.2026 14:32 - Ali: Selam şğüöçı 😂\n';

test('Saklı (yöntem 0) zip içinden sohbeti çıkarır', async () => {
  assert.equal(await zipdenMetin(zipKur('WhatsApp Chat.txt', METIN, 0)), METIN);
});

test('Deflate (yöntem 8) zip içinden sohbeti çıkarır', async () => {
  assert.equal(await zipdenMetin(zipKur('_chat.txt', METIN.repeat(50), 8)), METIN.repeat(50));
});

test('Zip olmayan veya .txt içermeyen dosyada anlaşılır hata verir', async () => {
  await assert.rejects(zipdenMetin(new ArrayBuffer(64)), /zip/i);
  await assert.rejects(zipdenMetin(zipKur('resim.jpg', 'x', 0)), /bulunamadı/);
});
