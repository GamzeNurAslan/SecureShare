// Mobil/web istemcilerinin yalnızca REST API üzerinden çalıştığını denetleyen aracın testleri
// + gerçek depodaki mobile/ ve web/ klasörlerinin denetimi.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { scanClients, normalizeEndpoint, isForbiddenPackage } = require('../scripts/check-client-boundary');

function makeRepo(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ss-boundary-'));
  for (const [name, content] of Object.entries(files)) {
    const full = path.join(root, name);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return root;
}
const rules = (res) => res.findings.map((f) => f.rule);

// ---------- Aracın kendi testleri ----------

test('normalizeEndpoint: şablon, parametre ve sorgu temizlenir', () => {
  assert.strictEqual(normalizeEndpoint('${BASE}/api/files/${id}/download?x=1'), '/api/files/:param/download');
  assert.strictEqual(normalizeEndpoint('http://10.0.0.2:3000/api/auth/login'), '/api/auth/login');
  assert.strictEqual(normalizeEndpoint('/api/files/:id/'), '/api/files/:param');
  assert.strictEqual(normalizeEndpoint('/health'), null);
});

test('yasak paketler tanınır', () => {
  for (const p of ['pg', 'minio', '@aws-sdk/client-s3', 'argon2', 'jsonwebtoken', 'express', '@prisma/client']) {
    assert.ok(isForbiddenPackage(p), p);
  }
  for (const p of ['react', 'expo', 'jwt-decode', 'expo-secure-store', 'axios']) assert.ok(!isForbiddenPackage(p), p);
});

test('temiz istemci: yalnızca /api/ çağrıları, hata yok', () => {
  const root = makeRepo({
    'mobile/package.json': JSON.stringify({ dependencies: { expo: '1', react: '1', 'jwt-decode': '1' } }),
    'mobile/src/api.ts': [
      "const BASE = process.env.EXPO_PUBLIC_API_URL;",
      "export const login = (b) => fetch(`${BASE}/api/auth/login`, { method: 'POST', body: JSON.stringify(b) });",
      "export const list = (t) => fetch(`${BASE}/api/files`, { headers: { Authorization: `Bearer ${t}` } });",
      "export const dl = (id) => fetch(`${BASE}/api/files/${id}/download`);",
    ].join('\n'),
    'backend/server.js': "app.use('/api/auth', authRouter); app.use('/api/files', filesRouter);",
    'docker-compose.yml': 'services:\n  postgres:\n    ports:\n      - "127.0.0.1:${POSTGRES_PORT}:5432"\n',
  });
  const res = scanClients({ root });
  assert.deepStrictEqual(res.errors, []);
  assert.deepStrictEqual(res.endpoints, ['/api/auth/login', '/api/files', '/api/files/:param/download']);
  assert.deepStrictEqual(res.warnings, []);
});

test('ihlaller yakalanır: paket, import, bağlantı dizesi, port, sır, ortam değişkeni', () => {
  const root = makeRepo({
    'web/package.json': JSON.stringify({ dependencies: { pg: '8', react: '19' }, devDependencies: { minio: '8' } }),
    'web/src/a.ts': [
      "import { Client } from 'pg';",
      "const Minio = require('minio');",
      "const url = 'postgres://u:p@db/x';",
      "fetch('http://192.168.1.5:9000/bucket/file');",
      "const k = process.env.KEK_HEX;",
    ].join('\n'),
    'web/.env': 'VITE_MINIO_SECRET=abc\n',
  });
  const r = rules(scanClients({ root }));
  for (const rule of ['FORBIDDEN_DEPENDENCY', 'FORBIDDEN_IMPORT', 'CONNECTION_STRING', 'DIRECT_SERVICE_PORT', 'SERVER_SECRET', 'PUBLIC_ENV_SECRET']) {
    assert.ok(r.includes(rule), `${rule} bulunamadı: ${r.join(',')}`);
  }
  assert.ok(scanClients({ root }).errors.length >= 6);
});

test('dış adres ve /api/ dışı yol uyarı verir (hata değil)', () => {
  const root = makeRepo({
    'mobile/src/a.ts': [
      "fetch('https://api.example.org/data');",
      "fetch('/uploads/x');",
    ].join('\n'),
  });
  const res = scanClients({ root });
  assert.deepStrictEqual(res.errors, []);
  assert.deepStrictEqual(rules(res).sort(), ['EXTERNAL_CALL', 'NON_API_PATH']);
});

test('yerel/özel ağ adresleri dış çağrı sayılmaz', () => {
  const root = makeRepo({ 'mobile/src/a.ts': "fetch('http://10.0.2.2:3000/health'); fetch('http://localhost:3000/x');" });
  assert.strictEqual(scanClients({ root }).findings.filter((f) => f.rule === 'EXTERNAL_CALL').length, 0);
});

test('backend\'de karşılığı olmayan uç uyarı verir', () => {
  const root = makeRepo({
    'mobile/src/a.ts': "fetch(`${B}/api/olmayan/x`); fetch(`${B}/api/files`);",
    'backend/routes/files.js': "router.get('/', h);",
    'backend/server.js': "app.use('/api/files', require('./routes/files'));",
  });
  const res = scanClients({ root });
  const unknown = res.findings.filter((f) => f.rule === 'UNKNOWN_ENDPOINT');
  assert.strictEqual(unknown.length, 1);
  assert.match(unknown[0].message, /\/api\/olmayan\/x/);
});

test('/api öneki app.use ile bağlanıp router yolları kısa yazılmışsa yanlış uyarı çıkmaz', () => {
  const root = makeRepo({
    'mobile/src/a.ts': "fetch(`${B}/api/files/${id}`);",
    'backend/server.js': "app.use('/api', apiRouter);",
    'backend/routes/index.js': "router.get('/files/:id', h);",
  });
  assert.strictEqual(scanClients({ root }).findings.filter((f) => f.rule === 'UNKNOWN_ENDPOINT').length, 0);
});

test('docker-compose: dışarıya açık veritabanı/MinIO portu hata verir, 127.0.0.1 verir geçer', () => {
  const bad = makeRepo({ 'docker-compose.yml': 'services:\n  postgres:\n    ports:\n      - "5432:5432"\n  minio:\n    ports:\n      - "0.0.0.0:9000:9000"\n      - "127.0.0.1:9001:9001"\n' });
  const res = scanClients({ root: bad });
  assert.deepStrictEqual(res.errors.map((e) => e.rule), ['COMPOSE_PORT_EXPOSED', 'COMPOSE_PORT_EXPOSED']);
  assert.match(res.errors[0].message, /postgres/);
  assert.match(res.errors[1].message, /minio/);

  const good = makeRepo({ 'docker-compose.yml': 'services:\n  postgres:\n    ports:\n      - "127.0.0.1:5432:5432"\n  backend:\n    ports:\n      - "3000:3000"\n' });
  assert.deepStrictEqual(scanClients({ root: good }).errors, []);
});

test('node_modules, assets ve kilit dosyaları taranmaz', () => {
  const root = makeRepo({
    'mobile/node_modules/x/index.js': "require('pg')",
    'mobile/assets/a.js': "require('pg')",
    'mobile/package-lock.json': '{"x":"postgres://a"}',
    'mobile/src/ok.ts': 'export const a = 1;',
  });
  assert.deepStrictEqual(scanClients({ root }).errors, []);
});

test('hiç ağ çağrısı yoksa NO_API_CALLS uyarısı verir (yanıltıcı "geçti" olmasın)', () => {
  const root = makeRepo({ 'mobile/src/a.ts': 'export const a = 1;', 'mobile/package.json': '{"dependencies":{"expo":"1"}}' });
  const res = scanClients({ root });
  assert.deepStrictEqual(res.errors, []);
  assert.deepStrictEqual(rules(res), ['NO_API_CALLS']);
  // çağrı olan istemcide uyarı çıkmaz
  const ok = makeRepo({ 'mobile/src/a.ts': 'fetch(`${B}/api/files`);', 'backend/server.js': "app.use('/api/files', r);" });
  assert.ok(!rules(scanClients({ root: ok })).includes('NO_API_CALLS'));
});

test('şablon içindeki ?: ifadesi yolu kesmez (gerçek hata: /api/auth/${isRegister)', () => {
  assert.strictEqual(
    normalizeEndpoint("${API}/api/auth/${isRegister ? 'register' : 'login'}"),
    '/api/auth/:param'
  );
  const root = makeRepo({
    'mobile/src/a.ts': "fetch(`${API}/api/auth/${isRegister ? 'register' : 'login'}`, { method: 'POST' });",
    'backend/server.js': "app.use('/api/auth', r);",
  });
  assert.deepStrictEqual(scanClients({ root }).endpoints, ['/api/auth/:param']);
});

test('aynı dosyadaki sabit adres değişkeni çözülür', () => {
  const root = makeRepo({
    'mobile/src/a.ts': "const url = `${B}/api/files`;\nfetch(url, { headers: h });",
    'backend/server.js': "app.use('/api/files', r);",
  });
  const res = scanClients({ root });
  assert.deepStrictEqual(res.endpoints, ['/api/files']);
  assert.deepStrictEqual(res.unresolved, []);
});

test('çözümlenemeyen çağrılar dosya ve satırla listelenir', () => {
  const root = makeRepo({ 'mobile/src/a.ts': "const x = 1;\nfetch(buildUrl(), {});" });
  const res = scanClients({ root });
  assert.strictEqual(res.unresolved.length, 1);
  assert.deepStrictEqual([res.unresolved[0].file, res.unresolved[0].line], ['mobile/src/a.ts', 2]);
  assert.match(res.unresolved[0].call, /^fetch\(buildUrl\)$/);
});

test('istemci kodunda geçen adresler listelenir', () => {
  const root = makeRepo({ 'mobile/src/a.ts': "const BASE = 'http://10.0.2.2:3000';\nfetch(`${BASE}/api/files`);" });
  const hosts = scanClients({ root }).hosts.map((h) => h.host);
  assert.deepStrictEqual(hosts, ['10.0.2.2:3000']);
});

test('elle doğrulanmış çağrı allow listesiyle ayrılır, eşleşmeyen çözümlenemeyen kalır', () => {
  const root = makeRepo({
    'mobile/src/a.ts': "fetch(asset.uri);\n\n\nfetch(other.uri);",
    'backend/server.js': "app.use('/api/files', r);",
  });
  const allow = [{ file: 'mobile/src/a.ts', call: 'fetch(asset.uri)', reason: 'yerel blob' }];
  const res = scanClients({ root, allow });
  assert.strictEqual(res.verified.length, 1);
  assert.strictEqual(res.verified[0].reason, 'yerel blob');
  assert.deepStrictEqual(res.unresolved.map((u) => u.call), ['fetch(other.uri)']);
  // allow olmadan ikisi de çözümlenemeyen
  assert.strictEqual(scanClients({ root }).unresolved.length, 2);
});

test('allow kaydı satır numarasına bağlı değil (kod kayınca bozulmaz)', () => {
  const root = makeRepo({ 'mobile/src/a.ts': "\n\n\n\n\nfetch(asset.uri);" });
  const res = scanClients({ root, allow: [{ file: 'mobile/src/a.ts', call: 'fetch(asset.uri)', reason: 'x' }] });
  assert.strictEqual(res.verified.length, 1);
  assert.strictEqual(res.unresolved.length, 0);
});

// ---------- Anahtar malzemesi, API sızıntısı, depo hijyeni ----------

test('istemci kodunda anahtar malzemesi ve depolama iç ayrıntısı hata verir; yorum satırı vermez', () => {
  const root = makeRepo({
    'mobile/src/a.ts': [
      '// KEK sunucuda tutulur, istemci bilmez',
      '/* DEK burada kullanılmaz */',
      'const k = row.encryptedDek;',
      'const x = response.object_key;',
      'const dek = await getKey();',
      "const url = presignedUrl;",
      "await client.getObject('secureshare-files', key);",
    ].join('\n'),
  });
  const res = scanClients({ root });
  const byRule = (r) => res.errors.filter((e) => e.rule === r).map((e) => e.line);
  assert.deepStrictEqual(byRule('CLIENT_KEY_MATERIAL'), [3, 4]); // 1-2. satır yorum, 5. satırdaki küçük harf `dek` değişken adı
  assert.deepStrictEqual(byRule('CLIENT_STORAGE_INTERNAL'), [6, 7]);
});

test('istemcide şifreleme kütüphanesi ve crypto.subtle uyarı verir (hata değil)', () => {
  const root = makeRepo({
    'mobile/package.json': JSON.stringify({ dependencies: { 'crypto-js': '4', expo: '1' } }),
    'mobile/src/a.ts': "import CryptoJS from 'crypto-js';\nconst d = await crypto.subtle.digest('SHA-256', b);",
  });
  const res = scanClients({ root });
  assert.deepStrictEqual(res.errors, []);
  const warns = res.warnings.map((w) => w.rule);
  assert.strictEqual(warns.filter((r) => r === 'CLIENT_CRYPTO_LIB').length, 2); // paket + import
  assert.ok(warns.includes('CLIENT_CRYPTO_API'));
});

test('API yanıtı anahtar/iç alan döndürürse hata verir (iç içe parantez dahil)', () => {
  const root = makeRepo({
    'backend/routes/files.js': [
      "router.get('/:id', async (req, res) => {",
      "  res.status(200).json({ id: row.id, originalName: row.original_name });",        // temiz
      "  res.json({ id: row.id, encrypted_dek: row.encrypted_dek });",                   // sızıntı (3+... 3. satır)
      "  res.status(200).json(rows.map((r) => ({ id: r.id, nonce: r.nonce })));",         // sızıntı (iç içe)
      "  res.send({ user: { id: u.id, password_hash: u.password_hash } });",              // sızıntı
      "  res.status(403).json({ error: 'Yetkiniz yok.' });",                              // temiz
      "});",
    ].join('\n'),
  });
  const leaks = scanClients({ root }).errors.filter((e) => e.rule === 'API_RESPONSE_LEAK');
  assert.deepStrictEqual(leaks.map((l) => l.line), [3, 4, 5]);
  assert.match(leaks[0].message, /encrypted_dek/);
});

test('SELECT * ve RETURNING * route dosyasında uyarı verir (hata değil)', () => {
  const root = makeRepo({
    'backend/routes/files.js': "const r = await db.query('SELECT * FROM files WHERE id = $1', [id]);\nres.json(r.rows[0]);\nawait db.query('INSERT INTO files (id) VALUES ($1) RETURNING *', [1]);",
  });
  const res = scanClients({ root });
  assert.deepStrictEqual(res.errors, []);
  assert.deepStrictEqual(res.warnings.filter((w) => w.rule === 'SELECT_STAR').map((w) => w.line), [1, 3]);
});

test('anahtarı meşru işleyen iç modüller (services, crypto, storage, audit, test, scripts) API sızıntısı için taranmaz', () => {
  const root = makeRepo({
    'backend/services/fileService.js': "res.json({ encrypted_dek: 1 });",
    'backend/crypto/encryption.js': "res.json({ kek: 1 });",
    'backend/test/a.test.js': "res.json({ nonce: 1 });",
    'backend/routes/ok.js': "res.json({ id: 1 });",
  });
  assert.strictEqual(scanClients({ root }).errors.filter((e) => e.rule === 'API_RESPONSE_LEAK').length, 0);
});

test('depo hijyeni: .env .gitignore\'da değilse ve .env.example\'da gizli değer doluysa hata', () => {
  const bad = makeRepo({ '.gitignore': 'node_modules\n*.log\n', '.env.example': 'KEK_HEX=a6c01c305aff2519f7e2daaf160ef8d2\nPOSTGRES_DB=x\nMINIO_ROOT_PASSWORD=\n' });
  const r = scanClients({ root: bad }).errors.map((e) => e.rule).sort();
  assert.deepStrictEqual(r, ['ENV_NOT_IGNORED', 'SECRET_IN_EXAMPLE']);

  for (const gi of ['.env\n', '.env*\n!.env.example\n', '.env.*\n', '/.env\n', '*.env\n']) {
    const ok = makeRepo({ '.gitignore': gi, '.env.example': 'KEK_HEX=\nAUDIT_HMAC_KEY=\nMINIO_ROOT_PASSWORD=\nJWT_SECRET=\n' });
    assert.deepStrictEqual(scanClients({ root: ok }).errors, [], `gitignore: ${JSON.stringify(gi)}`);
  }
});

// ---------- Gerçek depo ----------

test('GERÇEK DEPO: mobile/ ve web/ yalnızca REST API üzerinden çalışıyor (hata yok)', (t) => {
  const root = path.resolve(__dirname, '..', '..');
  if (!fs.existsSync(path.join(root, 'mobile')) && !fs.existsSync(path.join(root, 'web'))) {
    return t.skip('mobile/ ve web/ klasörleri yok');
  }
  const res = scanClients({ root });
  const msg = res.errors.map((e) => `${e.rule} ${e.file}:${e.line} ${e.message}`).join('\n');
  assert.deepStrictEqual(res.errors, [], '\n' + msg);
});
