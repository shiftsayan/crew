import queryString from 'query-string'

import { CrewClient } from "./Client"
import { getColorPalette } from "../util/color"

function App() {
	const values = queryString.parse(window.location.search)

	return <CrewClient
		numPlayers={values.numPlayers || 5}
		colors={getColorPalette('red')}
	/>
}

export default App