import classnames from "classnames";
import { Decoration } from "../util/enums";

import { mapSuiteToIcon, mapSuiteToTextColor } from "../util/maps";

export function CrewLabelText({ num, suite, decorations = {} }) {
  return (
    <div
      className={classnames({
        "m-auto w-2 h-6 text-lg font-display font-bold": true,
        [mapSuiteToTextColor[suite]]: !decorations[Decoration.Grayscale],
        "text-gray-600": decorations[Decoration.Grayscale],
      })}
    >
      {num}
    </div>
  );
}

export function CrewLabelIcon({ suite, size = "" }) {
  return (
    <div className={classnames("m-auto text-white opacity-20", size)}>
      {mapSuiteToIcon[suite]}
    </div>
  );
}
