import { TextField } from "@mui/material";
import { useState } from "react";
import { Login } from "../util/actions/login";
import { CrewStateType } from "../util/types";
import { Button } from "./Button";

type HomeProps = {
  state: CrewStateType;
  setState: React.Dispatch<React.SetStateAction<CrewStateType>>;
};

export function Home({ state, setState }: HomeProps) {
  const [crewName, setCrewName] = useState("");

  return (
    <div className="flex justify-center">
      <div className="bg-gray-100 rounded-2xl p-12">
        <form className="w-72 mx-auto flex flex-col space-y-4">
          <TextField
            label="Crew Name"
            value={crewName}
            onChange={(e) => setCrewName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                new Login(state, setState).run(crewName);
              }
            }}
            required
          />
          <div className="w-32">
            <Button onClick={() => new Login(state, setState).run(crewName)}>
              Login
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
