/**
 * Worker Cloudflare `track` : porte d'entrée HTTPS publique de l'admin web.
 *
 *   https://track.<compte>.workers.dev  ->  ORIGIN (Caddy sur l'EC2 : admin + /api/v1 + Socket.IO)
 *
 * Relaie tout à l'identique (méthode, en-têtes, corps, cookies, WebSocket). Seules les
 * redirections qui pointeraient vers l'origine sont réécrites vers l'adresse publique, pour que
 * le navigateur reste toujours sur workers.dev.
 */
export default {
  async fetch(request, env) {
    const origin = new URL(env.ORIGIN);
    const incoming = new URL(request.url);
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
