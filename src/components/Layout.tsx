import classnames from "classnames";

import { Snackbar, Alert } from "@mui/material";
import { CrewStateType } from "../util/types";

type LayoutProps = {
  state: CrewStateType;
  setState: React.Dispatch<React.SetStateAction<CrewStateType>>;
  children: React.ReactNode;
};

export function Layout({ children, state, setState }: LayoutProps) {
  return (
    <div
      className={classnames(
        "h-screen w-screen",
        "animate-gradient bg-[length:400%_400%] bg-gradient-to-b",
        "bg-gradient-to-b from-gray-600 via-gray-800 to-black"
      )}
    >
      <div className="h-full w-full flex flex-col space-y-8 justify-center">
        {children}
      </div>
      <Snackbar
        open={state.toast.show}
        autoHideDuration={3000}
        onClose={() => setState({ ...state, toast: { show: false } })}
      >
        <Alert severity={state.toast.style}>{state.toast.message}</Alert>
      </Snackbar>
    </div>
  );
}
