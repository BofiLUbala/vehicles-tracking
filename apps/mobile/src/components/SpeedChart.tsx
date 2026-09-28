import React, { useMemo, useState } from 'react';
import { GestureResponderEvent, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { AppRadius, AppTheme } from '../theme/colors';
import { SpeedSample, formatDuration } from '../geo/trace-analysis';

interface Props {
  series: SpeedSample[];
  durationSeconds: number;
  /** Intervalles d'arrêt (secondes depuis le début), grisés sur le graphique. */
  stops?: { startS: number; endS: number }[];
  /** Position du curseur de rejeu (s). */
  cursorSeconds?: number | null;
  /** Glisser le doigt sur le graphique déplace le rejeu. */
  onScrub?: (seconds: number) => void;
  height?: number;
}

const PAD_LEFT = 30;
const PAD_RIGHT = 8;
const PAD_TOP = 8;
const PAD_BOTTOM = 18;
const MAX_PATH_POINTS = 300;

/** Réduit la série en conservant le pic de chaque tranche (les excès de vitesse restent visibles). */
function downsample(series: SpeedSample[], max: number): SpeedSample[] {
  if (series.length <= max) return series;
  const size = series.length / max;
  const out: SpeedSample[] = [];
  for (let i = 0; i < max; i++) {
    const bucket = series.slice(Math.floor(i * size), Math.floor((i + 1) * size));
    out.push(bucket.reduce((a, b) => (b.kmh > a.kmh ? b : a), bucket[0]));
  }
  return out;
}

/** Courbe de vitesse du trajet, qui sert aussi de curseur de rejeu. */
export function SpeedChart({ series, durationSeconds, stops = [], cursorSeconds, onScrub, height = 130 }: Props) {
  const [width, setWidth] = useState(0);
  const plotW = Math.max(1, width - PAD_LEFT - PAD_RIGHT);
  const plotH = height - PAD_TOP - PAD_BOTTOM;
  const duration = Math.max(1, durationSeconds);

  const { path, area, yMax } = useMemo(() => {
    const pts = downsample(series, MAX_PATH_POINTS);
    const peak = pts.reduce((m, p) => Math.max(m, p.kmh), 0);
    const yMax = Math.max(30, Math.ceil(peak / 10) * 10);
    if (pts.length < 2 || width === 0) return { path: '', area: '', yMax };
    const x = (t: number) => PAD_LEFT + (t / duration) * plotW;
    const y = (v: number) => PAD_TOP + plotH - (Math.min(v, yMax) / yMax) * plotH;
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.t).toFixed(1)},${y(p.kmh).toFixed(1)}`).join(' ');
    const base = (PAD_TOP + plotH).toFixed(1);
    return { path: d, area: `${d} L${x(pts[pts.length - 1].t).toFixed(1)},${base} L${x(pts[0].t).toFixed(1)},${base} Z`, yMax };
  }, [series, width, duration, plotW, plotH]);

  const scrub = (e: GestureResponderEvent) => {
    if (!onScrub || width === 0) return;
    const f = (e.nativeEvent.locationX - PAD_LEFT) / plotW;
    onScrub(Math.max(0, Math.min(1, f)) * duration);
  };

  const cursorX = cursorSeconds != null ? PAD_LEFT + (Math.min(cursorSeconds, duration) / duration) * plotW : null;

  return (
    <View
      style={[styles.wrap, { height }]}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => !!onScrub}
      onMoveShouldSetResponder={() => !!onScrub}
      onResponderTerminationRequest={() => false}
      onResponderGrant={scrub}
      onResponderMove={scrub}
      accessibilityLabel="Courbe de vitesse du trajet"
      accessibilityHint={onScrub ? 'Glissez pour rejouer le trajet' : undefined}
    >
      {width > 0 && (
        <Svg width={width} height={height}>
          {stops.map((s, i) => (
            <Rect
              key={i}
              x={PAD_LEFT + (s.startS / duration) * plotW}
              y={PAD_TOP}
              width={Math.max(1, ((s.endS - s.startS) / duration) * plotW)}
              height={plotH}
              fill="#94A3B8"
              opacity={0.18}
            />
          ))}
          {[0, 0.5, 1].map((f) => {
            const yy = PAD_TOP + plotH - f * plotH;
            return (
              <React.Fragment key={f}>
                <Line x1={PAD_LEFT} x2={PAD_LEFT + plotW} y1={yy} y2={yy} stroke={AppTheme.border} strokeWidth={1} />
                <SvgText x={PAD_LEFT - 4} y={yy + 3} fontSize={9} fill={AppTheme.textMuted} textAnchor="end">
                  {Math.round(yMax * f)}
                </SvgText>
              </React.Fragment>
            );
          })}
          {area ? <Path d={area} fill={AppTheme.tracking} opacity={0.12} /> : null}
          {path ? <Path d={path} stroke={AppTheme.tracking} strokeWidth={2} fill="none" strokeLinejoin="round" /> : null}
          <SvgText x={PAD_LEFT} y={height - 4} fontSize={9} fill={AppTheme.textMuted}>0</SvgText>
          <SvgText x={PAD_LEFT + plotW} y={height - 4} fontSize={9} fill={AppTheme.textMuted} textAnchor="end">
            {formatDuration(duration)}
          </SvgText>
          {cursorX != null && <Line x1={cursorX} x2={cursorX} y1={PAD_TOP} y2={PAD_TOP + plotH} stroke={AppTheme.navy} strokeWidth={2} />}
        </Svg>
      )}
      {series.length < 2 && <Text style={styles.empty}>Pas encore assez de points pour tracer la vitesse</Text>}
      <Text style={styles.unit}>km/h</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: '#FFFFFF', borderRadius: AppRadius.md, borderWidth: 1, borderColor: AppTheme.border, overflow: 'hidden', marginBottom: 10 },
  empty: { position: 'absolute', left: 0, right: 0, top: '42%', textAlign: 'center', color: AppTheme.textMuted, fontSize: 12 },
  unit: { position: 'absolute', left: 4, top: 2, fontSize: 9, color: AppTheme.textMuted, fontWeight: '700' },
});
