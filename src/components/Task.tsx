import { Decoration } from "../util/enums";
import { CrewPillMini } from "./Pill";

export function TaskText({ text }) {
  return (
    <div className="h-full w-full px-0.5 flex flex-col justify-center">
      <div className="text-xxs text-center leading-tight whitespace-pre-line">
        {text}
      </div>
    </div>
  );
}

export function TaskHeader({ header, card_or_text_list }) {
  return (
    <div className="h-full w-full py-1 flex flex-col justify-start">
      <div className="mx-auto text-xxs flex-none">{header}</div>
      <div className="grow flex justify-center">
        <div className="my-auto flex flex-wrap justify-center gap-x-1">
          {card_or_text_list.map((card_or_text) => {
            if (card_or_text.text) {
              return (
                <div className="text-xxs my-auto -mx-0.5">
                  {card_or_text.text}
                </div>
              );
            }
            return (
              <CrewPillMini
                num={card_or_text.num}
                suite={card_or_text.suite}
                decorations={{
                  [Decoration.Rainbow]: card_or_text.suite === undefined,
                }}
              />
            );
          })}
        </div>
      </div>
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

export function Task({ type, data }) {
  if (type === "text") {
    return <TaskText text={data.text} />;
  } else if (type === "header") {
    return <TaskHeader card_or_text_list={data.cards} header={data.header} />;
  } else if (type === "cards") {
    return <TaskUpTo4Cards cards={data.cards} />;
  }
  return <></>;
}
