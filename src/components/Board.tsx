import { Dock } from "./Dock";
import { Console } from "./Console";
import { CrewGameType, CrewStateType } from "../util/types";

type BoardProps = {
  state: CrewStateType;
  setState: React.Dispatch<React.SetStateAction<CrewStateType>>;
  game: CrewGameType;
  setGame: React.Dispatch<React.SetStateAction<CrewGameType>>;
};

export function Board({ state, setState, game, setGame }: BoardProps) {
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
