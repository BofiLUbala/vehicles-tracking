/**
 * Worker Cloudflare `track` : porte d'entrée HTTPS publique de l'admin web.
 *
 *   https://track.<compte>.workers.dev  ->  ORIGIN (Caddy sur l'EC2 : admin + /api/v1 + Socket.IO)
 *
 * Relaie tout à l'identique (méthode, en-têtes, corps, cookies, WebSocket). Seules les
 * redirections qui pointeraient vers l'origine sont réécrites vers l'adresse publique, pour que
 * le navigateur reste toujours sur workers.dev.
 *
 * Les liens envoyés par e-mail aux chauffeurs sont servis par le Worker lui-même :
 *   - /.well-known/assetlinks.json : déclare l'application Android comme propriétaire de ce domaine
 *     (Android App Links) ; les liens ci-dessous ouvrent alors l'app directement.
 *   - /activate (invitation) et /reset-password (mot de passe oublié) : pages de repli quand l'app
 *     ne s'est pas ouverte (app absente ou lien non vérifié) : « Ouvrir l'application » et installation.
 */
export default {
  async fetch(request, env) {
    const incoming = new URL(request.url);

    if (incoming.pathname === '/.well-known/assetlinks.json') return assetLinks(env);
    const linkPath = incoming.pathname.replace(/\/+$/, '');
    if (linkPath in LINK_PAGES) return linkPage(env, linkPath.slice(1), LINK_PAGES[linkPath]);

    const origin = new URL(env.ORIGIN);
    const target = new URL(incoming.pathname + incoming.search, origin);

    const upstream = new Request(target, request);
    upstream.headers.set('X-Forwarded-Host', incoming.host);
    upstream.headers.set('X-Forwarded-Proto', 'https');

    const response = await fetch(upstream, { redirect: 'manual' });

    // WebSocket (Socket.IO) : la réponse 101 doit être renvoyée telle quelle.
    if (response.status === 101) return response;

    const location = response.headers.get('Location');
    if (!location || !location.startsWith(origin.origin)) return response;

    const rewritten = new Response(response.body, response);
    rewritten.headers.set('Location', incoming.origin + location.slice(origin.origin.length));
    return rewritten;
  },
};

function assetLinks(env) {
  const fingerprints = (env.ANDROID_SHA256_CERT_FINGERPRINTS || '')
    .split(',')
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);
  const body = fingerprints.length
    ? [
        {
          relation: ['delegate_permission/common.handle_all_urls'],
          target: {
            namespace: 'android_app',
            package_name: env.ANDROID_PACKAGE,
            sha256_cert_fingerprints: fingerprints,
          },
        },
      ]
    : [];
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
  });
}

const LINK_PAGES = {
  '/activate': {
    title: 'Activer mon compte chauffeur',
    intro: "Ouvrez l'application Tracking Vehicles pour choisir votre mot de passe.",
    steps: ["Si l'application n'est pas installée, installez-la.", 'Revenez sur cet e-mail et touchez à nouveau « Activer mon compte ».', "Choisissez votre mot de passe dans l'application."],
  },
  '/reset-password': {
    title: 'Nouveau mot de passe',
    intro: "Ouvrez l'application Tracking Vehicles pour choisir un nouveau mot de passe.",
    steps: ["Si l'application n'est pas installée, installez-la.", 'Revenez sur cet e-mail et touchez à nouveau le bouton.', "Choisissez votre nouveau mot de passe dans l'application."],
  },
};

function linkPage(env, appPath, page) {
  // Le jeton est lu dans l'URL par le script de la page (jamais injecté dans le HTML côté serveur).
  const config = JSON.stringify({ scheme: env.APP_SCHEME, pkg: env.ANDROID_PACKAGE, download: env.ANDROID_DOWNLOAD_URL, path: appPath });
  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${page.title}</title>
<style>
  :root { --bg:#f8fafc; --card:#ffffff; --text:#0f172a; --muted:#475569; --accent:#0f766e; --border:#e2e8f0; }
  @media (prefers-color-scheme: dark) { :root { --bg:#0b1220; --card:#111a2e; --text:#e2e8f0; --muted:#94a3b8; --accent:#14b8a6; --border:#1e293b; } }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--text); font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; }
  main { max-width:440px; margin:0 auto; padding:40px 16px; }
  .card { background:var(--card); border:1px solid var(--border); border-radius:16px; padding:28px 22px; }
  h1 { font-size:22px; margin:0 0 8px; }
  p { color:var(--muted); margin:0 0 16px; }
  .btn { display:block; width:100%; text-align:center; padding:14px 16px; border-radius:10px; font-weight:600; text-decoration:none; margin-top:12px; }
  .primary { background:var(--accent); color:#fff; }
  .secondary { border:1px solid var(--border); color:var(--text); }
  ol { color:var(--muted); padding-left:20px; margin:20px 0 0; }
  .error { color:#b91c1c; }
</style>
</head>
<body>
<main>
  <div class="card">
    <h1>${page.title}</h1>
    <p id="intro">${page.intro}</p>
    <a id="open" class="btn primary" href="#">Ouvrir l'application</a>
    <a id="install" class="btn secondary" href="#">Installer l'application</a>
    <ol>${page.steps.map((step) => `<li>${step}</li>`).join('')}</ol>
  </div>
</main>
<script>
  (function () {
    var cfg = ${config};
    var token = new URLSearchParams(location.search).get('token') || '';
    var install = document.getElementById('install');
    var open = document.getElementById('open');
    install.href = cfg.download;
    if (!token) {
      var intro = document.getElementById('intro');
      intro.textContent = "Ce lien est incomplet. Ouvrez à nouveau le lien reçu par e-mail.";
      intro.className = 'error';
      open.style.display = 'none';
      return;
    }
    var path = cfg.path + '?token=' + encodeURIComponent(token);
    var isAndroid = /Android/i.test(navigator.userAgent);
    open.href = isAndroid
      ? 'intent://' + path + '#Intent;scheme=' + cfg.scheme + ';package=' + cfg.pkg +
        ';S.browser_fallback_url=' + encodeURIComponent(cfg.download) + ';end'
      : cfg.scheme + '://' + path;
  })();
</script>
</body>
</html>`;
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
    },
  });
}
