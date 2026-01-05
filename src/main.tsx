import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log('🚀 Deployment Timestamp: 2026-01-05T00:40:36 (Bunker Buster)');
import { TaskProvider } from "./context/TaskContext";

createRoot(document.getElementById("root")!).render(
  <TaskProvider>
    <App />
  </TaskProvider>
);
