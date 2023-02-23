import { useEffect, useState } from "react";

import { ref, update, onValue } from "@firebase/database";

import { Home } from "./Home";
import { Board } from "./Board";
import { Layout } from "./Layout";

import { PALETTES } from "../util/theme/palette";
import { ViewName } from "../util/enums";
import { database } from "../services/firebase";
import { choice } from "../util/random";

export function App() {
  const palette = choice(PALETTES);
  const [state, setState] = useState({
    player: "",
    crew: "thethecrewcrew",
    view: ViewName.Table,
    palette,
    show_toast: false,
  });
  const [game, setGame] = useState({});

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
        <Home state={state} setState={setState} />
      )}
    </Layout>
  );
}
