import classnames from "classnames";
import { FiMoreHorizontal } from "react-icons/fi";

import { CrewLabelIcon, CrewLabelText } from "./Labels";

import { mapSuiteToBackgroundColor } from "../util/maps";
import { Decoration } from "../util/enums";

export function CrewPill({ num, suite, blank = false, decorations = {} }) {
  return (
    <div
      className={classnames({
        "h-8 w-14 bg-white rounded-md flex": true,
      })}
    >
      {!blank && (
        <>
          <div className="m-auto w-1/2">
            <CrewLabelText num={num} suite={suite} decorations={decorations} />
          </div>
          <div
            className={classnames({
              "w-1/2 rounded-r-md flex": true,
              [mapSuiteToBackgroundColor[suite]]:
                !decorations[Decoration.Grayscale],
              "bg-gray-500": decorations[Decoration.Grayscale],
              "saturate-50 transition": decorations[Decoration.Desaturate],
            })}
          >
            <CrewLabelIcon suite={suite} />
          </div>
        </>
      )}
      {blank && (
        <div className="m-auto animate-pulse">
          <FiMoreHorizontal />
        </div>
      )}
    </div>
  );
}
