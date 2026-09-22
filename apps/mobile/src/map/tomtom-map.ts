/**
 * Carte mobile = MapLibre GL JS dans une WebView, avec le fond de carte TomTom.
 * Aucun SDK Google Maps n'est requis. Ce module est pur (pas d'import React Native) afin d'être
 * testable sous Node.
 *
 * Rappel d'architecture : la carte n'est qu'un AFFICHAGE. Le GPS suit son chemin habituel
 * (expo-location → SQLite → NestJS → PostGIS) et ne dépend jamais de ce module : si TomTom ou la
 * WebView tombent, la collecte continue.
 */

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface MapStop extends LatLng {
  id: string;
  name: string;
  order: number;
  /** Couleur déjà résolue côté RN (terminé / courant / à venir). */
  color: string;
}

export interface MapState {
  gps: (LatLng & { accuracy?: number | null }) | null;
  /** Trace GPS réellement parcourue (nos positions, jamais un itinéraire théorique). */
  trace: LatLng[];
  /** Itinéraire planifié (TomTom Routing via le backend), affiché séparément de la trace. */
  plannedRoute: LatLng[];
  stops: MapStop[];
  follow: boolean;
  /** Provoque un recentrage même en mode « libre » (bouton recentrer). */
  recenterNonce: number;
}

export type MapMessage =
  | { type: 'ready' }
  | { type: 'userMoved' }
  | { type: 'error'; message: string };

export const MAPLIBRE_VERSION = '5.24.0';
const FALLBACK_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
/** Au-delà, la trace est décimée pour l'affichage (le stockage brut reste intact). */
export const MAX_RENDER_TRACE_POINTS = 2500;

/**
 * Styles mobiles : « conduite » par défaut (lisibilité au volant), satellite en option.
 * Combinaisons vérifiées en appel réel contre l'API Map Display (HTTP 200).
 */
export type MobileMapStyle = 'driving' | 'satellite';

const MOBILE_STYLES: Record<MobileMapStyle, { map: string; poi: string }> = {
  driving: { map: '2/basic_street-light-driving', poi: '2/poi_light' },
  // Hybride : imagerie + routes/labels. La source raster `satellite` du style n'est utilisée par
  // aucune couche — la WebView ajoute la couche manquante (voir `ensureSat` dans le HTML).
  satellite: { map: '2/hybrid_street-satellite', poi: '2/poi_satellite' },
};

/** Clé CLIENT TomTom (publique par nature — à restreindre côté portail TomTom). */
export function resolveStyleUrl(
  tomtomKey: string | undefined,
  style: MobileMapStyle = 'driving',
  version = '24.*',
): string {
  const key = tomtomKey?.trim();
  if (!key) return FALLBACK_STYLE_URL;
  const s = MOBILE_STYLES[style];
  const qs = new URLSearchParams({ key, map: s.map, poi: s.poi });
  return `https://api.tomtom.com/style/1/style/${version}?${qs.toString()}`;
}

/** Script de changement de fond de carte : ne touche ni la trace, ni les étapes, ni la mission. */
export function setStyleScript(styleUrl: string): string {
  return `window.__setStyle && window.__setStyle(${safeJson(styleUrl)}); true;`;
}

/** Décime une trace en conservant premier et dernier points (affichage uniquement). */
export function decimateTrace<T>(points: T[], max = MAX_RENDER_TRACE_POINTS): T[] {
  if (points.length <= max) return points;
  const step = (points.length - 1) / (max - 1);
  const out: T[] = [];
  for (let i = 0; i < max - 1; i++) out.push(points[Math.round(i * step)]);
  out.push(points[points.length - 1]);
  return out;
}

/** GeoJSON = [longitude, latitude] : c'est ici, et seulement ici, que l'ordre est inversé. */
export function toLngLat(points: LatLng[]): [number, number][] {
  return points
    .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
    .map((p) => [p.longitude, p.latitude]);
}

function safeJson(value: unknown): string {
  // Empêche toute fermeture de balise <script> / séquence de fin de ligne JS via le contenu.
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .split(String.fromCharCode(0x2028)).join('\\u2028')
    .split(String.fromCharCode(0x2029)).join('\\u2029');
}

/** Script injecté dans la WebView à chaque changement d'état. */
export function buildUpdateScript(state: MapState): string {
  const payload = {
    gps: state.gps ? { lng: state.gps.longitude, lat: state.gps.latitude, acc: state.gps.accuracy ?? null } : null,
    trace: toLngLat(decimateTrace(state.trace)),
    route: toLngLat(decimateTrace(state.plannedRoute)),
    stops: state.stops.map((s) => ({ id: s.id, name: s.name, order: s.order, color: s.color, lng: s.longitude, lat: s.latitude })),
    follow: state.follow,
    recenter: state.recenterNonce,
  };
  return `window.__update && window.__update(${safeJson(payload)}); true;`;
}

export function zoomScript(delta: number): string {
  return `window.__zoom && window.__zoom(${Number(delta) || 0}); true;`;
}

export function parseMapMessage(raw: string): MapMessage | null {
  try {
    const m = JSON.parse(raw) as { type?: string; message?: unknown };
    if (m.type === 'ready' || m.type === 'userMoved') return { type: m.type };
    if (m.type === 'error') return { type: 'error', message: typeof m.message === 'string' ? m.message : 'Erreur de carte' };
  } catch {
    // ignore
  }
  return null;
}

/** Message d'erreur affichable, sans jamais inclure d'URL (donc de clé). */
export function describeMapFailure(status?: number): string {
  if (status === 401 || status === 403) return 'Clé de carte refusée';
  if (status === 429) return 'Limite de requêtes de la carte atteinte';
  return 'Fond de carte indisponible';
}

