import { child, get, ref, update } from "@firebase/database";
import { database } from "../../services/firebase";
import { ToastStyle } from "../enums";
import { shuffle } from "../random";
import { Action } from "./action";

const MS_IN_DAY = 60 * 60 * 24 * 1000;

export class LoginAction extends Action<[string]> {
  name = "Login";
  async validateParams(username: string): Promise<string | void> {
    const all_crews = (await get(child(ref(database), "crews"))).val();
    const auth = username && username in all_crews;
    if (auth) {
      return;
    } else {
      return "Invalid Username";
    }
  }

  updateState(username: string) {
    return {
      ...this.state,
      crew: username,
      toast: {
        show: true,
        style: ToastStyle.Success,
        message: "Logged In",
      },
    };
  }

  async postRun(username: string) {
    // update seating
    const game = (await get(child(ref(database), `crews/${username}`))).val();
    const now = Date.now();
    if (!game.seatingTtl || game.seatingTtl < now) {
      update(ref(database), {
        [`crews/${username}/seating`]: shuffle(Object.keys(game.active)),
        [`crews/${username}/seatingTtl`]: now + MS_IN_DAY,
      });
    }
  }
}
