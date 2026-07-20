import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app.js";
import "./styles.css";

const root = document.getElementById("root");
if (root === null) throw new Error("Desktop root element is missing.");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
