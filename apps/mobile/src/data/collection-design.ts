import { type WallpaperMilestone } from './habit-rewards';

export const WALLPAPER_EXPORT_SIZE = { width: 1179, height: 2556 } as const;
export const WALLPAPER_ASPECT_RATIO = WALLPAPER_EXPORT_SIZE.width / WALLPAPER_EXPORT_SIZE.height;

export const WALLPAPER_SCENES: Record<WallpaperMilestone, {
  sky: string; horizon: string; sun: string; far: string; middle: string; near: string;
  motif: 'dawn' | 'dunes' | 'forest' | 'ridge' | 'ocean' | 'momentum' | 'summit'; footer: string;
}> = {
  7: { sky: '#251A3B', horizon: '#6A465F', sun: '#F4C6A3', far: '#916174', middle: '#563951', near: '#2B213C', motif: 'dawn', footer: 'EVERY BEGINNING COUNTS' },
  10: { sky: '#1B293E', horizon: '#435A72', sun: '#E9D3AA', far: '#8F8C9F', middle: '#4E647B', near: '#243C55', motif: 'dunes', footer: 'MAKE ROOM FOR POSSIBILITY' },
  21: { sky: '#132E31', horizon: '#3E5C54', sun: '#D2DFB0', far: '#607F6E', middle: '#315B50', near: '#123D3D', motif: 'forest', footer: 'ROOTED IN SHOWING UP' },
  30: { sky: '#32263D', horizon: '#856456', sun: '#F2D7A3', far: '#9A775F', middle: '#685061', near: '#342E49', motif: 'ridge', footer: 'BUILT ONE DAY AT A TIME' },
  45: { sky: '#142742', horizon: '#45648B', sun: '#E7CEAB', far: '#617DA6', middle: '#344F79', near: '#1D3157', motif: 'ocean', footer: 'STEADY BECOMES STRONG' },
  60: { sky: '#1B1542', horizon: '#050B22', sun: '#D4B6FF', far: '#6C53A6', middle: '#3D386B', near: '#171F44', motif: 'momentum', footer: 'KEEP YOUR MOMENTUM' },
  90: { sky: '#0B292B', horizon: '#092C45', sun: '#F7D99B', far: '#1D6867', middle: '#155359', near: '#0E3B47', motif: 'summit', footer: 'THE SUMMIT IS YOURS' },
};

export const ANIMAL_PATCHES = [
  { animal: 'bear', name: 'Bear', virtue: 'Resolve', accent: '#D9B077' },
  { animal: 'boar', name: 'Boar', virtue: 'Drive', accent: '#C58F75' },
  { animal: 'bison', name: 'Bison', virtue: 'Endurance', accent: '#88B1A3' },
  { animal: 'badger', name: 'Badger', virtue: 'Grit', accent: '#B3A2CC' },
  { animal: 'wolf', name: 'Wolf', virtue: 'Focus', accent: '#93B1CF' },
] as const;
export type PatchAnimal = (typeof ANIMAL_PATCHES)[number]['animal'];

export function badgeDesignForCycle(cycle: number) {
  const index = Math.max(0, Math.floor(cycle) - 1);
  return { ...ANIMAL_PATCHES[index % ANIMAL_PATCHES.length], rank: Math.floor(index / ANIMAL_PATCHES.length) + 1, cycle };
}
