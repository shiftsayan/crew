export const ROOM_NAME_PATTERN = /^[A-Za-z0-9_-]{2,32}$/;
export const PLAYER_NAME_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

export function normalizeLoginName(value: string) {
  return value.trim();
}
