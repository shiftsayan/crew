import { Communication, Condition, Status } from "../enums";
import { cards, suitTrump } from "../game";
import { deepSeaGoals } from "../game/deepSeaGoals";
import { missions } from "../game/missions";
import { shuffle } from "../random";
import { CrewGameType, CrewStateType } from "../types";
import {
  AgentAll,
  AgentAuto,
  AgentBase,
  AgentCommander,
  AgentCurrent,
  AgentNone,
  AgentWinner,
} from "./agent";
import { sortHand } from "./util";

export enum PhaseName {
  Preflight = "Preflight",
  DealCards = "DealCards",
  ChooseGoals = "ChooseGoals",
  DealGoals = "DealGoals",
  Communicate = "Communicate",
  PlayTrick = "PlayTrick",
  EndGame = "EndGame",
}

export abstract class Phase {
  static starter: typeof AgentBase;
  static agency: { [phase: string]: typeof AgentBase };

  static onStart(
    state: CrewStateType,
    game: CrewGameType
  ): Partial<CrewGameType> {
    return {};
  }

  static ended(state: CrewStateType, game: CrewGameType): boolean {
    return false;
  }

  static onEnd(
    state: CrewStateType,
    game: CrewGameType
  ): Partial<CrewGameType> {
    return {};
  }

  static next(state: CrewStateType, game: CrewGameType): PhaseName {
    return null;
  }
}

export class Preflight extends Phase {
  static starter = AgentNone;
  static agency = {
    Join: AgentAll,
  };

  static onEnd(
    state: CrewStateType,
    game: CrewGameType
  ): Partial<CrewGameType> {
    const names = Object.keys(game.active);

    const players = {};
    for (const name of names) {
      players[name] = {
        communication: {
          qualifier: Communication.NotCommunicated,
          card: null,
        },
        hand: [],
        goals: [],
        tricksWon: 0,
      };
    }

    return {
      players: players,
      goals: [],
      playedCards: [],
      tricks: [],
      leadingTrick: {},
      leadingSuite: null,
      leadingWinner: null,
      commander: null,
      condition: Condition.InProgress,
      maxTricks: Math.floor(cards.length / names.length),
    };
  }

  static ended(state: CrewStateType, game: CrewGameType): boolean {
    // all players are active
    const names = Object.keys(game.active);
    return names.reduce((res, key) => res && game.active[key], true);
  }

  static next(state: CrewStateType, game: CrewGameType): PhaseName {
    return PhaseName.DealCards;
  }
}

export class DealCards extends Phase {
  static starter = AgentAuto;
  static agency = {};

  static onStart(
    state: CrewStateType,
    game: CrewGameType
  ): Partial<CrewGameType> {
    const names = Object.keys(game.active);
    const players = game.players;

    const allCards = shuffle([...cards]);
    let commander = null;
    let idx = 0;
    while (allCards.length !== 0) {
      let card = allCards.pop();
      if (card.suite === suitTrump && card.num === 4) {
        commander = game.seating.indexOf(names[idx]);
      }
      players[names[idx]].hand.push(card);
      idx = (idx + 1) % names.length;
    }

    // Sort Hands
    for (let name of names) {
      sortHand(players[name].hand);
    }

    return {
      players: players,
      commander: commander,
    };
  }

  static ended(state: CrewStateType, game: CrewGameType): boolean {
    return true;
  }

  static next(state: CrewStateType, game: CrewGameType): PhaseName {
    return PhaseName.DealGoals;
  }
}

export class DealGoals extends Phase {
  static starter = AgentAuto;
  static agency = {};

  static ended(state: CrewStateType, game: CrewGameType): boolean {
    return true;
  }

  static next(state: CrewStateType, game: CrewGameType): PhaseName {
    return PhaseName.ChooseGoals;
  }

  static onStart(
    state: CrewStateType,
    game: CrewGameType
  ): Partial<CrewGameType> {
    const missionData = missions[game.mission.version][game.mission.num];

    const goals = [];
    if (game.mission.version === "planetX") {
      //   const allGoals = shuffle([...cards]);
      //   let count = 0;
      //   while (count !== missionData.numGoals) {
      //     let goal = allGoals.pop();
      //     if (goal.suite !== suitTrump) {
      //       goals.push({
      //         ...goal,
      //         order:
      //           !missionData.orders || count >= missionData.orders.length
      //             ? Order.None
      //             : missionData.orders[count],
      //         status: Status.NotChosen,
      //       });
      //       count++;
      //     }
      //   }
    } else if (game.mission.version === "deepSea") {
      const allGoals = shuffle([...deepSeaGoals]);
      let totalDifficulty = 0;
      while (allGoals.length && totalDifficulty !== missionData.maxDifficulty) {
        const goal = allGoals.pop();
        if (totalDifficulty + goal.difficulty[2] <= missionData.maxDifficulty) {
          goals.push({
            ...goal,
            status: Status.NotChosen,
          });
          totalDifficulty += goal.difficulty[2];
        }
      }
    } else {
      throw new Error("Invalid mission version");
    }

    return {
      goals: goals,
    };
  }
}

