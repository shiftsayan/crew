import { TextField } from "@mui/material";
import { useState } from "react";
import { LoginAction } from "../util/actions/login";
import { CrewStateType } from "../util/types";
import { Button } from "./Button";

type LoginProps = {
  state: CrewStateType;
  setState: React.Dispatch<React.SetStateAction<CrewStateType>>;
};

export function Login({ state, setState }: LoginProps) {
  const [crewName, setCrewName] = useState("");

  return (
    <div className="flex justify-center flex-col space-y-6">
      <div className="w-96 bg-gray-100 rounded-2xl p-12 mx-auto">
        <form className="flex flex-col space-y-4">
          <TextField
            label="Crew Name"
            value={crewName}
            onChange={(e) => setCrewName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                new LoginAction(state, setState).run(crewName);
              }
            }}
            required
          />
          <div className="w-32">
            <Button
              onClick={() => new LoginAction(state, setState).run(crewName)}
            >
              Login
            </Button>
          </div>
        </form>
      </div>
      <div className="bg-gray-100 mx-auto px-4 py-2 rounded-full">
        <span>
          Fill{" "}
          <a
            href="https://forms.gle/pbkcejdFaiUE8W9S9"
            className="text-indigo-700 hover:underline transition duration-200 after:content-['_↗']"
          >
            this form
          </a>{" "}
          to play with your friends!
        </span>
      </div>
    </div>
  );
}
