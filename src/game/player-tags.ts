export enum PlayerTag {
  Bug = "bug",
  AlwaysRed = "always-red",
}

export const PLAYER_TAGS = [PlayerTag.Bug, PlayerTag.AlwaysRed] as const;
