import { z } from "zod";

export const CURRENT_STATE_VERSION = 1 as const;

export const EditionKeySchema = z.enum(["planet-nine", "deep-sea"]);
export type EditionKey = z.infer<typeof EditionKeySchema>;

export const PlayerCountSchema = z.union([
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);
export type PlayerCount = z.infer<typeof PlayerCountSchema>;

export const SuitSchema = z.enum([
  "blue",
  "green",
  "pink",
  "yellow",
  "trump",
]);
export type Suit = z.infer<typeof SuitSchema>;

export const CardIdSchema = z
  .string()
  .regex(/^(?:blue|green|pink|yellow)-[1-9]$|^trump-[1-4]$/);
export type CardId = z.infer<typeof CardIdSchema>;

export const CardSchema = z.object({
  id: CardIdSchema,
  suit: SuitSchema,
  value: z.number().int().min(1).max(9),
});
export type Card = z.infer<typeof CardSchema>;

export const MissionKeySchema = z.string().regex(/^(?:planet-nine|deep-sea):\d+$/);
export type MissionKey = z.infer<typeof MissionKeySchema>;

export const GamePhaseSchema = z.enum([
  "setup",
  "assigning-tasks",
  "between-tricks",
  "playing-trick",
  "adjudicating",
  "finished",
]);
export type GamePhase = z.infer<typeof GamePhaseSchema>;

export const GameResultSchema = z.enum(["won", "lost"]);
export type GameResult = z.infer<typeof GameResultSchema>;

export const TaskOutcomeSchema = z.enum(["pending", "success", "failure"]);
export type TaskOutcome = z.infer<typeof TaskOutcomeSchema>;

export const TaskOrderSchema = z.enum([
  "one",
  "two",
  "three",
  "four",
  "first",
  "second",
  "third",
  "last",
  "last-trick",
]);
export type TaskOrder = z.infer<typeof TaskOrderSchema>;

export const CommunicationQualifierSchema = z.enum([
  "highest",
  "only",
  "lowest",
]);
export type CommunicationQualifier = z.infer<
  typeof CommunicationQualifierSchema
>;

export const CommunicationSchema = z.object({
  cardId: CardIdSchema,
  qualifier: CommunicationQualifierSchema,
});
export type Communication = z.infer<typeof CommunicationSchema>;

export const EnginePlayerStateSchema = z.object({
  playerId: z.string().min(1),
  hand: z.array(CardIdSchema),
  captured: z.array(CardIdSchema),
  tricksWon: z.number().int().nonnegative(),
  hasCommunicated: z.boolean(),
  communication: CommunicationSchema.nullable(),
});
export type EnginePlayerState = z.infer<typeof EnginePlayerStateSchema>;

export const EngineTaskSchema = z.object({
  id: z.string().min(1),
  definitionId: z.string().min(1),
  difficulty: z.number().int().nonnegative().nullable(),
  cardId: CardIdSchema.nullable(),
  order: TaskOrderSchema.nullable(),
  ownerPlayerId: z.string().min(1).nullable(),
  outcome: TaskOutcomeSchema,
});
export type EngineTask = z.infer<typeof EngineTaskSchema>;

export const TrickPlaySchema = z.object({
  playerId: z.string().min(1),
  cardId: CardIdSchema,
});
export type TrickPlay = z.infer<typeof TrickPlaySchema>;

export const TrickSchema = z.object({
  number: z.number().int().positive(),
  leaderPlayerId: z.string().min(1),
  plays: z.array(TrickPlaySchema),
  winnerPlayerId: z.string().min(1).nullable(),
});
export type Trick = z.infer<typeof TrickSchema>;

export const GameStateSchema = z.object({
  stateVersion: z.literal(CURRENT_STATE_VERSION),
  editionKey: EditionKeySchema,
  missionKey: MissionKeySchema,
  attemptNumber: z.number().int().positive(),
  phase: GamePhaseSchema,
  result: GameResultSchema.nullable(),
  seatOrder: z.array(z.string().min(1)).max(5),
  captainPlayerId: z.string().min(1).nullable(),
  currentPlayerId: z.string().min(1).nullable(),
  players: z.record(z.string(), EnginePlayerStateSchema),
  tasks: z.array(EngineTaskSchema),
  assignmentTurns: z.number().int().nonnegative(),
  currentTrick: TrickSchema.nullable(),
  lastTrick: TrickSchema.nullable(),
  trickNumber: z.number().int().nonnegative(),
});
export type GameState = z.infer<typeof GameStateSchema>;

export const PlayerCommandSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("claim-task"),
    taskId: z.string().min(1),
  }),
  z.object({
    type: z.literal("pass-task"),
  }),
  z.object({
    type: z.literal("communicate"),
    cardId: CardIdSchema,
    qualifier: CommunicationQualifierSchema,
  }),
  z.object({
    type: z.literal("play-card"),
    cardId: CardIdSchema,
  }),
  z.object({
    type: z.literal("set-task-outcome"),
    taskId: z.string().min(1),
    outcome: TaskOutcomeSchema,
  }),
  z.object({
    type: z.literal("set-mission-outcome"),
    outcome: z.enum(["success", "failure"]),
  }),
]);
export type PlayerCommand = z.infer<typeof PlayerCommandSchema>;

