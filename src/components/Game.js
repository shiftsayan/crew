import shuffle from "lodash/shuffle";

function Setup(ctx, setupData) {
    const G = {}

    var cards = []
    for (let num = 1; num <= 9; num++)
        for (let suite of ['blue', 'red', 'green', 'yellow'])
            cards.push({'num': num, 'suite': suite})
    for (let num = 1; num <= 4; num++)
        cards.push({'num': num, 'suite': 'black'})
    G.cards = shuffle(cards)

    G.mission = (setupData && setupData.mission) || 'planetx_1'
    G.reception_dead_spot = false

    G.numGoals = 2 // TODO
    
    G.players = {}
    for (let i = 0; i < ctx.numPlayers; i++)
        G.players[i.toString()] = { 
            hand: [], 
            canCommunicate: false,
            communication: null,
        }
    
    G.goals = []

    G.currentTrick = []
    G.allTricks = []

    G.lost = false

    return G
}

function DealCards(G, ctx) {
    var player = 0
    while (G.cards.length !== 0) {
        var card = G.cards.pop()
        if (card.suite === 'black' && card.num === 4)
            G.commander = player
        G.players[player.toString()].hand.push(card)
        player = (player + 1) % ctx.numPlayers
    }
}

function DealGoals(G, ctx) {
    var goals = []
    for (let num = 1; num <= 9; num++)
        for (let suite of ['blue', 'red', 'green', 'yellow'])
            goals.push({'card': {'num': num, 'suite': suite}, 'player': null, 'accomplished': false})
    goals = shuffle(goals)
    
    for (let i = 0; i < G.numGoals; i++) {
        G.goals.push(goals[i])
    }
}

function ChooseGoals(G, ctx, idx) {
    if (G.goals[idx].player !== null)
        throw new Error("Goal Already Chosen")
    
    G.goals[idx].player = ctx.currentPlayer
    // TODO: If only 1 goal remains, auto-assign it.
    ctx.events.endTurn() // TODO
}

function Communicate(G, ctx, isCommunicating, card, order) {
    if (!isCommunicating)
        return;
    
    if (!G.player[ctx.currentPlayer].canCommunicate) {
        if (G.player.communication !== null)
            throw new Error("Player Already Communicated")
        else
            throw new Error("Player Not Allowed To Communicate")
    }

    if (card.suite === 'black')
        throw new Error("Cannot Communicate Rockets") // TODO
    
    G.player[ctx.currentPlayer].canCommunicate = false
    G.player.communication = {'card': card, 'order': G.reception_dead_spot ? null : order}
}

function PlayTrick(G, ctx, card) {
    if (!G.players[ctx.currentPlayer].hand.includes(card))
        throw new Error("Card Not Possessed")
    
    if (G.currentTrick !== [] // this is not a new trick
        && G.currentTrick[0].suite !== card.suite // and the suite does not match the trick suit
        && !G.players[ctx.currentPlayer].hand.every(_card => _card.suite !== card.suite)) // even though the player has it
        throw new Error("Must Play Card of Same Suite When Possible")

    G.players[ctx.currentPlayer].hand.splice(G.players[ctx.currentPlayer].hand.indexOf(card), 1)
    G.currentTrick.push({'player': ctx.currentPlayer, 'card': card})

    ctx.events.endTurn()
}

function EndTrick(G, ctx) {
    var winner = null
    var winnerNum = null
    var winnerSuite = null
    for (let play of G.currentTrick) {
        if ((play.card.suite === winnerSuite && play.card.num > winnerNum) || play.card.suite === 'black') {
            winner = play.player
            winnerNum = play.card.num
            winnerSuite = play.card.suite
        }
    }

    for (let goal of G.goals) {
        if (G.currentTrick.some(play => (play.card === goal.card))) {
            if (goal.player === winner) {
                goal.accomplished = true
            }
            else {
                G.lost = true
            }
        }
    }
    
    G.allTricks.push({'winner': winner, 'trick': G.currentTrick})
    G.currentTrick = []
}

export const CrewGame = {
    minPlayers: 3,
    maxPlayers: 5,

    setup: Setup,

    phases: {
        DealCards: {
            start: true,
            onBegin: DealCards,
            endIf: G => (G.cards.length <= 0),
            next: 'DealGoals',
        },

        DealGoals: {
            onBegin: DealGoals,
            endIf: G => (G.goals.length === G.numGoals),
            next: 'ChooseGoals',
        },

        ChooseGoals: {
            moves: { ChooseGoals },
            endIf: G => (G.goals.every(goal => goal.player !== null)),
            // next: 'Communicate',
            next: 'PlayTrick',
        },
        
        Communicate: {
            moves: { Communicate },
            next: 'PlayTrick',
        },

        PlayTrick: {
            moves: { PlayTrick },
            onEnd: EndTrick,
        },
    },
};