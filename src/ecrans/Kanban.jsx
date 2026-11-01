import { useState } from "react"
import { nouvelId } from "../outils"
import { reglerEtape, lienDeCarte, synchroniserCartes, POINTS } from "../actions"

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
function Kanban({ cartes, setCartes, objectifs, setObjectifs, gagnerPoints }) {
  const [titre, setTitre] = useState("")
  const [priorite, setPriorite] = useState("moyenne")
  const [lien, setLien] = useState("") // "idObjectif|idEtape", ou "" si la carte n'est liée à rien
  const [erreur, setErreur] = useState("")
  const [carteTiree, setCarteTiree] = useState(null) // la carte qu'on déplace à la souris
  const [colonneSurvolee, setColonneSurvolee] = useState(null)
  const [carteOuverte, setCarteOuverte] = useState(null) // la carte dont on voit la liste to-do

  // Les étapes qu'on peut lier : pas encore faites, et pas déjà sur le tableau
  const etapesDejaSurLeTableau = cartes.map((c) => c.etapeId).filter(Boolean)
  const grandsObjectifs = objectifs
    .filter((o) => o.type === "grand")
    .map((o) => ({ ...o, libres: o.etapes.filter((e) => !e.fait && !etapesDejaSurLeTableau.includes(e.id)) }))
    .filter((o) => o.libres.length > 0)

  // Quand on choisit une étape, son nom remplit la case si elle est vide
  function choisirLien(valeur) {
    setLien(valeur)
    if (!valeur || titre.trim()) return
    const [idObjectif, idEtape] = valeur.split("|")
    const etape = objectifs.find((o) => o.id === idObjectif)?.etapes.find((e) => e.id === idEtape)
    if (etape) setTitre(etape.titre)
    setErreur("")
  }

  // Ajoute une carte dans « À faire »
  function ajouter(e) {
    e.preventDefault()
    if (!titre.trim()) return setErreur("Écris le nom de la tâche")
    const carte = { id: nouvelId(), titre: titre.trim(), priorite, colonne: "afaire" }
    if (lien) {
      const [objectifId, etapeId] = lien.split("|")
      Object.assign(carte, { objectifId, etapeId })
    }
    setCartes([...cartes, carte])
    setTitre("")
    setLien("")
    setErreur("")
  }

  // Déplace une carte vers une autre colonne
  function deplacer(id, versColonne) {
    const carte = cartes.find((c) => c.id === id)
    if (!carte || carte.colonne === versColonne) return
    const arrive = versColonne === "termine"
    const repart = carte.colonne === "termine"
    const liee = lienDeCarte(objectifs, carte)
    const tache = objectifs.find((o) => o.id === carte.tacheId)

    if (tache) {
      // Carte liée à une tâche : on la marque faite / pas faite, elle rapporte ses propres points
      if (arrive && !tache.fait) {
        setObjectifs(objectifs.map((o) => (o.id === tache.id ? { ...o, fait: true } : o)))
        gagnerPoints(POINTS.tache)
      }
      if (repart && tache.fait) {
        setObjectifs(objectifs.map((o) => (o.id === tache.id ? { ...o, fait: false } : o)))
        gagnerPoints(-POINTS.tache)
      }
    } else if (liee) {
      // Carte liée à une étape : on coche / décoche l'étape, qui rapporte ses propres points
      if (arrive && !liee.etape.fait) {
        setObjectifs(reglerEtape(objectifs, liee.objectif.id, liee.etape.id, true))
        gagnerPoints(POINTS.etape)
      }
      if (repart && liee.etape.fait) {
        setObjectifs(reglerEtape(objectifs, liee.objectif.id, liee.etape.id, false))
        gagnerPoints(-POINTS.etape)
      }
    } else {
      // Carte simple : 5 points quand elle arrive dans « Terminé », on les retire si elle en ressort
      if (arrive) gagnerPoints(5)
      if (repart) gagnerPoints(-5)
    }
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

  // La to-do liste d'une carte vient de 3 endroits possibles :
  // - carte d'un grand objectif → ce sont les étapes de l'objectif
  // - carte d'une tâche → c'est la to-do liste de la tâche
  // - carte simple → elle a sa propre liste
  function todoDeCarte(carte) {
    const grand = objectifs.find((o) => o.id === carte.grandId && o.type === "grand")
    if (grand) return grand.etapes.map((e) => ({ id: e.id, texte: e.titre, fait: e.fait }))
    const tache = objectifs.find((o) => o.id === carte.tacheId)
    if (tache) return tache.todo || []
    return carte.todo || []
  }

  // Enregistre la nouvelle to-do liste au bon endroit
  function changerTodo(carte, nouvelle) {
    const grand = objectifs.find((o) => o.id === carte.grandId && o.type === "grand")
    if (grand) {
      // Les éléments cochés / décochés sont des étapes : elles rapportent (ou retirent) leurs points
      let difference = 0
      let cartesAJour = cartes
      const etapes = nouvelle.map((t) => {
        const avant = grand.etapes.find((e) => e.id === t.id)
        if (avant && avant.fait !== t.fait) {
          difference += t.fait ? POINTS.etape : -POINTS.etape
          cartesAJour = synchroniserCartes(cartesAJour, t.id, t.fait) // une carte liée à cette étape suit
        }
        return { id: t.id, titre: t.texte, fait: t.fait }
      })
      setObjectifs(objectifs.map((o) => (o.id === grand.id ? { ...o, etapes } : o)))
      if (cartesAJour !== cartes) setCartes(cartesAJour)
      if (difference) gagnerPoints(difference)
      return
    }
    const tache = objectifs.find((o) => o.id === carte.tacheId)
    if (tache) {
      setObjectifs(objectifs.map((o) => (o.id === tache.id ? { ...o, todo: nouvelle } : o)))
      return
    }
    setCartes(cartes.map((c) => (c.id === carte.id ? { ...c, todo: nouvelle } : c)))
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
        {grandsObjectifs.length > 0 && (
          <select
            className="kanban-lien"
            value={lien}
            onChange={(e) => choisirLien(e.target.value)}
            aria-label="Lier à un objectif"
          >
            <option value="">🎯 Lier à un objectif (facultatif)</option>
            {grandsObjectifs.map((o) => (
              <optgroup key={o.id} label={o.titre}>
                {o.libres.map((e) => (
                  <option key={e.id} value={`${o.id}|${e.id}`}>
                    {e.titre}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        )}
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
                const liee = lienDeCarte(objectifs, carte)
                const tache = objectifs.find((o) => o.id === carte.tacheId)
                const grand = objectifs.find((o) => o.id === carte.grandId && o.type === "grand")
                const todo = todoDeCarte(carte)
                const faits = todo.filter((t) => t.fait).length
                const ouverte = carteOuverte === carte.id
                return (
                  <div
                    key={carte.id}
                    className={carte.colonne === "termine" ? "kanban-carte finie" : "kanban-carte"}
                    style={{ borderLeftColor: p.couleur }}
                    draggable={!ouverte}
                    onDragStart={() => setCarteTiree(carte.id)}
                    onDragEnd={() => { setCarteTiree(null); setColonneSurvolee(null) }}
                  >
                    <div className="kanban-carte-haut">
                      <span className="kanban-titre">{carte.titre}</span>
                      <button className="lien" onClick={() => supprimer(carte.id)} aria-label="Supprimer">
                        ✕
                      </button>
                    </div>
                    {liee && <div className="kanban-objectif">🎯 {liee.objectif.titre}</div>}
                    {grand && <div className="kanban-objectif">🎯 Grand objectif · ses étapes sont dans la liste</div>}
                    {tache && (
                      <div className="kanban-objectif">
                        📌 Tâche{tache.date && ` · ${new Date(tache.date).toLocaleDateString("fr-FR")}`}
                      </div>
                    )}
                    {/* L'avancement de la liste, quand elle est fermée */}
                    {todo.length > 0 && !ouverte && (
                      <div className="todo-resume">
                        <span>☑️ {faits}/{todo.length}</span>
                        <div className="barre-progres">
                          <div style={{ width: (faits / todo.length) * 100 + "%" }} />
                        </div>
                      </div>
                    )}

                    {ouverte && <ListeTodo todo={todo} onChange={(nouvelle) => changerTodo(carte, nouvelle)} />}

                    <div className="kanban-carte-bas">
                      <span className="kanban-gauche">
                        <span className="kanban-etiquette" style={{ background: p.couleur }}>
                          {p.nom}
                        </span>
                        <button
                          className={ouverte ? "bouton-todo actif" : "bouton-todo"}
                          onClick={() => setCarteOuverte(ouverte ? null : carte.id)}
                          aria-expanded={ouverte}
                        >
                          {ouverte ? "Fermer" : "☑️ Liste"}
                        </button>
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

// La petite liste to-do (dans une carte du tableau, ou dans une tâche)
export function ListeTodo({ todo, onChange }) {
  const [texte, setTexte] = useState("")
  const [erreur, setErreur] = useState("")

  function ajouter(e) {
    e.preventDefault()
    if (!texte.trim()) return setErreur("Écris quelque chose")
    onChange([...todo, { id: nouvelId(), texte: texte.trim(), fait: false }])
    setTexte("")
    setErreur("")
  }

  function cocher(id) {
    onChange(todo.map((t) => (t.id === id ? { ...t, fait: !t.fait } : t)))
  }

  function enlever(id) {
    onChange(todo.filter((t) => t.id !== id))
  }

  return (
    <div className="todo">
      {todo.length === 0 && <p className="discret petit">Ta liste est vide. Ajoute une première chose 👇</p>}
      {todo.map((t) => (
        <div key={t.id} className="todo-ligne">
          <label>
            <input type="checkbox" checked={t.fait} onChange={() => cocher(t.id)} />
            <span className={t.fait ? "barre-texte" : ""}>{t.texte}</span>
          </label>
          <button className="lien" onClick={() => enlever(t.id)} aria-label={`Enlever ${t.texte}`}>
            ✕
          </button>
        </div>
      ))}
      <form className="todo-ajout" onSubmit={ajouter}>
        <input
          value={texte}
          onChange={(e) => { setTexte(e.target.value); setErreur("") }}
          placeholder="Faire le plan"
          aria-label="Nouvel élément de la liste"
        />
        <button type="submit" className="fleche" aria-label="Ajouter à la liste">
          +
        </button>
      </form>
      {erreur && <p className="erreur petit">{erreur}</p>}
    </div>
  )
}

export default Kanban
