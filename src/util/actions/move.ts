import { ref, update } from "@firebase/database";

import { database } from "../../services/firebase";
import { Action } from "./action";
import { mergeUpdates } from "../random";
import { mapPhaseNameToPhase } from "../mechanics/phase";

export abstract class Move extends Action {
  game;
  setGame;

  constructor(state, setState, game, setGame) {
    super(state, setState);
    this.game = game;
    this.setGame = setGame;
  }

  async validateAgency(...params) {
    const phase = mapPhaseNameToPhase[this.game.phase];
    const agent = phase.agency[this.constructor.name];
    return agent && agent.check(this.state.player, this.game);
  }

  commitGame(updates) {
    // Make changes to this.game
    mergeUpdates(this.game, updates);
    // Make changes to Firebase
    const firebase_updates = toFirebaseNotation(updates, [
      `crews/${this.state.crew}`,
    ]);
    return update(ref(database), firebase_updates);
  }

  commitPhase(updates) {
    // Make changes to Firebase
    const firebase_updates = toFirebaseNotation(updates, [
      `crews/${this.state.crew}`,
    ]);
    return update(ref(database), firebase_updates);
  }

  updateGame(...params) {
    return {};
  }

  updatePhase(...params) {
    let phase = mapPhaseNameToPhase[this.game.phase];

    const updates: any = {
      current: phase.agency[this.constructor.name].next(this.game),
    };

    while (phase.ended(this.state, this.game)) {
      // end this phase
      const end_updates = phase.onEnd(this.state, this.game);
      mergeUpdates(updates, end_updates);
      mergeUpdates(this.game, end_updates);
      // get next phase
      phase = phase.next(this.state, this.game);
      updates.phase = phase.name;
      updates.current = phase.starter.get(this.game);
      // start next phase
      const start_updates = phase.onStart(this.state, this.game);
      mergeUpdates(updates, start_updates);
      mergeUpdates(this.game, start_updates);
    }

    return updates;
  }

  async run(...params) {
    if (
      !(await this.validateAgency(...params)) ||
      !(await this.validateParams(...params))
    ) {
      console.log("invalid move");
      return;
    }

    const state_updates = this.updateState(...params);
    this.commitState(state_updates);
    const game_updates = await this.updateGame(...params);
    this.commitGame(game_updates);
    const phase_updates = this.updatePhase(...params);
    this.commitPhase(phase_updates);

    this.postRun(...params);
  }
}

function toFirebaseNotation(data, prefix = []) {
  function walk(into, data, prefix = []) {
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
