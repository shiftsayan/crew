import { getColorPalette } from "../util/color"

import { CrewHUD } from "./HUD";
import { CrewLayout } from "./Layout";
import { CrewConsole } from "./Console"

export function CrewBoard(props) {
	const thisPlayer = 2
	const color = getColorPalette('pink') // TODO
	return (
		<CrewLayout color={color}>
			<CrewConsole
				numPlayers={parseInt(props.ctx.numPlayers)}
				thisPlayer={thisPlayer}
				currentPlayer={parseInt(props.ctx.currentPlayer)}
				hand={props.G.players[thisPlayer].hand}
				color={color}
			/>
			<CrewHUD />
		</CrewLayout>
	)
}