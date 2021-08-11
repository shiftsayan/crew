import queryString from 'query-string'

import { CrewClient } from "./Client"

function App() {
	const values = queryString.parse(window.location.search)

	return <CrewClient 
		numPlayers={values.numPlayers || 3}
	/>
} 

export default App