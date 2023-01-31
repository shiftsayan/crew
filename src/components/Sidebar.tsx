import classnames from "classnames";
import { FiInfo } from "react-icons/fi";

import { GOAL_VIEW_PHASES } from "./View";

import { Condition, ViewName } from "../util/enums";
import { Tooltip } from "@mui/material";
import { mapMissionVersionToName } from "../util/maps";
import { PhaseName } from "../util/mechanics/phase";
import {
  AgentCommander,
  AgentCurrent,
  AgentWinner,
} from "../util/mechanics/agent";
import { CTA } from "../util/actions/cta";

export function Sidebar({ state, setState, game, setGame }) {
  return (
    <div className="w-64 flex flex-col space-y-4 justify-center bg-white rounded-2xl">
      <div className="mx-auto flex justify-center space-x-2">
        <div className="m-auto font-bold">{game.crew_name}</div>
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
  const buttons_data = [];

  const is_current = AgentCurrent.check(state.player, game);
  const is_winner = AgentWinner.check(state.player, game);
  const is_commander = AgentCommander.check(state.player, game);
  switch (game.phase) {
    case PhaseName.ChooseGoals:
      if (is_current) {
        buttons_data.push({
          text: "Choose Goal",
          style: "info",
        });
      }
      break;

    case PhaseName.GoldenBorderDiscard:
      if (is_commander) {
        buttons_data.push({
          text: "Skip",
          style: "positive",
          onClick: () => new CTA(state, setState, game, setGame).run(),
        });
      } else {
        buttons_data.push({
          text: "Discard Goal",
          style: "info",
        });
      }
      break;

    case PhaseName.GoldenBorderAccept:
      buttons_data.push({
        text: "Accept Goal",
        style: "info",
        onClick: () => new CTA(state, setState, game, setGame).run(),
      });
      break;

    case PhaseName.Communicate:
      if (is_winner) {
        buttons_data.push({
          text: "Start Trick",
          style: "positive",
          onClick: () => new CTA(state, setState, game, setGame).run(),
        });
      } else {
        buttons_data.push({
          text: "Communicate",
          style: "info",
        });
      }
      break;

    case PhaseName.PlayTrick:
      if (is_current) {
        buttons_data.push({
          text: "Play Card",
          style: "info",
        });
      }
      break;

    case PhaseName.EndGame:
      if (game.condition === Condition.Won)
        buttons_data.push({
          text: "Next Mission",
          style: "positive",
          onClick: () => new CTA(state, setState, game, setGame).run(),
        });
      else if (game.condition === Condition.Lost) {
        buttons_data.push({
          text: "Retry Mission",
          style: "negative",
          onClick: () => new CTA(state, setState, game, setGame).run(),
        });
      }
  }

  if (buttons_data.length === 0) {
    buttons_data.push({ text: "Wait...", style: "neutral" });
  }

  const buttons = buttons_data.map(({ text, style, onClick }, idx) => (
    <div
      key={idx}
      onClick={onClick}
      className={classnames({
        "flex rounded-md justify-center m-auto": true,
        "bg-blue-600": style === "positive",
        "bg-red-600": style === "negative",
        "bg-gray-600": style === "neutral",
        "bg-gray-400": style === "info",
        "hover:shadow-lg hover:cursor-pointer":
          style === "positive" || style === "negative",
        "hover:cursor-not-allowed": style === "neutral",
      })}
    >
      <div className="m-auto truncate py-2 px-3 uppercase text-sm font-bold text-white">
        {text}
      </div>
    </div>
  ));

  return <div className="flex justify-around px-2">{buttons}</div>;
}
