import shuffle from "lodash/shuffle";

function Setup(ctx, setupData) {
    const G = {}

    var cards = []
    for (var num = 1; num <= 9; num++)
        for (var suite of ['blue', 'red', 'green', 'yellow'])
            cards.push({'num': num, 'suite': suite})
    for (num = 1; num <= 4; num++)
        cards.push({'num': num, 'suite': 'black'})
    G.cards = shuffle(cards)

    G.mission = (setupData && setupData.mission) || 'planetx_1'
    G.reception_dead_spot = false

    G.numGoals = 2 // TODO
    
    for (var i = 0; i < ctx.numPlayers; i++)
        G.players[i.toString()] = { 
            hand: [], 
            canCommunicate: false,
            communication: null,
        }
    
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
    for (var num = 1; num <= 9; num++)
        for (var suite of ['blue', 'red', 'green', 'yellow'])
            goals.push({'num': num, 'suite': suite, 'player': null}) // TODO
    goals = shuffle(goals)
    
    for (var i = 0; i < G.numGoals; i++) {
        G.goals.push(goals[i])
    }
}

function ChooseGoals(G, ctx, idx) {
    if (G.goals[idx].player === null) {
        G.goals[idx].player = ctx.currentPlayer
        ctx.events.endTurn()
    }
}

function Communicate(G, ctx, isCommunicating, card, order) {
    if (G.player[ctx.currentPlayer].canCommunicate && isCommunicating && card.suite !== 'black') {
        G.player[ctx.currentPlayer].canCommunicate = false
        G.player.communication = {'card': card, 'order': G.reception_dead_spot ? null : order}
    }
}

export const Crew = {
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
            next: 'Communicate'
        },
        
        Communicate: {
            moves: { Communicate }
        }
    },
};