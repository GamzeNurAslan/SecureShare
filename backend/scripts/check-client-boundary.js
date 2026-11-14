// Mobil ve web istemcilerinin YALNIZCA REST API üzerinden çalıştığını denetler.
//
// Kullanım:   cd backend && node scripts/check-client-boundary.js [--report]
//   --report   sonucu docs/client-api-boundary-report.md dosyasına da yazar
// Çıkış kodu: hata (error) bulunursa 1, aksi halde 0.
//
// Denetlenenler:
//  1. İstemci bağımlılıkları: veritabanı / nesne depolama / sunucu tarafı paketleri yok
//  2. İstemci kodu bu paketleri import/require etmiyor
//  3. Bağlantı dizesi (postgres://, s3:// ...) ve doğrudan servis portu (5432, 9000, 9001) yok
//  4. Sunucu sırları (KEK, MinIO/Postgres parolası, JWT secret...) istemcide geçmiyor
//  5. Ağ çağrıları: /api/... uçlarına gidiyor, dış servis çağrısı uyarı veriyor,
//     çağrılan uçların backend'de karşılığı var mı (en iyi çaba)
//  6. docker-compose: veritabanı ve MinIO yalnızca 127.0.0.1'e açık
//  7. İstemcide anahtar malzemesi (KEK/DEK, şifreli anahtar, nesne yolu), depolama iç ayrıntısı ve
//     istemci tarafı şifreleme kütüphanesi yok
//  8. Backend API yanıtlarında anahtar malzemesi / nonce / AAD / nesne yolu / parola özeti dönmüyor
//     (SELECT * kullanımı uyarı verir: tüm satır doğrudan dönerse alanlar sızabilir)
//  9. .env .gitignore'da, .env.example içinde gizli değerler boş

const fs = require('fs');
const path = require('path');

const CLIENT_DIRS = ['mobile', 'web'];
const IGNORE_DIRS = new Set([
  'node_modules', '.git', '.expo', 'dist', 'build', 'web-build', 'coverage', '.next',
  'android', 'ios', 'assets', '.turbo', '.cache',
]);
const SOURCE_EXT = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);
const TEXT_EXT = new Set([...SOURCE_EXT, '.json', '.html']);
const SKIP_FILES = new Set(['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml']);

// İstemcide bulunmaması gereken paketler
const FORBIDDEN_PACKAGES = [
  'pg', 'pg-promise', 'postgres', 'mysql', 'mysql2', 'mongodb', 'mongoose', 'sequelize', 'typeorm',
  'prisma', '@prisma/client', 'knex', 'redis', 'ioredis',
  'minio', 'aws-sdk', '@google-cloud/storage', '@supabase/supabase-js', 'firebase', 'firebase-admin',
  'argon2', 'jsonwebtoken', 'express',
];
const FORBIDDEN_PREFIXES = ['@aws-sdk/'];

const isForbiddenPackage = (name) =>
  FORBIDDEN_PACKAGES.includes(name) || FORBIDDEN_PREFIXES.some((p) => name.startsWith(p));

const SECRET_NAMES = [
  'KEK_HEX', 'AUDIT_HMAC_KEY', 'MINIO_ROOT_PASSWORD', 'MINIO_ROOT_USER', 'POSTGRES_PASSWORD',
  'POSTGRES_USER', 'JWT_SECRET',
];
const SECRET_RE = new RegExp(`\\b(${SECRET_NAMES.join('|')})\\b`);
const CONN_RE = /\b(postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|amqp|s3):\/\//i;
const PORT_RE = /[\w.-]+:(5432|9000|9001)\b/;
const PUBLIC_ENV_SECRET_RE = /\b(EXPO_PUBLIC|VITE|REACT_APP|NEXT_PUBLIC)_\w*(SECRET|PASSWORD|PRIVATE|KEK)\w*/i;

