import classnames from "classnames";

import { Card } from "./Card";
import { CrewGoal } from "./Goal";

import { mapNumberToEmoji } from "../util/maps";
import { Button } from "@mui/material";

import { Join } from "../util/actions/join";
import { PhaseName } from "../util/mechanics/phase";
import { Communication, Decoration, Status } from "../util/enums";

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
          for (let _goal of game.goals) {
            if (_goal.num === goal.num && _goal.suite === goal.suite) {
              accomplished = [Status.Success, Status.Failure].includes(
                _goal.status
              );
            }
          }
          return (
            <CrewGoal
              key={idx}
              goal={goal}
              decorations={{
                [Decoration.Shrink]: accomplished,
                [Decoration.Desaturate]: accomplished,
                // [Decoration.Grayscale]: accomplished,
              }}
            />
          );
        })
      : [];
  if (
    [PhaseName.ChooseGoals, PhaseName.GoldenBorderAccept].includes(game.phase)
  ) {
    goals.push(<CrewGoal key="blank" decoration={Decoration.Pending} />);
  }

  return (
    <div className="h-full bg-gray-100">
      {/* Title */}
      <div className="w-full h-12 flex justify-center space-x-2">
        <div
          className={classnames({
            "my-auto": true,
            underline: player === state.player,
          })}
        >
          {player}
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
          <div className="w-full mt-1 justify-around px-4 flex">
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
              "w-full h-8 mt-2 justify-around flex": true,
              // "px-4": player_data.goals.length !== 4,
            })}
          >
            {goals}
          </div>
        </>
      )}
      {!active && (
        <div className="h-40 -mt-1">
          <div className="flex h-full justify-center">
            <div className="my-auto">
              <Button
                variant="contained"
                size="small"
                color={state.palette.accent}
                onClick={() =>
                  new Join(state, setState, game, setGame).run(player)
                }
                disableElevation
              >
                Sit
              </Button>
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
