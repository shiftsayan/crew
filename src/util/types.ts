import {
  Communication,
  GoldenBorder,
  Status,
  ToastStyle,
  ViewName,
} from "./enums";

export type CrewCardType = {
  num: number;
  suite: string;
};

export type CrewStateType = {
  player: string;
  crew: string;
  view: ViewName;
  toast: {
    show: boolean;
    message?: string;
    style?: ToastStyle;
  };
};

export type CrewGameType = {
  active?: { [player: string]: boolean };
  seating?: string[];
  seatingTtl?: number;
  commander?: number;
  current?: number;
  goals?: {
    description: string;
    difficulty: number;
    id: number;
    player?: string;
    status: Status;
  }[];
  golden_border?: GoldenBorder;
  max_tricks?: number;
  mission?: {
    version: number;
    num: number;
    attempt: number;
  };
  num_players?: number;
  phase?: number;
  players?: {
    [player: string]: {
      communication: {
        card?: CrewCardType;
        qualifier: Communication;
      };
      hand: CrewCardType[];
      tricks_won: number;
    };
  };
};