// İstemcide anahtar malzemesi ve depolama iç ayrıntıları bulunmamalı
const KEY_MATERIAL_RE = /\b(encrypted_dek|encryptedDek|kek_hex|KEK|DEK|object_key|objectKey)\b/;
const STORAGE_INTERNAL_RE = /(X-Amz-|\bpresigned\w*|\bgetObject\b|\bputObject\b|secureshare-files)/i;
const CLIENT_CRYPTO_PACKAGES = [
  'crypto-js', 'node-forge', 'tweetnacl', 'tweetnacl-util', 'libsodium-wrappers', 'react-native-aes-crypto',
  'react-native-simple-crypto', 'react-native-quick-crypto', 'aes-js', 'sjcl', 'crypto-browserify', '@noble/ciphers',
];
const SUBTLE_RE = /\b(crypto\.subtle|SubtleCrypto)\b/;
const isCommentLine = (line) => /^\s*(\/\/|\*|\/\*)/.test(line);

// Backend yanıtlarında dönmemesi gereken alanlar
const API_LEAK_RE = /\b(encrypted_dek|encryptedDek|nonce|aad|object_key|objectKey|password_hash|passwordHash|kek|dek|JWT_SECRET)\b/i;
const RESPONSE_CALL_RE = /\bres(?:\s*\.\s*status\s*\([^)]*\))?\s*\.\s*(?:json|send)\s*\(/g;
// Anahtarları meşru biçimde işleyen iç modüller taranmaz (yalnızca yanıt üreten katman taranır)
const BACKEND_SKIP_DIRS = new Set(['test', 'scripts', 'crypto', 'storage', 'services', 'audit']);

const CALL_RE = /\b(fetch|axios(?:\.(?:get|post|put|patch|delete|request))?|ky|got)\s*\(\s*(`[^`]*`|'[^']*'|"[^"]*"|[A-Za-z_$][\w.$]*)/g;
const INSTANCE_CALL_RE = /\b[A-Za-z_$][\w$]*\.(get|post|put|patch|delete)\(\s*(`[^`]*`|'[^']*'|"[^"]*")/g;

const LOCAL_HOST_RE = /^(localhost|127\.0\.0\.1|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.has(entry.name)) walk(path.join(dir, entry.name), out);
    } else if (!SKIP_FILES.has(entry.name)) {
      const ext = path.extname(entry.name);
      if (TEXT_EXT.has(ext) || entry.name.startsWith('.env')) out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

const rel = (root, p) => path.relative(root, p).split(path.sep).join('/');
const lineOf = (text, index) => text.slice(0, index).split('\n').length;

/** `/api/files/${id}/download?x=1` -> `/api/files/:param/download` */
function normalizeEndpoint(raw) {
  const i = raw.indexOf('/api/');
  if (i === -1) return null;
  return raw.slice(i).replace(/\$\{[^}]*\}/g, ':param').replace(/[?#].*$/, '').replace(/\/:\w+/g, '/:param').replace(/\/+$/, '');
}

function scanClientFile(root, file, add, endpoints, stats) {
  const text = fs.readFileSync(file, 'utf8');
  const name = rel(root, file);
  const base = path.basename(file);
  const isSource = SOURCE_EXT.has(path.extname(file));

  // package.json: bağımlılıklar
  if (base === 'package.json') {
    let pkg = {};
    try { pkg = JSON.parse(text); } catch { add('warn', 'PARSE', name, 1, 'package.json okunamadı'); return; }
    for (const section of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
      for (const dep of Object.keys(pkg[section] || {})) {
        if (isForbiddenPackage(dep)) add('error', 'FORBIDDEN_DEPENDENCY', name, 1, `${section}: ${dep} istemcide olmamalı`);
        if (CLIENT_CRYPTO_PACKAGES.includes(dep)) add('warn', 'CLIENT_CRYPTO_LIB', name, 1, `${section}: ${dep} istemcide şifreleme kütüphanesi; anahtarlar istemcide mi tutuluyor?`);
      }
    }
    return;
  }

  stats.filesScanned += 1;
  stats.files.push(name);
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    const ln = i + 1;
    for (const hm of line.matchAll(/https?:\/\/([\w.-]+(?::\d+)?)/g)) {
      if (!stats.hosts.has(hm[1])) stats.hosts.set(hm[1], { file: name, line: ln });
    }
    if (CONN_RE.test(line)) add('error', 'CONNECTION_STRING', name, ln, 'veritabanı/depolama bağlantı dizesi');
    if (PORT_RE.test(line)) add('error', 'DIRECT_SERVICE_PORT', name, ln, 'veritabanı/MinIO portuna doğrudan adres (5432/9000/9001)');
    if (SECRET_RE.test(line)) add('error', 'SERVER_SECRET', name, ln, `sunucu sırrı istemcide geçiyor: ${line.match(SECRET_RE)[1]}`);
    if (PUBLIC_ENV_SECRET_RE.test(line)) add('error', 'PUBLIC_ENV_SECRET', name, ln, 'herkese açık ortam değişkeninde gizli değer adı');
    if (!isCommentLine(line)) {
      if (KEY_MATERIAL_RE.test(line)) add('error', 'CLIENT_KEY_MATERIAL', name, ln, `anahtar malzemesi istemcide geçiyor: ${line.match(KEY_MATERIAL_RE)[1]}`);
      if (STORAGE_INTERNAL_RE.test(line)) add('error', 'CLIENT_STORAGE_INTERNAL', name, ln, 'MinIO/depolama iç ayrıntısı istemcide geçiyor');
      if (SUBTLE_RE.test(line)) add('warn', 'CLIENT_CRYPTO_API', name, ln, "istemci tarafı şifreleme API'si (crypto.subtle); anahtar yönetimi sunucuda olmalı");
    }
  });

  if (!isSource) return;

  // import / require
  const importRe = /(?:from\s+|import\s+|require\(\s*)['"]([^'"]+)['"]/g;
  for (let m; (m = importRe.exec(text));) {
    const pkgName = m[1].startsWith('@') ? m[1].split('/').slice(0, 2).join('/') : m[1].split('/')[0];
    if (!m[1].startsWith('.') && isForbiddenPackage(pkgName)) {
      add('error', 'FORBIDDEN_IMPORT', name, lineOf(text, m.index), `${pkgName} istemci kodunda kullanılamaz`);
    }
    if (!m[1].startsWith('.') && CLIENT_CRYPTO_PACKAGES.includes(pkgName)) {
      add('warn', 'CLIENT_CRYPTO_LIB', name, lineOf(text, m.index), `${pkgName} istemcide şifreleme kütüphanesi; anahtarlar istemcide mi tutuluyor?`);
    }
  }

  // ağ çağrıları
  const consts = new Map();
  const constRe = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=\n]+)?=\s*(`[^`]*`|'[^']*'|"[^"]*")/g;
  for (const cm of text.matchAll(constRe)) consts.set(cm[1], cm[2]);
  const seen = new Set();
  const handle = (kind, arg, index) => {
    const ln = lineOf(text, index);
    const resolved = !/^[`'"]/.test(arg) && consts.has(arg) ? consts.get(arg) : arg;
    const lit = /^[`'"]/.test(resolved) ? resolved.slice(1, -1) : null;
    if (lit === null) { stats.unresolvedCalls += 1; stats.unresolved.push({ file: name, line: ln, call: `${kind}(${arg})` }); return; }
    stats.networkCalls += 1;
    const ep = normalizeEndpoint(lit);
    if (ep) { endpoints.push({ endpoint: ep, file: name, line: ln }); return; }
    const abs = lit.match(/^https?:\/\/([^/:?#]+)/i);
    if (abs && !LOCAL_HOST_RE.test(abs[1])) {
      add('warn', 'EXTERNAL_CALL', name, ln, `REST API dışı dış adres: ${abs[1]}`);
    } else if (lit.startsWith('/') && !seen.has(lit)) {
      seen.add(lit);
      add('warn', 'NON_API_PATH', name, ln, `/api/ ile başlamayan çağrı yolu: ${lit.slice(0, 60)}`);
    }
  };
  for (let m; (m = CALL_RE.exec(text));) handle(m[1], m[2], m.index);
  for (let m; (m = INSTANCE_CALL_RE.exec(text));) {
    const lit = m[2].slice(1, -1);
    if (lit.startsWith('/') || /^https?:\/\//.test(lit)) handle(m[1], m[2], m.index);
  }
}

/** Backend'de tanımlı /api/<segment> öneklerini en iyi çabayla toplar. */
function backendSegments(root) {
  const segs = new Set();
  const dir = path.join(root, 'backend');
  const files = walk(dir).filter((f) => SOURCE_EXT.has(path.extname(f)) && !/[\\/]test[\\/]/.test(f) && !/[\\/]scripts[\\/]/.test(f));
  let mountsApi = false;
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8');
    const lit = /['"`]\/api\/([\w-]+)/g;
    for (let m; (m = lit.exec(text));) segs.add(m[1]);
    if (/\.use\(\s*['"`]\/api['"`]/.test(text)) mountsApi = true;
  }
  if (mountsApi) {
    for (const f of files) {
      const text = fs.readFileSync(f, 'utf8');
      const re = /\b(?:router|app)\.(?:get|post|put|patch|delete|use)\(\s*['"`]\/([\w-]+)/g;
      for (let m; (m = re.exec(text));) segs.add(m[1]);
    }
  }
  return segs;
}

/** docker-compose: veritabanı ve MinIO yalnızca 127.0.0.1'e açık olmalı. */
function scanCompose(root, add) {
  const file = path.join(root, 'docker-compose.yml');
  if (!fs.existsSync(file)) return;
  const PUBLIC_OK = new Set(['backend', 'api', 'web', 'nginx', 'proxy', 'caddy', 'traefik']);
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  let service = null, inPorts = false, portsIndent = 0;
  lines.forEach((raw, i) => {
    const line = raw.replace(/\r$/, '');
    const svc = line.match(/^  ([\w-]+):\s*$/);
    if (svc) { service = svc[1]; inPorts = false; return; }
    const indent = line.length - line.trimStart().length;
    if (/^\s*ports:\s*$/.test(line)) { inPorts = true; portsIndent = indent; return; }
    if (inPorts) {
      const item = line.match(/^\s*-\s*["']?([^"'#]+?)["']?\s*(#.*)?$/);
      if (item && indent > portsIndent) {
        const val = item[1];
        if (service && !PUBLIC_OK.has(service) && !/^(127\.0\.0\.1|localhost):/.test(val)) {
          add('error', 'COMPOSE_PORT_EXPOSED', 'docker-compose.yml', i + 1, `${service} servisi dışarıya açık: "${val}" (127.0.0.1: ile başlamalı)`);
        }
      } else if (line.trim() !== '' && indent <= portsIndent) {
        inPorts = false;
      }
    }
  });
}

/** '(' sonrasındaki ilk karakterden eşleşen ')' karakterine kadar olan metni döner (tırnakları atlar). */
function extractCall(text, openIdx) {
  let depth = 1;
  let i = openIdx;
  let quote = null;
  for (; i < text.length && depth > 0; i++) {
    const ch = text[i];
    if (quote) { if (ch === '\\') i++; else if (ch === quote) quote = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') quote = ch;
    else if (ch === '(') depth++;
    else if (ch === ')') depth--;
  }
  return text.slice(openIdx, i);
}

/** Backend yanıtları (res.json / res.send) anahtar malzemesi, nonce/AAD, nesne yolu ya da parola özeti döndürüyor mu? */
function scanApiLeaks(root, add) {
  const dir = path.join(root, 'backend');
  if (!fs.existsSync(dir)) return;
  const files = walk(dir).filter((f) => {
    const segments = rel(dir, f).split('/');
    return SOURCE_EXT.has(path.extname(f)) && !segments.slice(0, -1).some((seg) => BACKEND_SKIP_DIRS.has(seg));
  });
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8');
    // Alan adı yazmadan tüm satırı döndüren kod, isim taramasında görünmez; SELECT * bunun işaretidir
    for (const sm of text.matchAll(/\b(SELECT|RETURNING)\s+\*/gi)) {
      add('warn', 'SELECT_STAR', rel(root, f), lineOf(text, sm.index), `${sm[1].toUpperCase()} * kullanılıyor; sonuç doğrudan istemciye dönerse encrypted_dek/nonce/aad/object_key sızabilir`);
    }
    RESPONSE_CALL_RE.lastIndex = 0;
    for (let m; (m = RESPONSE_CALL_RE.exec(text));) {
      const body = extractCall(text, m.index + m[0].length);
      const hit = body.match(API_LEAK_RE);
      if (hit) {
        add('error', 'API_RESPONSE_LEAK', rel(root, f), lineOf(text, m.index), `API yanıtı "${hit[1]}" alanını içeriyor; istemciye anahtar/iç ayrıntı sızabilir`);
      }
    }
  }
}

/** .env .gitignore'da mı, .env.example içinde gizli değerler boş mu? */
function scanRepoHygiene(root, add) {
  const gi = path.join(root, '.gitignore');
  if (fs.existsSync(gi)) {
    const lines = fs.readFileSync(gi, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#') && !l.startsWith('!'));
    if (!lines.some((l) => /^\/?\.env(\*|\.\*)?$/.test(l) || l === '*.env')) {
      add('error', 'ENV_NOT_IGNORED', '.gitignore', 0, '.env dosyası .gitignore içinde yok; anahtarlar depoya girebilir');
    }
  }
  const ex = path.join(root, '.env.example');
  if (fs.existsSync(ex)) {
    fs.readFileSync(ex, 'utf8').split(/\r?\n/).forEach((line, i) => {
      const m = line.match(/^\s*(KEK_HEX|MINIO_ROOT_PASSWORD|AUDIT_HMAC_KEY|JWT_SECRET)\s*=\s*(\S.*)$/);
      if (m) add('error', 'SECRET_IN_EXAMPLE', '.env.example', i + 1, `${m[1]} değeri .env.example içinde dolu olmamalı (depoya girer)`);
    });
  }
}

/**
 * @param {object} opts
 * @param {string} opts.root  Depo kökü (içinde mobile/, web/, backend/, docker-compose.yml)
 * @param {Array<{file:string, call:string, reason:string}>} [opts.allow]
 *        Elle doğrulanmış, otomatik çözümlenemeyen çağrılar (satır numarası eşleşmesi aranmaz)
 */
function scanClients({ root, allow = [] }) {
  const findings = [];
  const endpoints = [];
  const stats = { filesScanned: 0, networkCalls: 0, unresolvedCalls: 0, unresolved: [], hosts: new Map(), files: [] };
  const add = (severity, rule, file, line, message) => findings.push({ severity, rule, file, line, message });

  const present = CLIENT_DIRS.filter((d) => fs.existsSync(path.join(root, d)));
  for (const d of present) {
    for (const f of walk(path.join(root, d))) scanClientFile(root, f, add, endpoints, stats);
  }

  scanCompose(root, add);
  scanApiLeaks(root, add);
  scanRepoHygiene(root, add);

  // Hiç ağ çağrısı bulunmadıysa 'geçti' demek yanıltıcı olur: istemci API'ye henüz bağlanmamış olabilir
  if (present.length && stats.filesScanned > 0 && stats.networkCalls === 0 && stats.unresolvedCalls === 0) {
    add('warn', 'NO_API_CALLS', present.join(', '), 0, 'istemci kodunda hiç ağ çağrısı bulunamadı; API\'ye henüz bağlanmamış olabilir, bu sonuç bir kanıt değildir');
  }

  // Çağrılan uçların backend'de karşılığı
  const segs = backendSegments(root);
  const uniq = new Map();
  for (const e of endpoints) if (!uniq.has(e.endpoint)) uniq.set(e.endpoint, e);
  for (const e of uniq.values()) {
    const seg = e.endpoint.split('/')[2];
    if (!segs.has(seg)) add('warn', 'UNKNOWN_ENDPOINT', e.file, e.line, `${e.endpoint} için backend'de karşılık bulunamadı`);
  }

  const verified = [];
  const remaining = [];
  for (const u of stats.unresolved) {
    const hit = allow.find((a) => a.file === u.file && a.call === u.call);
    if (hit) verified.push({ ...u, reason: hit.reason }); else remaining.push(u);
  }

  return {
    findings,
    errors: findings.filter((f) => f.severity === 'error'),
    warnings: findings.filter((f) => f.severity === 'warn'),
    endpoints: [...uniq.values()].map((e) => e.endpoint).sort(),
    clientDirs: present,
    stats,
    unresolved: remaining,
    verified,
    hosts: [...stats.hosts].map(([host, v]) => ({ host, ...v })),
    scannedFiles: stats.files,
  };
}

function renderMarkdown(result) {
  const date = new Date().toISOString().slice(0, 10);
  const status = result.errors.length === 0 ? 'GEÇTİ' : 'KALDI';
  const rows = (list) => list.map((f) => `| ${f.severity} | ${f.rule} | \`${f.file}${f.line ? ':' + f.line : ''}\` | ${f.message} |`).join('\n');
  return [
    `# İstemci – REST API sınırı denetimi (${date})`,
    '',
    `**Sonuç: ${status}** — ${result.errors.length} hata, ${result.warnings.length} uyarı.`,
    `Taranan istemci klasörleri: ${result.clientDirs.join(', ') || '(yok)'} · taranan dosya: ${result.stats.filesScanned} · ağ çağrısı: ${result.stats.networkCalls} (çözümlenemeyen: ${result.stats.unresolvedCalls}).`,
    '',
    '## Denetlenen kurallar',
    '1. İstemci `package.json` dosyalarında veritabanı, nesne depolama ve sunucu tarafı paketleri yok.',
    '2. İstemci kodu bu paketleri import/require etmiyor.',
    '3. Bağlantı dizesi ve doğrudan servis portu (5432, 9000, 9001) yok.',
    '4. Sunucu sırları (KEK, MinIO/Postgres parolası, JWT secret) istemcide geçmiyor.',
    '5. Ağ çağrıları `/api/...` uçlarına gidiyor; dış adres ve `/api/` dışı yol uyarı verir.',
    '6. `docker-compose.yml` içinde veritabanı ve MinIO yalnızca `127.0.0.1` üzerinden erişilebilir.',
    '7. İstemci kodunda anahtar malzemesi (KEK/DEK, şifreli anahtar, nesne yolu) ve depolama iç ayrıntısı (presigned URL, getObject...) yok; istemci tarafı şifreleme kütüphanesi uyarı verir.',
    '8. Backend API yanıtlarında (res.json/res.send) anahtar malzemesi, nonce/AAD, nesne yolu ve parola özeti dönmüyor.',
    '9. `.env` dosyası `.gitignore` içinde; `.env.example` içinde KEK, MinIO parolası, HMAC anahtarı ve JWT secret boş.',
    '',
    '## İstemcilerin çağırdığı uç noktalar',
    result.endpoints.length ? result.endpoints.map((e) => `- \`${e}\``).join('\n') : '- (kodda doğrudan çözümlenebilir `/api/` çağrısı bulunamadı)',
    '',
    '## Çözümlenemeyen çağrılar (elle kontrol edilmeli)',
    result.unresolved.length ? result.unresolved.map((u) => `- \`${u.file}:${u.line}\` → \`${u.call}\``).join('\n') : '- yok',
    '',
    '## Elle doğrulanan çağrılar',
    result.verified.length ? result.verified.map((v) => `- \`${v.file}:${v.line}\` → \`${v.call}\` — ${v.reason}`).join('\n') : '- yok',
    '',
    '## İstemcinin kodunda geçen adresler',
    result.hosts.length ? result.hosts.map((h) => `- \`${h.host}\` (\`${h.file}:${h.line}\`)`).join('\n') : '- yok',
    '',
    '## Taranan dosyalar',
    result.scannedFiles.map((f) => `- \`${f}\``).join('\n') || '- yok',
    '',
    '## Bulgular',
    result.findings.length ? `| Seviye | Kural | Yer | Açıklama |\n|---|---|---|---|\n${rows(result.findings)}` : 'Bulgu yok.',
    '',
  ].join('\n');
}

module.exports = { scanClients, renderMarkdown, normalizeEndpoint, isForbiddenPackage };

if (require.main === module) {
  const root = path.resolve(__dirname, '..', '..');
  const allowFile = path.join(__dirname, 'client-boundary-allow.json');
  const allow = fs.existsSync(allowFile) ? JSON.parse(fs.readFileSync(allowFile, 'utf8')) : [];
  const result = scanClients({ root, allow });
  const out = (f) => console.log(`  [${f.severity.toUpperCase()}] ${f.rule}  ${f.file}${f.line ? ':' + f.line : ''}  ${f.message}`);

  console.log(`İstemci klasörleri: ${result.clientDirs.join(', ') || '(yok)'}  ·  taranan dosya: ${result.stats.filesScanned}`);
  console.log(`Ağ çağrıları: ${result.stats.networkCalls} (çözümlenemeyen: ${result.stats.unresolvedCalls}, elle doğrulanan: ${result.verified.length})`);
  console.log('Çağrılan uç noktalar:');
  (result.endpoints.length ? result.endpoints : ['(yok)']).forEach((e) => console.log('  ' + e));
  console.log('Taranan dosyalar: ' + (result.scannedFiles.join(', ') || '(yok)'));
  console.log('İstemci kodunda geçen adresler:');
  (result.hosts.length ? result.hosts.map((h) => `  ${h.host}  (${h.file}:${h.line})`) : ['  (yok)']).forEach((l) => console.log(l));
  console.log('Elle doğrulanan çağrılar:');
  (result.verified.length ? result.verified.map((v) => `  ${v.file}:${v.line}  ${v.call}  — ${v.reason}`) : ['  (yok)']).forEach((l) => console.log(l));
  console.log('Çözümlenemeyen çağrılar (elle kontrol edin):');
  (result.unresolved.length ? result.unresolved.map((u) => `  ${u.file}:${u.line}  ${u.call}`) : ['  (yok)']).forEach((l) => console.log(l));
  console.log(`\nBulgular: ${result.errors.length} hata, ${result.warnings.length} uyarı`);
  result.findings.forEach(out);

  if (process.argv.includes('--report')) {
    const target = path.join(root, 'docs', 'client-api-boundary-report.md');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, renderMarkdown(result));
    console.log(`\nRapor yazıldı: ${rel(root, target)}`);
  }
  console.log(result.errors.length === 0 ? '\nSONUÇ: GEÇTİ ✔ (istemciler yalnızca REST API üzerinden çalışıyor)' : '\nSONUÇ: KALDI ✘');
  process.exit(result.errors.length === 0 ? 0 : 1);
}
