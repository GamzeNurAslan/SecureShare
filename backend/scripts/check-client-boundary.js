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
  });

  if (!isSource) return;

  // import / require
  const importRe = /(?:from\s+|import\s+|require\(\s*)['"]([^'"]+)['"]/g;
  for (let m; (m = importRe.exec(text));) {
    const pkgName = m[1].startsWith('@') ? m[1].split('/').slice(0, 2).join('/') : m[1].split('/')[0];
    if (!m[1].startsWith('.') && isForbiddenPackage(pkgName)) {
      add('error', 'FORBIDDEN_IMPORT', name, lineOf(text, m.index), `${pkgName} istemci kodunda kullanılamaz`);
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

/**
 * @param {object} opts
 * @param {string} opts.root  Depo kökü (içinde mobile/, web/, backend/, docker-compose.yml)
 */
function scanClients({ root }) {
  const findings = [];
  const endpoints = [];
  const stats = { filesScanned: 0, networkCalls: 0, unresolvedCalls: 0, unresolved: [], hosts: new Map(), files: [] };
  const add = (severity, rule, file, line, message) => findings.push({ severity, rule, file, line, message });

  const present = CLIENT_DIRS.filter((d) => fs.existsSync(path.join(root, d)));
  for (const d of present) {
    for (const f of walk(path.join(root, d))) scanClientFile(root, f, add, endpoints, stats);
  }

  scanCompose(root, add);

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

  return {
    findings,
    errors: findings.filter((f) => f.severity === 'error'),
    warnings: findings.filter((f) => f.severity === 'warn'),
    endpoints: [...uniq.values()].map((e) => e.endpoint).sort(),
    clientDirs: present,
    stats,
    unresolved: stats.unresolved,
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
    '',
    '## İstemcilerin çağırdığı uç noktalar',
    result.endpoints.length ? result.endpoints.map((e) => `- \`${e}\``).join('\n') : '- (kodda doğrudan çözümlenebilir `/api/` çağrısı bulunamadı)',
    '',
    '## Çözümlenemeyen çağrılar (elle kontrol edilmeli)',
    result.unresolved.length ? result.unresolved.map((u) => `- \`${u.file}:${u.line}\` → \`${u.call}\``).join('\n') : '- yok',
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
  const result = scanClients({ root });
  const out = (f) => console.log(`  [${f.severity.toUpperCase()}] ${f.rule}  ${f.file}${f.line ? ':' + f.line : ''}  ${f.message}`);

  console.log(`İstemci klasörleri: ${result.clientDirs.join(', ') || '(yok)'}  ·  taranan dosya: ${result.stats.filesScanned}`);
  console.log(`Ağ çağrıları: ${result.stats.networkCalls} (çözümlenemeyen: ${result.stats.unresolvedCalls})`);
  console.log('Çağrılan uç noktalar:');
  (result.endpoints.length ? result.endpoints : ['(yok)']).forEach((e) => console.log('  ' + e));
  console.log('Taranan dosyalar: ' + (result.scannedFiles.join(', ') || '(yok)'));
  console.log('İstemci kodunda geçen adresler:');
  (result.hosts.length ? result.hosts.map((h) => `  ${h.host}  (${h.file}:${h.line})`) : ['  (yok)']).forEach((l) => console.log(l));
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
