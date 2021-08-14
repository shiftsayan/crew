import { CrewHands } from "./Hands";
import { CrewPile } from "./Pile";
import { CrewHUD } from "./HUD";
import { CrewLayout } from "./Layout";

const cards = [
	{ 'num': '1', 'suite': 'red' },
	{ 'num': '4', 'suite': 'black' },
	{ 'faceDown': true },
]

export function CrewBoard(props) {
	return (
		<CrewLayout>
			<CrewHands players={props.G.players} currentPlayer={props.ctx.currentPlayer} numPlayers={props.ctx.numPlayers} />
			{/* <CrewPile cards={cards} /> */}
			{/* <CrewHUD /> */}
		</CrewLayout>
	)
}