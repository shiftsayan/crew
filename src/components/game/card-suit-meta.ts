import {
  ChevronsUp,
  Circle,
  Square,
  Triangle,
  X,
  type LucideIcon,
} from "lucide-react";

import type { Card } from "./types";

export const CARD_SUIT_COLOR_CLASS_NAME = {
  pink: "text-card-pink",
  blue: "text-card-blue",
  green: "text-card-green",
  yellow: "text-card-yellow",
  trump: "text-card-trump",
} satisfies Record<Card["suit"], string>;

export const CARD_SUIT_META = {
  pink: { label: "Pink", Icon: Square },
  blue: { label: "Blue", Icon: Circle },
  green: { label: "Green", Icon: Triangle },
  yellow: { label: "Yellow", Icon: X },
  trump: { label: "Trump", Icon: ChevronsUp },
} satisfies Record<Card["suit"], { label: string; Icon: LucideIcon }>;
