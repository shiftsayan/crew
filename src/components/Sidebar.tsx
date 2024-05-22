import classnames from "classnames";
import { FiInfo } from "react-icons/fi";

import { Button as XButton } from "./Button";
import { GOAL_VIEW_PHASES } from "./View";

import { Tooltip } from "@mui/material";
import { CTAMove } from "../util/actions/cta";
import { Condition, Size, ViewName } from "../util/enums";
import { mapMissionVersionToName } from "../util/maps";
import {
  AgentCommander,
  AgentCurrent,
  AgentWinner,
} from "../util/mechanics/agent";
import { PhaseName } from "../util/mechanics/phase";

export function Sidebar({ state, setState, game, setGame }) {
  return (
    <div className="w-64 flex flex-col space-y-4 justify-center bg-white rounded-2xl">
      <div className="mx-auto flex justify-center space-x-2">
        <div className="m-auto font-bold">The Crew</div>
      </div>
      <div className="mx-auto grid grid-cols-2 gap-x-4">
        {game.mission && (
          <Counter
            label="Mission"
            value={game.mission.num}
            icon={<FiInfo />}
            tooltip={mapMissionVersionToName[game.mission.version]}
          />
        )}
        {game.mission && (
          <Counter label="Attempt" value={game.mission.attempt} />
        )}
      </div>
      <Toggle state={state} setState={setState} game={game} setGame={setGame} />
      <Button state={state} setState={setState} game={game} setGame={setGame} />
    </div>
  );
}

function Counter({ label, value, icon = null, tooltip = null }) {
  return (
    <div className="flex-col">
      <div className="mx-auto uppercase text-sm">{label}</div>
      <div className="m-auto flex justify-center pt-1 space-x-1">
        <div className="font-mono text-sm">{value}</div>
        {icon && (
          <div className="m-auto">
            <Tooltip
              title={tooltip}
              placement="right"
              PopperProps={{
                modifiers: [{ name: "offset", options: { offset: [0, -10] } }],
              }}
            >
              <div>{icon}</div>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  );
}

function Toggle({ state, setState, game, setGame }) {
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

function Button({ state, setState, game, setGame }) {
  const is_current = AgentCurrent.check(state.player, game);
  const is_winner = AgentWinner.check(state.player, game);
  const is_commander = AgentCommander.check(state.player, game);

  let button_data;
  switch (game.phase) {
    case PhaseName.ChooseGoals:
      if (is_commander) {
        button_data = {
          text: "START GAME",
          active: true,
          onClick: () => new CTAMove(state, setState, game, setGame).run(),
        };
      } else {
        button_data = {
          text: "CHOOSE GOAL",
          active: true,
          disabled: true,
        };
      }
      break;

    case PhaseName.Communicate:
      if (is_winner) {
        button_data = {
          text: "START TRICK",
          active: true,
          onClick: () => new CTAMove(state, setState, game, setGame).run(),
        };
      } else {
        button_data = {
          text: "COMMUNICATE",
          disabled: true,
        };
      }
      break;

    case PhaseName.PlayTrick:
      if (is_current) {
        button_data = {
          text: "PLAY CARD",
          active: true,
          disabled: true,
        };
      }
      break;

    case PhaseName.EndGame:
      if (game.condition === Condition.Won)
        button_data = {
          text: "NEXT MISSION",
          onClick: () => new CTAMove(state, setState, game, setGame).run(),
        };
      else if (game.condition === Condition.Lost) {
        button_data = {
          text: "RETRY MISSION",
          onClick: () => new CTAMove(state, setState, game, setGame).run(),
        };
      } else {
        button_data = {
          text: "MARK GOALS",
          disabled: true,
          onClick: () => new CTAMove(state, setState, game, setGame).run(),
        };
      }
      break;
  }
  button_data = button_data ?? {
    text: "WAITING...",
    active: false,
    disabled: true,
  };

  return (
    <div className="flex justify-around px-2">
      <XButton
        key={button_data.text}
        size={Size.Small}
        active={button_data.active}
        disabled={button_data.disabled}
        onClick={button_data.onClick}
      >
        {button_data.text}
      </XButton>
    </div>
  );
}
