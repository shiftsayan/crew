import {
  Communication,
  GoldenBorder,
  Status,
  Suite,
  ToastStyle,
  ViewName,
} from "./enums";
import { PhaseName } from "./mechanics/phase";

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
  max_tricks?: number;
  mission?: {
    version?: number;
    num?: number;
    attempt?: number;
  };
  num_players?: number;
  phase?: PhaseName;
  players?: {
    [player: string]: {
      communication?: {
        card?: CrewCardType;
        qualifier: Communication;
      };
      hand?: CrewCardType[];
      tricks_won?: number;
      goals?: number[];
    };
  };
  leading_trick?: { [player: string]: CrewCardType };
  leading_suite?: Suite | string;
  played_cards?: CrewCardType[];
  advance_phase?: boolean;
};
