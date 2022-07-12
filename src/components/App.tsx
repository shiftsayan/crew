import { Home } from "./Home"
import { Board } from "./Board"
import { Layout } from './Layout';

import { useEffect, useState } from 'react';
import { palette } from '../util/theme/palette'
import { ViewName } from '../util/enums';
import { ref, update } from "@firebase/database";
import { database } from "../services/firebase";

export default function App() {
	const [state, setState] = useState({
		// crew: "",
		player: "",
		crew: "thethecrewcrew",
		// player: "shift",
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
			update(ref(database), {
				[`crews/${state.crew}/active/${state.player}`]: false
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