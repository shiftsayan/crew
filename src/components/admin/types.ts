import type { ActorProjection } from "@/components/game/types";

export type MissionOption = {
  key: string;
  number: number;
  title: string;
};

export type EditionOption = {
  key: "planet-nine" | "deep-sea";
  title: string;
  missions: MissionOption[];
};

export type AdminPlayer = {
  id: string;
  displayName: string;
  loginKey: string;
  seat: number;
};

export type AdminRoom = {
  id: string;
  name: string;
  editionKey: EditionOption["key"];
  missionKey: string;
  missionNumber?: number;
  missionTitle?: string;
  phase: ActorProjection["phase"] | "restart-required";
  restartRequired: boolean;
  attemptNumber?: number;
  playerCount: number;
  updatedAt: string;
  players?: AdminPlayer[];
};

export type AdminRoomDetail = AdminRoom & {
  players: AdminPlayer[];
};

export type AdminBootstrap = {
  rooms: AdminRoom[];
  editions: EditionOption[];
};

export type AdminApiError = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
  message?: string;
};

export function adminErrorMessage(body: AdminApiError, fallback: string) {
  return body.error?.message ?? body.message ?? fallback;
}
