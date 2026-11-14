// PostgreSQL ve MinIO'nun ağdan doğrudan erişilebilir OLMADIĞINI canlı olarak dener.
//
// Mantık (her servis için):
//   1. 127.0.0.1:<port> açık mı?   Kapalıysa servis çalışmıyordur -> "KANIT YOK" (korunduğu anlamına gelmez)
//   2. Açıksa, bilgisayarın yerel ağ (LAN) adreslerinden aynı porta bağlanmayı dener.
//      Bağlanılabiliyorsa servis ağa açıktır -> HATA. Bağlanılamıyorsa -> GEÇTİ.
//
// Kullanım:   (Docker'da servisler açıkken)   cd backend && node scripts/check-network-exposure.js
// Çıkış kodu: ağa açık servis bulunursa 1, aksi halde 0.

const net = require('net');
const os = require('os');
const path = require('path');

/** host:port'a TCP bağlantısı dener -> 'open' | 'closed' | 'timeout' */
function tryConnect(host, port, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const sock = net.connect({ host, port });
    let done = false;
    const finish = (r) => { if (!done) { done = true; sock.destroy(); resolve(r); } };
    sock.setTimeout(timeoutMs, () => finish('timeout'));
    sock.once('connect', () => finish('open'));
    sock.once('error', () => finish('closed'));
  });
}

/** Bilgisayarın loopback dışındaki IPv4 adresleri */
function lanAddresses(interfaces = os.networkInterfaces()) {
  const out = [];
  for (const list of Object.values(interfaces)) {
    for (const i of list || []) {
      const v4 = i.family === 'IPv4' || i.family === 4;
      if (v4 && !i.internal) out.push(i.address);
    }
  }
  return out;
}

/**
 * @param {{services: Array<{name:string, port:number}>, lan?: string[], connect?: Function}} opts
 * @returns {Promise<Array<{name, port, status: 'OK'|'EXPOSED'|'SKIPPED', detail: string}>>}
 */
async function checkExposure({ services, lan = lanAddresses(), connect = tryConnect }) {
  const results = [];
  for (const s of services) {
    const local = await connect('127.0.0.1', s.port);
    if (local !== 'open') {
      results.push({ ...s, status: 'SKIPPED', detail: `127.0.0.1:${s.port} kapalı (servis çalışmıyor), kanıt yok` });
      continue;
    }
    if (lan.length === 0) {
      results.push({ ...s, status: 'SKIPPED', detail: 'bilgisayarda yerel ağ adresi yok, dışarıdan erişim denenemedi' });
      continue;
    }
    const exposedOn = [];
    for (const ip of lan) {
      if ((await connect(ip, s.port)) === 'open') exposedOn.push(`${ip}:${s.port}`);
    }
    results.push(exposedOn.length
      ? { ...s, status: 'EXPOSED', detail: `ağdan erişilebiliyor: ${exposedOn.join(', ')}` }
      : { ...s, status: 'OK', detail: `127.0.0.1'de açık, ${lan.join(', ')} üzerinden erişilemiyor` });
  }
  return results;
}

module.exports = { tryConnect, lanAddresses, checkExposure };

if (require.main === module) {
  try {
    require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env'), quiet: true });
  } catch { /* dotenv yoksa ortam değişkenleri ya da varsayılan portlar kullanılır */ }
  const services = [
    { name: 'PostgreSQL', port: Number(process.env.POSTGRES_PORT || 5432) },
    { name: 'MinIO (API)', port: Number(process.env.MINIO_PORT || 9000) },
    { name: 'MinIO (konsol)', port: Number(process.env.MINIO_CONSOLE_PORT || 9001) },
  ];

  checkExposure({ services }).then((results) => {
    console.log(`Yerel ağ adresleri: ${lanAddresses().join(', ') || '(yok)'}\n`);
    for (const r of results) console.log(`  [${r.status.padEnd(7)}] ${r.name.padEnd(15)} :${r.port}  ${r.detail}`);

    const exposed = results.filter((r) => r.status === 'EXPOSED');
    const ok = results.filter((r) => r.status === 'OK');
    if (exposed.length) {
      console.log('\nSONUÇ: KALDI ✘ (ağa açık servis var; docker-compose.yml portlarını 127.0.0.1: ile başlatın)');
      process.exit(1);
    }
    if (ok.length === 0) {
      console.log('\nSONUÇ: KANIT YOK (servisler çalışmıyor; önce `docker compose up -d` çalıştırıp tekrar deneyin)');
    } else if (ok.length < results.length) {
      console.log('\nSONUÇ: KISMEN ✔ (çalışan servisler ağa kapalı; kapalı olanlar denenemedi)');
    } else {
      console.log('\nSONUÇ: GEÇTİ ✔ (veritabanı ve MinIO yalnızca bu bilgisayardan erişilebilir)');
    }
    process.exit(0);
  });
}
