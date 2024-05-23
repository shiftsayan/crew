import classnames from "classnames";

import { deepSeaGoals } from "../util/game/deepSeaGoals";
import { Task } from "./Task";

export function Tasks() {
  return (
    <div className={classnames("h-screen w-screen bg-indigo-800 flex p-8")}>
      <div className="my-auto flex flex-wrap gap-2">
        {deepSeaGoals.map((goal) => (
          <div
            className={classnames({
              "h-14 w-14 rounded-md": true,
              relative: true,
              "bg-white": true,
            })}
          >
            <div className="flex flex-col h-full w-full absolute justify-start">
              <Task type={goal.type} data={goal.data} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
