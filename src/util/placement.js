export function calculatePi(player, currentPlayer, numPlayers) {
    // First player has pi = 0 (bottom) always
    if (player === currentPlayer) {
        return 0
    }

    // Second player has pi = 1 (right) always
    if (player === (currentPlayer + 1) % numPlayers) {
        return 1
    }

    // Third player has pi = 3 (left) with 3 players and 2 (top) otherwise
    if (player === (currentPlayer + 2) % numPlayers) {
        return numPlayers === 3 ? 3 : 2
    }

    // Fourth player has pi = 3 (left) with 4 players and 2 (top) otherwise
    if (player === (currentPlayer + 3) % numPlayers) {
        return numPlayers === 4 ? 3 : 2
    }

    // Fifth player has pi = 3 (left) always
    if (player === (currentPlayer + 4) % numPlayers) {
        return 3
    }
}