import classnames from "classnames";

import { CrewLabelIcon, CrewLabelText } from "./Labels";

import { QualifyMove } from "../util/actions/qualify";
import { Communication } from "../util/enums";
import {
  mapCommunicationToIcon,
  mapSuiteToBackgroundColor,
} from "../util/maps";
import { CrewCardType, CrewGameType, CrewStateType } from "../util/types";

type CardProps = {
  state: CrewStateType;
  setState: React.Dispatch<React.SetStateAction<CrewStateType>>;
  game: CrewGameType;
  setGame: React.Dispatch<React.SetStateAction<CrewGameType>>;
  card: CrewCardType;
  communication?: Communication;
  player?: string;
};

export function Card({
  state,
  setState,
  game,
  setGame,
  card,
  communication = Communication.None,
  player,
}: CardProps) {
  const communicating =
    state.player === player && communication === Communication.Communicating;

  const communicationIcons = [];
  if (communicating) {
    for (const qualifier of [
      Communication.Lowest,
      Communication.Only,
      Communication.Highest,
      Communication.Cancel,
    ]) {
      communicationIcons.push(
        <div
          className="m-auto hover:text-indigo-700 transition cursor-pointer"
          onClick={() =>
            new QualifyMove(state, setState, game, setGame).run(
              qualifier,
              player
            )
          }
          key={qualifier}
        >
          {mapCommunicationToIcon[qualifier]}
        </div>
      );
    }
  } else {
    communicationIcons.push(
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
          "scale-80 -my-1": communication !== Communication.None,
        })}
      >
        <>
          <div
            className={classnames(
              "rounded-lg h-full w-full flex",
              mapSuiteToBackgroundColor[card.suite]
            )}
          >
            <CrewLabelIcon suite={card.suite} size="text-4xl" />
          </div>
          <div className="rounded-tl-xl rounded-br-xl bg-white h-8 w-8 absolute top-0 left-0 flex">
            <CrewLabelText num={card.num} suite={card.suite} />
          </div>
        </>
      </div>
      {communication !== Communication.None && (
        <div
          className={classnames({
            "absolute h-8 -my-8 inset-y-full inset-x-1/2": true,
            "bg-white rounded-full flex justify-evenly": true,
            "text-xl": true,
            "w-8 -mx-4": !communicating,
            "w-24 -mx-12 px-1": communicating,
          })}
        >
          {communicationIcons}
        </div>
      )}
    </div>
  );
}
