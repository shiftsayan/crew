import type { Suit } from "../contracts";

export type DeepSeaTaskVisualItem = {
  value?: number | string;
  suit?: Suit;
  text?: string;
};

export type DeepSeaTaskVisual =
  | { kind: "text"; text: string }
  | { kind: "header"; header: string; items: readonly DeepSeaTaskVisualItem[] }
  | { kind: "cards"; cards: readonly DeepSeaTaskVisualItem[] };

// This is the compact visual language used by the legacy Mission Deep Sea
// tiles. Keep it separate from the full accessible mission copy.
export const DEEP_SEA_TASK_VISUALS = [
  { kind: "header", header: "WIN USING", items: [{ value: 5 }] },
  {
    kind: "header",
    header: "WIN =1x",
    items: [{ suit: "green" }, { suit: "pink" }],
  },
  {
    kind: "header",
    header: "WIN MORE",
    items: [{ suit: "pink" }, { text: ">" }, { suit: "green" }],
  },
  { kind: "text", text: "Win =X tricks (public)" },
  { kind: "header", header: "WIN USING", items: [{ value: 2 }] },
  { kind: "header", header: "WIN =0x", items: [{ value: 5 }] },
  { kind: "header", header: "WIN >1x", items: [{ value: 7 }] },
  { kind: "text", text: "Win first and second trick" },
  {
    kind: "cards",
    cards: [
      { value: 9, suit: "blue" },
      { value: 9, suit: "green" },
      { value: 9, suit: "pink" },
      { value: 9, suit: "yellow" },
    ],
  },
  {
    kind: "cards",
    cards: [
      { value: 9, suit: "pink" },
      { value: 8, suit: "yellow" },
    ],
  },
  { kind: "text", text: "Win more tricks than everyone else combined" },
  {
    kind: "cards",
    cards: [
      { value: 5, suit: "pink" },
      { value: 6, suit: "yellow" },
    ],
  },
  { kind: "text", text: "Win =X tricks (private)" },
  { kind: "text", text: "Win =1 trick" },
  {
    kind: "cards",
    cards: [
      { value: 5, suit: "green" },
      { value: 8, suit: "blue" },
    ],
  },
  { kind: "header", header: "WIN =3x", items: [{ value: 6 }] },
  { kind: "text", text: "Not open with Red or Green" },
  { kind: "text", text: "Not win any of the first 4 tricks" },
  { kind: "text", text: "Win a trick with only even cards" },
  {
    kind: "cards",
    cards: [
      { value: 7, suit: "yellow" },
      { value: 7, suit: "blue" },
    ],
  },
  { kind: "text", text: "Win equal #Red and #Yellow (>0)" },
  { kind: "text", text: "Win 2 tricks in a row" },
  {
    kind: "cards",
    cards: [
      { value: 3, suit: "blue" },
      { value: 3, suit: "pink" },
      { value: 3, suit: "yellow" },
      { value: 3, suit: "green" },
    ],
  },
  { kind: "text", text: "Win a trick with all cards >5" },
  { kind: "header", header: "WIN =1x", items: [{ suit: "pink" }] },
  {
    kind: "cards",
    cards: [
      { value: "0ˣ", suit: "yellow" },
      { value: "0ˣ", suit: "green" },
    ],
  },
  { kind: "header", header: "WIN USING", items: [{ value: 6 }] },
  { kind: "text", text: "Win fewer tricks than anyone else" },
  { kind: "text", text: "Not win 2 tricks in a row" },
  { kind: "header", header: "WIN USING", items: [{ value: 3 }] },
  { kind: "text", text: "Win =4 tricks" },
  { kind: "text", text: "Win =2 tricks and they will be in a row" },
  { kind: "text", text: "Win Green 2 in final trick" },
  {
    kind: "text",
    text: "Win a trick with value >{23,28,31}\n(no Trump)",
  },
  { kind: "text", text: "Not win any of the first 5 tricks" },
  { kind: "header", header: "WIN =0x", items: [{ suit: "pink" }] },
  { kind: "header", header: "WIN =3x", items: [{ suit: "trump" }] },
  {
    kind: "cards",
    cards: [
      { value: 3, suit: "green" },
      { value: 4, suit: "yellow" },
      { value: 5, suit: "yellow" },
    ],
  },
  { kind: "text", text: "Win only the last trick" },
  { kind: "text", text: "Win a trick with all cards <7\n(no Trump)" },
  {
    kind: "cards",
    cards: [
      { value: 1, suit: "blue" },
      { value: 2, suit: "blue" },
      { value: 3, suit: "blue" },
    ],
  },
  {
    kind: "text",
    text: "Win a trick with value <{8,12,16}\n(no Trump)",
  },
  { kind: "header", header: "WIN >2x", items: [{ value: 9 }] },
  {
    kind: "header",
    header: "WIN",
    items: [
      { value: 7, suit: "pink" },
      { text: "w" },
      { suit: "trump" },
    ],
  },
  {
    kind: "header",
    header: "WIN =0x",
    items: [{ suit: "pink" }, { suit: "blue" }],
  },
  { kind: "cards", cards: [{ value: 3, suit: "pink" }] },
  { kind: "header", header: "WIN >2x", items: [{ value: 5 }] },
  { kind: "header", header: "WIN =0x", items: [{ value: 1 }] },
  { kind: "text", text: "Win a trick with value 22/33\n(no Trump)" },
  {
    kind: "cards",
    cards: [
      { value: 8, suit: "pink" },
      { value: 5, suit: "blue" },
    ],
  },
  { kind: "text", text: "Win 0x tricks" },
  { kind: "text", text: "Win Trump 1 and no other Trump" },
  {
    kind: "header",
    header: "WIN",
    items: [
      { value: 9, suit: "green" },
      { text: "w" },
      { suit: "trump" },
    ],
  },
  { kind: "text", text: "Win fewer tricks than the commander" },
  { kind: "header", header: "WIN =2x", items: [{ suit: "blue" }] },
  { kind: "text", text: "Win the first trick" },
  { kind: "text", text: "Win the first and last trick" },
  { kind: "text", text: "Win =3 tricks and they will be in a row" },
  { kind: "text", text: "Win more tricks than anyone else" },
  { kind: "text", text: "Win more tricks than the commander" },
  { kind: "header", header: "WIN =2x", items: [{ suit: "green" }] },
  { kind: "text", text: "Win Trump 2 and no other Trump" },
  { kind: "header", header: "WIN =2x", items: [{ suit: "trump" }] },
  {
    kind: "header",
    header: "WIN MORE",
    items: [{ suit: "yellow" }, { text: ">" }, { suit: "blue" }],
  },
  {
    kind: "header",
    header: "WIN",
    items: [{ value: 6 }, { text: "w" }, { value: 6 }],
  },
  { kind: "cards", cards: [{ value: 3, suit: "trump" }] },
  { kind: "text", text: "Win equal #Red and #Blue in 1 trick (>0)" },
  { kind: "header", header: "WIN >6x", items: [{ suit: "yellow" }] },
  {
    kind: "header",
    header: "WIN",
    items: [{ value: 8 }, { text: "w" }, { value: 4 }],
  },
  { kind: "text", text: "Not win any 1, 2, or 3" },
  {
    kind: "header",
    header: "WIN =0x",
    items: [{ value: 8 }, { value: 9 }],
  },
  { kind: "text", text: "Win only the first trick" },
  { kind: "header", header: "WIN =0x", items: [{ suit: "green" }] },
  { kind: "cards", cards: [{ value: 1, suit: "yellow" }] },
  {
    kind: "cards",
    cards: [
      { value: 6, suit: "blue" },
      { value: 7, suit: "yellow" },
    ],
  },
  { kind: "header", header: "WIN >4x", items: [{ suit: "pink" }] },
  { kind: "text", text: "Not win any of the first 3 tricks" },
  {
    kind: "header",
    header: "WIN",
    items: [{ value: 5 }, { text: "w" }, { value: 7 }],
  },
  { kind: "text", text: "Win as many tricks as the commander" },
  { kind: "header", header: "WIN =0x", items: [{ suit: "yellow" }] },
  {
    kind: "text",
    text: "Win equal #Green and #Yellow in 1 trick (>0)",
  },
  { kind: "text", text: "Win the last trick" },
  { kind: "header", header: "WIN =0x", items: [{ value: 9 }] },
  { kind: "cards", cards: [{ value: 6, suit: "green" }] },
  { kind: "header", header: "WIN =2x", items: [{ value: 9 }] },
  {
    kind: "cards",
    cards: [
      { value: 1, suit: "pink" },
      { value: 7, suit: "green" },
    ],
  },
  { kind: "cards", cards: [{ value: 4, suit: "blue" }] },
  { kind: "header", header: "WIN =1x", items: [{ suit: "trump" }] },
  { kind: "text", text: "Not open with Yellow, Red, or Blue" },
  { kind: "header", header: "WIN =0x", items: [{ suit: "trump" }] },
  { kind: "text", text: "Win exactly 2 tricks" },
  { kind: "text", text: "Win all cards of 1+ color" },
  { kind: "text", text: "Win 1+ cards of all colors" },
  { kind: "text", text: "Win the first 3 tricks" },
  { kind: "text", text: "Win 3 tricks in a row" },
  { kind: "text", text: "Win a trick with only odd cards" },
] as const satisfies readonly DeepSeaTaskVisual[];
