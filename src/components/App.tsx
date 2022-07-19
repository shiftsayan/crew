import { Home } from "./Home"
import { Board } from "./Board"
import { Layout } from './Layout';

import { useEffect, useState } from 'react';
import { palette } from '../util/theme/palette'
import { ViewName } from '../util/enums';
import { ref, update } from "@firebase/database";
import { database } from "../services/firebase";

let FIX = false
// FIX = true

export default function App() {
	const params = window.location.search.split("?spoof=")
	const spoof = params.length > 1 ? params[1] : "shift"

	const [state, setState] = useState({
		// crew: "",
		player: spoof,
		crew: "thethecrewcrew",
		view: ViewName.Table,
		palette: palette,
		show_toast: false,
	})

	useEffect(() => {
		window.addEventListener('beforeunload', unloadAlert)
		window.addEventListener('unload', unload)
		return () => {
			window.removeEventListener('beforeunload', unloadAlert)
			window.removeEventListener('unload', unload)
		}
	})

	const unloadAlert = (event: any) => {
		event.preventDefault()
		event.returnValue = ''
	}

	const unload = () => {
		if (state.crew && state.player) {
			!FIX && update(ref(database), {
				[`crews/${state.crew}/active/${state.player}`]: false,
				// TODO
				[`crews/${state.crew}/phase`]: "Preflight",
				[`crews/${state.crew}/players`]: {},
				[`crews/${state.crew}/goals`]: [],
			})
		}
	}

	return (
		<Layout state={state} setState={setState}>
			{state.crew
				? <Board state={state} setState={setState} />
				: <Home state={state} setState={setState} />
			}
		</Layout>
	)
}