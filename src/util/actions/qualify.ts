import { Communication } from '../enums';
import { Move } from './move';

export class Qualify extends Move {
	async validateParams(qualifer: Communication, disabled: boolean) {
		// TODO: Add dead spot check
		// TODO: Add correctness check
		return !disabled && this.game.players[this.state.player].communication.qualifier === Communication.Communicating
	}

	updateGame(qualifier: Communication, disabled: boolean) {
		return {
			players: {
				[this.state.player]: {
					communication: {
						qualifier: qualifier,
					}
				},
			},
		}
	}
}
