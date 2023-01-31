import classnames from "classnames";

import { Snackbar, Alert } from "@mui/material";

export function Layout({ children, state, setState }) {
  return (
    <div
      className={classnames(
        "h-screen w-screen animate-gradient bg-[length:400%_400%] bg-gradient-to-tl",
        state.palette.background
      )}
    >
      <div className="h-full w-full flex flex-col space-y-8 justify-center">
        {children}
      </div>
      {state.toast && (
        <Snackbar
          open={state.show_toast}
          autoHideDuration={2000}
          onClose={() => setState({ ...state, show_toast: false })}
        >
          <Alert severity={state.toast.style}>{state.toast.text}</Alert>
        </Snackbar>
      )}
    </div>
  );
}
