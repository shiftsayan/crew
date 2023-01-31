import { useEffect, useState } from "react";

import { ref, update } from "@firebase/database";

import { Home } from "./Home";
import { Board } from "./Board";
import { Layout } from "./Layout";

import { palette } from "../util/theme/palette";
import { ViewName } from "../util/enums";
import { database } from "../services/firebase";

export default function App() {
  const [state, setState] = useState({
    player: "",
    crew: "",
    view: ViewName.Table,
    palette,
    show_toast: false,
  });

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
        <Board state={state} setState={setState} />
      ) : (
        <Home state={state} setState={setState} />
      )}
    </Layout>
  );
}
