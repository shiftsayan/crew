import { useEffect, useState } from "react";

import { ref, set } from "@firebase/database";

import { crewName, players } from "../config";
import { database } from "../services/firebase";
import { shuffle } from "../util/random";

export function Reset() {
  const [reset, setReset] = useState(false);

  useEffect(() => {
    async function resetCrew(crewName: string) {
      if (crewName) {
        await set(ref(database), {
          [`${crewName}`]: {
            current: 0,
            mission: {
              num: 1,
              attempt: 1,
              version: "deepSea",
            },
            phase: "Preflight",
            active: {
              shift: false,
              sml: false,
              thepinetree: false,
              Steven: false,
              mewtwo: false,
            },
            numPlayers: 5,
            seating: shuffle(players),
            seatingTtl: Date.now() + 60 * 60 * 24 * 1000,
          },
        });

        // const game = (await get(child(ref(database), `crews/${username}`))).val();
        // const now = Date.now();
        // if (!game.seatingTtl || game.seatingTtl < now) {
        //   update(ref(database), {
        //     [`crews/${username}/seating`]: shuffle(Object.keys(game.active)),
        //     [`crews/${username}/seatingTtl`]: now + msInDay,
        //   });
        // }

        setReset(true);
      }
    }

    resetCrew(crewName);
  }, []);

  return <>{reset ? <>Reset</> : <>Resetting...</>}</>;
}
