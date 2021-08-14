import { Client } from "boardgame.io/react";
import { CrewGame } from "./Game";
import { CrewBoard } from "./Board";

export function CrewClient(props) {
	let CrewClient = Client({
		game: CrewGame,
		board: CrewBoard,
		numPlayers: props.numPlayers,
		debug: false,
	})
	return <CrewClient />
}