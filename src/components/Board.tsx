import { Dock } from "./Dock"
import { Console } from "./Console"

import { gameRef } from "../services/firebase"
import { onValue } from "@firebase/database"
import { useEffect, useState } from "react"

export function Board({ state, setState, view, setView }) {
	var [game, setGame] = useState({})

	useEffect(() => {
		onValue(gameRef, (snapshot) => {
			var data = snapshot.val()
			setGame(data)
		})
	}, [])

	return (
		<>
			<Console state={state} setState={setState} game={game} setGame={setGame} view={view} setView={setView} />
			<Dock state={state} setState={setState} game={game} setGame={setGame} view={view} setView={setView} />
		</>
	)
}



