/**
 * Carte mobile = MapLibre GL JS dans une WebView, avec le fond de carte TomTom.
 * Aucun SDK Google Maps n'est requis. Ce module est pur (pas d'import React Native) afin d'être
 * testable sous Node.
 *
 * Rappel d'architecture : la carte n'est qu'un AFFICHAGE. Le GPS suit son chemin habituel
 * (expo-location → SQLite → NestJS → PostGIS) et ne dépend jamais de ce module : si TomTom ou la
 * WebView tombent, la collecte continue.
 *
 * Rendu :
 *  - le véhicule glisse entre deux positions GPS (interpolation `requestAnimationFrame`) et
 *    s'oriente selon son cap, au lieu de sauter à chaque point ;
 *  - halo de précision GPS, trace colorée par vitesse, arrêts détectés, trace recalée TomTom ;
 *  - rejeu d'un trajet (position interpolée + portion déjà parcourue) ;
 *  - mode 3D : caméra inclinée qui suit le cap, bâtiments extrudés du style TomTom, et véhicule
 *    3D rendu par three.js dans une « custom layer » MapLibre (chargé seulement à la demande).
 */

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface TimedLatLng extends LatLng {
  /** ISO 8601 — sert à caler le rejeu et la durée d'animation. */
  timestamp?: string;
  /** m/s */
  speed?: number | null;
}

export interface MapStop extends LatLng {
  id: string;
  name: string;
  order: number;
  /** Couleur déjà résolue côté RN (terminé / courant / à venir). */
  color: string;
}

export interface MapPause extends LatLng {
  /** Libellé court affiché sur le marqueur (ex. « 12 min »). */
  label: string;
}

export interface MapSegment {
  color: string;
  points: LatLng[];
}

export interface MapGps extends LatLng {
  accuracy?: number | null;
  /** Cap en degrés (0 = nord). */
  heading?: number | null;
  /** m/s */
  speed?: number | null;
  timestamp?: string;
}

export interface MapState {
  gps: MapGps | null;
  /** Trace GPS réellement parcourue (nos positions nettoyées, jamais un itinéraire théorique). */
  trace: TimedLatLng[];
  /** Si fournis, la trace est dessinée par tronçons colorés (vitesse) au lieu d'un trait uni. */
  traceSegments?: MapSegment[];
  /** Trace recalée sur les routes (TomTom Snap to Roads), affichée à la place de la trace brute. */
  snappedTrace?: LatLng[];
  /** Itinéraire planifié (TomTom Routing via le backend), affiché séparément de la trace. */
  plannedRoute: LatLng[];
  stops: MapStop[];
  /** Arrêts détectés sur la trace (analyse locale). */
  pauses?: MapPause[];
  follow: boolean;
  /** Provoque un recentrage même en mode « libre » (bouton recentrer). */
  recenterNonce: number;
  /** Vue 3D : caméra inclinée orientée selon le cap + véhicule three.js. */
  view3d?: boolean;
  /** Mode rejeu : le véhicule n'est plus piloté par le GPS mais par `replayScript`. */
  replay?: boolean;
  /** Recadre la carte sur toute la trace (écran d'analyse). */
  fitNonce?: number;
}

export interface ReplayState extends LatLng {
  bearing: number;
  /** Millisecondes depuis le premier point de la trace. */
  elapsedMs: number;
}

export type MapMessage =
  | { type: 'ready' }
  | { type: 'userMoved' }
  | { type: 'error'; message: string };

export const MAPLIBRE_VERSION = '5.24.0';
/** three.js n'est téléchargé que lorsque l'utilisateur active la vue 3D. */
export const THREE_VERSION = '0.169.0';
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

const finiteOrNull = (v: number | null | undefined) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/**
 * Temps relatif (ms depuis le premier point) de chaque point de la trace décimée : la WebView
 * s'en sert pour couper la portion « déjà parcourue » pendant un rejeu. Tableau vide si la trace
 * n'est pas horodatée.
 */
