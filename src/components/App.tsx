import { useEffect, useState } from "react";

import { onValue, ref, update } from "@firebase/database";

import { Board } from "./Board";
import { Layout } from "./Layout";
import { Login } from "./Login";

import { database } from "../services/firebase";
import { ViewName } from "../util/enums";
import { CrewGameType, CrewStateType } from "../util/types";

export function App() {
  const [state, setState] = useState<CrewStateType>({
    player: "",
    crew: "thethecrewcrew",
    view: ViewName.Table,
    toast: { show: false },
  });
  const [game, setGame] = useState<CrewGameType>({});

  useEffect(() => {
    const gameRef = ref(database, `crews/thethecrewcrew`);
    onValue(gameRef, async (snapshot) => {
      const data = snapshot.val();
      setGame(data);
    });
  }, [state.crew]);

  const unloadAlert = (event: any) => {
    event.preventDefault();
    event.returnValue = "";
  };

  const unload = () => {
    if (state.crew && state.player) {
      update(ref(database), {
        [`crews/${state.crew}/active/${state.player}`]: false,
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
      {state.crew ? (
        <Board
          state={state}
          setState={setState}
          game={game}
          setGame={setGame}
        />
      ) : (
        <Login state={state} setState={setState} />
      )}
    </Layout>
  );
}
