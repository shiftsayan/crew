export abstract class AgentBase {
  static check(player, game): boolean {
    return false;
  }

  static get(game) {
    return game.current;
  }

  static next(game) {
    return game.current;
  }
}

export class AgentNone extends AgentBase {
  static check(player, game) {
    return false;
  }
}

export class AgentAuto extends AgentBase {
  static check(player, game) {
    return false;
  }
}

export class AgentAll extends AgentBase {
  static check(player, game) {
    return true;
  }
}

export class AgentCurrent extends AgentBase {
  static check(player, game) {
    return game.seating && player === game.seating[game.current];
  }

  static next(game) {
    return (game.current + 1) % game.num_players;
  }
}

export class AgentWinner extends AgentBase {
  static check(player, game) {
    return game.seating && player === game.seating[AgentWinner.get(game)];
  }

  static get(game) {
    if (game.leading_winner) return game.seating.indexOf(game.leading_winner);
    else {
      return game.commander;
    }
  }
}

export class AgentCommander extends AgentBase {
  static check(player, game) {
    return game.seating && player === game.seating[AgentCommander.get(game)];
  }

  static get(game) {
    return game.commander;
  }
}
