import classnames from "classnames";

import { CrewPill } from "./Pill";

import { mapOrderToIcon, mapSuiteToBorderColor } from "../util/maps";
import { Decoration, Order, Suite } from "../util/enums";

export function CrewGoal({
  goal = { num: 0, suite: Suite.None, order: Order.None },
  decoration = Decoration.None,
  decorations = {},
}) {
  return (
    <div
      className={classnames({
        "scale-150 transition": decorations[Decoration.Display],
        // "scale-150 transition": decorations[Decoration.Display],
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
