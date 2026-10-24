const test = require('node:test');
const assert = require('node:assert/strict');
const { parseChat } = require('../src/parser.js');

test('Android (GG.AA.YYYY SS:DD - Ad: mesaj) biçimini okur', () => {
  const r = parseChat('24.10.2026 14:32 - Ali: Selam\n24.10.2026 14:33 - Veli: Merhaba');
  assert.equal(r.messages.length, 2);
  assert.deepEqual(r.participants, ['Ali', 'Veli']);
  assert.equal(r.messages[0].t.getHours(), 14);
  assert.equal(r.messages[0].t.getDate(), 24);
  assert.equal(r.dateOrder, 'GAY');
});

test('iOS ([GG.AA.YY SS:DD:SS] Ad: mesaj) biçimini okur, görünmez işaretleri atar', () => {
  const r = parseChat('‎[24.10.26 14:32:05] Ali: Selam\n[24.10.26 14:32:40] Veli: ‎<Medya dahil edilmedi>');
  assert.equal(r.messages.length, 2);
  assert.equal(r.messages[0].t.getFullYear(), 2026);
  assert.equal(r.messages[0].t.getSeconds(), 5);
  assert.equal(r.messages[1].type, 'media');
});

test('Ay/gün sırası verideki 12 üstü sayıdan anlaşılır', () => {
  const r = parseChat('10/24/26, 2:32 PM - Ali: Selam\n10/25/26, 9:05 AM - Veli: Günaydın');
  assert.equal(r.dateOrder, 'AGY');
  assert.equal(r.messages[0].t.getMonth(), 9);
  assert.equal(r.messages[0].t.getDate(), 24);
  assert.equal(r.messages[0].t.getHours(), 14);
  assert.equal(r.messages[1].t.getHours(), 9);
});

test('12 saatli düzende gece yarısı ve öğle doğru çevrilir', () => {
  const r = parseChat('10/24/26, 12:05 AM - Ali: gece\n10/24/26, 12:05 PM - Ali: öğle');
  assert.equal(r.messages[0].t.getHours(), 0);
  assert.equal(r.messages[1].t.getHours(), 12);
});

test('Belirsiz tarihte Türkçe düzen (gün önce) varsayılır', () => {
  const r = parseChat('03.04.2026 10:00 - Ali: x');
  assert.equal(r.messages[0].t.getMonth(), 3);
  assert.equal(r.messages[0].t.getDate(), 3);
});

test('Çok satırlı mesaj tek mesaj olarak kalır', () => {
  const r = parseChat('24.10.2026 14:32 - Ali: ilk satır\nikinci satır\nüçüncü satır\n24.10.2026 14:40 - Veli: tamam');
  assert.equal(r.messages.length, 2);
  assert.equal(r.messages[0].text, 'ilk satır\nikinci satır\nüçüncü satır');
});

test('Sistem mesajları sayılır ama mesaj listesine girmez', () => {
  const r = parseChat('24.10.2026 14:00 - Mesajlar uçtan uca şifrelidir.\n24.10.2026 14:01 - Ali: selam\n24.10.2026 14:02 - Ali Veli\'yi ekledi');
  assert.equal(r.messages.length, 1);
  assert.equal(r.systemCount, 2);
});

test('Medya türleri ve silinen mesajlar ayrılır', () => {
  const r = parseChat([
    '24.10.2026 14:00 - A: <Medya dahil edilmedi>',
    '24.10.2026 14:01 - A: görüntü dahil edilmedi',
    '24.10.2026 14:02 - A: ses dahil edilmedi',
    '24.10.2026 14:03 - A: çıkartma dahil edilmedi',
    '24.10.2026 14:04 - A: IMG-0001.jpg (dosya ekli)',
    '24.10.2026 14:05 - A: Bu mesaj silindi',
    '24.10.2026 14:06 - A: normal mesaj',
  ].join('\n'));
  assert.deepEqual(r.messages.map(m => m.media), ['other', 'photo', 'audio', 'sticker', 'photo', null, null]);
  assert.equal(r.messages[5].type, 'deleted');
  assert.equal(r.messages[6].type, 'text');
});

test('Mesajlar zamana göre sıralanır, boş girdi hata vermez', () => {
  const r = parseChat('24.10.2026 15:00 - A: sonra\n24.10.2026 14:00 - B: önce');
  assert.deepEqual(r.messages.map(m => m.sender), ['B', 'A']);
  assert.equal(parseChat('').messages.length, 0);
  assert.equal(parseChat('alakasız metin').messages.length, 0);
});

test('Gönderen adındaki iki nokta üst üste yalnızca ilk ": " ile ayrılır', () => {
  const r = parseChat('24.10.2026 14:00 - Ali: saat 14:30: görüşürüz');
  assert.equal(r.messages[0].sender, 'Ali');
  assert.equal(r.messages[0].text, 'saat 14:30: görüşürüz');
});
