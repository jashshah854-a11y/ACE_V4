import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { TaskProvider } from "./context/TaskContext";

createRoot(document.getElementById("root")!).render(
  <TaskProvider>
    <App />
  </TaskProvider>
);
