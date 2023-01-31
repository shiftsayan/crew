// import shuffle from "lodash/shuffle";

// import { missions } from "../util/missions"

// const COMMANDER_STARTS = {
// 	first: (G, ctx) => G.commander,
// 	next: (G, ctx) => (ctx.playOrderPos + 1) % ctx.numPlayers,
// }

// const SUITES = ["blue", "red", "green", "yellow", "black"]
// const TRUMP_SUIT = "black"

// const names = ["alpha", "beta", "gamma", "deltaaaaaaaaaa", "epsilon"]

// export const CrewGame = {
// 	minPlayers: 4,
// 	maxPlayers: 5,

// 	setup: Setup,

// 	phases: {
// 		DealCards: {
// 			start: true,
// 			onBegin: DealCards,
// 			next: "DealGoals",
// 		},

// 		DealGoals: {
// 			onBegin: DealGoals,
// 			endIf: (G) => G.goals.length === G.num_goals,
// 			next: "ChooseGoals",
// 		},

// 		ChooseGoals: {
// 			moves: { ToggleGoal },
// 			turn: {
// 				order: COMMANDER_STARTS
// 			},
// 			endIf: (G) => G.goals.every((goal) => goal.player !== undefined),
// 			next: 'GoldenBorder',
// 		},

// 		GoldenBorder: {
// 			moves: { AllowExchange },
// 			turn: {
// 				order: COMMANDER_STARTS,
// 				stages: {
// 					GoldenBorderDiscard: {
// 						moves: { ToggleGoal },
// 						next: "GoldenBorderAccept",
// 					},

// 					GoldenBorderAccept: {
// 						moves: { ToggleGoal },
// 					}
// 				}
// 			},
// 			endIf: (G) => !G.golden_border || G.allow_exchange === false || G.goal_exchanged,
// 			next: "Communicate"
// 		},

// 		// Limbo: {
// 		// 	moves: { Communicate, StartTrick },
// 		// },

// 		Communicate: {
// 			moves: { Communicate },
// 			next: "PlayTrick",
// 		},

// 		PlayTrick: {
// 			moves: { PlayTrick },
// 			on_end: EndTrick,
// 		},
// 	},

// };

// function Setup(ctx, setupData) {
// 	setupData = {
// 		thisPlayer: 2,
// 		mission: {
// 			num: 6,
// 			version: "planet_x"
// 		},
// 		team: {
// 			name: "The Shift Crew",
// 			icon: "🚀",
// 		}
// 	}

// 	const G = {}

// 	G.suites = SUITES
// 	G.trump_suit = TRUMP_SUIT

// 	G.thisPlayer = setupData.thisPlayer
// 	G.mission = setupData.mission
// 	G.team = setupData.team

// 	G.cards = []
// 	G.goals = []
// 	for (let suite of SUITES) {
// 		for (let num = 1; num <= (suite === G.trump_suit ? 4 : 9); num++) {
// 			G.cards.push({ num: num, suite: suite })
// 		}
// 	}

// 	const mission_details = missions[G.mission.version][G.mission.num]
// 	G.num_goals = mission_details.num_goals
// 	G.orders = mission_details.orders || []

// 	G.golden_border = mission_details.golden_border
// 	G.goal_exchanged = false
// 	// sick
// 	// dead_spot
// 	// win_with_one
// 	// non_communicator
// 	// winners

// 	G.players = {}
// 	G.num_players = ctx.numPlayers
// 	for (let i = 0; i < ctx.numPlayers; i++) {
// 		G.players[i] = {
// 			name: names[i],
// 			hand: [],
// 			goals: [],
// 			canCommunicate: false,
// 			communication: null,
// 		}
// 	}

// 	G.num_tricks = Math.floor(G.cards.length / ctx.numPlayers)

// 	G.current_trick = [];
// 	G.all_tricks = [];

// 	G.lost = false;

// 	return G;
// }

// function DealCards(G, ctx) {
// 	var cards = shuffle([...G.cards])

// 	var player = 0

// 	while (cards.length !== 0) {
// 		var card = cards.pop()
// 		if (card.suite === "black" && card.num === 4) {
// 			G.commander = player
// 		}
// 		G.players[player].hand.push(card)
// 		player = (player + 1) % ctx.numPlayers
// 	}

// 	ctx.events.endPhase()
// }

// function DealGoals(G, ctx) {
// 	var cards = shuffle([...G.cards])

// 	var i = 0
// 	while (i !== G.num_goals) {
// 		var card = cards.pop()
// 		if (card.suite !== G.trump_suit) {
// 			G.goals.push({
// 				...card,
// 				'order': G.orders[i]
// 			})
// 			i++
// 		}
// 	}
// }

