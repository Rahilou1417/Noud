import { useState } from "react"
import { nouvelId } from "../outils"

// Les 3 colonnes du tableau
const COLONNES = [
  { id: "afaire", nom: "À faire", emoji: "📝" },
  { id: "encours", nom: "En cours", emoji: "🚀" },
  { id: "termine", nom: "Terminé", emoji: "✅" },
]

// Les étiquettes de priorité
const PRIORITES = {
  basse: { nom: "Tranquille", couleur: "var(--secondaire)" },
  moyenne: { nom: "Normal", couleur: "#E8C15A" },
  haute: { nom: "Urgent", couleur: "var(--principal)" },
}

// Le tableau Kanban : on déplace ses cartes de gauche à droite
function Kanban({ cartes, setCartes, gagnerPoints }) {
  const [titre, setTitre] = useState("")
  const [priorite, setPriorite] = useState("moyenne")
  const [erreur, setErreur] = useState("")
  const [carteTiree, setCarteTiree] = useState(null) // la carte qu'on déplace à la souris
  const [colonneSurvolee, setColonneSurvolee] = useState(null)

  // Ajoute une carte dans « À faire »
  function ajouter(e) {
    e.preventDefault()
    if (!titre.trim()) return setErreur("Écris le nom de la tâche")
    setCartes([...cartes, { id: nouvelId(), titre: titre.trim(), priorite, colonne: "afaire" }])
    setTitre("")
    setErreur("")
  }

  // Déplace une carte vers une autre colonne
  function deplacer(id, versColonne) {
    const carte = cartes.find((c) => c.id === id)
    if (!carte || carte.colonne === versColonne) return
    // 5 points quand une carte arrive dans « Terminé », on les retire si elle en ressort
    if (versColonne === "termine") gagnerPoints(5)
    if (carte.colonne === "termine") gagnerPoints(-5)
    setCartes(cartes.map((c) => (c.id === id ? { ...c, colonne: versColonne } : c)))
  }

  // Déplace vers la colonne de gauche (-1) ou de droite (+1)
  function decaler(carte, sens) {
    const index = COLONNES.findIndex((col) => col.id === carte.colonne)
    const nouvelle = COLONNES[index + sens]
    if (nouvelle) deplacer(carte.id, nouvelle.id)
  }

  function supprimer(id) {
    setCartes(cartes.filter((c) => c.id !== id))
  }

  function viderTermine() {
    if (confirm("Effacer toutes les cartes terminées ?")) {
      setCartes(cartes.filter((c) => c.colonne !== "termine"))
    }
  }

  return (
    <div>
      <h1>Mon tableau 📋</h1>
      <p className="discret">Fais glisser tes cartes, ou utilise les flèches ← →</p>

      {/* Ajouter une carte */}
      <form className="kanban-ajout" onSubmit={ajouter}>
        <input
          value={titre}
          onChange={(e) => { setTitre(e.target.value); setErreur("") }}
          placeholder="Préparer mon exposé"
          aria-label="Nouvelle tâche"
        />
        <select value={priorite} onChange={(e) => setPriorite(e.target.value)} aria-label="Priorité">
          {Object.entries(PRIORITES).map(([cle, p]) => (
            <option key={cle} value={cle}>
              {p.nom}
            </option>
          ))}
        </select>
        <button type="submit" className="bouton plein">
          + Ajouter
        </button>
      </form>
      {erreur && <p className="erreur">{erreur}</p>}

      {/* Les 3 colonnes */}
      <div className="kanban">
        {COLONNES.map((col, index) => {
          const liste = cartes.filter((c) => c.colonne === col.id)
          return (
            <section
              key={col.id}
              className={colonneSurvolee === col.id ? "kanban-colonne survolee" : "kanban-colonne"}
              onDragOver={(e) => { e.preventDefault(); setColonneSurvolee(col.id) }}
              onDragLeave={() => setColonneSurvolee(null)}
              onDrop={() => {
                if (carteTiree) deplacer(carteTiree, col.id)
                setCarteTiree(null)
                setColonneSurvolee(null)
              }}
            >
              <div className="kanban-entete">
                <h2>
                  {col.emoji} {col.nom}
                </h2>
                <span className="kanban-compteur">{liste.length}</span>
              </div>

              {liste.length === 0 && <p className="discret centre petit">Rien ici pour l'instant</p>}

              {liste.map((carte) => {
                const p = PRIORITES[carte.priorite] || PRIORITES.moyenne
                return (
                  <div
                    key={carte.id}
                    className={carte.colonne === "termine" ? "kanban-carte finie" : "kanban-carte"}
                    style={{ borderLeftColor: p.couleur }}
                    draggable
                    onDragStart={() => setCarteTiree(carte.id)}
                    onDragEnd={() => { setCarteTiree(null); setColonneSurvolee(null) }}
                  >
                    <div className="kanban-carte-haut">
                      <span className="kanban-titre">{carte.titre}</span>
                      <button className="lien" onClick={() => supprimer(carte.id)} aria-label="Supprimer">
                        ✕
                      </button>
                    </div>
                    <div className="kanban-carte-bas">
                      <span className="kanban-etiquette" style={{ background: p.couleur }}>
                        {p.nom}
                      </span>
                      <span>
                        {index > 0 && (
                          <button className="fleche" onClick={() => decaler(carte, -1)} aria-label="Colonne précédente">
                            ←
                          </button>
                        )}
                        {index < COLONNES.length - 1 && (
                          <button className="fleche" onClick={() => decaler(carte, 1)} aria-label="Colonne suivante">
                            →
                          </button>
                        )}
                      </span>
                    </div>
                  </div>
                )
              })}

              {col.id === "termine" && liste.length > 0 && (
                <button className="lien petit" onClick={viderTermine}>
                  Effacer les cartes terminées
                </button>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}

export default Kanban
