import classnames from "classnames";

import { CrewLabelIcon, CrewLabelText } from "./Labels";

import { Decoration, Communication } from "../util/enums";
import {
  mapSuiteToBackgroundColor,
  mapCommunicationToIcon,
} from "../util/maps";
import { Qualify } from "../util/actions/qualify";

export function Card({
  state,
  setState,
  game = null,
  setGame = null,
  card,
  decoration = Decoration.None,
  communication = Communication.None,
  qualifyDisabled = false,
}) {
  var communication_icons = [];
  if (communication === Communication.Communicating) {
    for (let key of [
      Communication.Lowest,
      Communication.Only,
      Communication.Highest,
    ]) {
      communication_icons.push(
        <div
          className="m-auto"
          onClick={() =>
            new Qualify(state, setState, game, setGame).run(
              key,
              qualifyDisabled
            )
          }
          key={key}
        >
          {mapCommunicationToIcon[key]}
        </div>
      );
    }
  } else {
    communication_icons.push(
      <div className="m-auto" key={communication}>
        {mapCommunicationToIcon[communication]}
      </div>
    );
  }

  return (
    <div className="relative flex flex-col">
      <div
        className={classnames({
          "rounded-xl h-28 w-20 bg-white p-1.5": true,
          "scale-80 -my-1": communication,
        })}
      >
        {decoration !== Decoration.Blank && (
          <>
            <div
              className={`rounded-lg h-full w-full ${
                mapSuiteToBackgroundColor[card.suite]
              } flex`}
            >
              <CrewLabelIcon suite={card.suite} size="text-4xl" />
            </div>
            <div className="rounded-tl-xl rounded-br-xl bg-white h-8 w-8 absolute top-0 left-0 flex">
              <CrewLabelText num={card.num} suite={card.suite} />
            </div>
          </>
        )}
      </div>
      {communication !== Communication.None && (
        <div
          className={classnames({
            "absolute h-8 -my-8 inset-y-full inset-x-1/2": true,
            "bg-white rounded-full": true,
            "flex justify-evenly": true,
            "text-xl": true,
            "w-8 -mx-4": communication !== Communication.Communicating,
            "w-20 -mx-10 px-1": communication === Communication.Communicating,
          })}
        >
          {communication_icons}
        </div>
      )}
    </div>
  );
}
