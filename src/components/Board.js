import { getColorPalette } from "../util/color"

import { CrewHands } from "./Hands";
import { CrewPile } from "./Pile";
import { CrewHUD } from "./HUD";
import { CrewLayout } from "./Layout";
import { CrewConsole } from "./Console"

const cards = [
	{ 'num': '1', 'suite': 'red' },
	{ 'num': '4', 'suite': 'black' },
	{ 'faceDown': true },
]

export function CrewBoard(props) {
	return ( // TODO: unhardcode color palette
		<CrewLayout color={getColorPalette('red')}>
			{/* <CrewHands players={props.G.players} currentPlayer={props.ctx.currentPlayer} numPlayers={props.ctx.numPlayers} /> */}
			{/* <CrewPile cards={cards} /> */}
			<CrewConsole
				numPlayers={parseInt(props.ctx.numPlayers)}
				thisPlayer={2}
				currentPlayer={parseInt(props.ctx.currentPlayer)}
				hand={props.G.players[2].hand}
			/>
			<CrewHUD />
		</CrewLayout>
	)
}