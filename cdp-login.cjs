const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:9222';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url) {
  const res = await fetch(url);
  return res.json();
}

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
      }
    });
  }
  static async connect(wsUrl) {
    const ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve);
      ws.addEventListener('error', reject);
    });
    return new CDP(ws);
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() {
    try { this.ws.close(); } catch {}
  }
}

async function main() {
  const userDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-cdp-'));
  const chrome = spawn(CHROME, [
    '--headless=new',
    '--remote-debugging-port=9222',
    `--user-data-dir=${userDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--disable-background-networking',
    '--window-size=1440,900',
    'about:blank',
  ], { stdio: 'ignore' });

  // Wait for debugging endpoint
  let target;
  for (let i = 0; i < 60; i++) {
    await sleep(500);
    try {
      const list = await getJson(BASE + '/json/list');
      if (list.length > 0) { target = list.find((t) => t.type === 'page') || list[0]; break; }
    } catch (e) { /* retry */ }
  }
  if (!target) throw new Error('Chrome CDP endpoint not available');
  console.log('TARGET URL:', target.url);

  const cdp = await CDP.connect(target.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');
  await cdp.send('Log.enable');

  async function evaluate(expression) {
    const res = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (res.exceptionDetails) throw new Error('Eval exception: ' + JSON.stringify(res.exceptionDetails));
    return res.result.value;
  }

  async function nav(url) {
    await cdp.send('Page.navigate', { url });
    await sleep(2500);
  }

  async function waitFor(expression, timeoutMs = 20000, label = 'condition') {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const v = await evaluate(expression).catch(() => null);
      if (v) return v;
      await sleep(500);
    }
    const pageText = await evaluate('document.body ? document.body.innerText.slice(0, 1500) : "no body"').catch(() => '');
    throw new Error(`Timed out waiting for: ${label}\n--- page text ---\n${pageText}`);
  }

  async function text() {
    return evaluate('document.body ? document.body.innerText : ""');
  }

  // 1. Login
  await nav(BASE_APP + '/login');
  await waitFor("document.querySelector('#email') && document.querySelector('#password')", 15000, 'login form');
  await evaluate(`
    (() => {
      const setNative = (el, value) => {
        const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      };
      setNative(document.querySelector('#email'), ${JSON.stringify(ADMIN_EMAIL)});
      setNative(document.querySelector('#password'), ${JSON.stringify(ADMIN_PASSWORD)});
      return true;
    })()
  `);
  await sleep(500);
  await evaluate(`document.querySelector('form button[type=submit]').click(); true`);
  // After login redirect (next=/tracking) — wait for dashboard
  await waitFor(`window.location.pathname.startsWith('/tracking') || document.body.innerText.includes('Connexion') === false && document.querySelector('main')`, 20000, 'login success redirect');
  await sleep(2500);
  console.log('AFTER LOGIN URL:', await evaluate('window.location.href'));
  console.log('AFTER LOGIN TEXT (first 800):', (await text()).slice(0, 800));

  // Expose helper for subsequent steps read/write form
  globalThis.__cdp = cdp;
  globalThis.__evaluate = evaluate;
  globalThis.__waitFor = waitFor;
  globalThis.__nav = nav;
  globalThis.__text = text;

  chrome.kill();
  try { cdp.close(); } catch {}
  process.exit(0);
}

const BASE_APP = 'http://127.0.0.1:3000';
const ADMIN_EMAIL = 'admin@demo.local';
const ADMIN_PASSWORD = 'ChangeMe123';

main().catch((e) => { console.error('FATAL', e.message); process.exit(1); });