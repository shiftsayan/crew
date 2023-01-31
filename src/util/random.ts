import { mergeWith, isArray } from "lodash";

// https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
export function shuffle(array) {
  let currentIndex = array.length,
    randomIndex;

  // While there remain elements to shuffle...
  while (currentIndex !== 0) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}

export function choice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

export function mergeUpdates(data, updates) {
  mergeWith(data, updates, (_, updatedValue) =>
    isArray(updatedValue) ? updatedValue : undefined
  );
}
