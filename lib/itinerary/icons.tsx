import {
  Landmark, Building2, Cpu, Cog, Trees, Footprints, UtensilsCrossed, Bus,
  TrainFront, Plane, Drama, ScrollText, GraduationCap, School, Hammer,
  Trophy, Mountain, BedDouble,
} from 'lucide-react';
import type { HighlightType } from './schema';

/**
 * One restrained icon per highlight type. Lucide's stroke weight matches the
 * outline set already used in the travel app, so the two feel related.
 */
const ICONS = {
  landmark: Landmark,
  museum: Building2,
  technology: Cpu,
  engineering: Cog,
  nature: Trees,
  walking: Footprints,
  food: UtensilsCrossed,
  transport: Bus,
  train: TrainFront,
  flight: Plane,
  culture: Drama,
  history: ScrollText,
  education: GraduationCap,
  university: School,
  workshop: Hammer,
  sport: Trophy,
  adventure: Mountain,
  accommodation: BedDouble,
} as const satisfies Record<HighlightType, unknown>;

export function HighlightIcon({ type, size = 19 }: { type: HighlightType; size?: number }) {
  const Icon = ICONS[type] ?? Landmark;
  return <Icon size={size} strokeWidth={1.6} aria-hidden="true" />;
}
