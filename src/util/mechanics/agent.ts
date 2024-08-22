import { CrewGameType } from "../types";

export abstract class AgentBase {
  static check(player: string, game: CrewGameType): boolean {
    return false;
  }

  static get(game: CrewGameType): number {
    return game.current;
  }

  static next(game: CrewGameType): number {
    return game.current;
  }
}

export class AgentNone extends AgentBase {
  static check(player: string, game: CrewGameType): boolean {
    return false;
  }
}

export class AgentAuto extends AgentBase {
  static check(player: string, game: CrewGameType): boolean {
    return false;
  }
}

export class AgentAll extends AgentBase {
  static check(player: string, game: CrewGameType): boolean {
    return true;
  }
}

export class AgentCurrent extends AgentBase {
  static check(player: string, game: CrewGameType): boolean {
    return game.seating && player === game.seating[game.current];
  }

  static next(game: CrewGameType): number {
    return (game.current + 1) % game.numPlayers;
  }
}

export class AgentOther extends AgentBase {
  static check(player: string, game: CrewGameType): boolean {
    return game.seating && player !== game.seating[game.current];
  }
}

export class AgentWinner extends AgentBase {
  static check(player: string, game: CrewGameType): boolean {
    return game.seating && player === game.seating[AgentWinner.get(game)];
  }

  static get(game: CrewGameType): number {
    if (game.leadingWinner) return game.seating.indexOf(game.leadingWinner);
    else {
      return game.commander;
    }
  }
}

export class AgentCommander extends AgentBase {
  static check(player: string, game: CrewGameType): boolean {
    return game.seating && player === game.seating[AgentCommander.get(game)];
  }

  static get(game: CrewGameType): number {
    return game.commander;
  }
}
