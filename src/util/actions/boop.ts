import { CrewGameType } from "../types";
import { Move } from "./move";

export class BoopMove extends Move<[string, boolean]> {
  name = "Boop";

  async validateParams(player: string, boop: boolean): Promise<string | void> {
    return;
  }

  updateGame(player: string, boop: boolean): Partial<CrewGameType> {
    return {
      players: {
        [player]: {
          boop: boop,
        },
      },
    };
  }
}
