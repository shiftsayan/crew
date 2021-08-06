import { Client } from "boardgame.io/react";
import { CrewGame } from "./Game";
import { CrewBoard } from "./Board";

const App = Client({
  game: CrewGame,
  board: CrewBoard,
});

export default App;
