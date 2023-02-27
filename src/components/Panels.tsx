import classnames from "classnames";

import { Panel } from "./Panel";

import { mapPlayersToGridsClass } from "../util/maps";
import { CrewGameType, CrewStateType } from "../util/types";

type PanelsProps = {
  state: CrewStateType;
  setState: React.Dispatch<React.SetStateAction<CrewStateType>>;
  game: CrewGameType;
  setGame: React.Dispatch<React.SetStateAction<CrewGameType>>;
};

export function Panels({ state, setState, game, setGame }: PanelsProps) {
  const panels = [];
  for (let i = 0; i < game.num_players; i++) {
    panels.push(
      <Panel
        key={i}
        idx={i}
        state={state}
        setState={setState}
        game={game}
        setGame={setGame}
      />
    );
  }

  return (
    <div className="mb-5">
      <div
        className={classnames(
          "grid divide-x-2 divide-gray-200",
          mapPlayersToGridsClass[game.num_players]
        )}
      >
        {panels}
      </div>
    </div>
  );
}
