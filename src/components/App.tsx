import { Route, Routes } from 'react-router-dom';

import { Home } from "./Home"
import { CrewClient } from "./Client"
import { Layout } from './Layout';

import { get, child, ref } from "firebase/database"

import { useEffect, useState } from 'react';
import { database } from '../services/firebase';

export default function App() {
	const [state, setState] = useState({})
	const [view, setView] = useState({
		background: "bg-zinc-900",
		text: "This is a success message!",
	})

	useEffect(() => {
		get(child(ref(database), 'crews')).then((snapshot) => {
			let data = snapshot.val()
			// setAllCrews(data)
		})
	})

	// useEffect(() => {
	// 	onValue(stateRef, (snapshot) => {
	// 		var state = snapshot.val()
	// 		setState(state)
	// 	})
	// }, [])

	return (
		<Layout view={view}>
			<Routes>
				<Route path="/" element={<Home state={state} setState={setState} setView={setView} />} />
				<Route path="/play" element={<CrewClient />} />
			</Routes>
		</Layout>
	)
}