import { useEffect, useState } from "react";

import { ref, update } from "@firebase/database";

import { database } from "../services/firebase";

export function Reset() {
  const [crewName] = useState("thethecrewcrew");

  useEffect(() => {
    if (crewName) {
      update(ref(database), {
        [`crews/${crewName}/phase`]: "Preflight",
        [`crews/${crewName}/players`]: {},
        [`crews/${crewName}/goals`]: [],
        // [`crews/${crewName}/active`]: {
        //   shift: false,
        //   sml: false,
        //   thepinetree: false,
        //   Steven: false,
        //   mewtwo: false,
        // },
        [`crews/${crewName}/played_cards`]: [],
        [`crews/${crewName}/tricks`]: [],
        [`crews/${crewName}/leading_trick`]: [],
        [`crews/${crewName}/leading_suite`]: null,
        [`crews/${crewName}/leading_winner`]: null,
        [`crews/${crewName}/commander`]: null,
      });
    }
  }, [crewName]);

  return (
    <>
      {crewName ? (
        <>Resetting `{crewName}`...</>
      ) : (
        <>Set `crewName` state variable using React Developer Tools</>
      )}
    </>
  );
}
