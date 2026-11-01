import { useState } from "react"
import { nouvelId, serieDeJours, dateDuJour } from "../outils"
import { basculerEtape, synchroniserCartes, avancement, POINTS } from "../actions"

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
    setFormulaireOuvert(false)
  }

  function supprimer(id) {
    if (confirm("Supprimer cet objectif ?")) {
      setObjectifs(objectifs.filter((o) => o.id !== id))
      // Les cartes du tableau restent, mais ne sont plus liées
      setCartes(cartes.map((c) => (c.objectifId === id ? { ...c, objectifId: undefined, etapeId: undefined } : c)))
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

                {o.type === "ponctuel" && <p className="discret">{o.fait ? "Terminé ✅" : "À faire"}</p>}

                {o.type === "grand" && (
                  <>
                    <div className="barre-progres">
                      <div style={{ width: avancement(o) + "%" }} />
                    </div>
                    <p className="discret">{avancement(o)} % accompli</p>
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

// Le formulaire pour créer un objectif
function Formulaire({ onAjouter, onAnnuler }) {
  const [type, setType] = useState("habitude")
  const [titre, setTitre] = useState("")
  const [pourquoi, setPourquoi] = useState("")
  const [date, setDate] = useState("")
  const [etapes, setEtapes] = useState("")
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
    if (type === "ponctuel") Object.assign(objectif, { date, fait: false })
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
