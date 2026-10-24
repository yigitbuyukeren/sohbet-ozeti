const test = require('node:test');
const assert = require('node:assert/strict');
const { parseChat } = require('../src/parser.js');
const { hesapla } = require('../src/stats.js');
const { ornekSohbet } = require('../src/ornek.js');

const hesap = (metin) => hesapla(parseChat(metin).messages);

test('Boş sohbet için null döner', () => {
  assert.equal(hesapla([]), null);
});

test('Mesaj sayıları, kişi payları ve gün sayısı', () => {
  const s = hesap([
    '01.01.2026 10:00 - Ali: bir',
    '01.01.2026 10:01 - Ali: iki',
    '01.01.2026 10:02 - Veli: üç',
    '03.01.2026 09:00 - Veli: dört',
  ].join('\n'));
  assert.equal(s.total, 4);
  assert.equal(s.days, 3);
  assert.equal(s.activeDays, 2);
  assert.equal(s.people[0].messages, 2);
  assert.equal(s.people.length, 2);
  assert.equal(s.busiest.date, '2026-01-01');
  assert.equal(s.busiest.count, 3);
});

test('Cevap süresi yalnızca konuşan değişince ölçülür; konuşmayı başlatan sayılır', () => {
  const s = hesap([
    '01.01.2026 10:00 - Ali: selam',
    '01.01.2026 10:02 - Veli: merhaba',
    '01.01.2026 10:03 - Ali: nasılsın',
    '02.01.2026 10:00 - Veli: günaydın',
  ].join('\n'));
  const ali = s.people.find(p => p.name === 'Ali');
  const veli = s.people.find(p => p.name === 'Veli');
  assert.equal(veli.medianReply, 120);
  assert.equal(ali.medianReply, 60);
  assert.equal(ali.starters, 1);
  assert.equal(veli.starters, 1);
  assert.equal(ali.enders, 1);
});

test('Isı haritası haftanın gününü Pazartesi=0 olarak sayar', () => {
  // 05.01.2026 Pazartesi
  const s = hesap('05.01.2026 14:10 - Ali: a\n11.01.2026 23:50 - Ali: b');
  assert.equal(s.heat[0][14], 1);
  assert.equal(s.heat[6][23], 1);
});

test('Kelimeler: durdurma sözcükleri ve kısa kelimeler elenir, Türkçe küçük harf', () => {
  const s = hesap('01.01.2026 10:00 - Ali: İSTANBUL güzel ve bir şehir istanbul\n01.01.2026 10:01 - Ali: ben de');
  const kelimeler = Object.fromEntries(s.topWords.map(x => [x.w, x.n]));
  assert.equal(kelimeler['istanbul'], 2);
  assert.equal(kelimeler['güzel'], 1);
  assert.equal(kelimeler['ve'], undefined);
  assert.equal(kelimeler['de'], undefined);
});

test('Emoji ve kahkaha sayılır', () => {
  const s = hesap('01.01.2026 10:00 - Ali: hahaha 😂😂 ❤️\n01.01.2026 10:01 - Ali: lol');
  assert.equal(s.people[0].emojiCount, 3);
  assert.equal(s.topEmoji[0].e, '😂');
  assert.ok(s.people[0].laughs >= 4);
});

test('En uzun sessizlik ve günlük seri', () => {
  const s = hesap([
    '01.01.2026 10:00 - Ali: a',
    '02.01.2026 10:00 - Ali: b',
    '03.01.2026 10:00 - Ali: c',
    '10.01.2026 10:00 - Ali: d',
  ].join('\n'));
  assert.equal(s.streak, 3);
  assert.equal(s.longestSilence.ms, 7 * 86400000);
});

test('Aylık seri boş ayları da içerir', () => {
  const s = hesap('15.01.2026 10:00 - Ali: a\n15.04.2026 10:00 - Ali: b');
  assert.deepEqual(s.monthly.map(m => m.key), ['2026-01', '2026-02', '2026-03', '2026-04']);
  assert.deepEqual(s.monthly.map(m => m.count), [1, 0, 0, 1]);
});

test('Örnek sohbet: ayrışır, aynı çıktıyı verir, unvanlar dağıtılır', () => {
  const metin = ornekSohbet();
  assert.equal(metin, ornekSohbet());
  const r = parseChat(metin);
  assert.deepEqual(r.participants.sort(), ['Defne', 'Ela', 'Kerem']);
  assert.ok(r.messages.length > 2000);
  const s = hesapla(r.messages);
  assert.equal(s.people.length, 3);
  assert.ok(Object.keys(s.titles).length >= 2);
  assert.equal(new Set(Object.values(s.titles)).size, Object.values(s.titles).length);
});

test('Altyazılı medyanın kelimeleri sayılır, mesaj yine de medya olarak kalır', () => {
  const s = hesap('24.10.2026 14:00 - A: harika manzara görüntü dahil edilmedi\n24.10.2026 14:01 - B: tamam');
  const a = s.people.find(p => p.name === 'A');
  assert.equal(a.mediaTotal, 1);
  assert.equal(a.textMessages, 0);
  assert.equal(a.words, 2);
  assert.equal(s.mediaCount, 1);
  assert.equal(s.textCount, 1);
});
