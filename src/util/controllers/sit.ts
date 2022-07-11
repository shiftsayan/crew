import { child, push, ref, update } from "@firebase/database";
import { database } from "../../services/firebase";

export function sitController(player, state, setState) {
    update(ref(database), {
        [`crews/thethecrewcrew/players/${player}/active`]: true
    });
    setState({
        ...state,
        this_player: player,
    })
}