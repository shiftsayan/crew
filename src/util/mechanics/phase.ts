// import { Play } from "../actions/play";

import {
  Communication,
  Condition,
  GoldenBorder,
  Order,
  Status,
} from "../enums";
import { CARDS, SUIT_TRUMP } from "../game";
import { missions } from "../game/missions";
import { shuffle } from "../random";
import {
  AgentAll,
  AgentAuto,
  AgentCommander,
  AgentCurrent,
  AgentNone,
  AgentWinner,
} from "./agent";
import { sortHand } from "./util";

export enum PhaseName {
  None = "",
  Lobby = "Lobby",
  Preflight = "Preflight",
  DealCards = "DealCards",
  ChooseGoals = "ChooseGoals",
  DealGoals = "DealGoals",
  GoldenBorderDiscard = "GoldenBorderDiscard",
  GoldenBorderAccept = "GoldenBorderAccept",
  Communicate = "Communicate",
  PlayTrick = "PlayTrick",
  EndGame = "EndGame",
}

export abstract class Phase {
  static starter;
  static agency;

  static ended(state, game) {
    return false;
  }

  static next(state, game) {}

  static onStart(state, game) {
    return {};
  }

  static onEnd(state, game) {
    return {};
  }
}

export class Preflight extends Phase {
  static starter = AgentNone;
  static agency = {
    Join: AgentAll,
  };

  static ended(state, game) {
    // all players are active
    const names = Object.keys(game.active);
    return names.reduce((res, key) => res && game.active[key], true);
  }

  static next(state, game) {
    return DealCards;
  }

  static onEnd(state, game) {
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
      played_cards: [],
      tricks: [],
      leading_trick: {},
      leading_suite: null,
      leading_winner: null,
      commander: null,
      condition: Condition.InProgress,
      max_tricks: Math.floor(CARDS.length / names.length),
    };
  }
}

export class DealCards extends Phase {
  static starter = AgentAuto;
  static agency = {};

  static ended(state, game) {
    return true;
  }

  static next(state, game) {
    return DealGoals;
  }