export const PublicPlayerSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  seat: z.number().int().min(1).max(5),
  cardCount: z.number().int().nonnegative(),
  tricksWon: z.number().int().nonnegative(),
  communication: CommunicationSchema.nullable(),
  isCaptain: z.boolean(),
  isCurrent: z.boolean(),
});
export type PublicPlayer = z.infer<typeof PublicPlayerSchema>;

export const ProjectedTaskSchema = EngineTaskSchema.extend({
  title: z.string().min(1),
  footnote: z.string().min(1).nullable(),
  ownerDisplayName: z.string().min(1).nullable(),
});
export type ProjectedTask = z.infer<typeof ProjectedTaskSchema>;

export const CommunicationOptionSchema = z.object({
  cardId: CardIdSchema,
  qualifiers: z.array(CommunicationQualifierSchema).min(1),
});
export type CommunicationOption = z.infer<typeof CommunicationOptionSchema>;

export const ActorProjectionSchema = z.object({
  room: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
  }),
  mission: z.object({
    editionKey: EditionKeySchema,
    missionKey: MissionKeySchema,
    number: z.number().int().positive(),
    title: z.string().min(1),
    attemptNumber: z.number().int().positive(),
    manualRule: z.boolean(),
    deadSpot: z.boolean(),
  }),
  phase: GamePhaseSchema,
  result: GameResultSchema.nullable(),
  self: z.object({
    id: z.string().min(1),
    displayName: z.string().min(1),
    seat: z.number().int().min(1).max(5),
    hand: z.array(CardSchema),
    captured: z.array(CardSchema),
    tricksWon: z.number().int().nonnegative(),
    communication: CommunicationSchema.nullable(),
  }),
  players: z.array(PublicPlayerSchema),
  tasks: z.array(ProjectedTaskSchema),
  currentTrick: TrickSchema.nullable(),
  lastTrick: TrickSchema.nullable(),
  legalActions: z.object({
    claimableTaskIds: z.array(z.string()),
    canPassTask: z.boolean(),
    playableCardIds: z.array(CardIdSchema),
    communicationOptions: z.array(CommunicationOptionSchema),
    taskOutcomeTaskIds: z.array(z.string()),
    canSetMissionOutcome: z.boolean(),
  }),
});
export type ActorProjection = z.infer<typeof ActorProjectionSchema>;

export type ProjectionRosterPlayer = {
  id: string;
  displayName: string;
  seat: number;
};

export type ProjectionContext = {
  roomId: string;
  roomName: string;
  roster: ProjectionRosterPlayer[];
};

export const EngineErrorCodeSchema = z.enum([
  "INVALID_STATE",
  "INVALID_SETUP",
  "UNKNOWN_PLAYER",
  "INVALID_PHASE",
  "NOT_YOUR_TURN",
  "UNKNOWN_TASK",
  "TASK_ALREADY_CLAIMED",
  "PASS_NOT_ALLOWED",
  "INVALID_CARD",
  "MUST_FOLLOW_SUIT",
  "COMMUNICATION_NOT_ALLOWED",
  "INVALID_COMMUNICATION",
  "OUTCOME_NOT_ALLOWED",
]);
export type EngineErrorCode = z.infer<typeof EngineErrorCodeSchema>;

export type EngineError = {
  code: EngineErrorCode;
  message: string;
};

export type TransitionResult =
  | { ok: true; state: GameState }
  | { ok: false; error: EngineError };
