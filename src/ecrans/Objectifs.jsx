import { useState } from "react"
import { nouvelId, serieDeJours, dateDuJour } from "../outils"
import { basculerEtape, synchroniserCartes, cartePourTache, cartePourGrand, lignesEnTodo, avancement, POINTS } from "../actions"
import { ListeTodo } from "./Kanban"

// Les trois types d'objectifs
const TYPES = {
  grand: { nom: "Grand objectif", pluriel: "Grands objectifs", emoji: "🎯", aide: "Ex. : préparer une certif, perdre du poids" },
  habitude: { nom: "Habitude", pluriel: "Habitudes", emoji: "🔁", aide: "Ex. : faire la prière, aller au travail, lire" },
  ponctuel: { nom: "Tâche", pluriel: "Tâches", emoji: "📌", aide: "Ex. : rendez-vous chez le médecin" },
}

// Des modèles prêts à l'emploi pour démarrer vite
const MODELES = [
  {
    titre: "Préparer une certif",
    pourquoi: "Pour booster mon CV",
    etapes: ["Choisir la certif et la date d'examen", "Lister les chapitres", "Réviser 1 chapitre par semaine", "Faire 2 examens blancs", "Passer l'examen"],
  },
  {
    titre: "Perdre du poids en douceur",
    pourquoi: "Pour me sentir bien dans mon corps",
    etapes: ["Noter mes repas pendant 1 semaine", "Ajouter 3 marches de 30 min par semaine", "Boire 1,5 L d'eau par jour", "Préparer mes repas le dimanche"],
  },
]

