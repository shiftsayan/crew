import { Route, Routes, Navigate } from 'react-router-dom';

import { Home } from "./Home"
import { Board } from "./Board"
import { Layout } from './Layout';

import { useState } from 'react';
import { palette } from '../util/theme/palette'
import { ViewName } from '../util/enums';

export default function App() {
	const [state, setState] = useState({
		auth: true,
		crew: "thethecrewcrew",
		view: ViewName.Table,
	})
	const [view, setView] = useState({
		...palette,
	})

	// useEffect(() => {
	// 	get(child(ref(database), 'crews')).then((snapshot) => {
	// 		let data = snapshot.val()
	// 		// setAllCrews(data)
	// 	})
	// })

	return (
		<Layout view={view}>
			<Routes>
				<Route path="/" element={
					state.auth
						? <Navigate to="/play" />
						: <Home state={state} setState={setState} view={view} setView={setView} />
				} />
				<Route path="/play" element={<Board state={state} setState={setState} view={view} setView={setView} />} />
			</Routes>
		</Layout>
	)
}