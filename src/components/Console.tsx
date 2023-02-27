import { CrewGameType, CrewStateType } from "../util/types";
import { HUD } from "./HUD";
import { Panels } from "./Panels";

type ConsoleProps = {
  state: CrewStateType;
  setState: React.Dispatch<React.SetStateAction<CrewStateType>>;
  game: CrewGameType;
  setGame: React.Dispatch<React.SetStateAction<CrewGameType>>;
};

export function Console({ state, setState, game, setGame }: ConsoleProps) {
  return (
    <div className="flex-grow bg-gray-100 rounded-b-2xl mx-8">
      <div className="w-full h-full flex flex-col">
        <HUD state={state} setState={setState} game={game} setGame={setGame} />
        <Panels
          state={state}
          setState={setState}
          game={game}
          setGame={setGame}
        />
      </div>
    </div>
  );
}