export function buildMapHtml(styleUrl: string, initial: { lat: number; lng: number; zoom: number }): string {
  const cfg = safeJson({ style: styleUrl, center: [initial.lng, initial.lat], zoom: initial.zoom });
  return `<!doctype html><html><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
<link href="https://cdn.jsdelivr.net/npm/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css" rel="stylesheet" />
<style>html,body,#map{margin:0;padding:0;height:100%;width:100%;background:#E8EEF4}
.maplibregl-ctrl-attrib{font-size:9px}
.stop{width:26px;height:26px;border-radius:50%;border:2px solid #fff;color:#fff;font:800 11px sans-serif;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,.35)}
.me{width:22px;height:22px;border-radius:50%;background:rgba(20,121,255,.25);display:flex;align-items:center;justify-content:center}
.me i{width:11px;height:11px;border-radius:50%;background:#1479FF;border:2px solid #fff;display:block}</style></head>
<body><div id="map"></div>
<script src="https://cdn.jsdelivr.net/npm/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js"></script>
<script>
(function(){
  var cfg=${cfg};
  function post(m){try{window.ReactNativeWebView.postMessage(JSON.stringify(m));}catch(e){}}
  if(!window.maplibregl){post({type:'error',message:'Bibliothèque de carte inaccessible (réseau)'});return;}
  var map=new maplibregl.Map({container:'map',style:cfg.style,center:cfg.center,zoom:cfg.zoom,attributionControl:{compact:true}});
  var ready=false,pending=null,markers={},meEl=null,lastRecenter=-1,lastState=null,announced=false;
  function empty(){return {type:'Feature',properties:{},geometry:{type:'LineString',coordinates:[]}};}
  function line(id,color,width,dash){
    map.addSource(id,{type:'geojson',data:empty()});
    var paint={'line-color':color,'line-width':width};
    if(dash)paint['line-dasharray']=dash;
    map.addLayer({id:id,type:'line',source:id,layout:{'line-join':'round','line-cap':'round'},paint:paint});
  }
  // Le style hybride declare la source raster 'satellite' sans couche qui l'affiche.
  function ensureSat(){
    try{
      if(!map.getSource('satellite')||map.getLayer('sat-base'))return;
      var first=(map.getStyle().layers[0]||{}).id;
      map.addLayer({id:'sat-base',type:'raster',source:'satellite'},first);
    }catch(e){}
  }
  // 'style.load' se declenche au premier style ET apres chaque setStyle : les couches
  // personnalisees (trace reelle, itineraire) sont donc reinstallees a chaque changement de fond.
  function installLayers(){
    ensureSat();
    if(!map.getLayer('route'))line('route','#F59E0B',3,[2,2]); // itineraire planifie (TomTom)
    if(!map.getLayer('trace'))line('trace','#1479FF',4);        // trace GPS reelle (nos positions)
    ready=true;
    if(!announced){announced=true;post({type:'ready'});}
    var st=pending||lastState;
    if(st)apply(st);
  }
  map.on('style.load',installLayers);
  window.__setStyle=function(url){ready=false;try{map.setStyle(url);}catch(e){post({type:'error',message:'Changement de fond impossible'});}};
  map.on('error',function(e){
    var s=e&&e.error&&e.error.status;
    if(s===401||s===403)post({type:'error',message:'Clé de carte refusée'});
    else if(s===429)post({type:'error',message:'Limite de requêtes de la carte atteinte'});
    else if(s>=500||(e&&e.error&&/failed to fetch|load failed/i.test(e.error.message||'')))post({type:'error',message:'Fond de carte indisponible'});
  });
  map.on('dragstart',function(){post({type:'userMoved'});});
  map.on('zoomstart',function(e){if(e.originalEvent)post({type:'userMoved'});});
  function setLine(id,coords){var s=map.getSource(id);if(s)s.setData({type:'Feature',properties:{},geometry:{type:'LineString',coordinates:coords}});}
  function apply(st){
    lastState=st;
    setLine('route',st.route.length>1?st.route:[]);
    setLine('trace',st.trace.length>1?st.trace:[]);
    var seen={};
    st.stops.forEach(function(s){
      seen[s.id]=1;var m=markers[s.id];
      if(!m){var el=document.createElement('div');el.className='stop';el.textContent=s.order;
        m=markers[s.id]=new maplibregl.Marker({element:el}).setLngLat([s.lng,s.lat]).addTo(map);}
      m.getElement().style.background=s.color;m.setLngLat([s.lng,s.lat]);
    });
    Object.keys(markers).forEach(function(id){if(!seen[id]){markers[id].remove();delete markers[id];}});
    if(st.gps){
      if(!meEl){var d=document.createElement('div');d.className='me';d.innerHTML='<i></i>';
        meEl=new maplibregl.Marker({element:d}).setLngLat([st.gps.lng,st.gps.lat]).addTo(map);}
      else meEl.setLngLat([st.gps.lng,st.gps.lat]);
      var force=st.recenter!==lastRecenter;lastRecenter=st.recenter;
      if(st.follow||force)map.easeTo({center:[st.gps.lng,st.gps.lat],zoom:Math.max(map.getZoom(),15),duration:400});
    }
  }
  window.__update=function(st){lastState=st;if(!ready){pending=st;return;}try{apply(st);}catch(e){post({type:'error',message:'Erreur d\\'affichage de la carte'});}};
  window.__zoom=function(d){map.easeTo({zoom:map.getZoom()+d,duration:250});};
})();
</script></body></html>`;
}
