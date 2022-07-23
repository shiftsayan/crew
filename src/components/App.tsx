import { useEffect, useState } from 'react';

import { ref, update } from '@firebase/database';

import { Home } from './Home';
import { Board } from './Board';
import { Layout } from './Layout';

import { palette } from '../util/theme/palette';
import { ViewName } from '../util/enums';
import { database } from '../services/firebase';

let FIX = false;
// FIX = true;

export default function App() {
	const params = window.location.search.split('?spoof=');
	const spoof = params.length > 1 ? params[1] : (FIX ? "shift" : "");

	const [state, setState] = useState({
		crew: "",
		// player: spoof,
		// crew: 'thethecrewcrew',
		view: ViewName.Table,
		palette,
		show_toast: false,
	});

	const unloadAlert = (event: any) => {
		event.preventDefault();
		event.returnValue = '';
	};

	const unload = () => {
		// if (!FIX) {
		// 	update(ref(database), {
		// 		[`crews/${state.crew}/active/shift`]: false,
		// 		// TODO
		// 		[`crews/${state.crew}/phase`]: 'Preflight',
		// 		[`crews/${state.crew}/players`]: {},
		// 		[`crews/${state.crew}/goals`]: [],
		// 		[`crews/${state.crew}/played_cards`]: [],
		// 		[`crews/${state.crew}/tricks`]: [],
		// 		[`crews/${state.crew}/leading_trick`]: [],
		// 		[`crews/${state.crew}/leading_suite`]: null,
		// 		[`crews/${state.crew}/leading_winner`]: null,
		// 		[`crews/${state.crew}/commander`]: null,
		// 	});
		// }
	};

	useEffect(() => {
		window.addEventListener('beforeunload', unloadAlert);
		window.addEventListener('unload', unload);
		return () => {
			window.removeEventListener('beforeunload', unloadAlert);
			window.removeEventListener('unload', unload);
		};
	});

	return (
		<Layout state={state} setState={setState}>
			{state.crew
				? <Board state={state} setState={setState} />
				: <Home state={state} setState={setState} />}
		</Layout>
	);
}
