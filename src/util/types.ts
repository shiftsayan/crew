import { Communication, Status, Suite, ToastStyle, ViewName } from "./enums";
import { PhaseName } from "./mechanics/phase";

export type CrewCardType = {
  num: number;
  suite: string;
};

export type CrewStateType = {
  player: string;
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
  maxTricks?: number;
  mission?: {
    version?: number;
    num?: number;
    attempt?: number;
  };
  numPlayers?: number;
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
  leadingTrick?: { [player: string]: CrewCardType };
  leadingSuite?: Suite | string;
  playedCards?: CrewCardType[];
  advancePhase?: boolean;
};
