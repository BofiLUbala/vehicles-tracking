const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE_APP = 'http://127.0.0.1:3000';
const CDP_BASE = 'http://127.0.0.1:9222';
const ADMIN_EMAIL = 'admin@demo.local';
const ADMIN_PASSWORD = 'ChangeMe123';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const out = [];
function note(k, v) { out.push({ k, v }); console.log(k, '=>', typeof v === 'string' ? v.slice(0, 1200) : JSON.stringify(v)?.slice(0, 1200)); }

async function getJson(url) {
  const res = await fetch(url);
  return res.json();
}

class CdpClient {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); }
  static async connect(wsUrl) {
    const ws = new WebSocket(wsUrl);
    await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
    const c = new CdpClient(ws);
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : ev.data.toString());
      if (msg.id && c.pending.has(msg.id)) {
        const { resolve, reject } = c.pending.get(msg.id);
        c.pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      }
    });
    return c;
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
}

async function main() {
  const userDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-cdp-'));
  const chrome = spawn(CHROME, [
    '--headless=new', '--remote-debugging-port=9222',
    `--user-data-dir=${userDir}`, '--no-first-run', '--no-default-browser-check',
    '--disable-gpu', '--disable-background-networking', '--window-size=1440,1100',
    'about:blank',
  ], { stdio: 'ignore' });

  let target;
  for (let i = 0; i < 60; i++) {
    await sleep(500);
    try {
      const list = await getJson(CDP_BASE + '/json/list');
      if (list.length > 0) { target = list.find((t) => t.type === 'page') || list[0]; break; }
    } catch (e) {}
  }
  if (!target) throw new Error('CDP not available');
  const cdp = await CdpClient.connect(target.webSocketDebuggerUrl);
  await cdp.send('Page.enable'); await cdp.send('Runtime.enable');

  async function evaluate(expression) {
    const res = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (res.exceptionDetails) throw new Error('Eval: ' + JSON.stringify(res.exceptionDetails).slice(0, 500));
    return res.result.value;
  }
  async function nav(url) { await cdp.send('Page.navigate', { url }); await sleep(3000); }
  async function waitFor(expression, ms = 20000) {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { const v = await evaluate(expression).catch(() => null); if (v) return v; await sleep(500); }
    const body = await evaluate('document.body ? document.body.innerText.slice(0, 1200) : ""').catch(() => '');
    throw new Error('timeout: ' + expression + '\nPAGE:\n' + body);
  }
  const text = () => evaluate('document.body.innerText');

  // ---------- LOGIN ----------
  await nav(BASE_APP + '/login');
  await waitFor("!!document.querySelector('#email') && !!document.querySelector('#password')", 15000);
  await evaluate(`
    (() => {
      const setNative = (el, value) => {
        const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      setNative(document.querySelector('#email'), ${JSON.stringify(ADMIN_EMAIL)});
      setNative(document.querySelector('#password'), ${JSON.stringify(ADMIN_PASSWORD)});
      return true;
    })()
  `);
  await sleep(400);
  await evaluate(`(() => { const b = document.querySelector('form button[type=submit]'); b.click(); return true; })()`);
  // Login navigates to /tracking. Wait for app shell.
  await waitFor(`window.location.pathname !== '/login'`, 20000);
  await sleep(3000);
  note('LOGIN_URL', await evaluate('window.location.href'));
  note('LOGIN_OK', await evaluate(`document.body.innerText.includes('Mot de passe oublié') ? 'STILL_ON_LOGIN' : 'DASHBOARD'`));

  // ---------- VEHICLES: capture pre-state ----------
  await nav(BASE_APP + '/vehicles');
  await waitFor(`document.body.innerText.includes('Véhicules') && document.body.innerText.includes('Nouveau véhicule')`, 20000);
  note('VEHICLES_PAGE_TITLE', await evaluate(`document.querySelector('h1')?.innerText ?? ''`));
  const emptyPre = await evaluate(`document.body.innerText.includes('Aucun véhicule')`);
  note('VEHICLES_EMPTY_STATE_PRE', emptyPre);

  // ---------- CREATE VEHICLE ----------
  await evaluate(`(() => { const btns = [...document.querySelectorAll('button')]; const b = btns.find(x => x.innerText.includes('Nouveau véhicule')); b.click(); return true; })()`);
  await waitFor(`!!document.querySelector('#plateNumber')`, 15000);
  await sleep(500);
  await evaluate(`
    (() => {
      const setNative = (el, value) => {
        const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      };
      setNative(document.querySelector('#plateNumber'), ${JSON.stringify('VH-001')});
      setNative(document.querySelector('#brand'), ${JSON.stringify('Isuzu')});
      setNative(document.querySelector('#model'), ${JSON.stringify('NPR')});
      return true;
    })()
  `);
  await sleep(300);
  // Status select defaults to AVAILABLE; verify selected value
  const statusSel = await evaluate(`document.querySelector('#status')?.value`);
  note('VEHICLE_STATUS_DEFAULT', statusSel);
  await evaluate(`(() => { const btns = [...document.querySelectorAll('button')]; const b = btns.find(x => x.innerText.includes('Enregistrer')); b.click(); return true; })()`);
  // Wait for dialog close + toast + table row
  await waitFor(`!document.querySelector('#plateNumber') || document.body.innerText.includes('Véhicule créé')`, 15000);
  await sleep(1500);
  const vhrow = await evaluate(`document.body.innerText.includes('VH-001')`);
  note('VEHICLE_CREATED_IN_TABLE', vhrow);
  const pageText = await text();
  note('VEHICLES_PAGE_AFTER_CREATE', pageText.slice(0, 900));
  const rowHtml = await evaluate(`(() => { const tr = [...document.querySelectorAll('tr')].find(r => r.innerText.includes('VH-001')); return tr ? tr.innerText : null; })()`);
  note('VH001_ROW', rowHtml);

  fs.writeFileSync(path.join(__dirname, 'ui-evidence-1.json'), JSON.stringify(out, null, 2));
  chrome.kill();
}

main().catch((e) => { console.error('FATAL', e.message); process.exit(1); });