function Objectifs({ objectifs, setObjectifs, cartes, setCartes, gagnerPoints }) {
  const [formulaireOuvert, setFormulaireOuvert] = useState(false)

  function ajouter(objectif) {
    setObjectifs([...objectifs, objectif])
    // Un nouveau grand objectif apparaît aussi dans le tableau, avec ses étapes en to-do liste
    if (objectif.type === "grand") setCartes([...cartes, cartePourGrand(objectif, nouvelId())])
    setFormulaireOuvert(false)
  }

  // Met une tâche ou un grand objectif sur le tableau (à la demande)
  function mettreAuTableau(objectif) {
    const carte = objectif.type === "grand" ? cartePourGrand(objectif, nouvelId()) : cartePourTache(objectif, nouvelId())
    setCartes([...cartes, carte])
  }

  // Est-ce que cet objectif a déjà sa carte sur le tableau ?
  function surLeTableau(objectif) {
    return cartes.some((c) => c.grandId === objectif.id || c.tacheId === objectif.id)
  }

  // Remplace la to-do liste d'une tâche
  function changerTodoTache(id, todo) {
    setObjectifs(objectifs.map((o) => (o.id === id ? { ...o, todo } : o)))
  }

  function supprimer(id) {
    if (confirm("Supprimer cet objectif ?")) {
      const supprime = objectifs.find((o) => o.id === id)
      setObjectifs(objectifs.filter((o) => o.id !== id))
      // Les cartes du tableau restent, mais ne sont plus liées
      setCartes(
        cartes.map((c) => {
          if (c.objectifId === id) return { ...c, objectifId: undefined, etapeId: undefined }
          if (c.tacheId === id) return { ...c, tacheId: undefined }
          // La carte garde une copie des étapes dans sa propre to-do liste
          if (c.grandId === id)
            return { ...c, grandId: undefined, todo: (supprime?.etapes || []).map((e) => ({ id: e.id, texte: e.titre, fait: e.fait })) }
          return c
        })
      )
    }
  }

  // Crée une carte « À faire » dans le tableau, liée à cette étape
  function envoyerAuTableau(objectif, etape) {
    setCartes([
      ...cartes,
      { id: nouvelId(), titre: etape.titre, priorite: "moyenne", colonne: "afaire", objectifId: objectif.id, etapeId: etape.id },
    ])
  }

  function cocherEtape(objectif, etape) {
    setObjectifs(basculerEtape(objectifs, objectif.id, etape.id))
    setCartes(synchroniserCartes(cartes, etape.id, !etape.fait)) // la carte du tableau suit
    gagnerPoints(etape.fait ? -POINTS.etape : POINTS.etape)
  }

  return (
    <div>
      <h1>Mes objectifs 🎯</h1>

      {!formulaireOuvert && (
        <button className="bouton plein" onClick={() => setFormulaireOuvert(true)}>
          + Nouvel objectif
        </button>
      )}
      {formulaireOuvert && <Formulaire onAjouter={ajouter} onAnnuler={() => setFormulaireOuvert(false)} />}

      {Object.entries(TYPES).map(([type, infos]) => {
        const liste = objectifs.filter((o) => o.type === type)
        if (liste.length === 0) return null
        return (
          <section key={type}>
            <h2>
              {infos.emoji} {infos.pluriel}
            </h2>
            <div className="grille-cartes">
            {liste.map((o) => (
              <div key={o.id} className="carte">
                <div className="carte-entete">
                  <span className="carte-titre">{o.titre}</span>
                  <button className="lien" onClick={() => supprimer(o.id)} aria-label="Supprimer">
                    🗑️
                  </button>
                </div>

                {o.pourquoi && <p className="pourquoi">💗 {o.pourquoi}</p>}
                {o.date && <p className="discret">📅 {new Date(o.date).toLocaleDateString("fr-FR")}</p>}

                {o.type === "habitude" && (
                  <p className="discret">
                    🔥 {serieDeJours(o.jours)} jours d'affilée · {o.jours.includes(dateDuJour()) ? "fait aujourd'hui ✅" : "pas encore aujourd'hui"}
                  </p>
                )}

                {o.type === "ponctuel" && (
                  <>
                    <p className="discret">
                      {o.fait ? "Terminé ✅" : "À faire"}
                      {surLeTableau(o) && " · 📋 sur le tableau"}
                    </p>
                    <TodoRepliable todo={o.todo || []} onChange={(todo) => changerTodoTache(o.id, todo)} />
                    {!o.fait && !surLeTableau(o) && (
                      <button className="lien petit" onClick={() => mettreAuTableau(o)}>
                        📋 Mettre au tableau
                      </button>
                    )}
                  </>
                )}

                {o.type === "grand" && (
                  <>
                    <div className="barre-progres">
                      <div style={{ width: avancement(o) + "%" }} />
                    </div>
                    <p className="discret">
                      {avancement(o)} % accompli
                      {surLeTableau(o) ? " · 📋 sur le tableau" : ""}
                    </p>
                    {!surLeTableau(o) && (
                      <button className="lien petit" onClick={() => mettreAuTableau(o)}>
                        📋 Mettre au tableau
                      </button>
                    )}
                    {o.etapes.map((e) => (
                      <label key={e.id} className="ligne-coche sans-bord">
                        <input type="checkbox" checked={e.fait} onChange={() => cocherEtape(o, e)} />
                        <span className={e.fait ? "barre-texte" : ""}>{e.titre}</span>
                        {!e.fait &&
                          (cartes.some((c) => c.etapeId === e.id) ? (
                            <span className="discret etape-tableau">📋 sur le tableau</span>
                          ) : (
                            <button
                              type="button"
                              className="lien etape-tableau"
                              onClick={(ev) => { ev.preventDefault(); envoyerAuTableau(o, e) }}
                            >
                              📋 Au tableau
                            </button>
                          ))}
                      </label>
                    ))}
                  </>
                )}
              </div>
            ))}
            </div>
          </section>
        )
      })}

      {objectifs.length === 0 && !formulaireOuvert && (
        <p className="discret centre">Commence par un petit objectif. Le plus dur, c'est de commencer 🌸</p>
      )}
    </div>
  )
}

