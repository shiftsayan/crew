import { Route, Routes, Navigate } from 'react-router-dom';

import { Home } from "./Home"
import { CrewClient } from "./Client"
import { Layout } from './Layout';

import { get, child, ref } from "firebase/database"

import { useEffect, useState } from 'react';
import { database } from '../services/firebase';
import { palette } from '../util/theme/palette'

export default function App() {
	const [state, setState] = useState({
		auth: true,
		crew: "thethecrewcrew"
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
				<Route path="/play" element={<CrewClient state={state} setState={setState} view={view} setView={setView} />} />
			</Routes>
		</Layout>
	)
}