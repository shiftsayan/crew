import classnames from "classnames"

import { CrewLabelPendant } from "./Labels";
import { CrewPill } from "./Pill";

import { mapOrderToIcon } from "../util/maps";


export function CrewGoal({ idx = undefined, goal = { num: 0, suite: "", order: "" }, display = false, dimmed = false, blank = false }) {
    return (
        <div className={classnames({
            "scale-150": display,
            "scale-125 saturate-50 transition": dimmed
        })}>
            <div className="relative">
                <CrewPill num={goal.num} suite={goal.suite} blank={blank} />
                {goal.order &&
                    <CrewLabelPendant icon={mapOrderToIcon[goal.order]} suite={goal.suite} />
                }
            </div >
        </div>
    )
}