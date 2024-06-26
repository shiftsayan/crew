import { useEffect, useState } from "react";

import { onValue, ref, update } from "@firebase/database";

import { Board } from "./Board";
import { Layout } from "./Layout";

import { useSearchParams } from "react-router-dom";
import { crewName } from "../config";
import { database } from "../services/firebase";
import { JoinMove } from "../util/actions/join";
import { ViewName } from "../util/enums";
import { CrewGameType, CrewStateType } from "../util/types";

export function App() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [state, setState] = useState<CrewStateType>({
    player: "",
    view: ViewName.Table,
    toast: { show: false },
  });
  const [game, setGame] = useState<CrewGameType>({});

  useEffect(() => {
    async function setPlayerOverride() {
      const player = searchParams.get("u");
      if (player) {
        setState((prevState) => ({ ...prevState, player }));
        if (!game.active[player]) {
          await new JoinMove(state, setState, game, setGame).run(player);
        }
      }
    }

    if (state.player === "" && game.active) {
      setPlayerOverride();
    }
  }, [searchParams, game]);

  useEffect(() => {
    const gameRef = ref(database, crewName);
    onValue(gameRef, async (snapshot) => {
      const data = snapshot.val();
      setGame(data);
    });
  }, []);

  const unloadAlert = (event: any) => {
    event.preventDefault();
    event.returnValue = "";
  };

  const unload = () => {
    if (state.player) {
      update(ref(database), {
        [`${crewName}/active/${state.player}`]: false,
      });
    }
  };

  useEffect(() => {
    window.addEventListener("beforeunload", unloadAlert);
    window.addEventListener("unload", unload);
    return () => {
      window.removeEventListener("beforeunload", unloadAlert);
      window.removeEventListener("unload", unload);
    };
  });

  return (
    <Layout state={state} setState={setState}>
      <Board state={state} setState={setState} game={game} setGame={setGame} />
    </Layout>
  );
}
