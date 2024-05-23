import classnames from "classnames";

import { Button } from "./Button";
import { GOAL_VIEW_PHASES } from "./View";

import { CTAMove } from "../util/actions/cta";
import { Condition, Size, ViewName } from "../util/enums";
import { mapMissionVersionToName } from "../util/maps";
import {
  AgentCommander,
  AgentCurrent,
  AgentWinner,
} from "../util/mechanics/agent";
import { PhaseName } from "../util/mechanics/phase";
import { CrewComponentType } from "../util/types";

export function Sidebar({ state, setState, game, setGame }: CrewComponentType) {
  return (
    <div className="w-64 flex flex-col bg-white rounded-2xl justify-between pt-6 pb-4">
      <div className="flex flex-col space-y-4 justify-center items-center">
        <div className="flex flex-col justify-center items-center text-center space-y-1">
          <div className="font-bold">🧑‍🚀 The Crew</div>
          <div>
            {game.mission && mapMissionVersionToName[game.mission.version]}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-4">
          {game.mission && <Counter label="Mission" value={game.mission.num} />}
          {game.mission && (
            <Counter label="Attempt" value={game.mission.attempt} />
          )}
        </div>
        <Toggle
          state={state}
          setState={setState}
          game={game}
          setGame={setGame}
        />
      </div>
      <div className="">
        <ActionStack
          state={state}
          setState={setState}
          game={game}
          setGame={setGame}
        />
      </div>
    </div>
  );
}

function Counter({ label, value }) {
  return (
    <div className="flex-col">
      <div className="mx-auto uppercase text-sm text-gray-600">{label}</div>
      <div className="m-auto flex justify-center pt-1 space-x-1">
        <div className="font-mono text-sm">{value}</div>
      </div>
    </div>
  );
}

function Toggle({ state, setState, game, setGame }: CrewComponentType) {
  return (
    <div className="flex-col mx-auto">
      <div
        className={classnames({
          "mx-auto uppercase text-sm": true,
          "text-gray-300": GOAL_VIEW_PHASES.includes(game.phase),
        })}
      >
        {state.view === ViewName.Table ? "Table View" : "Trick View"}
      </div>
      <div className="mx-auto pt-1">
        <label
          className={classnames({
            flex: true,
            "cursor-pointer": GOAL_VIEW_PHASES.includes(game.phase),
            "cursor-not-allowed": GOAL_VIEW_PHASES.includes(game.phase),
          })}
        >
          <input
            type="checkbox"
            className="hidden"
            onClick={() =>
              setState({
                ...state,
                view:
                  state.view === ViewName.Table
                    ? ViewName.Trick
                    : ViewName.Table,
              })
            }
            disabled={GOAL_VIEW_PHASES.includes(game.phase)}
          />
          <div
            className={classnames({
              "w-14 h-8 rounded-full transition mx-auto relative": true,
              "bg-gray-300": GOAL_VIEW_PHASES.includes(game.phase),
              "bg-gray-500": state.view === ViewName.Trick,
              "bg-blue-500": state.view === ViewName.Table,
            })}
          >
            <div
              className={classnames({
                "absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition":
                  true,
                "translate-x-full": state.view === ViewName.Table,
              })}
            />
          </div>
        </label>
      </div>
    </div>
  );
}

function ActionStack({ state, setState, game, setGame }: CrewComponentType) {
  const is_current = AgentCurrent.check(state.player, game);
  const is_winner = AgentWinner.check(state.player, game);
  const is_commander = AgentCommander.check(state.player, game);

  let buttonData: {
    text: string;
    active?: boolean;
    disabled?: boolean;
    onClick?: () => void;
    info?: boolean;
  };
  let infoData: {
    text: string;
  };

  switch (game.phase) {
    case PhaseName.ChooseGoals:
      infoData = {
        text: "ACTION: Choose Goals",
      };
      if (is_commander) {
        buttonData = {
          text: "START GAME",
          active: true,
          onClick: () => new CTAMove(state, setState, game, setGame).run(),
        };
      }
      break;

    case PhaseName.Communicate:
      if (is_winner) {
        buttonData = {
          text: "START TRICK",
          active: true,
          onClick: () => new CTAMove(state, setState, game, setGame).run(),
        };
      } else {
        buttonData = {
          text: "COMMUNICATE",
          disabled: true,
        };
      }
      break;

    case PhaseName.PlayTrick:
      if (is_current) {
        buttonData = {
          text: "PLAY CARD",
          active: true,
          disabled: true,
        };
      }
      break;

    case PhaseName.EndGame:
      if (game.condition === Condition.Won)
        buttonData = {
          text: "NEXT MISSION",
          onClick: () => new CTAMove(state, setState, game, setGame).run(),
        };
      else if (game.condition === Condition.Lost) {
        buttonData = {
          text: "RETRY MISSION",
          onClick: () => new CTAMove(state, setState, game, setGame).run(),
        };
      } else {
        buttonData = {
          text: "MARK GOALS",
          disabled: true,
          onClick: () => new CTAMove(state, setState, game, setGame).run(),
        };
      }
      break;
  }
  buttonData = buttonData ?? {
    text: "WAIT...",
    active: false,
    disabled: true,
  };

  return (
    <div className="flex flex-col space-y-2">
      <div className="m-auto">
        <Button
          key={buttonData.text}
          size={Size.Small}
          active={buttonData.active}
          disabled={buttonData.disabled}
          onClick={buttonData.onClick}
        >
          {buttonData?.text}
        </Button>
      </div>
      {infoData && (
        <div className="m-auto px-4 py-2 text-sm font-medium rounded-md bg-transparent hover:bg-gray-100 text-gray-700 underline underline-offset-2 cursor-help transition duration-200">
          {infoData.text}
        </div>
      )}
    </div>
  );
}
