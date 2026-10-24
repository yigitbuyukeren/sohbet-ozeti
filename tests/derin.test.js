const test = require('node:test');
const assert = require('node:assert/strict');
const { parseChat } = require('../src/parser.js');
const { derinHesapla } = require('../src/derin.js');
const { duyguPuani } = require('../src/duygu.js');
const { ornekSohbet } = require('../src/ornek.js');

const hesap = (metin) => derinHesapla(parseChat(metin).messages);

test('Boş sohbet için null döner', () => {
  assert.equal(derinHesapla([]), null);
});

test('Çift mesaj: aynı kişinin 10 dakika içindeki art arda mesajları tek tur sayılır', () => {
  const d = hesap([
    '01.01.2026 10:00 - Ali: bir',
    '01.01.2026 10:01 - Ali: iki',
    '01.01.2026 10:02 - Ali: üç',
    '01.01.2026 10:05 - Veli: tamam',
    '01.01.2026 10:40 - Ali: dört',
  ].join('\n'));
  const ali = d.people.find(p => p.name === 'Ali');
  assert.equal(ali.turns, 2);
  assert.equal(ali.doubleTurns, 1);
  assert.equal(ali.longestBurst, 3);
  assert.ok(Math.abs(ali.messagesPerTurn - 2) < 1e-9);
});

test('Cevap süresi kutuları: 30 sn, 3 dk, 1 saat', () => {
  const d = hesap([
    '01.01.2026 10:00:00 - Ali: a',
    '01.01.2026 10:00:30 - Veli: b',
    '01.01.2026 10:03:30 - Ali: c',
    '01.01.2026 11:03:30 - Veli: d',
  ].join('\n'));
  assert.deepEqual(d.replyAll, [1, 1, 0, 1, 0]);
  assert.equal(d.network.names.length, 2);
});

test('Mesaj uzunluğu kutuları kelime sayısına göre', () => {
  const d = hesap('01.01.2026 10:00 - Ali: tek\n01.01.2026 10:01 - Ali: iki kelime\n01.01.2026 10:02 - Ali: bir iki üç dört beş altı yedi sekiz dokuz');
  assert.deepEqual(d.lengthAll, [1, 1, 0, 1, 0]);
});

test('İfade sayaçları ve bağlantı alan adları', () => {
  const d = hesap([
    '01.01.2026 10:00 - Ali: günaydın canım, teşekkür ederim https://www.ornek.com/x?y=1 ve (www.baska.org).',
    '01.01.2026 10:01 - Veli: pardon ama neden? hahaha',
  ].join('\n'));
  const ali = d.people.find(p => p.name === 'Ali');
  const veli = d.people.find(p => p.name === 'Veli');
  assert.equal(ali.phrases['Sevgi'], 1);
  assert.equal(ali.phrases['Teşekkür'], 1);
  assert.equal(ali.phrases['Selamlaşma'], 1);
  assert.equal(veli.phrases['Özür'], 1);
  assert.equal(veli.questions, 1);
  assert.equal(d.links.total, 2);
  assert.deepEqual(d.links.domains.map(x => x.d).sort(), ['baska.org', 'ornek.com']);
});

test('İkili kelime öbekleri yalnızca en az 3 kez geçince listelenir', () => {
  const satir = (i) => `01.01.2026 10:0${i} - Ali: harika film izledik`;
  const d = hesap([0, 1, 2].map(satir).join('\n') + '\n01.01.2026 10:09 - Ali: tek geçen öbek');
  assert.equal(d.topBigrams[0].w, 'harika film');
  assert.equal(d.topBigrams[0].n, 3);
  assert.ok(!d.topBigrams.some(x => x.w === 'tek geçen'));
});

test('Ayırt edici kelimeler kişiye özgü olanı öne çıkarır', () => {
  const ali = [1, 2, 3, 4].map(i => `01.01.2026 10:0${i} - Ali: bisiklet bisiklet ortak`);
  const veli = [5, 6, 7, 8].map(i => `01.01.2026 10:0${i} - Veli: ortak satranç satranç`);
  const d = hesap([...ali, ...veli].join('\n'));
  assert.equal(d.people.find(p => p.name === 'Ali').distinctive[0].w, 'bisiklet');
  assert.equal(d.people.find(p => p.name === 'Veli').distinctive[0].w, 'satranç');
});

test('Haftalık seri boş haftaları doldurur, en yoğun ve en sessiz haftayı bulur', () => {
  const d = hesap([
    '05.01.2026 10:00 - Ali: a', '05.01.2026 10:01 - Ali: b', '05.01.2026 10:02 - Ali: c',
    '12.01.2026 10:00 - Ali: d',
    '26.01.2026 10:00 - Ali: e',
    '02.02.2026 10:00 - Ali: f',
  ].join('\n'));
  assert.deepEqual(d.weekly.map(w => w.count), [3, 1, 0, 1, 1]);
  assert.equal(d.busiestWeek.key, '2026-01-05');
  assert.equal(d.quietestWeek.key, '2026-01-19');
});

test('Duygu puanı: olumlu, olumsuz, olumsuzlama, emoji', () => {
  assert.ok(duyguPuani('çok güzel bir gün') > 0);
  assert.ok(duyguPuani('berbat bir film') < 0);
  assert.ok(duyguPuani('iyi değil') < 0);
  assert.ok(duyguPuani('😍') > 0);
  assert.ok(duyguPuani('😭') < 0);
  assert.equal(duyguPuani('toplantı saat üçte'), 0);
});

test('Örnek sohbette derin analiz çalışır ve ağ matrisi simetrik boyutludur', () => {
  const d = derinHesapla(parseChat(ornekSohbet()).messages);
  assert.equal(d.people.length, 3);
  assert.equal(d.network.matrix.length, 3);
  assert.ok(d.network.matrix.every(satir => satir.length === 3));
  assert.ok(d.startHours.reduce((a, b) => a + b, 0) > 100);
  assert.ok(d.sentiment.length >= 6);
});