function traceTimes(points: TimedLatLng[]): number[] {
  const valid = points.filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));
  if (valid.length === 0 || !valid.every((p) => p.timestamp)) return [];
  const t0 = Date.parse(valid[0].timestamp!);
  const out = valid.map((p) => Date.parse(p.timestamp!) - t0);
  return out.every(Number.isFinite) ? out : [];
}

/** Script injecté dans la WebView à chaque changement d'état. */
export function buildUpdateScript(state: MapState): string {
  const trace = decimateTrace(state.trace);
  const payload = {
    gps: state.gps
      ? {
          lng: state.gps.longitude,
          lat: state.gps.latitude,
          acc: finiteOrNull(state.gps.accuracy),
          heading: finiteOrNull(state.gps.heading),
          speed: finiteOrNull(state.gps.speed),
          time: state.gps.timestamp ? Date.parse(state.gps.timestamp) || null : null,
        }
      : null,
    trace: toLngLat(trace),
    traceT: traceTimes(trace),
    segments: (state.traceSegments ?? [])
      .map((s) => ({ color: s.color, coords: toLngLat(s.points) }))
      .filter((s) => s.coords.length > 1),
    snapped: toLngLat(decimateTrace(state.snappedTrace ?? [])),
    route: toLngLat(decimateTrace(state.plannedRoute)),
    stops: state.stops.map((s) => ({ id: s.id, name: s.name, order: s.order, color: s.color, lng: s.longitude, lat: s.latitude })),
    pauses: (state.pauses ?? []).map((p) => ({ label: p.label, lng: p.longitude, lat: p.latitude })),
    follow: state.follow,
    recenter: state.recenterNonce,
    view3d: !!state.view3d,
    replay: !!state.replay,
    fit: state.fitNonce ?? 0,
  };
  return `window.__update && window.__update(${safeJson(payload)}); true;`;
}

