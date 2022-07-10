import { useEffect, useState } from "react"

import { CrewBoard } from "./Board"

import { gameRef } from "../services/firebase"
import { onValue } from "@firebase/database"

import { getInitialState } from "../util/state"

const SETUP_DATA = {
	this_player: 2,
	num_players: 5,
	names: ["alpha", "beta", "gamma", "delta", "epsilon"],
	mission: {
		version: "planet_x",
		num: 4,
	},
	attempt: 10,
	team: {
		name: "The Shift Crew",
		icon: "🚀",
	},
}

export function CrewClient({ state, setState, view, setView }) {
	var [game, setGame] = useState(getInitialState(SETUP_DATA))

	useEffect(() => {
		onValue(gameRef, (snapshot) => {
			var data = snapshot.val()
			setGame(data)
		})
	}, [])

	return <CrewBoard state={state} setState={setState} game={game} setGame={setGame} view={view} setView={setView} />
}