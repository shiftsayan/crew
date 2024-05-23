import { ref, update } from "@firebase/database";

import { crewName } from "../../config";
import { database } from "../../services/firebase";
import { ToastStyle } from "../enums";
import { mapPhaseNameToPhase } from "../mechanics/phase";
import { mergeUpdates } from "../random";
import { CrewGameType, CrewStateType } from "../types";

export abstract class Move<T extends any[]> {
  name = "Move";

  constructor(
    public state: CrewStateType,
    public setState: React.Dispatch<React.SetStateAction<CrewStateType>>,
    public game: CrewGameType,
    public setGame: React.Dispatch<React.SetStateAction<CrewGameType>>
  ) {
    this.state = state;
    this.setState = setState;
    this.game = game;
    this.setGame = setGame;
  }

  async validateParams(...params: T): Promise<string | void> {
    return;
  }

  async validateAgency(...params: T): Promise<string | void> {
    const phase = mapPhaseNameToPhase[this.game.phase];
    const agent = phase.agency[this.name];
    if (!agent || !agent.check(this.state.player, this.game)) {
      return "Invalid Agency";
    }
  }

  updateState(...params: T): Partial<CrewStateType> {
    return {};
  }

  updateGame(...params: T): Partial<CrewGameType> {
    return {};
  }

  updatePhase(...params: T): Partial<CrewGameType> {
    let phase = mapPhaseNameToPhase[this.game.phase];

    const updates: Partial<CrewGameType> = {
      current: phase.agency[this.name].next(this.game),
    };

    while (phase.ended(this.state, this.game)) {
      // end this phase
      const endUpdates = phase.onEnd(this.state, this.game);
      mergeUpdates(updates, endUpdates);
      mergeUpdates(this.game, endUpdates);
      // get next phase
      const newPhaseName = phase.next(this.state, this.game);
      phase = mapPhaseNameToPhase[newPhaseName];
      updates.phase = newPhaseName;
      updates.current = phase.starter.get(this.game);
      // start next phase
      const startUpdates = phase.onStart(this.state, this.game);
      mergeUpdates(updates, startUpdates);
      mergeUpdates(this.game, startUpdates);
    }

    return updates;
  }

  commitState(updates: Partial<CrewStateType>): void {
    return this.setState({
      ...this.state,
      ...updates,
    });
  }

  commitGame(updates: Partial<CrewGameType>): Promise<void> {
    // Make changes to this.game
    mergeUpdates(this.game, updates);
    // Make changes to Firebase
    const firebaseUpdates = toFirebaseNotation(updates, [crewName]);
    return update(ref(database), firebaseUpdates);
  }

  commitPhase(updates: Partial<CrewGameType>): Promise<void> {
    // Make changes to Firebase
    const firebaseUpdates = toFirebaseNotation(updates, [crewName]);
    return update(ref(database), firebaseUpdates);
  }

  async postRun(...params: T): Promise<void> {}

  async run(...params: T) {
    const agencyError = await this.validateAgency(...params);
    if (agencyError) {
      this.commitState({
        toast: {
          show: true,
          style: ToastStyle.Error,
          message: agencyError,
        },
      });
      return;
    }

    const paramsError = await this.validateParams(...params);
    if (paramsError) {
      this.commitState({
        toast: {
          show: true,
          style: ToastStyle.Error,
          message: paramsError,
        },
      });
      return;
    }

    const stateUpdates = this.updateState(...params);
    this.commitState(stateUpdates);
    const gameUpdates = this.updateGame(...params);
    this.commitGame(gameUpdates);
    const phaseUpdates = this.updatePhase(...params);
    this.commitPhase(phaseUpdates);

    this.postRun(...params);
  }
}

function toFirebaseNotation(data: any, prefix: string[]) {
  function walk(into: any, data: any, prefix = []) {
    Object.entries(data).forEach(([key, val]) => {
      if (val && typeof val === "object" && !Array.isArray(val))
        walk(into, val, [...prefix, key]);
      else {
        into[[...prefix, key].join("/")] = val;
      }
    });
  }
  const out = {};
  walk(out, data, prefix);
  return out;
}
