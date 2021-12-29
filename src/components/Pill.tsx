import classNames from "classnames";
import { FiMoreHorizontal } from "react-icons/fi";

import { CrewLabelIcon, CrewLabelText } from "./Labels";

import { mapSuiteToBackgroundColor } from "../util/maps";

export function CrewPill({ num, suite, dimmed = false, blank = false }) {
    return (
        <div className={classNames({
            "h-8 w-14 bg-white rounded-md flex": true,
            "scale-75 saturate-0 transition": dimmed,
        })}
        >
            {!blank &&
                <>
                    <div className="m-auto w-1/2">
                        <CrewLabelText num={num} suite={suite} />
                    </div>
                    <div className={`w-1/2 ${mapSuiteToBackgroundColor[suite]} rounded-r-md flex`}>
                        <CrewLabelIcon suite={suite} />
                    </div>
                </>
            }
            {blank &&
                <div className="m-auto animate-pulse">
                    <FiMoreHorizontal />
                </div>
            }
        </div>
    )
}