// La to-do liste d'une tâche : on voit l'avancement, et on l'ouvre pour la modifier
function TodoRepliable({ todo, onChange }) {
  const [ouverte, setOuverte] = useState(false)
  const faits = todo.filter((t) => t.fait).length
  return (
    <div>
      <button className={ouverte ? "bouton-todo actif" : "bouton-todo"} onClick={() => setOuverte(!ouverte)} aria-expanded={ouverte}>
        {ouverte ? "Fermer la liste" : todo.length ? `☑️ Liste ${faits}/${todo.length}` : "☑️ Ajouter une liste"}
      </button>
      {ouverte && <ListeTodo todo={todo} onChange={onChange} />}
    </div>
  )
}

// Le formulaire pour créer un objectif
function Formulaire({ onAjouter, onAnnuler }) {
  const [type, setType] = useState("habitude")
  const [titre, setTitre] = useState("")
  const [pourquoi, setPourquoi] = useState("")
  const [date, setDate] = useState("")
  const [etapes, setEtapes] = useState("")
  const [liste, setListe] = useState("") // la to-do liste d'une tâche
  const [erreur, setErreur] = useState("")

  function utiliserModele(m) {
    setType("grand")
    setTitre(m.titre)
    setPourquoi(m.pourquoi)
    setEtapes(m.etapes.join("\n"))
  }

  function valider(e) {
    e.preventDefault()
    if (!titre.trim()) return setErreur("Donne un nom à ton objectif")
    if (type === "ponctuel" && !date) return setErreur("Choisis une date")

    const objectif = { id: nouvelId(), type, titre: titre.trim(), pourquoi: pourquoi.trim() }
    if (type === "habitude") objectif.jours = []
    if (type === "ponctuel") Object.assign(objectif, { date, fait: false, todo: lignesEnTodo(liste, nouvelId) })
    if (type === "grand") {
      objectif.date = date
      objectif.etapes = etapes
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => ({ id: nouvelId(), titre: t, fait: false }))
    }
    onAjouter(objectif)
  }

  return (
    <form className="carte formulaire" onSubmit={valider}>
      <div className="choix-type">
        {Object.entries(TYPES).map(([cle, infos]) => (
          <button
            type="button"
            key={cle}
            className={type === cle ? "puce active" : "puce"}
            onClick={() => setType(cle)}
          >
            {infos.emoji} {infos.nom}
          </button>
        ))}
      </div>
      <p className="discret">{TYPES[type].aide}</p>

      {type === "grand" && (
        <div className="modeles">
          <span className="discret">Modèles :</span>
          {MODELES.map((m) => (
            <button type="button" key={m.titre} className="puce" onClick={() => utiliserModele(m)}>
              {m.titre}
            </button>
          ))}
        </div>
      )}

      <label>
        Mon objectif
        <input value={titre} onChange={(e) => { setTitre(e.target.value); setErreur("") }} placeholder="Faire la prière à l'heure" />
      </label>

      <label>
        Pourquoi c'est important pour moi
        <input value={pourquoi} onChange={(e) => setPourquoi(e.target.value)} placeholder="Pour me sentir apaisée" />
      </label>

      {type !== "habitude" && (
        <label>
          {type === "grand" ? "Date visée (facultatif)" : "Date"}
          <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setErreur("") }} />
        </label>
      )}

      {type === "grand" && (
        <label>
          Les petites étapes (une par ligne)
          <textarea rows={5} value={etapes} onChange={(e) => setEtapes(e.target.value)} placeholder={"Choisir la date d'examen\nRéviser le chapitre 1"} />
        </label>
      )}

      {type === "ponctuel" && (
        <label>
          Ma to-do liste (facultatif, une chose par ligne)
          <textarea rows={3} value={liste} onChange={(e) => setListe(e.target.value)} placeholder={"Prendre la carte vitale\nNoter mes questions"} />
        </label>
      )}

      {type === "grand" && <p className="discret petit">Il apparaîtra aussi dans ton Tableau 📋, avec ses étapes en to-do liste.</p>}

      {erreur && <p className="erreur">{erreur}</p>}

      <div className="boutons">
        <button type="button" className="bouton" onClick={onAnnuler}>
          Annuler
        </button>
        <button type="submit" className="bouton plein">
          Ajouter
        </button>
      </div>
    </form>
  )
}

export default Objectifs
