import classNames from "classnames";

import { CrewCard } from "./Card";
import { CrewGoal } from "./Goal";

export function CrewPanel(props) {
    return (
        <div
            className={classNames({
                "flex-grow": true,
                "border-none": props.active || props.afterActive,
                "-my-4": props.active,
            })}>
            <div className={classNames({
                "h-full flex flex-col": true,
                "bg-gray-200 rounded-t-3xl py-4": props.active,
            })}>
                <div className="m-auto">
                    <p className="text-lg uppercase font-bold">
                        {props.name}
                    </p>
                </div>
                <div className="w-full flex justify-between px-4">
                    <div className="flex flex-col justify-between">
                        <CrewGoal num={5} suite={'red'} color={props.color} />
                        <CrewGoal num={5} suite={'red'} color={props.color} />
                    </div>
                    <CrewCard />
                    {/* <CrewCard /> */}
                </div>
            </div>
        </div>
    )
}