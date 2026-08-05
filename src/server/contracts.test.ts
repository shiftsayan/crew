import { describe, expect, it } from "vitest";

import {
  AddPlayerSchema,
  AdminRoomActionSchema,
  CreateRoomSchema,
  PlayerLoginSchema,
  RoomNameSchema,
  SaveAdminRoomSettingsSchema,
  UpdatePlayerSchema,
} from "@/server/contracts";

describe("player tag contracts", () => {
  it("creates a room without accepting a starting mission", () => {
    expect(
      CreateRoomSchema.parse({
        name: "Europa",
        editionKey: "planet-nine",
      }),
    ).toEqual({ name: "Europa", editionKey: "planet-nine" });
    expect(() =>
      CreateRoomSchema.parse({
        name: "Europa",
        editionKey: "planet-nine",
        missionKey: "planet-nine:1",
      }),
    ).toThrow();
  });

  it("accepts an explicitly unset mission in room settings", () => {
    expect(
      SaveAdminRoomSettingsSchema.parse({
        editionKey: "planet-nine",
        missionKey: null,
        players: Array.from({ length: 5 }, (_, index) => ({
          displayName: "",
          seat: index + 1,
        })),
      }).missionKey,
    ).toBeNull();
  });

  it("accepts configured tags and removes duplicates", () => {
    expect(
      UpdatePlayerSchema.parse({
        tags: ["bug", "bug", "always-red"],
      }).tags,
    ).toEqual(["bug", "always-red"]);
  });

  it("defaults new players to no tags", () => {
    expect(AddPlayerSchema.parse({ displayName: "Ada" })).toMatchObject({
      tags: [],
    });
  });

  it("accepts only constrained room and player names", () => {
    expect(
      PlayerLoginSchema.parse({
        roomName: "Planet_9",
        playerName: "Ada-L",
      }),
    ).toEqual({ roomName: "Planet_9", playerName: "Ada-L" });
    expect(() => RoomNameSchema.parse("Planet Nine")).toThrow();
    expect(() =>
      PlayerLoginSchema.parse({
        roomName: "Planet_9",
        playerName: "Ada Lovelace",
      }),
    ).toThrow();
  });

  it("rejects retired player color fields", () => {
    expect(() =>
      AddPlayerSchema.parse({ displayName: "Ada", color: "indigo" }),
    ).toThrow();
    expect(() =>
      UpdatePlayerSchema.parse({ tags: [], color: "orange" }),
    ).toThrow();
    expect(() =>
      SaveAdminRoomSettingsSchema.parse({
        editionKey: "planet-nine",
        missionKey: "planet-nine-1",
        players: [
          { displayName: "Ada", color: "indigo", seat: 1 },
          { displayName: "", seat: 2 },
          { displayName: "", seat: 3 },
          { displayName: "", seat: 4 },
          { displayName: "", seat: 5 },
        ],
      }),
    ).toThrow();
  });

  it("accepts player shuffling with explicit reset confirmation", () => {
    expect(
      AdminRoomActionSchema.parse({ type: "shuffle", confirmReset: true }),
    ).toEqual({ type: "shuffle", confirmReset: true });
    expect(AdminRoomActionSchema.parse({ type: "return-to-preflight" })).toEqual({
      type: "return-to-preflight",
      confirmReset: false,
    });
  });

  it("accepts five admin slots and infers active players from names", () => {
    const settings = SaveAdminRoomSettingsSchema.parse({
      editionKey: "planet-nine",
      missionKey: "planet-nine-1",
      attemptNumber: 3,
      players: [
        {
          id: "00000000-0000-4000-8000-000000000001",
          displayName: "Ada",
          tags: ["bug"],
          seat: 1,
        },
        {
          displayName: "Grace",
          tags: [],
          seat: 2,
        },
        ...Array.from({ length: 3 }, (_, index) => ({
          displayName: "",
          tags: [],
          seat: index + 3,
        })),
      ],
    });

    expect(settings.players.filter((player) => player.displayName)).toHaveLength(2);
    expect(settings.attemptNumber).toBe(3);
    expect(settings.players[2]).toMatchObject({ displayName: "", seat: 3 });
  });

  it("accepts only positive integer attempt counters", () => {
    const baseSettings = {
      editionKey: "planet-nine" as const,
      missionKey: "planet-nine-1",
      players: [
        { displayName: "Ada", seat: 1 },
        { displayName: "", seat: 2 },
        { displayName: "", seat: 3 },
        { displayName: "", seat: 4 },
        { displayName: "", seat: 5 },
      ],
    };

    expect(
      SaveAdminRoomSettingsSchema.parse({
        ...baseSettings,
        attemptNumber: 7,
      }).attemptNumber,
    ).toBe(7);
    expect(() =>
      SaveAdminRoomSettingsSchema.parse({
        ...baseSettings,
        attemptNumber: 0,
      }),
    ).toThrow();
    expect(() =>
      SaveAdminRoomSettingsSchema.parse({
        ...baseSettings,
        attemptNumber: 1.5,
      }),
    ).toThrow();
  });

  it("rejects duplicate names in admin player slots", () => {
    expect(() =>
      SaveAdminRoomSettingsSchema.parse({
        editionKey: "planet-nine",
        missionKey: "planet-nine-1",
        players: [
          { displayName: "Ada", seat: 1 },
          { displayName: "ADA", seat: 2 },
          { displayName: "", seat: 3 },
          { displayName: "", seat: 4 },
          { displayName: "", seat: 5 },
        ],
      }),
    ).toThrow();
  });

  it("requires each admin slot to use a unique seat", () => {
    expect(() =>
      SaveAdminRoomSettingsSchema.parse({
        editionKey: "planet-nine",
        missionKey: "planet-nine-1",
        players: [
          { displayName: "Ada", seat: 1 },
          { displayName: "", seat: 1 },
          { displayName: "", seat: 3 },
          { displayName: "", seat: 4 },
          { displayName: "", seat: 5 },
        ],
      }),
    ).toThrow();
  });

  it("rejects tags outside the configured enum", () => {
    expect(() => UpdatePlayerSchema.parse({ tags: ["glitch"] })).toThrow();
    expect(() => UpdatePlayerSchema.parse({ tags: ["  "] })).toThrow();
    expect(() =>
      UpdatePlayerSchema.parse({ tags: ["x".repeat(33)] }),
    ).toThrow();
    expect(() =>
      UpdatePlayerSchema.parse({ tags: ["featured"] }),
    ).toThrow();
  });
});
