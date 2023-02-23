import { Dock } from "./Dock";
import { Console } from "./Console";

export function Board({ state, setState, game, setGame }) {
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
