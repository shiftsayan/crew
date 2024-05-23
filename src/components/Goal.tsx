import classnames from "classnames";

import { CrewPill } from "./Pill";

import { Modal } from "@mui/material";
import { useState } from "react";
import { FiCheck, FiLoader, FiPlus, FiX } from "react-icons/fi";
import { TbInfoHexagon, TbStars } from "react-icons/tb";
import { MarkMove } from "../util/actions/mark";
import { ToggleMove } from "../util/actions/toggle";
import { Decoration, Order, Status, Suite } from "../util/enums";
import { mapOrderToIcon, mapSuiteToBorderColor } from "../util/maps";
import { CrewComponentType } from "../util/types";
import { Task } from "./Task";

export function CrewGoal({
  goal = { num: 0, suite: Suite.None, order: Order.None },
  decoration = Decoration.None,
  decorations = {},
}) {
  return (
    <div
      className={classnames({
        "scale-150 transition": decorations[Decoration.Display],
        "scale-75": decorations[Decoration.Shrink],
        "saturate-50 transition": decorations[Decoration.Desaturate],
      })}
    >
      <div className="relative">
        <CrewPill
          num={goal.num}
          suite={goal.suite}
          blank={decoration === Decoration.Pending}
          decorations={decorations}
        />
        {goal.order !== Order.None && (
          <CrewPendant
            icon={mapOrderToIcon[goal.order]}
            suite={goal.suite}
            decorations={decorations}
          />
        )}
      </div>
    </div>
  );
}

function CrewPendant({ icon, suite, decorations }) {
  return (
    <div
      className={classnames({
        "w-5 h-5 bg-white absolute inset-x-1/2 inset-y-full -mx-2.5 -my-2.5 rounded-full flex justify-center border-2":
          true,
        [mapSuiteToBorderColor[suite]]: !decorations[Decoration.Grayscale],
        "border-gray-500": decorations[Decoration.Grayscale],
      })}
    >
      <div className="text-xs m-auto">{icon}</div>
    </div>
  );
}

function CrewGoalModal({ open, setOpen, goal }) {
  return (
    <Modal open={open} onClose={() => setOpen(false)}>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[400px] bg-white p-4 rounded-md flex flex-col space-y-4">
        <div className="font-bold text-xl">Goal Description</div>
        <div>{goal.mission}</div>
        {goal.footnote && <div className="italic">{goal.footnote}</div>}
      </div>
    </Modal>
  );
}

export function CrewGoalSquareDisplay({
  goalIdx,
  decorations,
  state,
  setState,
  game,
  setGame,
}) {
  const [showModal, setShowModal] = useState(false);

  const goal = game.goals[goalIdx] ?? {};

  return (
    <div
      className={classnames({
        "rounded-md bg-slate-300": true,
        "scale-150 transition": decorations[Decoration.Display],
        "scale-75": decorations[Decoration.Shrink],
      })}
    >
      <div
        onClick={() =>
          new ToggleMove(state, setState, game, setGame).run(goalIdx)
        }
      >
        <CrewGoalSquare goal={goal} />
      </div>
      <div
        className="w-14 text-xs py-0.5 px-1 flex items-center justify-between"
        onClick={(e) => {
          setShowModal(true);
          e.stopPropagation();
        }}
      >
        <div className="flex items-center space-x-0.5">
          <TbStars />
          <div>{goal.difficulty[2]}</div>
        </div>
        <div>
          <TbInfoHexagon />
        </div>
      </div>
      <CrewGoalModal open={showModal} setOpen={setShowModal} goal={goal} />
    </div>
  );
}

export function CrewGoalSquareSelected({
  goalIdx,
  state,
  setState,
  game,
  setGame,
}) {
  const goal = game.goals[goalIdx] ?? {};

  return (
    <div>
      <div
        className={classnames({
          "cursor-pointer": true,
          "h-5 w-5 absolute z-10 -m-2 rounded-full flex justify-center": true,
          "bg-gray-500": [Status.Chosen, Status.NotChosen].includes(
            goal.status
          ),
          "bg-emerald-500": [Status.Success].includes(goal.status),
          "bg-red-600": [Status.Failure].includes(goal.status),
        })}
        onClick={() => {
          new MarkMove(state, setState, game, setGame).run(goalIdx);
        }}
      >
        {[Status.Chosen, Status.NotChosen].includes(goal.status) && (
          <FiLoader className="m-auto text-white text-sm animate-spin-slow" />
        )}
        {[Status.Success].includes(goal.status) && (
          <FiCheck className="m-auto text-sm text-white stroke-icon" />
        )}
        {[Status.Failure].includes(goal.status) && (
          <FiX className="m-auto text-sm text-white stroke-icon" />
        )}
      </div>
      <CrewGoalSquare goal={goal} />
    </div>
  );
}

export function CrewGoalSquarePending({
  state,
  setState,
  game,
  setGame,
}: CrewComponentType) {
  return <CrewGoalSquare goal={{}} />;
}

function CrewGoalSquare({ goal }) {
  return (
    <div>
      <div
        className={classnames({
          "h-14 w-14 rounded-md relative": true,
          "border-dashed border-3 border-gray-300": goal.id === undefined,
          "bg-white": goal.id !== undefined,
        })}
      >
        <div className="flex flex-col h-full w-full absolute justify-start select-none">
          {goal.id !== undefined ? (
            <Task type={goal.type} data={goal.data} />
          ) : (
            <div className="flex h-full w-full justify-center">
              <FiPlus className="m-auto text-gray-300 stroke-icon text-2xl" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
