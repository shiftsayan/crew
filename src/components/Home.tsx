import { TextField, Button } from "@mui/material";
import { useState } from "react";
import { Login } from "../util/actions/login";

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
          <div className="w-32">
            <Button
              variant="contained"
              size="large"
              color={state.palette.accent}
              onClick={() => new Login(state, setState).run(crewName)}
              disableElevation
            >
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