// function ToggleGoal(G, ctx, idx) {
// 	// Do not allow choosing a goal that has already been chosen
// 	if (ctx.phase === "ChooseGoals" && G.goals[idx].player !== undefined) {
// 		console.error("Goal Already Selected")
// 		return
// 	}
// 	if (ctx.phase === "GoldenBorder" && G.allow_exchange === false) {

// 		return
// 	}

// 	var currentPlayer = parseInt(ctx.currentPlayer)
// 	// If goal is being selected   => newPlayer = currentPlayer
// 	// If goal is being deselected => newPlayer = undefined
// 	var newPlayer = G.goals[idx].player === undefined ? currentPlayer : undefined

// 	// Update goals with the newPlayer
// 	var goals = [...G.goals]
// 	var goal = {
// 		...goals[idx],
// 		'player': newPlayer,
// 	}
// 	goals[idx] = goal

// 	var player_goals = []
// 	if (newPlayer) {
// 		// If goal is being selected, concat goal to player's goals
// 		player_goals = G.players[currentPlayer].goals.concat(goal)
// 	}
// 	else {
// 		// If goal is being deselected, remove goal from player's goals
// 		player_goals = G.players[currentPlayer].goals.filter((_goal) => !(_goal.num === goal.num && _goal.suite === goal.suite))
// 	}

// 	var goal_exchanged = G.exchanged_goals
// 	if (ctx.phase === "ChooseGoals") {
// 		ctx.events.endTurn()
// 	}
// 	else if (ctx.phase === "GoldenBorder") {
// 		// Record that goals were exchanged in the GoldenBorder phase
// 		if (G.allow_exchange && newPlayer) {
// 			goal_exchanged = true
// 		}
// 		else {
// 			ctx.events.setActivePlayers({ 'all': 'GoldenBorderAccept' })
// 		}
// 	}

// 	return {
// 		...G,
// 		'goals': goals,
// 		'players': {
// 			...G.players,
// 			[currentPlayer]: {
// 				...G.players[currentPlayer],
// 				'goals': player_goals,
// 			},
// 		},
// 		'goal_exchanged': goal_exchanged,
// 	}
// }

// function AllowExchange(G, ctx, allow) {
// 	if (allow) {
// 		ctx.events.setActivePlayers({ 'all': 'GoldenBorderDiscard' })
// 	}
// 	return {
// 		...G,
// 		'allow_exchange': allow,
// 	}
// }

// function Communicate(G, ctx, isCommunicating, card, order) {
// 	if (!isCommunicating) return;

// 	if (!G.player[ctx.currentPlayer].canCommunicate) {
// 		if (G.player.communication !== null)
// 			throw new Error("Player Already Communicated");
// 		else throw new Error("Player Not Allowed To Communicate");
// 	}

// 	if (card.suite === G.trump_suit) throw new Error("Cannot Communicate Rockets"); // TODO

// 	G.player[ctx.currentPlayer].canCommunicate = false;
// 	G.player.communication = {
// 		card: card,
// 		order: G.dead_spot ? null : order,
// 	};
// }

// function PlayTrick(G, ctx, card) {
// 	if (!G.players[ctx.currentPlayer].hand.includes(card))
// 		throw new Error("Card Not Possessed");

// 	if (
// 		G.current_trick !== [] && // this is not a new trick
// 		G.current_trick[0].suite !== card.suite && // and the suite does not match the trick suit
// 		!G.players[ctx.currentPlayer].hand.every(
// 			(_card) => _card.suite !== card.suite // even though the player has it
// 		)
// 	)
// 		throw new Error("Must Play Card of Same Suite When Possible");

// 	G.players[ctx.currentPlayer].hand.splice(
// 		G.players[ctx.currentPlayer].hand.indexOf(card),
// 		1
// 	)
// 	G.current_trick.push({ player: ctx.currentPlayer, card: card })

// 	ctx.events.endTurn()
// }

// function EndTrick(G, ctx) {
// 	var winner = null;
// 	var winnerNum = null;
// 	var winnerSuite = null;
// 	for (let play of G.current_trick) {
// 		if (
// 			(play.card.suite === winnerSuite && play.card.num > winnerNum) ||
// 			play.card.suite === G.trump_suit
// 		) {
// 			winner = play.player;
// 			winnerNum = play.card.num;
// 			winnerSuite = play.card.suite;
// 		}
// 	}

// 	for (let goal of G.goals) {
// 		if (G.current_trick.some((play) => play.card === goal.card)) {
// 			if (goal.player === winner) {
// 				goal.accomplished = true;
// 			} else {
// 				G.lost = true;
// 			}
// 		}
// 	}

// 	G.all_tricks.push({ winner: winner, trick: G.current_trick });
// 	G.current_trick = [];
// }

export {};
