import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { AppTheme } from '../theme/colors';
import {
  MapState,
  MobileMapStyle,
  ReplayState,
  buildMapHtml,
  buildUpdateScript,
  parseMapMessage,
  replayScript,
  resolveStyleUrl,
  setStyleScript,
  zoomScript,
} from '../map/tomtom-map';

export interface TomTomMapHandle {
  zoomBy: (delta: number) => void;
  /** Place le véhicule à une position de rejeu (appelé à chaque image : aucun re-rendu React). */
  replayTo: (frame: ReplayState) => void;
}

interface Props {
  state: MapState;
  /** Appelé quand l'utilisateur déplace la carte à la main (désactive le suivi automatique). */
  onUserMoved?: () => void;
  handleRef?: React.MutableRefObject<TomTomMapHandle | null>;
  /** Fond de carte. Le changer ne réinitialise ni la mission, ni la trace, ni le suivi GPS. */
  mapStyle?: MobileMapStyle;
}

// Clé CLIENT (publique, à restreindre côté portail TomTom). Sans clé : fond OpenFreeMap.
const TOMTOM_KEY = process.env.EXPO_PUBLIC_TOMTOM_API_KEY;
// Modèle 3D glTF/GLB facultatif (https, Draco accepté). Absent : camion généré par three.js.
const VEHICLE_MODEL_URL = process.env.EXPO_PUBLIC_VEHICLE_MODEL_URL;
const BASE_URL = 'https://tracking-vehicles.local/';
/** Seul le document initial (baseUrl / about:blank) peut être chargé comme page. */
export function isOwnDocument(req: { url: string }): boolean {
  return req.url === 'about:blank' || req.url.startsWith(BASE_URL);
}
const DEFAULT_CENTER = { lat: -4.325, lng: 15.322, zoom: 12 };

/**
 * Affichage cartographique uniquement. Ne lit ni n'écrit aucune donnée GPS : si la WebView ou TomTom
 * échouent, on affiche un bandeau d'erreur et la mission/le suivi continuent normalement.
 */
export function TomTomMapView({ state, onUserMoved, handleRef, mapStyle = 'driving' }: Props) {
  const webRef = useRef<WebView>(null);
  const [error, setError] = useState<string | null>(null);

  // La source HTML ne doit JAMAIS changer après le montage (sinon rechargement de la carte) :
  // le centre initial est figé, les mises à jour passent par injectJavaScript.
  const html = useMemo(() => {
    const first = state.gps ?? state.stops[0];
    const initial = first ? { lat: first.latitude, lng: first.longitude, zoom: 14 } : DEFAULT_CENTER;
    return buildMapHtml(resolveStyleUrl(TOMTOM_KEY, mapStyle), initial, { vehicleModelUrl: VEHICLE_MODEL_URL });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Changement de fond APRÈS le montage : `setStyle` dans la WebView, jamais un rechargement
  // (un rechargement perdrait la carte et rejouerait le chargement des tuiles).
  const appliedStyleRef = useRef<MobileMapStyle>(mapStyle);
  useEffect(() => {
    if (appliedStyleRef.current === mapStyle) return;
    appliedStyleRef.current = mapStyle;
    setError(null);
    webRef.current?.injectJavaScript(setStyleScript(resolveStyleUrl(TOMTOM_KEY, mapStyle)));
  }, [mapStyle]);

  useEffect(() => {
    webRef.current?.injectJavaScript(buildUpdateScript(state));
  }, [state]);

  useEffect(() => {
    if (handleRef) {
      handleRef.current = {
        zoomBy: (d) => webRef.current?.injectJavaScript(zoomScript(d)),
        replayTo: (frame) => webRef.current?.injectJavaScript(replayScript(frame)),
      };
    }
    return () => {
      if (handleRef) handleRef.current = null;
    };
  }, [handleRef]);

  const onMessage = useCallback(
    (e: WebViewMessageEvent) => {
      const msg = parseMapMessage(e.nativeEvent.data);
      if (!msg) return;
      if (msg.type === 'userMoved') onUserMoved?.();
      else if (msg.type === 'error') setError(msg.message);
      else if (msg.type === 'ready') {
        setError(null);
        webRef.current?.injectJavaScript(buildUpdateScript(state));
      }
    },
    [onUserMoved, state],
  );

  return (
    <View style={styles.fill}>
      <WebView
        ref={webRef}
        style={styles.fill}
        // Durcissement : la WebView n'affiche que notre document. Toute autre navigation (lien
        // d'attribution, redirection) est bloquée ; aucun accès fichier/géoloc/fenêtre externe.
        originWhitelist={['https://*', 'about:*']}
        source={{ html, baseUrl: BASE_URL }}
        onShouldStartLoadWithRequest={isOwnDocument}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess={false}
        allowUniversalAccessFromFileURLs={false}
        geolocationEnabled={false}
        javaScriptCanOpenWindowsAutomatically={false}
        mixedContentMode="never"
        onMessage={onMessage}
        onError={() => setError('Fond de carte indisponible')}
        onHttpError={() => setError('Fond de carte indisponible')}
        setSupportMultipleWindows={false}
        overScrollMode="never"
        androidLayerType="hardware"
      />
      {error && (
        <View style={styles.error} pointerEvents="none" accessibilityRole="alert">
          <Text style={styles.errorText}>{error} — le suivi GPS continue.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#E8EEF4' },
  error: {
    position: 'absolute',
    left: 12,
    right: 60,
    bottom: 34,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: AppTheme.danger,
  },
  errorText: { color: AppTheme.danger, fontSize: 12, fontWeight: '700' },
});
