import { getColorPalette } from "../util/color"

import { CrewHUD } from "./HUD";
import { CrewLayout } from "./Layout";
import { CrewConsole } from "./Console"

const cards = [
	{ 'num': '1', 'suite': 'red' },
	{ 'num': '4', 'suite': 'black' },
	{ 'faceDown': true },
]

export function CrewBoard(props) {
	const color = getColorPalette('pink') // TODO
	return (
		<CrewLayout color={color}>
			<CrewConsole
				numPlayers={parseInt(props.ctx.numPlayers)}
				thisPlayer={2}
				currentPlayer={parseInt(props.ctx.currentPlayer)}
				hand={props.G.players[2].hand}
				color={color}
			/>
			<CrewHUD />
		</CrewLayout>
	)
}