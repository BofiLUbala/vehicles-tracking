const dns = require('dns');
const net = require('net');

function testOne(host, port) {
  return new Promise((resolve) => {
    const sock = net.connect({ host, port, timeout: 3000 });
    let done = false;
    const finish = (res) => { if (!done) { done = true; try { sock.destroy(); } catch {} resolve(res); } };
    sock.on('connect', () => finish(`connect OK (${host}:3001)`));
    sock.on('timeout', () => finish(`TIMEOUT (${host}:3001)`));
    sock.on('error', (e) => finish(`ERROR (${host}:3001) ${e.code ?? e.message}`));
  });
}

(async () => {
  const family = process.env.UV_THREADPOOL_SIZE == null ? null : null;
  try { console.log('dns.lookup localhost:', await new Promise((r) => dns.lookup('localhost', { all: true }, (e, a) => r(e ? 'ERR ' + e.code : JSON.stringify(a))))); } catch (e) { console.log('lookup err', e.message); }
  console.log('node fetch localhost:', await (await fetch('http://localhost:3001/health', { signal: AbortSignal.timeout(3000) }).catch((e) => ({ status: 'ERR ' + e.cause?.code ?? e.message }) )).status ?? 'n/a');
  try {
    const res = await fetch('http://localhost:3001/health', { signal: AbortSignal.timeout(3000) });
    console.log('localhost health:', res.status, await res.text());
  } catch (e) { console.log('localhost health ERR:', e.cause?.code ?? e.message); }
  console.log(await testOne('localhost', 3001));
  console.log(await testOne('127.0.0.1', 3001));
  console.log(await testOne('::1', 3001));
})();