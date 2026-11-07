import { useId } from 'react';
import { Image, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { type WallpaperEdition, type WallpaperMilestone } from '../data/habit-rewards';
export type { WallpaperEdition } from '../data/habit-rewards';
import { badgeDesignForCycle, type PatchAnimal, WALLPAPER_ASPECT_RATIO, WALLPAPER_SCENES } from '../data/collection-design';

export const WALLPAPER_TITLES: Record<WallpaperMilestone, string> = {
  7: 'First Spark', 10: 'Dream Bigger', 21: 'Mind Over Matter', 30: 'Built by Discipline',
  45: 'Show Up', 60: 'Momentum', 90: 'The Summit',
};
const PHOTOS = {
  7: { source: require('../../assets/wallpapers/winning.jpg'), background: '#E5E5DF' },
  10: { source: require('../../assets/wallpapers/dream-big.jpg'), background: '#080808' },
  21: { source: require('../../assets/wallpapers/psychological.jpg'), background: '#050505' },
  30: { source: require('../../assets/wallpapers/discipline.jpg'), background: '#EEEAE7' },
  45: { source: require('../../assets/wallpapers/consistency.jpg'), background: '#080808' },
};
const VIEW_HEIGHT = 360 / WALLPAPER_ASPECT_RATIO;

export function CollectionWallpaper({ days, width, edition = 'landscape', onReady, onError }: {
  days: WallpaperMilestone; width: number; edition?: WallpaperEdition; onReady?: () => void; onError?: () => void;
}) {
  const id = `wall-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const photo = edition === 'quote' && days <= 45 ? PHOTOS[days as keyof typeof PHOTOS] : undefined;
  const scene = WALLPAPER_SCENES[days];
  const sharpRidge = scene.motif === 'ridge' || scene.motif === 'summit';
  const height = width / WALLPAPER_ASPECT_RATIO;
  return <View style={{ width, height, overflow: 'hidden', backgroundColor: photo?.background ?? scene.sky }}
    onLayout={() => { if (!photo) onReady?.(); }}>
    {photo ? <Image source={photo.source} resizeMode="contain" style={{ width, height }}
      onLoad={onReady} onError={onError} accessibilityLabel={`${days}-day quote wallpaper: ${WALLPAPER_TITLES[days]}`} />
      : <Svg width="100%" height="100%" viewBox={`0 0 360 ${VIEW_HEIGHT}`} accessible={false}>
        <Defs><LinearGradient id={id} x1="0" y1="0" x2="0.8" y2="1"><Stop offset="0" stopColor={scene.sky} /><Stop offset="1" stopColor={scene.horizon} /></LinearGradient></Defs>
        <Rect width="360" height={VIEW_HEIGHT} fill={`url(#${id})`} />
        {[0, 1, 2, 3].map((ring) => <Circle key={ring} cx="180" cy="432" r={65 + ring * 44} fill="none" stroke={scene.sun} strokeOpacity={0.12 - ring * 0.02} strokeWidth="0.8" />)}
        <Circle cx="180" cy="432" r="66" fill={scene.sun} />
        <Path d={sharpRidge ? 'M0 660 70 580 116 605 184 462 261 590 300 570 360 630V900H0Z' : 'M0 570Q100 460 190 585T360 540V900H0Z'} fill={scene.far} />
        {sharpRidge && <Path d="m155 524 29-62 32 54-32-13Z" fill="#F1F0DA" />}
        <Path d={scene.motif === 'ocean' ? 'M0 620q45-20 90 0t90 0 90 0 90 0V900H0Z' : 'M0 640Q115 526 217 627T360 600V900H0Z'} fill={scene.middle} />
        {scene.motif === 'forest' && <G fill={scene.near} opacity="0.85">
          {[20, 65, 108, 245, 293, 335].map((x, index) => <Path key={x} d={`M${x} ${590 + index % 3 * 20}l-23 68h13l-18 36h56l-18-36h13Z`} />)}
        </G>}
        <Path d="M0 695Q115 620 205 684T360 665V900H0Z" fill={scene.near} />
        {scene.motif === 'ocean' && <G stroke={scene.sun} opacity="0.25" strokeWidth="1" strokeLinecap="round"><Path d="M110 580h140M135 589h90M92 600h165M123 611h105" /></G>}
        <G fill="#F8EEDD" textAnchor="middle" fontFamily="System">
          <SvgText x="180" y="240" fontSize="10" letterSpacing="4">ONE DAY AT A TIME</SvgText>
          <SvgText x="180" y="323" fontSize="70" fontWeight="800">{days}</SvgText>
          <SvgText x="180" y="352" fontSize="11" letterSpacing="3">DAYS OF SHOWING UP</SvgText>
          <SvgText x="180" y={VIEW_HEIGHT - 42} fontSize="9" letterSpacing="2.1">{scene.footer}</SvgText>
        </G>
        {[38, 81, 280, 313].map((x, index) => <Circle key={x} cx={x} cy={48 + index * 41} r="1" fill={scene.sun} opacity="0.5" />)}
      </Svg>}
  </View>;
}

function AnimalPortrait({ animal, accent }: { animal: PatchAnimal; accent: string }) {
  const ivory = '#DDD8C7';
  const ink = '#172329';
  const features = <>
    <Path d="m110 125 29 12-18 9-12-10m81-11-29 12 18 9 12-10" fill={ink} />
    <Path d="m118 135 12 4m52-4-12 4" stroke={accent} strokeWidth="2.5" strokeLinecap="square" />
    <Path d="m108 120 32 13m52-13-32 13" stroke={ink} strokeWidth="5" strokeLinecap="round" />
    <Path d="m134 190 16-6 16 6-6 12h-20Z" fill={ink} />
    <Path d="m138 190 5 8 3-11m8 0 3 11 5-8" fill={ivory} stroke="none" />
  </>;
  if (animal === 'bear') return <G stroke={ink} strokeWidth="3" strokeLinejoin="round">
    <Circle cx="101" cy="92" r="17" fill={accent} /><Circle cx="199" cy="92" r="17" fill={accent} />
    <Circle cx="101" cy="92" r="8" fill={ink} /><Circle cx="199" cy="92" r="8" fill={ink} />
    <Path d="m96 112 15-25 23-8 16 5 16-5 23 8 15 25 9 37-11 26-20 24-32 14-32-14-20-24-11-26Z" fill={ivory} />
    <Path d="m100 116 30-14 20 10 20-10 30 14-17 43-33 18-33-18Z" fill={accent} stroke="none" />
    <Path d="m121 161 29-12 29 12-6 28-23 15-23-15Z" fill={ivory} /><Path d="m135 164 15-7 15 7-15 15Z" fill={ink} />{features}
  </G>;
  if (animal === 'boar') return <G stroke={ink} strokeWidth="3.5" strokeLinejoin="round">
    <Path d="m99 110-17-40 43 17m76 23 17-40-43 17" fill={accent} />
    <Path d="M150 84q40 0 54 38l-9 58-45 34-45-34-9-58q14-38 54-38Z" fill={ivory} />
    <Path d="m150 87-19 33 19 25 19-25Z" fill={accent} stroke="none" />
    <Path d="M119 177q-22-1-27-36-15 37 14 56l14-9m61-11q22-1 27-36 15 37-14 56l-14-9" fill={ivory} />
    <Rect x="122" y="151" width="56" height="37" rx="9" fill={accent} /><Ellipse cx="138" cy="168" rx="4" ry="6" fill={ink} /><Ellipse cx="162" cy="168" rx="4" ry="6" fill={ink} />{features}
  </G>;
  if (animal === 'bison') return <G stroke={ink} strokeWidth="3.5" strokeLinejoin="round">
    <Path d="M107 115Q64 120 62 67q13 29 48 23m83 25q43 5 45-48-13 29-48 23" fill={ivory} />
    <Path d="m97 98 15-12 10-17 14 9 14-13 14 13 14-9 10 17 15 12 6 43-23 43-36 29-36-29-23-43Z" fill={accent} />
    <Path d="m116 105 34 12 34-12-7 38-27 27-27-27Z" fill={ivory} stroke="none" />
    <Path d="m121 164 29-14 29 14-8 30-21 11-21-11Z" fill={ivory} /><Path d="m139 177 11-5 11 5-11 10Z" fill={ink} />{features}
  </G>;
  if (animal === 'badger') return <G stroke={ink} strokeWidth="3" strokeLinejoin="round">
    <Circle cx="105" cy="91" r="12" fill={accent} /><Circle cx="195" cy="91" r="12" fill={accent} />
    <Path d="m150 80 32 8 24 37-6 31-15 23-35 35-35-35-15-23-6-31 24-37Z" fill={ivory} />
    <Path d="m123 91-14 38 16 49 17-30-8-50m43-7 14 38-16 49-17-30 8-50" fill={ink} stroke="none" />
    <Path d="m150 91-12 51 12 43 12-43Z" fill={accent} stroke="none" />
    <Path d="m128 171 22-13 22 13-22 25Z" fill={ivory} /><Path d="m140 172 10-5 10 5-10 11Z" fill={ink} />
    {features}
  </G>;
  return <G stroke={ink} strokeWidth="3" strokeLinejoin="round">
    <Path d="m96 117-11-61 46 34 19-8 19 8 46-34-11 61 16 31-9 3 10 16-20 14-8 16-13-2-30 20-30-20-13 2-8-16-20-14 10-16-9-3Z" fill={ivory} />
    <Path d="m99 107-3-28 26 18m79 10 3-28-26 18" fill={accent} />
    <Path d="m102 113 33 10 15 33 15-33 33-10-15 45-33 40-33-40Z" fill={accent} stroke="none" />
    <Path d="m134 164 16-18 16 18-16 32Z" fill={ivory} /><Path d="m139 175 11-7 11 7-11 12Z" fill={ink} />{features}
  </G>;
}

export function ChampionBadgeArt({ cycle, size = 240 }: { cycle: number; size?: number }) {
  const design = badgeDesignForCycle(cycle);
  return <Svg width={size} height={size} viewBox="0 0 300 300" accessible={false}>
    <Path d="M69 25h162q22 0 27 22l17 144q3 18-13 29l-97 61q-15 10-30 0l-97-61q-16-11-13-29L42 47q5-22 27-22Z" fill="#101A21" stroke="#070E13" strokeWidth="7" strokeLinejoin="round" />
    <Path d="M69 33h162q15 0 19 17l17 140q2 14-12 24l-96 60q-9 6-18 0l-96-60q-14-10-12-24L50 50q4-17 19-17Z" fill="#1E2B33" stroke={design.accent} strokeWidth="4" />
    <Path d="M70 42h160q8 0 11 12l16 134q2 10-7 16l-94 59q-6 4-12 0l-94-59q-9-6-7-16L59 54q3-12 11-12Z" fill="none" stroke={design.accent} strokeWidth="1.3" strokeDasharray="2 4" opacity="0.65" />
    <SvgText x="150" y="64" textAnchor="middle" fill={design.accent} fontFamily="System" fontWeight="800" fontSize="13" letterSpacing="3">{design.virtue.toUpperCase()}</SvgText>
    <AnimalPortrait animal={design.animal} accent={design.accent} />
    <Path d="M77 213h146l-7 30H84Z" fill="#101A21" stroke={design.accent} strokeWidth="1.5" strokeLinejoin="round" />
    <SvgText x="150" y="233" textAnchor="middle" fill="#E8E0CD" fontFamily="System" fontWeight="800" fontSize="14" letterSpacing="2">{design.name.toUpperCase()}</SvgText>
    <SvgText x="150" y="258" textAnchor="middle" fill={design.accent} fontFamily="System" fontWeight="700" fontSize="10" letterSpacing="1.5">90 DAYS</SvgText>
  </Svg>;
}
