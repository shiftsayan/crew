import { useEffect, useState } from "react"

import { CrewBoard } from "./Board"

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

	return <CrewBoard state={state} setState={setState} game={game} setGame={setGame} view={view} setView={setView} />
}