/** Position de rejeu : appelée à chaque image du curseur, donc volontairement minuscule. */
export function replayScript(frame: ReplayState): string {
  const payload = {
    lng: frame.longitude,
    lat: frame.latitude,
    bearing: Number.isFinite(frame.bearing) ? frame.bearing : 0,
    t: Math.max(0, frame.elapsedMs),
  };
  return `window.__replay && window.__replay(${safeJson(payload)}); true;`;
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

export interface MapHtmlOptions {
  /** Modèle 3D glTF/GLB (compression Draco acceptée). Absent : véhicule 3D généré par three.js. */
  vehicleModelUrl?: string;
}

export function buildMapHtml(
  styleUrl: string,
  initial: { lat: number; lng: number; zoom: number },
  options: MapHtmlOptions = {},
): string {
  const threeBase = `https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}`;
  const cfg = safeJson({
    style: styleUrl,
    center: [initial.lng, initial.lat],
    zoom: initial.zoom,
    model: options.vehicleModelUrl?.startsWith('https://') ? options.vehicleModelUrl : null,
    draco: `${threeBase}/examples/jsm/libs/draco/gltf/`,
  });
  const importMap = safeJson({
    imports: { three: `${threeBase}/build/three.module.min.js`, 'three/addons/': `${threeBase}/examples/jsm/` },
  });
  return `<!doctype html><html><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
<link href="https://cdn.jsdelivr.net/npm/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css" rel="stylesheet" />
<script type="importmap">${importMap}</script>
<style>html,body,#map{margin:0;padding:0;height:100%;width:100%;background:#E8EEF4}
.maplibregl-ctrl-attrib{font-size:9px}
.stop{width:26px;height:26px;border-radius:50%;border:2px solid #fff;color:#fff;font:800 11px sans-serif;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,.35)}
.pause{padding:2px 6px;border-radius:9px;background:#334155;color:#fff;font:700 10px sans-serif;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.35);white-space:nowrap}
.me{width:34px;height:34px;display:flex;align-items:center;justify-content:center}
.me .dot{width:13px;height:13px;border-radius:50%;background:#1479FF;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)}
.me svg{display:none;filter:drop-shadow(0 1px 2px rgba(0,0,0,.45))}
.me.moving .dot{display:none}.me.moving svg{display:block}
.me.hidden{visibility:hidden}</style></head>
<body><div id="map"></div>
<script src="https://cdn.jsdelivr.net/npm/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js"></script>
<script>
(function(){
  var cfg=${cfg};
  function post(m){try{window.ReactNativeWebView.postMessage(JSON.stringify(m));}catch(e){}}
  if(!window.maplibregl){post({type:'error',message:'Bibliothèque de carte inaccessible (réseau)'});return;}
  var map=new maplibregl.Map({container:'map',style:cfg.style,center:cfg.center,zoom:cfg.zoom,attributionControl:{compact:true},maxPitch:70});
  var ready=false,pending=null,markers={},pauseMarkers=[],lastRecenter=-1,lastFit=0,lastState=null,announced=false;

  // ---------- Couches ----------
  function emptyLine(){return {type:'Feature',properties:{},geometry:{type:'LineString',coordinates:[]}};}
  function emptyFc(){return {type:'FeatureCollection',features:[]};}
  function line(id,color,width,dash,opacity){
    map.addSource(id,{type:'geojson',data:emptyLine()});
    var paint={'line-color':color,'line-width':width,'line-opacity':opacity==null?1:opacity};
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
  // personnalisees sont donc reinstallees a chaque changement de fond.
  function installLayers(){
    ensureSat();
    if(!map.getLayer('acc')){
      map.addSource('acc',{type:'geojson',data:emptyFc()});
      map.addLayer({id:'acc',type:'fill',source:'acc',paint:{'fill-color':'#1479FF','fill-opacity':0.12}});
      map.addLayer({id:'acc-line',type:'line',source:'acc',paint:{'line-color':'#1479FF','line-opacity':0.35,'line-width':1}});
    }
    if(!map.getLayer('route'))line('route','#F59E0B',3,[2,2]);          // itineraire planifie (TomTom)
    if(!map.getLayer('trace'))line('trace','#1479FF',4);               // trace GPS reelle (nos positions)
    if(!map.getLayer('segments')){                                     // trace coloree par vitesse
      map.addSource('segments',{type:'geojson',data:emptyFc()});
      map.addLayer({id:'segments',type:'line',source:'segments',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':['get','color'],'line-width':5}});
    }
    if(!map.getLayer('snapped'))line('snapped','#0F766E',5,null,0.9);  // trace recalee (Snap to Roads)
    if(!map.getLayer('played'))line('played','#0B1F33',5,null,0.9);    // portion rejouee
    ready=true;
    if(three.layer&&!map.getLayer('vehicle3d'))try{map.addLayer(three.layer);}catch(e){}
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
  map.on('dragstart',function(){follow=false;post({type:'userMoved'});});
  map.on('zoomstart',function(e){if(e.originalEvent){follow=false;post({type:'userMoved'});}});
  map.on('rotatestart',function(e){if(e.originalEvent){follow=false;post({type:'userMoved'});}});
  map.on('pitchstart',function(e){if(e.originalEvent){follow=false;post({type:'userMoved'});}});
  function setData(id,data){var s=map.getSource(id);if(s)s.setData(data);}
  function setLine(id,coords){setData(id,{type:'Feature',properties:{},geometry:{type:'LineString',coordinates:coords.length>1?coords:[]}});}
  function setVis(id,on){if(map.getLayer(id))map.setLayoutProperty(id,'visibility',on?'visible':'none');}

  // Halo de precision : cercle geodesique de rayon = precision GPS (m).
  function circle(lng,lat,r){
    var pts=[],n=48,dLat=r/111320,dLng=r/(111320*Math.cos(lat*Math.PI/180));
    for(var i=0;i<=n;i++){var a=2*Math.PI*i/n;pts.push([lng+dLng*Math.cos(a),lat+dLat*Math.sin(a)]);}
    return {type:'FeatureCollection',features:[{type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[pts]}}]};
  }

  // ---------- Vehicule : interpolation fluide entre deux positions ----------
  var veh={cur:null,bearing:0,from:null,to:null,fromB:0,toB:0,start:0,dur:0,raf:0,moving:false,lastTime:null,lastKey:null,placed:false};
  var meMarker=null,meEl=null,follow=true,view3d=false,replay=false,vehVisible=false;
  function lerpAngle(a,b,t){var d=((((b-a)%360)+540)%360)-180;return (a+d*t+360)%360;}
  function ensureMe(){
    if(meMarker)return;
    meEl=document.createElement('div');meEl.className='me';
    meEl.innerHTML='<div class="dot"></div><svg width="30" height="30" viewBox="0 0 30 30"><path d="M15 2 L26 27 L15 21 L4 27 Z" fill="#1479FF" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/></svg>';
    meMarker=new maplibregl.Marker({element:meEl,rotationAlignment:'map',pitchAlignment:'map'}).setLngLat(veh.cur).addTo(map);
  }
  function renderVehicle(){
    if(!veh.cur)return;
    ensureMe();
    meMarker.setLngLat(veh.cur);
    meMarker.setRotation(veh.bearing);
    meEl.classList.toggle('moving',veh.moving);
    meEl.classList.toggle('hidden',!vehVisible||(view3d&&three.ready));
    if(three.ready){three.setPose(veh.cur,veh.bearing);map.triggerRepaint();}
    if(follow){
      var cam={center:veh.cur};
      // Premiere position : zoom de conduite ; ensuite on laisse le zoom choisi par l'utilisateur.
      if(!veh.placed){veh.placed=true;cam.zoom=Math.max(map.getZoom(),view3d?17:15);}
      if(view3d)cam.bearing=veh.bearing;
      map.jumpTo(cam);
    }
  }
  function step(now){
    veh.raf=0;
    var k=veh.dur>0?Math.min(1,(now-veh.start)/veh.dur):1;
    veh.cur=[veh.from[0]+(veh.to[0]-veh.from[0])*k,veh.from[1]+(veh.to[1]-veh.from[1])*k];
    veh.bearing=lerpAngle(veh.fromB,veh.toB,k);
    renderVehicle();
    if(k<1)veh.raf=requestAnimationFrame(step);
  }
  function moveVehicle(lng,lat,bearing,durMs){
    if(!veh.cur||durMs<=0){
      if(veh.raf){cancelAnimationFrame(veh.raf);veh.raf=0;}
      veh.cur=[lng,lat];if(bearing!=null)veh.bearing=bearing;renderVehicle();return;
    }
    veh.from=veh.cur.slice();veh.to=[lng,lat];
    veh.fromB=veh.bearing;veh.toB=bearing==null?veh.bearing:bearing;
    veh.start=performance.now();veh.dur=durMs;
    if(!veh.raf)veh.raf=requestAnimationFrame(step);
  }
  function bearingTo(a,b){
    var r=Math.PI/180,y=Math.sin((b[0]-a[0])*r)*Math.cos(b[1]*r);
    var x=Math.cos(a[1]*r)*Math.sin(b[1]*r)-Math.sin(a[1]*r)*Math.cos(b[1]*r)*Math.cos((b[0]-a[0])*r);
    return (Math.atan2(y,x)/r+360)%360;
  }
  function onGps(g){
    // Un changement d'etat sans nouvelle position (suivi, 3D...) ne doit pas relancer l'animation.
    var key=g.lng+'|'+g.lat+'|'+g.time;
    if(key===veh.lastKey)return;
    veh.lastKey=key;
    var target=[g.lng,g.lat];
    var moving=g.speed!=null?g.speed>=1:false;
    var bearing=null;
    if(g.heading!=null&&moving)bearing=g.heading;
    else if(veh.to&&moving)bearing=bearingTo(veh.to,target);
    veh.moving=moving||(bearing!=null);
    // Duree d'animation = ecart reel entre deux positions (plafonne) : le vehicule glisse en
    // continu sans jamais accumuler de retard sur le GPS.
    var dur=0;
    if(g.time&&veh.lastTime)dur=Math.max(300,Math.min(4000,(g.time-veh.lastTime)*0.9));
    else if(veh.cur)dur=800;
    if(g.time)veh.lastTime=g.time;
    moveVehicle(g.lng,g.lat,bearing,dur);
    setData('acc',g.acc&&g.acc>3?circle(g.lng,g.lat,Math.min(g.acc,500)):emptyFc());
  }

  // ---------- Vue 3D : camera inclinee + batiments + vehicule three.js ----------
  var three={ready:false,loading:false,layer:null,setPose:function(){}};
  function set3dBuildings(on){
    try{
      map.getStyle().layers.forEach(function(l){
        if(l.type==='fill-extrusion')map.setPaintProperty(l.id,'fill-extrusion-opacity',on?0.85:0.4);
      });
    }catch(e){}
  }
  function loadThree(){
    if(three.loading||three.ready)return;
    three.loading=true;
    import('three').then(function(THREE){
      var origin=null,modelRoot=null,scene=null,camera=null,renderer=null;
      function vehicleSizeFactor(){
        // Un camion de 8 m ferait quelques pixels : on l'agrandit quand on dezoome.
        return Math.min(40,3*Math.pow(2,Math.max(0,18-map.getZoom())));
      }
      function buildTruck(){
        var g=new THREE.Group();
        var cab=new THREE.MeshStandardMaterial({color:0x1479ff,roughness:0.5,metalness:0.2});
        var box=new THREE.MeshStandardMaterial({color:0xf1f5f9,roughness:0.7});
        var dark=new THREE.MeshStandardMaterial({color:0x1f2937,roughness:0.9});
        var glass=new THREE.MeshStandardMaterial({color:0x93c5fd,roughness:0.1,metalness:0.6});
        // Avant du vehicule = -Z local.
        var cabin=new THREE.Mesh(new THREE.BoxGeometry(2.4,2.4,2),cab);cabin.position.set(0,1.7,-2.9);g.add(cabin);
        var shield=new THREE.Mesh(new THREE.BoxGeometry(2.1,0.9,0.05),glass);shield.position.set(0,2.2,-3.92);g.add(shield);
        var cargo=new THREE.Mesh(new THREE.BoxGeometry(2.5,2.9,5.6),box);cargo.position.set(0,1.95,1);g.add(cargo);
        var chassis=new THREE.Mesh(new THREE.BoxGeometry(2.3,0.35,7.8),dark);chassis.position.set(0,0.55,0);g.add(chassis);
        var wg=new THREE.CylinderGeometry(0.5,0.5,0.4,16);wg.rotateZ(Math.PI/2);
        [[-1.15,-2.8],[1.15,-2.8],[-1.15,1.9],[1.15,1.9],[-1.15,3],[1.15,3]].forEach(function(p){
          var w=new THREE.Mesh(wg,dark);w.position.set(p[0],0.5,p[1]);g.add(w);
        });
        return g;
      }
      function normalize(obj){
        // Modele glTF quelconque : 8 m de long, pose au sol, centre sur l'origine.
        var b=new THREE.Box3().setFromObject(obj),size=new THREE.Vector3(),c=new THREE.Vector3();
        b.getSize(size);b.getCenter(c);
        var s=8/Math.max(size.x,size.z,0.001);
        var wrap=new THREE.Group();obj.position.set(-c.x,-b.min.y,-c.z);wrap.add(obj);wrap.scale.setScalar(s);
        // Convention glTF : l'avant regarde +Z ; notre repere : -Z.
        wrap.rotation.y=Math.PI;
        return wrap;
      }
      var layer={
        id:'vehicle3d',type:'custom',renderingMode:'3d',
        onAdd:function(m,gl){
          camera=new THREE.Camera();scene=new THREE.Scene();
          scene.add(new THREE.AmbientLight(0xffffff,1.6));
          var sun=new THREE.DirectionalLight(0xffffff,2.2);sun.position.set(30,80,40);scene.add(sun);
          modelRoot=new THREE.Group();modelRoot.add(buildTruck());scene.add(modelRoot);
          renderer=new THREE.WebGLRenderer({canvas:m.getCanvas(),context:gl,antialias:true});
          renderer.autoClear=false;
          if(cfg.model){
            import('three/addons/loaders/GLTFLoader.js').then(function(G){
              return import('three/addons/loaders/DRACOLoader.js').then(function(D){
                var loader=new G.GLTFLoader(),draco=new D.DRACOLoader();
                draco.setDecoderPath(cfg.draco);loader.setDRACOLoader(draco);
                loader.load(cfg.model,function(gltf){
                  modelRoot.clear();modelRoot.add(normalize(gltf.scene));map.triggerRepaint();
                },undefined,function(){/* modele indisponible : on garde le camion genere */});
              });
            }).catch(function(){});
          }
        },
        render:function(gl,args){
          if(!origin||!three.visible||!vehVisible)return;
          var mc=maplibregl.MercatorCoordinate.fromLngLat(origin.lngLat,0);
          var s=mc.meterInMercatorCoordinateUnits()*vehicleSizeFactor();
          var rx=new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1,0,0),Math.PI/2);
          var ry=new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(0,1,0),-origin.bearing*Math.PI/180);
          var mat=(args&&args.defaultProjectionData)?args.defaultProjectionData.mainMatrix:args;
          var m=new THREE.Matrix4().fromArray(mat);
          var l=new THREE.Matrix4().makeTranslation(mc.x,mc.y,mc.z).scale(new THREE.Vector3(s,-s,s)).multiply(rx).multiply(ry);
          camera.projectionMatrix=m.multiply(l);
          renderer.resetState();
          renderer.render(scene,camera);
        }
      };
      three.layer=layer;
      three.visible=view3d;
      three.setPose=function(lngLat,bearing){origin={lngLat:lngLat,bearing:bearing};};
      if(veh.cur)three.setPose(veh.cur,veh.bearing);
      try{map.addLayer(layer);}catch(e){}
      three.ready=true;three.loading=false;
      renderVehicle();
    }).catch(function(){
      three.loading=false;
      post({type:'error',message:'Vue 3D indisponible (réseau)'});
    });
  }
  // En suivi, chaque image recentre la carte par jumpTo, ce qui interromprait un easeTo :
  // le changement de camera est alors applique d'un coup.
  function camera(opts,duration){
    if(follow&&veh.cur){opts.center=veh.cur;map.jumpTo(opts);}
    else{opts.duration=duration;map.easeTo(opts);}
  }
  function setView3d(on){
    if(on===view3d)return;
    view3d=on;
    three.visible=on;
    set3dBuildings(on);
    if(on)loadThree();
    camera(on?{pitch:60,zoom:Math.max(map.getZoom(),17),bearing:follow?veh.bearing:map.getBearing()}:{pitch:0,bearing:0},650);
    renderVehicle();
    map.triggerRepaint();
  }

  // ---------- Rejeu ----------
  var traceCoords=[],traceT=[];
  window.__replay=function(r){
    if(!ready)return;
    // Portion deja parcourue = points dont le temps relatif <= t, + position interpolee.
    var lo=0,hi=traceT.length;
    while(lo<hi){var mid=(lo+hi)>>1;if(traceT[mid]<=r.t)lo=mid+1;else hi=mid;}
    setLine('played',traceCoords.slice(0,lo).concat([[r.lng,r.lat]]));
    veh.moving=true;
    moveVehicle(r.lng,r.lat,r.bearing,120);
  };

  function fitAll(st){
    var pts=st.trace.concat(st.snapped,st.route,st.stops.map(function(s){return [s.lng,s.lat];}));
    if(pts.length<1)return;
    var b=new maplibregl.LngLatBounds(pts[0],pts[0]);
    pts.forEach(function(p){b.extend(p);});
    // Fixe d'abord inclinaison/orientation : fitBounds interromprait une transition 2D/3D en cours.
    map.jumpTo({pitch:view3d?60:0,bearing:view3d?map.getBearing():0});
    map.fitBounds(b,{padding:48,duration:0,maxZoom:16});
  }

  function apply(st){
    lastState=st;
    traceCoords=st.trace;traceT=st.traceT||[];
    setLine('route',st.route);
    var useSnapped=st.snapped.length>1,useSegments=!useSnapped&&st.segments.length>0;
    setLine('snapped',useSnapped?st.snapped:[]);
    setData('segments',{type:'FeatureCollection',features:useSegments?st.segments.map(function(s){
      return {type:'Feature',properties:{color:s.color},geometry:{type:'LineString',coordinates:s.coords}};
    }):[]});
    setLine('trace',useSnapped||useSegments?[]:st.trace);
    // En rejeu, le trajet complet s'estompe et la portion parcourue passe au premier plan.
    var dim=st.replay?0.35:1;
    ['trace','segments','snapped'].forEach(function(id){if(map.getLayer(id))map.setPaintProperty(id,'line-opacity',dim);});
    if(!st.replay)setLine('played',[]);
    replay=st.replay;

    var seen={};
    st.stops.forEach(function(s){
      seen[s.id]=1;var m=markers[s.id];
      if(!m){var el=document.createElement('div');el.className='stop';el.textContent=s.order;
        m=markers[s.id]=new maplibregl.Marker({element:el}).setLngLat([s.lng,s.lat]).addTo(map);}
      m.getElement().style.background=s.color;m.setLngLat([s.lng,s.lat]);
    });
    Object.keys(markers).forEach(function(id){if(!seen[id]){markers[id].remove();delete markers[id];}});
    pauseMarkers.forEach(function(m){m.remove();});
    pauseMarkers=st.pauses.map(function(p){
      var el=document.createElement('div');el.className='pause';el.textContent='P · '+p.label;
      return new maplibregl.Marker({element:el,anchor:'bottom'}).setLngLat([p.lng,p.lat]).addTo(map);
    });

    follow=st.follow;
    vehVisible=!!(st.gps||st.replay);
    setView3d(st.view3d);
    if(veh.cur)renderVehicle();
    if(!st.replay&&st.gps)onGps(st.gps);
    if(!st.gps&&!st.replay)setData('acc',emptyFc());
    var force=st.recenter!==lastRecenter;lastRecenter=st.recenter;
    if(force&&veh.cur){var c={center:veh.cur,zoom:Math.max(map.getZoom(),view3d?17:15),pitch:view3d?60:0,bearing:view3d?veh.bearing:0};if(follow)map.jumpTo(c);else{c.duration=400;map.easeTo(c);}}
    if(st.fit&&st.fit!==lastFit){lastFit=st.fit;fitAll(st);}
  }
  window.__update=function(st){lastState=st;if(!ready){pending=st;return;}try{apply(st);}catch(e){post({type:'error',message:'Erreur d\\'affichage de la carte'});}};
  window.__zoom=function(d){map.easeTo({zoom:map.getZoom()+d,duration:250});};
})();
</script></body></html>`;
}
