import { Suite } from "../enums";

export const deepSeaGoals = [
  {
    id: 1,
    mission: "I will win a trick using a 5",
    difficulty: [2, 3, 4],
    type: "header",
    data: {
      header: "WIN USING",
      cards: [{ num: 5 }],
    },
  },
  {
    id: 2,
    mission: "I will win exactly one Green and one Pink card",
    difficulty: [4, 4, 4],
    type: "header",
    data: {
      header: "WIN =1x",
      cards: [{ suite: Suite.Green }, { suite: Suite.Red }],
    },
  },
  {
    id: 3,
    mission: "I will win more Pink than Green cards",
    difficulty: [1, 1, 1],
    type: "header",
    data: {
      header: "WIN MORE",
      cards: [{ suite: Suite.Red }, { text: ">" }, { suite: Suite.Green }],
    },
  },
  {
    id: 4,
    mission: "I will win X tricks",
    difficulty: [3, 2, 2],
    type: "text",
    data: {
      text: "Win =X tricks (public)",
    },
  },
  {
    id: 5,
    mission: "I will win a trick using a 2",
    difficulty: [3, 4, 5],
    type: "header",
    data: {
      header: "WIN USING",
      cards: [{ num: 2 }],
    },
  },
  {
    id: 6,
    mission: "I will win no 5",
    difficulty: [1, 2, 2],
    type: "header",
    data: {
      header: "WIN =0x",
      cards: [{ num: 5 }],
    },
  },
  {
    id: 7,
    mission: "I will win at least two 7s",
    difficulty: [2, 2, 2],
    type: "header",
    data: {
      header: "WIN >1x",
      cards: [{ num: 7 }],
    },
  },
  {
    id: 8,
    mission: "I will win the first 2 tricks",
    difficulty: [1, 1, 2],
    type: "text",
    data: {
      text: "Win first and second trick",
    },
  },
  {
    id: 9,
    mission: "I will win all four 9s",
    difficulty: [4, 5, 6],
    type: "cards",
    data: {
      cards: [
        { num: 9, suite: Suite.Blue },
        { num: 9, suite: Suite.Green },
        { num: 9, suite: Suite.Red },
        { num: 9, suite: Suite.Yellow },
      ],
    },
  },
  {
    id: 10,
    mission: "I will win the Pink 9 and Yellow 8",
    difficulty: [2, 3, 3],
    type: "cards",
    data: {
      cards: [
        { num: 9, suite: Suite.Red },
        { num: 8, suite: Suite.Yellow },
      ],
    },
  },
  {
    id: 11,
    mission: "I will win more tricks than everyone else combined",
    difficulty: [3, 4, 5],
    type: "text",
    data: {
      text: "Win more tricks than everyone else combined",
    },
  },
  {
    id: 12,
    mission: "I will win the Pink 5 and Yellow 6",
    difficulty: [2, 2, 3],
    type: "cards",
    data: {
      cards: [
        { num: 5, suite: Suite.Red },
        { num: 6, suite: Suite.Yellow },
      ],
    },
  },
  {
    id: 13,
    mission: "I will win X tricks",
    difficulty: [4, 3, 3],
    type: "text",
    data: {
      text: "Win =X tricks (private)",
    },
  },
  {
    id: 14,
    mission: "I will win exactly one trick",
    difficulty: [3, 2, 2],
    type: "text",
    data: {
      text: "Win =1 trick",
    },
  },
  {
    id: 15,
    mission: "I will win the Green 5 and Blue 8",
    difficulty: [2, 2, 3],
    type: "cards",
    data: {
      cards: [
        { num: 5, suite: Suite.Green },
        { num: 8, suite: Suite.Blue },
      ],
    },
  },
  {
    id: 16,
    mission: "I will win exactly three 6s",
    difficulty: [3, 4, 4],
    type: "header",
    data: {
      header: "WIN =3x",
      cards: [{ num: 6 }],
    },
  },
  {
    id: 17,
    mission: "I will not open a trick with Pink or Green",
    difficulty: [2, 1, 1],
    type: "text",
    data: {
      text: "Not open with Red or Green",
    },
  },
  {
    id: 18,
    mission: "I will win none of the first four tricks",
    difficulty: [1, 2, 3],
    type: "text",
    data: {
      text: "Not win any of the first 4 tricks",
    },
  },
  {
    id: 19,
    mission: "I will win a trick that contains only even numbered cards",
    difficulty: [2, 5, 6],
    type: "text",
    data: {
      text: "Win a trick with only even cards",
    },
  },
  {
    id: 20,
    mission: "I will win the Yellow 7 and Blue 7",
    difficulty: [2, 3, 3],
    type: "cards",
    data: {
      cards: [
        { num: 7, suite: Suite.Yellow },
        { num: 7, suite: Suite.Blue },
      ],
    },
  },
  {
    id: 21,
    mission: "I will win as many Pink as Yellow cards",
    difficulty: [4, 4, 4],
    footnote: "0 pink/yellow cards is not allowed",
    type: "text",
    data: {
      text: "Win equal #Red and #Yellow (>0)",
    },
  },
  {
    id: 22,
    mission: "I will win 2 tricks in a row",
    difficulty: [1, 1, 1],
    type: "text",
    data: {
      text: "Win 2 tricks in a row",
    },
  },
  {
    id: 23,
    mission: "I will win the Blue 3, Pink 3, Yellow 3 and Green 3",
    difficulty: [3, 4, 5],
    type: "cards",
    data: {
      cards: [
        { num: 3, suite: Suite.Blue },
        { num: 3, suite: Suite.Red },
        { num: 3, suite: Suite.Yellow },
        { num: 3, suite: Suite.Green },
      ],
    },
  },
  {
    id: 24,
    mission:
      "I will win a trick of which the card values are all greater than 5",
    difficulty: [2, 3, 4],
    type: "text",
    data: {
      text: "Win a trick with all cards >5",
    },
  },
  {
    id: 25,
    mission: "I will win exactly one Pink",
    difficulty: [3, 3, 4],
    type: "header",
    data: {
      header: "WIN =1x",
      cards: [{ suite: Suite.Red }],
    },
  },
  {
    id: 26,
    mission: "I will win no Yellows or Greens",
    difficulty: [3, 3, 3],
    type: "cards",
    data: {
      cards: [
        { num: "0ˣ", suite: Suite.Yellow },
        { num: "0ˣ", suite: Suite.Green },
      ],
    },
  },
  {
    id: 27,
    mission: "I will win a trick using a 6",
    difficulty: [2, 3, 3],
    type: "header",
    data: {
      header: "WIN USING",
      cards: [{ num: 6 }],
    },
  },
  {
    id: 28,
    mission: "I will win fewer tricks than anyone else",
    difficulty: [2, 2, 3],
    type: "text",
    data: {
      text: "Win fewer tricks than anyone else",
    },
  },
  {
    id: 29,
    mission: "I will never win two tricks in a row",
    difficulty: [3, 2, 2],
    type: "text",
    data: {
      text: "Not win 2 tricks in a row",
    },
  },
  {
    id: 30,
    mission: "I will win a trick using a 3",
    difficulty: [3, 4, 5],
    type: "header",
    data: {
      header: "WIN USING",
      cards: [{ num: 3 }],
    },
  },
  {
    id: 31,
    mission: "I will win exactly four tricks",
    difficulty: [2, 3, 5],
    type: "text",
    data: {
      text: "Win =4 tricks",
    },
  },
  {
    id: 32,
    mission: "I will win exactly two tricks and they will be in a row",
    difficulty: [3, 3, 3],
    type: "text",
    data: {
      text: "Win =2 tricks and they will be in a row",
    },
  },
  {
    id: 33,
    mission: "I will win the Green 2 in the final trick of the game",
    difficulty: [3, 4, 5],
    type: "text",
    data: {
      text: "Win Green 2 in final trick",
    },
  },
  {
    id: 34,
    mission:
      "I will win a trick with total value greater than 23 (3p) / 28 (4p) / 31 (5p)",
    difficulty: [3, 3, 4],
    footnote: "Submarines are not allowed in the trick",
    type: "text",
    data: {
      text: "Win a trick with value >{23,28,31}\n(no Trump)",
    },
  },
  {
    id: 35,
    mission: "I will win none of the first five tricks",
    difficulty: [2, 3, 3],
    type: "text",
    data: {
      text: "Not win any of the first 5 tricks",
    },
  },
  {
    id: 36,
    mission: "I will win no Pinks",
    difficulty: [2, 2, 2],
    type: "header",
    data: {
      header: "WIN =0x",
      cards: [{ suite: Suite.Red }],
    },
  },
  {
    id: 37,
    mission: "I will win exactly three submarines",
    difficulty: [3, 4, 4],
    footnote:
      "If the submarine cards 1,2,3,4 are in one hand, re-deal the playing cards",
    type: "header",
    data: {
      header: "WIN =3x",
      cards: [{ suite: Suite.Black }],
    },
  },
  {
    id: 38,
    mission: "I will win the Green 3, Yellow 4, Yellow 5",
    difficulty: [3, 4, 4],
    type: "cards",
    data: {
      cards: [
        { num: 3, suite: Suite.Green },
        { num: 4, suite: Suite.Yellow },
        { num: 5, suite: Suite.Yellow },
      ],
    },
  },
  {
    id: 39,
    mission: "I will win only the last trick",
    difficulty: [4, 4, 4],
    type: "text",
    data: {
      text: "Win only the last trick",
    },
  },
  {
    id: 40,
    mission: "I will win a trick of which the card values are all less than 7",
    difficulty: [2, 3, 3],
    footnote: "Submarines are not allowed in this trick",
    type: "text",
    data: {
      text: "Win a trick with all cards <7\n(no Trump)",
    },
  },
  {
    id: 41,
    mission: "I will win the Blue 1, Blue 2 and Blue 3",
    difficulty: [2, 3, 3],
    type: "cards",
    data: {
      cards: [
        { num: 1, suite: Suite.Blue },
        { num: 2, suite: Suite.Blue },
        { num: 3, suite: Suite.Blue },
      ],
    },
  },
  {
    id: 42,
    mission:
      "I will win a trick with total value less than 8 (3p) / 12 (4p) / 16 (5p)",
    difficulty: [3, 3, 4],
    foonote: "Submarines are not allowed in this trick",
    type: "text",
    data: {
      text: "Win a trick with value <{8,12,16}\n(no Trump)",
    },
  },
  {
    id: 43,
    mission: "I will win at least three 9s",
    difficulty: [3, 4, 5],
    type: "header",
    data: {
      header: "WIN >2x",
      cards: [{ num: 9 }],
    },
  },
  {
    id: 44,
    mission: "I will win the Pink 7 with a submarine",
    difficulty: [3, 3, 3],
    type: "header",
    data: {
      header: "WIN",
      cards: [
        { num: 7, suite: Suite.Red },
        { text: "w" },
        { suite: Suite.Black },
      ],
    },
  },
  {
    id: 45,
    mission: "I will win no Pink or Blue cards",
    difficulty: [3, 3, 3],
    type: "header",
    data: {
      header: "WIN =0x",
      cards: [{ suite: Suite.Red }, { suite: Suite.Blue }],
    },
  },
  {
    id: 46,
    mission: "I will win the Pink 3",
    difficulty: [1, 1, 1],
    type: "cards",
    data: {
      cards: [{ num: 3, suite: Suite.Red }],
    },
  },
  {
    id: 47,
    mission: "I will win at least three 5s",
    difficulty: [3, 4, 5],
    type: "header",
    data: {
      header: "WIN >2x",
      cards: [{ num: 5 }],
    },
  },
  {
    id: 48,
    mission: "I will win no 1s",
    difficulty: [2, 2, 2],
    type: "header",
    data: {
      header: "WIN =0x",
      cards: [{ num: 1 }],
    },
  },
  {
    id: 49,
    mission: "I will win a trick with a total value of 22 or 33",
    difficulty: [3, 3, 4],
    foonotes: "Submarines are not allowed in this trick",
    type: "text",
    data: {
      text: "Win a trick with value 22/33\n(no Trump)",
    },
  },
  {
    id: 50,
    mission: "I will win the Pink 8 and Blue 5",
    difficulty: [2, 2, 3],
    type: "cards",
    data: {
      cards: [
        { num: 8, suite: Suite.Red },
        { num: 5, suite: Suite.Blue },
      ],
    },
  },
  {
    id: 51,
    mission: "I will win zero tricks",
    difficulty: [4, 3, 3],
    type: "text",
    data: {
      text: "Win 0x tricks",
    },
  },
  {
    id: 52,
    mission: "I will win the Submarine 1 and no other submarines",
    difficulty: [3, 3, 3],
    footnote:
      "If submarine cards 1 and 4 or 1,2,3 are in one hand, re-deal the playing cards",
    type: "text",
    data: {
      text: "Win Trump 1 and no other Trump",
    },
  },
  {
    id: 53,
    mission: "I will win the Green 9 with a submarine",
    difficulty: [3, 3, 3],
    type: "header",
    data: {
      header: "WIN",
      cards: [
        { num: 9, suite: Suite.Green },
        { text: "w" },
        { suite: Suite.Black },
      ],
    },
  },
  {
    id: 54,
    mission: "I will win fewer tricks than the commander",
    difficulty: [2, 2, 2],
    footnote: "I am not the commander",
    type: "text",
    data: {
      text: "Win fewer tricks than the commander",
    },
  },
  {
    id: 55,
    mission: "I will win exactly two Blues",
    difficulty: [3, 4, 4],
    type: "header",
    data: {
      header: "WIN =2x",
      cards: [{ suite: Suite.Blue }],
    },
  },
  {
    id: 56,
    mission: "I will win the first trick",
    difficulty: [1, 1, 1],
    type: "text",
    data: {
      text: "Win the first trick",
    },
  },
  {
    id: 57,
    mission: "I will win the first and the last trick",
    difficulty: [3, 4, 4],
    type: "text",
    data: {
      text: "Win the first and last trick",
    },
  },
  {
    id: 58,
    mission: "I will win exactly three tricks and they will be in a row",
    difficulty: [3, 3, 4],
    type: "text",
    data: {
      text: "Win =3 tricks and they will be in a row",
    },
  },
  {
    id: 59,
    mission: "I will win more tricks than anyone else",
    difficulty: [2, 3, 3],
    type: "text",
    data: {
      text: "Win more tricks than anyone else",
    },
  },
  {
    id: 60,
    mission: "I will win more tricks than the commander",
    difficulty: [2, 2, 3],
    footnote: "I am not the commander",
    type: "text",
    data: {
      text: "Win more tricks than the commander",
    },
  },
  {
    id: 61,
    mission: "I will win exactly two Greens",
    difficulty: [3, 4, 4],
    type: "header",
    data: {
      header: "WIN =2x",
      cards: [{ suite: Suite.Green }],
    },
  },
  {
    id: 62,
    mission: "I will win the Submarine 2 and no other submarine",
    difficulty: [3, 3, 3],
    footnote:
      "If submarine cards 2 and 4 or 1,2,3 are in one hand, re-deal the playing cards",
    type: "text",
    data: {
      text: "Win Trump 2 and no other Trump",
    },
  },
  {
    id: 63,
    mission: "I will win exactly two Submarines",
    difficulty: [3, 3, 4],
    footnote:
      "If submarine cards 2,3,4 are in one hand, re-deal the playing cards",
    type: "header",
    data: {
      header: "WIN =2x",
      cards: [{ suite: Suite.Black }],
    },
  },
  {
    id: 64,
    mission: "I will win more Yellow than Blue cards",
    difficulty: [1, 1, 1],
    footnote: "0 Blue cards is allowed",
    type: "header",
    data: {
      header: "WIN MORE",
      cards: [{ suite: Suite.Yellow }, { text: ">" }, { suite: Suite.Blue }],
    },
  },
  {
    id: 65,
    mission: "I will win a 6 with another 6",
    difficulty: [2, 3, 4],
    type: "header",
    data: {
      header: "WIN",
      cards: [{ num: 6 }, { text: "w" }, { num: 6 }],
    },
  },
  {
    id: 66,
    mission: "I will win the Submarine 3",
    difficulty: [1, 1, 1],
    type: "cards",
    data: {
      cards: [{ num: 3, suite: Suite.Black }],
    },
  },
  {
    id: 67,
    mission: "I will win as many Pink as Blue cards in one trick",
    difficulty: [2, 3, 3],
    footnote: "0 pink/blue cards is not allowed",
    type: "text",
    data: {
      text: "Win equal #Red and #Blue in 1 trick (>0)",
    },
  },
  {
    id: 68,
    mission: "I will win at least 7 Yellows",
    difficulty: [3, 3, 3],
    type: "header",
    data: {
      header: "WIN >6x",
      cards: [{ suite: Suite.Yellow }],
    },
  },
  {
    id: 69,
    mission: "I will win an 8 with a 4",
    difficulty: [3, 4, 5],
    type: "header",
    data: {
      header: "WIN",
      cards: [{ num: 8 }, { text: "w" }, { num: 4 }],
    },
  },
  {
    id: 70,
    mission: "I will win no 1s, 2s or 3s",
    difficulty: [3, 3, 3],
    type: "text",
    data: {
      text: "Not win any 1, 2, or 3",
    },
  },
  {
    id: 71,
    mission: "I will win no 8s or 9s",
    difficulty: [3, 3, 2],
    type: "header",
    data: {
      header: "WIN =0x",
      cards: [{ num: 8 }, { num: 9 }],
    },
  },
  {
    id: 72,
    mission: "I will win only the first trick",
    difficulty: [4, 3, 3],
    type: "text",
    data: {
      text: "Win only the first trick",
    },
  },
  {
    id: 73,
    mission: "I will win no Greens",
    difficulty: [2, 2, 2],
    type: "header",
    data: {
      header: "WIN =0x",
      cards: [{ suite: Suite.Green }],
    },
  },
  {
    id: 74,
    mission: "I will win the Yellow 1",
    difficulty: [1, 1, 1],
    type: "cards",
    data: {
      cards: [{ num: 1, suite: Suite.Yellow }],
    },
  },
  {
    id: 75,
    mission: "I will win the Blue 6 and Yellow 7",
    difficulty: [2, 2, 3],
    type: "cards",
    data: {
      cards: [
        { num: 6, suite: Suite.Blue },
        { num: 7, suite: Suite.Yellow },
      ],
    },
  },
  {
    id: 76,
    mission: "I will win at least 5 Pinks",
    difficulty: [2, 3, 3],
    type: "header",
    data: {
      header: "WIN >4x",
      cards: [{ suite: Suite.Red }],
    },
  },
  {
    id: 77,
    mission: "I will win none of the first three tricks",
    difficulty: [1, 2, 2],
    type: "text",
    data: {
      text: "Not win any of the first 3 tricks",
    },
  },
  {
    id: 78,
    mission: "I will win a 5 with a 7",
    difficulty: [1, 2, 2],
    type: "header",
    data: {
      header: "WIN",
      cards: [{ num: 5 }, { text: "w" }, { num: 7 }],
    },
  },
  {
    id: 79,
    mission: "I will win as many tricks as the commander",
    difficulty: [4, 3, 3],
    footnote: "I am not the commander",
    type: "text",
    data: {
      text: "Win as many tricks as the commander",
    },
  },
  {
    id: 80,
    mission: "I will win no Yellows",
    difficulty: [2, 2, 2],
    type: "header",
    data: {
      header: "WIN =0x",
      cards: [{ suite: Suite.Yellow }],
    },
  },
  {
    id: 81,
    mission: "I will win as many Green as Yellow cards in one trick",
    difficulty: [2, 3, 3],
    footnote: "0 Green/Yellow cards is not allowed",
    type: "text",
    data: {
      text: "Win equal #Green and #Yellow in 1 trick (>0)",
    },
  },
  {
    id: 82,
    mission: "I will win the last trick",
    difficulty: [2, 3, 3],
    type: "text",
    data: {
      text: "Win the last trick",
    },
  },
  {
    id: 83,
    mission: "I will win no 9s",
    difficulty: [1, 1, 1],
    type: "header",
    data: {
      header: "WIN =0x",
      cards: [{ num: 9 }],
    },
  },
  {
    id: 84,
    mission: "I will win the Green 6",
    difficulty: [1, 1, 1],
    type: "cards",
    data: {
      cards: [{ num: 6, suite: Suite.Green }],
    },
  },
  {
    id: 85,
    mission: "I will win exactly two 9s",
    difficulty: [2, 3, 3],
    type: "header",
    data: {
      header: "WIN =2x",
      cards: [{ num: 9 }],
    },
  },
  {
    id: 86,
    mission: "I will win the Pink 1 and Green 7",
    difficulty: [2, 2, 2],
    type: "cards",
    data: {
      cards: [
        { num: 1, suite: Suite.Red },
        { num: 7, suite: Suite.Green },
      ],
    },
  },
  {
    id: 87,
    mission: "I will win the Blue 4",
    difficulty: [1, 1, 1],
    type: "cards",
    data: {
      cards: [{ num: 4, suite: Suite.Blue }],
    },
  },
  {
    id: 88,
    mission: "I will win exactly one Submarine",
    difficulty: [3, 3, 3],
    footnote:
      "If submarine cards 1,2,3,4 are in one hand, re-deal the playing cards",
    type: "header",
    data: {
      header: "WIN =1x",
      cards: [{ suite: Suite.Black }],
    },
  },
  {
    id: 89,
    mission: "I will not open a trick with Yellow, Pink or Blue",
    difficulty: [4, 3, 3],
    type: "text",
    data: {
      text: "Not open with Yellow, Red, or Blue",
    },
  },
  {
    id: 90,
    mission: "I will win no Submarines",
    difficulty: [1, 1, 1],
    type: "header",
    data: {
      header: "WIN =0x",
      cards: [{ suite: Suite.Black }],
    },
  },
  {
    id: 91,
    mission: "I will win exactly two tricks",
    difficulty: [2, 2, 2],
    type: "text",
    data: {
      text: "Win exactly 2 tricks",
    },
  },
  {
    id: 92,
    mission: "I will win all the cards in at least one of the four colors",
    difficulty: [3, 4, 5],
    type: "text",
    data: {
      text: "Win all cards of 1+ color",
    },
  },
  {
    id: 93,
    mission: "I will win at least one card of each color",
    difficulty: [2, 3, 4],
    type: "text",
    data: {
      text: "Win 1+ cards of all colors",
    },
  },
  {
    id: 94,
    mission: "I will win the first three tricks",
    difficulty: [2, 3, 4],
    type: "text",
    data: {
      text: "Win the first 3 tricks",
    },
  },
  {
    id: 95,
    mission: "I will win three tricks in a row",
    difficulty: [2, 3, 4],
    type: "text",
    data: {
      text: "Win 3 tricks in a row",
    },
  },
  {
    id: 96,
    mission: "I will win a trick that contains only odd-numbered cards",
    difficulty: [2, 4, 5],
    type: "text",
    data: {
      text: "Win a trick with only odd cards",
    },
  },
];
