import { useState, useEffect } from "react"
import { useStockage } from "./useStockage"
import { useRappels } from "./useRappels"
import Aujourdhui from "./ecrans/Aujourdhui"
import Objectifs from "./ecrans/Objectifs"
import Planning from "./ecrans/Planning"
import Kanban from "./ecrans/Kanban"
import Concentration from "./ecrans/Concentration"
import Reglages from "./ecrans/Reglages"

// Les 6 écrans de l'app, affichés dans le menu en haut à droite
const ONGLETS = [
  { id: "aujourdhui", nom: "Aujourd'hui", emoji: "🏠" },
  { id: "objectifs", nom: "Objectifs", emoji: "🎯" },
  { id: "planning", nom: "Planning", emoji: "🗓️" },
  { id: "kanban", nom: "Tableau", emoji: "📋" },
  { id: "concentration", nom: "Focus", emoji: "⏳" },
  { id: "reglages", nom: "Moi", emoji: "🌙" },
]

function App() {
  // L'écran affiché en ce moment
  const [onglet, setOnglet] = useState("aujourdhui")
  // Le menu en haut à droite : ouvert ou fermé
  const [menuOuvert, setMenuOuvert] = useState(false)

  // La touche Échap ferme le menu
  useEffect(() => {
    if (!menuOuvert) return
    function touche(e) {
      if (e.key === "Escape") setMenuOuvert(false)
    }
    window.addEventListener("keydown", touche)
    return () => window.removeEventListener("keydown", touche)
  }, [menuOuvert])

  // Change de page, ferme le menu et remonte en haut
  function allerA(id) {
    setOnglet(id)
    setMenuOuvert(false)
    window.scrollTo(0, 0)
  }

  // Toutes les données, gardées dans le navigateur
  const [profil, setProfil] = useStockage("profil", { prenom: "", coucher: "23:00", reveil: "07:00" })
  const [objectifs, setObjectifs] = useStockage("objectifs", [])
  const [blocs, setBlocs] = useStockage("blocs", [])
  const [points, setPoints] = useStockage("points", 0)
  const [cartes, setCartes] = useStockage("kanban", [])

  // Les rappels tournent en fond, quel que soit l'écran
  useRappels({ blocs, coucher: profil.coucher, reveil: profil.reveil })

  // Ajoute des points (ou en retire si le nombre est négatif)
  function gagnerPoints(nombre) {
    setPoints((p) => Math.max(0, p + nombre))
  }

  // Ce qu'on donne à chaque écran
  const donnees = { profil, setProfil, objectifs, setObjectifs, blocs, setBlocs, cartes, setCartes, points, gagnerPoints, setOnglet: allerA }

  return (
    <div className="app">
      {/* La barre du haut */}
      <header className="entete">
        <button className="logo" onClick={() => allerA("aujourdhui")}>
          NouD 🌙
        </button>
        <button
          className="bouton-menu"
          onClick={() => setMenuOuvert(!menuOuvert)}
          aria-label={menuOuvert ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={menuOuvert}
        >
          {menuOuvert ? "✕" : "☰"}
        </button>
      </header>

      {/* Le menu, visible seulement quand il est ouvert */}
      {menuOuvert && (
        <>
          <div className="voile" onClick={() => setMenuOuvert(false)} />
          <nav className="menu" aria-label="Menu">
            {ONGLETS.map((o) => (
              <button
                key={o.id}
                className={onglet === o.id ? "onglet actif" : "onglet"}
                onClick={() => allerA(o.id)}
              >
                <span className="onglet-emoji">{o.emoji}</span>
                <span>{o.nom}</span>
              </button>
            ))}
          </nav>
        </>
      )}

      <main className="contenu">
        {onglet === "aujourdhui" && <Aujourdhui {...donnees} />}
        {onglet === "objectifs" && <Objectifs {...donnees} />}
        {onglet === "planning" && <Planning {...donnees} />}
        {onglet === "kanban" && <Kanban {...donnees} />}
        {onglet === "concentration" && <Concentration {...donnees} />}
        {onglet === "reglages" && <Reglages {...donnees} />}
      </main>
    </div>
  )
}

export default App
