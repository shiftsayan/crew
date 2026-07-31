import { randomInt } from "node:crypto";

const PLAYER_KEY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PLAYER_KEY_LENGTH = 6;

export const PLAYER_KEY_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;
export const ROOM_KEY_PATTERN = PLAYER_KEY_PATTERN;

export function normalizePlayerKey(key: string): string {
  return key.trim().toUpperCase();
}

export function generatePlayerKey(): string {
  let key = "";
  for (let index = 0; index < PLAYER_KEY_LENGTH; index += 1) {
    key += PLAYER_KEY_ALPHABET[randomInt(PLAYER_KEY_ALPHABET.length)];
  }
  return key;
}

export const generateRoomKey = generatePlayerKey;
export const normalizeRoomKey = normalizePlayerKey;
