import classnames from "classnames";

import { Card } from "./Card";
import { CrewGoalSquarePending, CrewGoalSquareSelected } from "./Goal";

import { mapNumberToEmoji } from "../util/maps";

import { JoinMove } from "../util/actions/join";
import { Communication, Size } from "../util/enums";
import { PhaseName } from "../util/mechanics/phase";
import { Button } from "./Button";

export function Panel({ idx, state, setState, game, setGame }) {
  const player = game.seating[idx];
  const playerData = (game.players && game.players[player]) || {};
  const active = game.active[player];

  const card = game.leadingTrick ? game.leadingTrick[player] : {};

  const communicationCard = playerData?.communication?.card ?? {};
  const communicationQualifier =
    playerData?.communication?.qualifier ?? Communication.NotCommunicated;

  const goals =
    playerData && playerData.goals
      ? playerData.goals.map((goalIdx) => {
          return (
            <CrewGoalSquareSelected
              key={goalIdx}
              goalIdx={goalIdx}
              state={state}
              setState={setState}
              game={game}
              setGame={setGame}
            />
          );
        })
      : [];
  if ([PhaseName.ChooseGoals].includes(game.phase)) {
    goals.push(
      <CrewGoalSquarePending
        key="pending"
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
        {playerData && (
          <div className="h-10 bg-white rounded-full my-auto flex justify-between px-2 space-x-1">
            {idx === game.commander && <Badge emoji="👑" />}
            <Badge emoji={mapNumberToEmoji[playerData.tricksWon ?? 0]} />
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
              card={
                communicationQualifier !== Communication.Communicating ||
                state.player === player
                  ? communicationCard
                  : {}
              }
              communication={communicationQualifier}
              state={state}
              setState={setState}
              game={game}
              setGame={setGame}
              player={player}
            />
          </div>
          {/* Goals */}
          <div
            className={classnames({
              "w-full h-14 mt-4 justify-left flex px-11 gap-4": true,
              // "px-4": playerData.goals.length !== 4,
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
                <Button disabled active={false} size={Size.Small}>
                  WAITING...
                </Button>
              ) : (
                <Button
                  onClick={() =>
                    new JoinMove(state, setState, game, setGame).run(player)
                  }
                  size={Size.Small}
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
