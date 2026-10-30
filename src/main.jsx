import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App.jsx"

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
)

// Le « service worker » permet d'installer NouD comme une app
// et d'afficher les notifications sur téléphone
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js")
}
