import { z } from "zod";

import { PLAYER_KEY_PATTERN } from "@/server/player-keys";

export const RoomNameSchema = z
  .string()
  .trim()
  .min(2)
  .max(32)
  .regex(
    /^[A-Za-z0-9 _-]+$/,
    "Use only letters, numbers, spaces, underscores, and hyphens.",
  )
  .transform((value) => value.replace(/\s+/g, " "));

export const DisplayNameSchema = z.string().trim().min(1).max(32);
export const EditionKeySchema = z.enum(["planet-nine", "deep-sea"]);
export const MissionKeySchema = z.string().regex(/^[A-Za-z0-9_:-]{1,32}$/);

export const AdminLoginSchema = z.strictObject({
  password: z.string().min(1),
});

export const CreateRoomSchema = z.strictObject({
  name: RoomNameSchema,
  editionKey: EditionKeySchema,
  missionKey: MissionKeySchema,
});

export const UpdateRoomSchema = z
  .strictObject({
    name: RoomNameSchema.optional(),
    editionKey: EditionKeySchema.optional(),
    missionKey: MissionKeySchema.optional(),
    confirmReset: z.boolean().optional().default(false),
  })
  .refine(
    ({ name, editionKey, missionKey }) =>
      name !== undefined || editionKey !== undefined || missionKey !== undefined,
    "Provide at least one room field to update.",
  );

export const AddPlayerSchema = z.strictObject({
  displayName: DisplayNameSchema,
  seat: z.number().int().min(1).max(5).optional(),
  confirmReset: z.boolean().optional().default(false),
});

export const UpdatePlayerSchema = z
  .strictObject({
    displayName: DisplayNameSchema.optional(),
    seat: z.number().int().min(1).max(5).optional(),
    confirmReset: z.boolean().optional().default(false),
  })
  .refine(
    ({ displayName, seat }) => displayName !== undefined || seat !== undefined,
    "Provide a name or seat to update.",
  );

export const ConfirmResetSchema = z.strictObject({
  confirmReset: z.boolean().optional().default(false),
});

export const AdminRoomActionSchema = z.strictObject({
  type: z.enum(["start", "restart", "advance"]),
});

export const PlayerLoginSchema = z.strictObject({
  roomName: RoomNameSchema,
  key: z
    .string()
    .trim()
    .toUpperCase()
    .regex(PLAYER_KEY_PATTERN, "Player keys contain six unambiguous characters."),
});

export type CreateRoomInput = z.infer<typeof CreateRoomSchema>;
export type UpdateRoomInput = z.infer<typeof UpdateRoomSchema>;
export type AddPlayerInput = z.infer<typeof AddPlayerSchema>;
export type UpdatePlayerInput = z.infer<typeof UpdatePlayerSchema>;
export type AdminRoomAction = z.infer<typeof AdminRoomActionSchema>["type"];

export interface RoomRow {
  id: string;
  name: string;
  editionKey: string;
  missionKey: string;
  stateVersion: number;
  state: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlayerRow {
  id: string;
  roomId: string;
  displayName: string;
  loginKey: string;
  seat: number;
  createdAt: Date;
}

export interface AdminRoomSummary {
  id: string;
  name: string;
  editionKey: string;
  missionKey: string;
  missionNumber: number;
  missionTitle: string;
  stateVersion: number;
  phase: string;
  result: string | null;
  attemptNumber: number;
  playerCount: number;
  restartRequired: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminEditionOption {
  key: "planet-nine" | "deep-sea";
  title: string;
  missions: Array<{
    key: string;
    number: number;
    title: string;
  }>;
}

export interface AdminRoomDetail extends AdminRoomSummary {
  players: Array<{
    id: string;
    displayName: string;
    loginKey: string;
    seat: number;
    createdAt: string;
  }>;
}
