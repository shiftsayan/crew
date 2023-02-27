import classnames from "classnames";

import { Task } from "./Task";
import { DEEP_SEA_GOALS } from "../util/game/deep_sea_goals";

export function AllTasks() {
  return (
    <div className={classnames("h-screen w-screen bg-indigo-300 flex p-8")}>
      <div className="my-auto flex flex-wrap gap-2">
        {DEEP_SEA_GOALS.map((goal) => (
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