export class ChooseGoals extends Phase {
  static starter = AgentCommander;
  static agency = {
    Toggle: AgentAll,
    Join: AgentAll,
    Mark: AgentAll,
    CTA: AgentCommander,
  };

  static ended(state: CrewStateType, game: CrewGameType): boolean {
    return game.advancePhase;
  }

  static onEnd(
    state: CrewStateType,
    game: CrewGameType
  ): Partial<CrewGameType> {
    return {
      advancePhase: false,
    };
  }

  static next(state: CrewStateType, game: CrewGameType): PhaseName {
    return PhaseName.Communicate;
  }
}

export class Communicate extends Phase {
  static starter = AgentWinner;
  static agency = {
    Play: AgentAll,
    Qualify: AgentAll,
    CTA: AgentWinner,
    StartTrick: AgentCurrent,
    Join: AgentAll,
    Mark: AgentAll,
  };

  static ended(state: CrewStateType, game: CrewGameType): boolean {
    return game.advancePhase;
  }

  static onEnd(
    state: CrewStateType,
    game: CrewGameType
  ): Partial<CrewGameType> {
    return {
      advancePhase: false,
    };
  }

  static next(state: CrewStateType, game: CrewGameType): PhaseName {
    return PhaseName.PlayTrick;
  }
}

export class PlayTrick extends Phase {
  static starter = AgentCurrent;
  static agency = {
    Play: AgentCurrent,
    Join: AgentAll,
    Mark: AgentAll,
  };

  static ended(state: CrewStateType, game: CrewGameType): boolean {
    const names = Object.keys(game.active);
    return (
      game.leadingTrick &&
      names.every((name) => game.leadingTrick[name] !== undefined)
    );
  }

  static onEnd(state: any, game: any): {} {
    const leadingTrick = { ...game.leadingTrick };
    const leadingSuite = game.leadingSuite;

    // Decide winner
    let winner = undefined;
    let winnerNum = Number.NEGATIVE_INFINITY;
    let winnerSuite = leadingSuite;
    for (let player in game.leadingTrick) {
      const card = game.leadingTrick[player];
      if (
        (card.suite === winnerSuite && card.num > winnerNum) ||
        (card.suite !== winnerSuite && card.suite === suitTrump)
      ) {
        winner = player;
        winnerNum = card.num;
        winnerSuite = card.suite;
      }
    }

    const tricks = game.tricks ?? [];
    tricks.push(leadingTrick);

    const goals = [...game.goals];
    const missionData = missions[game.mission.version][game.mission.num];
    const condition = missionData.check(state, game);

    return {
      goals,
      leadingTrick: [],
      leadingSuite: null,
      leadingWinner: winner,
      tricks,
      condition: condition,
      players: {
        [winner]: {
          tricksWon: game.players[winner].tricksWon + 1,
        },
      },
    };
  }

  static next(state: CrewStateType, game: CrewGameType): PhaseName {
    if (game.tricks.length === game.maxTricks) return PhaseName.EndGame;
    return game.condition === Condition.InProgress
      ? PhaseName.Communicate
      : PhaseName.EndGame;
  }
}

export class EndGame extends Phase {
  static starter = AgentAll;
  static agency = {
    CTA: AgentAll,
    Join: AgentAll,
    Mark: AgentAll,
  };

  static ended(state: CrewStateType, game: CrewGameType): boolean {
    return game.advancePhase;
  }

  static onEnd(
    state: CrewStateType,
    game: CrewGameType
  ): Partial<CrewGameType> {
    if (game.condition === Condition.Lost) {
      return {
        advancePhase: false,
        mission: {
          attempt: game.mission.attempt + 1,
        },
      };
    } else if (game.condition === Condition.Won) {
      return {
        advancePhase: false,
        mission: {
          num: game.mission.num + 1,
          attempt: 1,
        },
      };
    }
  }

  static next(state: CrewStateType, game: CrewGameType): PhaseName {
    return PhaseName.Preflight;
  }
}

export const mapPhaseNameToPhase: Record<PhaseName, typeof Phase> = {
  [PhaseName.Preflight]: Preflight,
  [PhaseName.DealCards]: DealCards,
  [PhaseName.DealGoals]: DealGoals,
  [PhaseName.ChooseGoals]: ChooseGoals,
  [PhaseName.Communicate]: Communicate,
  [PhaseName.PlayTrick]: PlayTrick,
  [PhaseName.EndGame]: EndGame,
};
