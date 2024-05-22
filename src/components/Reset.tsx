import { useEffect, useState } from "react";

import { ref, update } from "@firebase/database";

import { database } from "../services/firebase";

export function Reset() {
  const [crewName] = useState("thethecrewcrew");
  const [reset, setReset] = useState(false);

  useEffect(() => {
    async function resetCrew(crewName: string) {
      if (crewName) {
        await update(ref(database), {
          [`crews/${crewName}/phase`]: "Preflight",
          [`crews/${crewName}/players`]: {},
          [`crews/${crewName}/goals`]: [],
          [`crews/${crewName}/active`]: {
            shift: false,
            sml: false,
            thepinetree: false,
            Steven: false,
            mewtwo: false,
          },
          [`crews/${crewName}/played_cards`]: [],
          [`crews/${crewName}/tricks`]: [],
          [`crews/${crewName}/leading_trick`]: [],
          [`crews/${crewName}/leading_suite`]: null,
          [`crews/${crewName}/leading_winner`]: null,
          [`crews/${crewName}/commander`]: null,
        });
        setReset(true);
      }
    }

    resetCrew(crewName);
  }, [crewName]);

  return (
    <>{reset ? <>Reset `{crewName}`...</> : <>Resetting `{crewName}`...</>}</>
  );
}
