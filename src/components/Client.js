import { Client } from "boardgame.io/react";
import { CrewGame } from "./Game";
import { CrewBoard } from "./Board";

export function CrewClient(props) {
	let CrewClient = Client({
		game: CrewGame,
		numPlayers: props.numPlayers,
		board: CrewBoard,
	})
	return <CrewClient />
}