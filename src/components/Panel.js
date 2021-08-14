import classNames from "classnames";

import { CrewCard } from "./Card";

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
                "bg-gray-200 rounded-t-3xl py-2": props.active,
            })}>
                <div className="m-auto">
                    <p className="text-lg uppercase font-bold">
                        {props.name}
                    </p>
                </div>
                <CrewCard />
            </div>
        </div>
    )
}