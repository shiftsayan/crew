import classnames from "classnames";

import { Card } from "./Card";
import { CrewGoalNew } from "./Goal";

import { mapNumberToEmoji } from "../util/maps";
import { Button as MuiButton } from "@mui/material";

import { Join } from "../util/actions/join";
import { PhaseName } from "../util/mechanics/phase";
import { Communication, Decoration, Order, Status, Suite } from "../util/enums";
import { CrewGoal } from "./Goal";
import { Button } from "./Button";

export function Panel({ idx, state, setState, game, setGame }) {
  const player = game.seating[idx];
  const player_data = (game.players && game.players[player]) || {};
  const active = game.active[player];

  const card = game.leading_trick ? game.leading_trick[player] : {};
  const comm =
    player_data.communication && player_data.communication.card
      ? player_data.communication
      : {};

  const goals =
    player_data && player_data.goals
      ? player_data.goals.map((goal, idx) => {
          let accomplished = false;
          let goal_idx = 0;
          for (let _goal of game.goals) {
            if (_goal.id === goal.id) {
              idx = _goal.idx;
              accomplished = [Status.Success, Status.Failure].includes(
                _goal.status
              );
              break;
            }
            goal_idx++;
          }
          return (
            <CrewGoalNew
              key={idx}
              idx={goal_idx}
              id={goal.id}
              goal={game.goals[goal_idx]}
              decorations={
                {
                  // [Decoration.Shrink]: accomplished,
                  // [Decoration.Desaturate]: accomplished,
                  // [Decoration.Grayscale]: accomplished,
                }
              }
              state={state}
              setState={setState}
              game={game}
              setGame={setGame}
            />
          );
        })
      : [];
  if (
    [PhaseName.ChooseGoals, PhaseName.GoldenBorderAccept].includes(game.phase)
  ) {
    goals.push(
      <CrewGoalNew
        key="blank"
        decorations={{ [Decoration.Pending]: true }}
        state={state}
        setState={setState}
        game={game}
        setGame={setGame}
      />
    );
  }

  return (
    <div className="h-full bg-gray-100">
      {/* Title */}
      <div className="w-full h-12 flex justify-center space-x-2">
        <div
          className={classnames({
            "my-auto": true,
            "bg-white px-4 h-10 rounded-full flex": player === state.player,
          })}
        >
          <div className="my-auto">{player}</div>
        </div>
        {player_data && (
          <div className="h-10 bg-white rounded-full my-auto flex justify-between px-2 space-x-1">
            {idx === game.commander && <Badge emoji="👑" />}
            <Badge emoji={mapNumberToEmoji[player_data.tricks_won ?? 0]} />
          </div>
        )}
      </div>
      {/* Cards */}
      {active && (
        <>
          <div className="w-full mt-2 justify-between px-11 flex gap-8">
            <Card
              card={card || {}}
              state={state}
              setState={setState}
              game={game}
              setGame={setGame}
            />
            <Card
              card={comm.card || {}}
              communication={comm.qualifier || Communication.NotCommunicated}
              state={state}
              setState={setState}
              game={game}
              setGame={setGame}
              qualifyDisabled={player !== state.player}
            />
          </div>
          {/* Goals */}
          <div
            className={classnames({
              "w-full h-14 mt-4 justify-left flex px-11 gap-4": true,
              // "px-4": player_data.goals.length !== 4,
            })}
          >
            {goals}
          </div>
        </>
      )}
      {!active && (
        <div className="h-[12rem]">
          <div className="flex h-full justify-center">
            <div className="my-auto">
              {state.player ? (
                <Button disabled>WAITING...</Button>
              ) : (
                <Button
                  onClick={() =>
                    new Join(state, setState, game, setGame).run(player)
                  }
                >
                  SIT
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Badge({ emoji }) {
  return (
    <div className="my-auto h-7 w-7 flex justify-center rounded-full">
      <div className="z-10 m-auto">{emoji}</div>
    </div>
  );
}
