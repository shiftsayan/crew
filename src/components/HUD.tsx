import { Sidebar } from "./Sidebar";
import { View } from "./View";

export function HUD({ state, setState, game, setGame }) {
  return (
    <div className="w-full h-full flex-grow bg-gray-100 flex justify-center rounded-2xl py-6 px-8">
      <View state={state} setState={setState} game={game} setGame={setGame} />
      <Sidebar
        state={state}
        setState={setState}
        game={game}
        setGame={setGame}
      />
    </div>
  );
}