  static onStart(state, game) {
    const names = Object.keys(game.active);
    const players = game.players;

    const all_cards = shuffle([...CARDS]);
    let commander = null;
    let idx = 0;
    while (all_cards.length !== 0) {
      let card = all_cards.pop();
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
}

export class DealGoals extends Phase {
  static starter = AgentAuto;
  static agency = {};

  static ended(state, game) {
    return true;
  }

  static next(state, game) {
    return ChooseGoals;
  }

  static onStart(state, game) {
    const mission_data = missions[game.mission.version][game.mission.num];

    const all_goals = shuffle([...CARDS]);
    const goals = [];
    let count = 0;
    while (count !== mission_data.num_goals) {
      let goal = all_goals.pop();
      if (goal.suite !== SUIT_TRUMP) {
        goals.push({
          ...goal,
          order:
            !mission_data.orders || count >= mission_data.orders.length
              ? Order.None
              : mission_data.orders[count],
          status: Status.NotChosen,
        });
        count++;
      }
    }

    return {
      goals: goals,
    };
  }
}

export class ChooseGoals extends Phase {
  static starter = AgentCommander;
  static agency = {
    Toggle: AgentCurrent,
  };

  static ended(state, game) {
    return game.goals.every((goal) => goal.player !== undefined);
  }

  static next(state, game) {
    return GoldenBorderDiscard;
  }
}

export class GoldenBorderDiscard extends Phase {
  static starter = AgentAll;
  static agency = {
    Toggle: AgentAll,
    CTA: AgentCommander,
  };

  static ended(state, game) {
    return (
      game.advance_phase ||
      [GoldenBorder.NotAvailable, GoldenBorder.Using].includes(
        game.golden_border
      )
    );
  }

  static next(state, game) {
    return GoldenBorderAccept;
  }
}

export class GoldenBorderAccept extends Phase {
  static starter = AgentAll;
  static agency = {
    Toggle: AgentAll,
  };

  static ended(state, game) {
    return (
      game.advance_phase ||
      [
        GoldenBorder.NotAvailable,
        GoldenBorder.Skipped,
        GoldenBorder.Used,
      ].includes(game.golden_border)
    );
  }

  static next(state, game) {
    return Communicate;
  }

  static onEnd(state, game) {
    return {
      advance_phase: false,
    };
  }
}

export class Communicate extends Phase {
  static starter = AgentWinner;
  static agency = {
    Play: AgentAll,
    Qualify: AgentAll,
    CTA: AgentWinner,
    StartTrick: AgentCurrent,
  };

  static ended(state: any, game: any): boolean {
    const names = Object.keys(game.active);
    const someone_communicating = names.some(
      (name) =>
        game.players[name].communication.qualifier ===
        Communication.Communicating
    );
    return game.advance_phase && !someone_communicating;
  }

  static onEnd(state: any, game: any): {} {
    return {
      advance_phase: false,
    };
  }

  static next(state, game) {
    return PlayTrick;
  }
}

export class PlayTrick extends Phase {
  static starter = AgentCurrent;
  static agency = {
    Play: AgentCurrent,
  };

  static ended(state: any, game: any): boolean {
    const names = Object.keys(game.active);
    return (
      game.leading_trick &&
      names.every((name) => game.leading_trick[name] !== undefined)
    );
  }

  static next(state, game) {
    return game.condition === Condition.InProgress ? Communicate : EndGame;
  }

  static onEnd(state: any, game: any): {} {
    const leading_trick = { ...game.leading_trick };
    const leading_suite = game.leading_suite;

    // Decide winner
    let winner = undefined;
    let winner_num = Number.NEGATIVE_INFINITY;
    let winner_suite = leading_suite;
    for (let player in game.leading_trick) {
      const card = game.leading_trick[player];
      if (
        (card.suite === winner_suite && card.num > winner_num) ||
        (card.suite !== winner_suite && card.suite === SUIT_TRUMP)
      ) {
        winner = player;
        winner_num = card.num;
        winner_suite = card.suite;
      }
    }

    const tricks = game.tricks ?? [];
    tricks.push(leading_trick);

    const goals = [...game.goals];
    const mission_data = missions[game.mission.version][game.mission.num];
    const condition = mission_data.check(
      winner,
      goals,
      leading_trick,
      tricks,
      game.max_tricks
    );

    return {
      goals,
      leading_trick: [],
      leading_suite: null,
      leading_winner: winner,
      tricks,
      condition: condition,
      players: {
        [winner]: {
          tricks_won: game.players[winner].tricks_won + 1,
        },
      },
    };
  }
}

export class EndGame extends Phase {
  static starter = AgentAll;
  static agency = {
    CTA: AgentAll,
  };

  static ended(state, game) {
    return game.advance_phase;
  }

  static onEnd(state, game) {
    if (game.condition === Condition.Lost) {
      return {
        advance_phase: false,
        mission: {
          attempt: game.mission.attempt + 1,
        },
      };
    } else if (game.condition === Condition.Won) {
      return {
        advance_phase: false,
        mission: {
          num: game.mission.num + 1,
          attempt: 1,
        },
      };
    }
  }

  static next(state, game) {
    return Preflight;
  }
}

export const mapPhaseNameToPhase = {
  [PhaseName.Preflight]: Preflight,
  [PhaseName.DealCards]: DealCards,
  [PhaseName.DealGoals]: DealGoals,
  [PhaseName.ChooseGoals]: ChooseGoals,
  [PhaseName.GoldenBorderDiscard]: GoldenBorderDiscard,
  [PhaseName.GoldenBorderAccept]: GoldenBorderAccept,
  [PhaseName.Communicate]: Communicate,
  [PhaseName.PlayTrick]: PlayTrick,
  [PhaseName.EndGame]: EndGame,
};
