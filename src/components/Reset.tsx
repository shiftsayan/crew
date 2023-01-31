import { useEffect, useState } from "react";

import { ref, update } from "@firebase/database";

import { database } from "../services/firebase";

export function Reset() {
  const [crewname] = useState("thethecrewcrew");

  useEffect(() => {
    if (crewname) {
      update(ref(database), {
        [`crews/${crewname}/phase`]: "Preflight",
        [`crews/${crewname}/players`]: {},
        [`crews/${crewname}/goals`]: [],
        [`crews/${crewname}/played_cards`]: [],
        [`crews/${crewname}/tricks`]: [],
        [`crews/${crewname}/leading_trick`]: [],
        [`crews/${crewname}/leading_suite`]: null,
        [`crews/${crewname}/leading_winner`]: null,
        [`crews/${crewname}/commander`]: null,
      });
    }
  }, [crewname]);

  return (
    <>
      {crewname ? (
        <>Resetting `{crewname}`...</>
      ) : (
        <>Set `crewname` state variable using React Developer Tools</>
      )}
    </>
  );
}
