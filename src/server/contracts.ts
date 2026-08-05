import { z } from "zod";

import { PLAYER_TAGS, type PlayerTag } from "@/game/player-tags";
import {
  PLAYER_NAME_PATTERN,
  ROOM_NAME_PATTERN,
} from "@/lib/identifiers";

export const RoomNameSchema = z
  .string()
  .trim()
  .min(2)
  .max(32)
  .regex(
    ROOM_NAME_PATTERN,
    "Use only letters, numbers, underscores, and hyphens.",
  );

export const DisplayNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .regex(
    PLAYER_NAME_PATTERN,
    "Use only letters, numbers, underscores, and hyphens.",
  );
export const PlayerTagSchema = z.enum(PLAYER_TAGS);
export const PlayerTagsSchema = z
  .array(PlayerTagSchema)
  .transform((tags) => [...new Set(tags)])
  .pipe(z.array(PlayerTagSchema).max(PLAYER_TAGS.length));
export const EditionKeySchema = z.enum(["planet-nine", "deep-sea"]);
export const MissionKeySchema = z.string().regex(/^[A-Za-z0-9_:-]{1,32}$/);

export const AdminLoginSchema = z.strictObject({
  password: z.string().min(1),
});

export const CreateRoomSchema = z.strictObject({
  name: RoomNameSchema,
  editionKey: EditionKeySchema,
});

export const UpdateRoomSchema = z
  .strictObject({
    name: RoomNameSchema.optional(),
    editionKey: EditionKeySchema.optional(),
    missionKey: MissionKeySchema.nullable().optional(),
    confirmReset: z.boolean().optional().default(false),
  })
  .refine(
    ({ name, editionKey, missionKey }) =>
      name !== undefined || editionKey !== undefined || missionKey !== undefined,
    "Provide at least one room field to update.",
  );

export const AddPlayerSchema = z.strictObject({
  displayName: DisplayNameSchema,
  tags: PlayerTagsSchema.optional().default([]),
  seat: z.number().int().min(1).max(5).optional(),
  confirmReset: z.boolean().optional().default(false),
});

export const UpdatePlayerSchema = z
  .strictObject({
    displayName: DisplayNameSchema.optional(),
    tags: PlayerTagsSchema.optional(),
    seat: z.number().int().min(1).max(5).optional(),
    confirmReset: z.boolean().optional().default(false),
  })
  .refine(
    ({ displayName, tags, seat }) =>
      displayName !== undefined ||
      tags !== undefined ||
      seat !== undefined,
    "Provide a name, tags, or seat to update.",
  );

export const ConfirmResetSchema = z.strictObject({
  confirmReset: z.boolean().optional().default(false),
});

export const AdminRoomActionSchema = z.strictObject({
  type: z.enum(["return-to-preflight", "advance", "shuffle"]),
  confirmReset: z.boolean().optional().default(false),
});

const AdminPlayerSettingsSchema = z.strictObject({
  id: z.string().uuid().optional(),
  displayName: z.union([DisplayNameSchema, z.literal("")]),
  tags: PlayerTagsSchema.optional().default([]),
  seat: z.number().int().min(1).max(5),
});

export const SaveAdminRoomSettingsSchema = z
  .strictObject({
    editionKey: EditionKeySchema,
    missionKey: MissionKeySchema.nullable(),
    attemptNumber: z.number().int().positive().optional(),
    players: z.array(AdminPlayerSettingsSchema).length(5),
    confirmReset: z.boolean().optional().default(false),
  })
  .superRefine(({ players }, context) => {
    const seats = new Set<number>();
    const ids = new Set<string>();
    const names = new Set<string>();

    for (const [index, player] of players.entries()) {
      if (seats.has(player.seat)) {
        context.addIssue({
          code: "custom",
          message: "Each player slot must use a unique seat.",
          path: ["players", index, "seat"],
        });
      }
      seats.add(player.seat);

      if (player.id) {
        if (ids.has(player.id)) {
          context.addIssue({
            code: "custom",
            message: "Each player can appear only once.",
            path: ["players", index, "id"],
          });
        }
        ids.add(player.id);
      }

      if (player.displayName) {
        const normalizedName = player.displayName.toLocaleLowerCase("en-US");
        if (names.has(normalizedName)) {
          context.addIssue({
            code: "custom",
            message: "Player names must be unique in this room.",
            path: ["players", index, "displayName"],
          });
        }
        names.add(normalizedName);
      }
    }
  });

export const PlayerLoginSchema = z.strictObject({
  roomName: RoomNameSchema,
  playerName: DisplayNameSchema,
});

export type CreateRoomInput = z.infer<typeof CreateRoomSchema>;
export type UpdateRoomInput = z.infer<typeof UpdateRoomSchema>;
export type AddPlayerInput = z.infer<typeof AddPlayerSchema>;
export type UpdatePlayerInput = z.infer<typeof UpdatePlayerSchema>;
export type AdminRoomAction = z.infer<typeof AdminRoomActionSchema>["type"];
export type SaveAdminRoomSettingsInput = z.infer<
  typeof SaveAdminRoomSettingsSchema
>;

export interface RoomRow {
  id: string;
  name: string;
  editionKey: string;
  missionKey: string | null;
  stateVersion: number | null;
  state: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlayerRow {
  id: string;
  roomId: string;
  displayName: string;
  tags: PlayerTag[];
  seat: number;
  createdAt: Date;
}

export interface AdminRoomSummary {
  id: string;
  name: string;
  editionKey: string;
  missionKey: string | null;
  missionNumber: number | null;
  missionTitle: string | null;
  stateVersion: number | null;
  phase: string;
  result: string | null;
  attemptNumber: number | null;
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
    tags: PlayerTag[];
    seat: number;
    createdAt: string;
  }>;
}
