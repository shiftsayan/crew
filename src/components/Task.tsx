import { Suite } from "../util/enums";
import { CrewPillMini } from "./Pill";

export function TaskText({}) {
  return (
    <div className="bg-red-100 h-full w-full text-xxs">
      I will win Green 3, Yellow 4, and Yellow 5.
    </div>
  );
}

export function TaskUpTo4Cards({ cards }) {
  return (
    <div className="h-full w-full p-1 flex flex-col justify-center gap-1">
      <div className="flex w-full justify-center gap-1">
        {[1, 2, 3, 4].includes(cards.length) && (
          <CrewPillMini num={cards[0].num} suite={cards[0].suite} />
        )}
        {[2, 4].includes(cards.length) && (
          <CrewPillMini num={cards[1].num} suite={cards[1].suite} />
        )}
      </div>
      {[3, 4].includes(cards.length) && (
        <div className="flex w-full justify-center gap-1">
          {[3].includes(cards.length) && (
            <CrewPillMini num={cards[1].num} suite={cards[1].suite} />
          )}
          {[3].includes(cards.length) && (
            <CrewPillMini num={cards[2].num} suite={cards[2].suite} />
          )}
          {[4].includes(cards.length) && (
            <CrewPillMini num={cards[2].num} suite={cards[2].suite} />
          )}
          {[4].includes(cards.length) && (
            <CrewPillMini num={cards[3].num} suite={cards[3].suite} />
          )}
        </div>
      )}
    </div>
  );
}

export const MAP_TASK_TO_COMPONENT = {
  1: (
    <TaskUpTo4Cards
      cards={[
        { num: 3, suite: Suite.Green },
        { num: 4, suite: Suite.Yellow },
        { num: 5, suite: Suite.Yellow },
      ]}
    />
  ),
  2: <TaskUpTo4Cards cards={[{ num: 3, suite: Suite.Black }]} />,
};
