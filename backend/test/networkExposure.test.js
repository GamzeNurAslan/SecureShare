// check-network-exposure.js testleri. Gerçek bir TCP sunucusu ve sahte (stub) bağlantı fonksiyonu kullanılır.

const test = require('node:test');
const assert = require('node:assert');
const net = require('net');
const { tryConnect, lanAddresses, checkExposure } = require('../scripts/check-network-exposure');

const stub = (map) => async (host, port) => map[`${host}:${port}`] || 'closed';
const svc = [{ name: 'PostgreSQL', port: 5432 }];

test('lanAddresses: loopback ve IPv6 elenir, eski (sayısal) family kabul edilir', () => {
  const ifaces = {
    lo: [{ family: 'IPv4', address: '127.0.0.1', internal: true }],
    eth0: [{ family: 'IPv4', address: '192.168.1.20', internal: false }, { family: 'IPv6', address: 'fe80::1', internal: false }],
    wlan: [{ family: 4, address: '10.0.0.7', internal: false }],
  };
  assert.deepStrictEqual(lanAddresses(ifaces), ['192.168.1.20', '10.0.0.7']);
});

test('yalnızca loopback\'te açık servis OK sayılır', async () => {
  const r = await checkExposure({ services: svc, lan: ['192.168.1.20'], connect: stub({ '127.0.0.1:5432': 'open' }) });
  assert.strictEqual(r[0].status, 'OK');
});

test('LAN adresinden de açıksa EXPOSED', async () => {
  const r = await checkExposure({ services: svc, lan: ['192.168.1.20', '10.0.0.7'], connect: stub({ '127.0.0.1:5432': 'open', '10.0.0.7:5432': 'open' }) });
  assert.strictEqual(r[0].status, 'EXPOSED');
  assert.match(r[0].detail, /10\.0\.0\.7:5432/);
  assert.doesNotMatch(r[0].detail, /192\.168/);
});

test('zaman aşımı da "erişilemiyor" sayılır (güvenlik duvarı)', async () => {
  const r = await checkExposure({ services: svc, lan: ['192.168.1.20'], connect: stub({ '127.0.0.1:5432': 'open', '192.168.1.20:5432': 'timeout' }) });
  assert.strictEqual(r[0].status, 'OK');
});

test('servis kapalıysa kanıt yok (SKIPPED), OK denmez', async () => {
  const r = await checkExposure({ services: svc, lan: ['192.168.1.20'], connect: stub({}) });
  assert.strictEqual(r[0].status, 'SKIPPED');
  assert.match(r[0].detail, /kanıt yok/);
});

test('yerel ağ adresi yoksa SKIPPED', async () => {
  const r = await checkExposure({ services: svc, lan: [], connect: stub({ '127.0.0.1:5432': 'open' }) });
  assert.strictEqual(r[0].status, 'SKIPPED');
});

const listen = (host) => new Promise((resolve) => {
  const srv = net.createServer((s) => s.end());
  srv.listen(0, host, () => resolve(srv));
});

test('tryConnect gerçek soketle: açık port open, kapanınca closed', async () => {
  const srv = await listen('127.0.0.1');
  const { port } = srv.address();
  assert.strictEqual(await tryConnect('127.0.0.1', port), 'open');
  await new Promise((r) => srv.close(r));
  assert.strictEqual(await tryConnect('127.0.0.1', port), 'closed');
});

test('gerçek soketle: 0.0.0.0\'a bağlı servis EXPOSED, 127.0.0.1\'e bağlı servis OK', async (t) => {
  const lan = lanAddresses();
  if (lan.length === 0) return t.skip('bu makinede yerel ağ adresi yok');

  const open = await listen('0.0.0.0');
  const closed = await listen('127.0.0.1');
  try {
    const a = await checkExposure({ services: [{ name: 'acik', port: open.address().port }], lan });
    const b = await checkExposure({ services: [{ name: 'kapali', port: closed.address().port }], lan });
    assert.strictEqual(a[0].status, 'EXPOSED');
    assert.strictEqual(b[0].status, 'OK');
  } finally {
    await new Promise((r) => open.close(r));
    await new Promise((r) => closed.close(r));
  }
});
