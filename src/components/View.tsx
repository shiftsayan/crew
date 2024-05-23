import { CrewGoal, CrewGoalSquareDisplay } from "./Goal";
import { CrewPill as Pill } from "./Pill";

import { Decoration, Order, ViewName } from "../util/enums";
import { SUITES, SUIT_TRUMP } from "../util/game";
import { PhaseName } from "../util/mechanics/phase";

export const GOAL_VIEW_PHASES = [
  PhaseName.Preflight,
  PhaseName.DealCards,
  PhaseName.DealGoals,
  PhaseName.ChooseGoals,
];

export function View({ state, setState, game, setGame }) {
  let view = undefined;
  if (GOAL_VIEW_PHASES.includes(game.phase)) {
    view = (
      <GoalView
        state={state}
        setState={setState}
        game={game}
        setGame={setGame}
      />
    );
  } else {
    view =
      state.view === ViewName.Trick ? (
        <TrickView
          state={state}
          setState={setState}
          game={game}
          setGame={setGame}
        />
      ) : (
        <TableView
          state={state}
          setState={setState}
          game={game}
          setGame={setGame}
        />
      );
  }

  return (
    <div className="h-full w-full m-auto flex-grow justify-between py-2">
      {view}
    </div>
  );
}

function TrickView({ state, setState, game, setGame }) {
  const col_classes =
    "flex flex-col -my-5 p-3 justify-between rounded-lg hover:bg-slate-200 transition duration-300 ease-in-out";
  const grid = [];

  let firstCol = [];
  for (let j = 0; j < game.numPlayers; j++) {
    firstCol.push(<Header text={game.seating[j]} />);
  }
  grid.push(
    <div className={col_classes} key="first">
      {firstCol}
    </div>
  );

  for (let trick of game.tricks ?? []) {
    const col = [];
    for (let j = 0; j < game.numPlayers; j++) {
      const player = game.seating[j];
      col.push(
        <Pill key={j} num={trick[player].num} suite={trick[player].suite} />
      );
    }
    grid.push(<div className={col_classes}>{col}</div>);
  }

  if (game.leadingTrick) {
    let last_col = [];
    for (let j = 0; j < game.numPlayers; j++) {
      const player = game.seating[j];
      last_col.push(
        <Pill
          key={j}
          num={game.leadingTrick[player]?.num}
          suite={game.leadingTrick[player]?.suite}
        />
      );
    }
    grid.push(
      <div className={col_classes} key="last">
        {last_col}
      </div>
    );
  }

  return <div className="flex h-full py-3">{grid}</div>;
}

function TableView({ state, setState, game, setGame }) {
  const grid = [];

  for (let suite of SUITES) {
    let row = [<Header key={suite} text={suite} />];
    for (let i = 1; i <= (suite === SUIT_TRUMP ? 4 : 9); i++) {
      let played =
        game.playedCards &&
        game.playedCards.some((card) => card.num === i && card.suite === suite);
      row.push(
        <CrewGoal
          key={i}
          goal={{ num: i, suite: suite, order: Order.None }}
          decorations={{
            [Decoration.Grayscale]: played,
            [Decoration.Shrink]: played,
          }}
        />
      );
    }
    grid.push(
      <div
        key={suite}
        className="flex w-fit -my-2 -mx-3 py-3 px-3 space-x-6 rounded-lg hover:bg-slate-200 transition duration-300 ease-in-out"
      >
        {row}
      </div>
    );
  }

  return (
    <div className="flex flex-col px-3 justify-between h-full w-full -py-2">
      {grid}
    </div>
  );
}

function Header({ text }) {
  return (
    <div className="flex bg-white rounded-md justify-between h-8 w-20 text-sm">
      <div className="m-auto truncate p-1">{text}</div>
    </div>
  );
}

function GoalView({ state, setState, game, setGame }) {
  const goals = game.goals || [];

  const breakpoint =
    goals.length >= 6 ? Math.ceil(goals.length / 2) : goals.length;

  const goalsGrid = [];
  const rowClassNames = "flex justify-center space-x-20";
  let row = [];
  for (let i = 0; i < goals.length; i++) {
    row.push(
      <div className="cursor-pointer" key={i}>
        <CrewGoalSquareDisplay
          goalIdx={i}
          decorations={{
            [Decoration.Display]: true,
            [Decoration.Shrink]: Boolean(goals[i].player),
          }}
          state={state}
          setState={setState}
          game={game}
          setGame={setGame}
        />
      </div>
    );
    if (row.length === breakpoint) {
      goalsGrid.push(
        <div className={rowClassNames} key={i}>
          {row}
        </div>
      );
      row = [];
    }
  }
  if (row.length > 0)
    goalsGrid.push(
      <div className={rowClassNames} key="last">
        {row}
      </div>
    );

  return (
    <div className="h-full flex">
      {/* <div className="w-64 flex flex-col space-y-4 justify-center bg-white rounded-2xl">
        <div className="mx-auto flex justify-center space-x-2">
          <div className="m-auto">
            {mapMissionVersionToEmoji[game.mission.version]}
          </div>
          <div className="m-auto font-bold">Mission {game.mission.num}</div>
        </div>
      </div> */}
      <div className="w-full flex flex-col h-full space-y-20 justify-center">
        {goalsGrid}
      </div>
    </div>
  );
}
