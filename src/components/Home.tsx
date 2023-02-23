import { TextField, Button as MUIButton } from "@mui/material";
import classnames from "classnames";
import { useState } from "react";
import { Login } from "../util/actions/login";
import { PALETTES } from "../util/theme/palette";
import { Button } from "./Button";

export function Home({ state, setState }) {
  const [crewName, setCrewName] = useState("");

  return (
    <div className="flex justify-center">
      <div className="bg-gray-100 rounded-2xl p-12">
        <Form>
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
          <div className="flex justify-between py-1">
            {PALETTES.map((palette) => (
              <div
                className={classnames(
                  "bg-white w-10 h-10 rounded-full bg-gradient-to-tl cursor-pointer",
                  palette,
                  "hover:ring-4 hover:ring-offset-2 hover:ring-indigo-300 duration-300",
                  {
                    "ring-4 ring-offset-2 ring-indigo-500 hover:ring-indigo-500":
                      palette === state.palette,
                  }
                )}
                onClick={() => setState({ ...state, palette })}
              />
            ))}
          </div>
          <div className="w-32">
            <Button onClick={() => new Login(state, setState).run(crewName)}>
              Login
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}

function Form({ children }) {
  return (
    <form className="w-72 mx-auto flex flex-col space-y-4">{children}</form>
  );
}
