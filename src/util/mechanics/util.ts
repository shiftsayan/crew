export function sortHand(hand) {
  hand.sort((card1, card2) => {
    return card1.suite === card2.suite
      ? card2.num - card1.num
      : card1.suite < card2.suite
      ? -1
      : 1;
  });
}
