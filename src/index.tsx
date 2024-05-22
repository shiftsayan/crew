import ReactDOM from "react-dom";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import "./index.css";

import { App } from "./components/App";
import { Reset } from "./components/Reset";
import { Tasks } from "./components/Tasks";

ReactDOM.render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/reset" element={<Reset />} />
      <Route path="/tasks" element={<Tasks />} />
    </Routes>
  </BrowserRouter>,
  document.getElementById("root")
);
