import { CrewDock } from "./Dock"
import { CrewConsole } from "./Console"

import { gameRef } from "../services/firebase"
import { onValue } from "@firebase/database"
import { useEffect } from "react"

export function CrewBoard({ state, setState, game, setGame, view, setView }) {
	return (
		<>
			<CrewConsole state={state} setState={setState} game={game} setGame={setGame} view={view} setView={setView} />
			{/* <CrewDock state={state} setState={setState} game={game} setGame={setGame} view={view} setView={setView} /> */}
		</>
	)
}

