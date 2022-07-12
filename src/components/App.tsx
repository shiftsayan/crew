import { Home } from "./Home"
import { Board } from "./Board"
import { Layout } from './Layout';

import { useState } from 'react';
import { palette } from '../util/theme/palette'
import { ViewName } from '../util/enums';

export default function App() {
	const [state, setState] = useState({
		crew: "thethecrewcrew",
		player: "shift",
		view: ViewName.Table,
		palette: palette,
		show_toast: false,
	})

	return (
		<Layout state={state} setState={setState}>
			{state.crew
				? <Board state={state} setState={setState} />
				: <Home state={state} setState={setState} />
			}
		</Layout>
	)
}