import { Communication, Condition, Status } from "../enums";
import { CARDS, SUIT_TRUMP } from "../game";
import { DEEP_SEA_GOALS } from "../game/deep_sea_goals";
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
        tricks_won: 0,
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
      maxTricks: Math.floor(CARDS.length / names.length),
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

    const allCards = shuffle([...CARDS]);
    let commander = null;
    let idx = 0;
    while (allCards.length !== 0) {
      let card = allCards.pop();
      if (card.suite === SUIT_TRUMP && card.num === 4) {
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
    const mission_data = missions[game.mission.version][game.mission.num];

    const goals = [];
    if (game.mission.version === "planet_x") {
      //   const all_goals = shuffle([...CARDS]);
      //   let count = 0;
      //   while (count !== mission_data.num_goals) {
      //     let goal = all_goals.pop();
      //     if (goal.suite !== SUIT_TRUMP) {
      //       goals.push({
      //         ...goal,
      //         order:
      //           !mission_data.orders || count >= mission_data.orders.length
      //             ? Order.None
      //             : mission_data.orders[count],
      //         status: Status.NotChosen,
      //       });
      //       count++;
      //     }
      //   }
    } else if (game.mission.version === "deep_sea") {
      const all_goals = shuffle([...DEEP_SEA_GOALS]);
      let total_difficulty = 0;
      while (
        all_goals.length &&
        total_difficulty !== mission_data.max_difficulty
      ) {
        const goal = all_goals.pop();
        if (
          total_difficulty + goal.difficulty[2] <=
          mission_data.max_difficulty
        ) {
          goals.push({
            ...goal,
            status: Status.NotChosen,
          });
          total_difficulty += goal.difficulty[2];
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
        (card.suite !== winnerSuite && card.suite === SUIT_TRUMP)
      ) {
        winner = player;
        winnerNum = card.num;
        winnerSuite = card.suite;
      }
    }

    const tricks = game.tricks ?? [];
    tricks.push(leadingTrick);

    const goals = [...game.goals];
    const mission_data = missions[game.mission.version][game.mission.num];
    const condition = mission_data.check(state, game);

    return {
      goals,
      leadingTrick: [],
      leadingSuite: null,
      leadingWinner: winner,
      tricks,
      condition: condition,
      players: {
        [winner]: {
          tricks_won: game.players[winner].tricks_won + 1,
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
