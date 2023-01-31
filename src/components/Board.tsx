import { Dock } from "./Dock";
import { Console } from "./Console";

import { gameRef } from "../services/firebase";
import { onValue } from "@firebase/database";
import { useEffect, useState } from "react";

export function Board({ state, setState }) {
  const [game, setGame] = useState({});

  useEffect(() => {
    onValue(gameRef, async (snapshot) => {
      const data = snapshot.val();
      setGame(data);
    });
  }, []);

  return (
    <>
      <Console
        state={state}
        setState={setState}
        game={game}
        setGame={setGame}
      />
      <Dock state={state} setState={setState} game={game} setGame={setGame} />
    </>
  );
}
