import classnames from "classnames";

import { Alert, Snackbar } from "@mui/material";
import { CrewStateType } from "../util/types";

type LayoutProps = {
  state: CrewStateType;
  setState: React.Dispatch<React.SetStateAction<CrewStateType>>;
  children: React.ReactNode;
};

export function Layout({ children, state, setState }: LayoutProps) {
  return (
    <div className={classnames("h-screen w-screen bg-indigo-700")}>
      <div className="h-full w-full flex flex-col space-y-8 justify-center">
        {children}
      </div>
      <Snackbar
        open={state.toast.show}
        autoHideDuration={3000}
        onClose={() =>
          setState({ ...state, toast: { ...state.toast, show: false } })
        }
      >
        <Alert severity={state.toast.style} variant="filled">
          {state.toast.message}
        </Alert>
      </Snackbar>
    </div>
  );
}
