import ReactDOM from "react-dom";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import reportWebVitals from "./reportWebVitals";
import "./index.css";

import { App } from "./components/App";
import { Reset } from "./components/Reset";

ReactDOM.render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/reset" element={<Reset />} />
    </Routes>
  </BrowserRouter>,
  document.getElementById("root")
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
