import { useState, useEffect } from "react"
import { POINTS } from "../actions"
import { notifier } from "../useRappels"

const DUREES = [15, 25, 45, 60]

// Le mode concentration : un minuteur plein écran
function Concentration({ gagnerPoints, objectifs }) {
  const [duree, setDuree] = useState(25) // en minutes
  const [restant, setRestant] = useState(null) // en secondes, null = pas lancé
  const [enPause, setEnPause] = useState(false)
  const [termine, setTermine] = useState(false)
  const [sujet, setSujet] = useState("")

  // Le minuteur : enlève 1 seconde chaque seconde
  useEffect(() => {
    if (restant === null || enPause) return
    if (restant === 0) {
      setTermine(true)
      setRestant(null)
      gagnerPoints(POINTS.focus)
      notifier("🎉 Bravo !", `Session de ${duree} min terminée. +${POINTS.focus} points`)
      return
    }
    const minuteur = setTimeout(() => setRestant(restant - 1), 1000)
    return () => clearTimeout(minuteur)
  }, [restant, enPause, duree, gagnerPoints])

  function lancer() {
    setTermine(false)
    setEnPause(false)
    setRestant(duree * 60)
  }

  function arreter() {
    if (confirm("Arrêter la session ? Tu ne gagneras pas les points.")) setRestant(null)
  }

  // Écran de félicitations
  if (termine) {
    return (
      <div className="focus-fin">
        <div className="grand-emoji">🎉</div>
        <h1>Bravo !</h1>
        <p>
          {duree} minutes de concentration{sujet ? ` sur « ${sujet} »` : ""}.
        </p>
        <p className="stat jaune">+{POINTS.focus} points</p>
        <button className="bouton plein" onClick={() => setTermine(false)}>
          Super
        </button>
      </div>
    )
  }

  // Le minuteur plein écran
  if (restant !== null) {
    const minutes = String(Math.floor(restant / 60)).padStart(2, "0")
    const secondes = String(restant % 60).padStart(2, "0")
    const pourcentage = 100 - (restant / (duree * 60)) * 100
    return (
      <div className="focus-plein">
        {sujet && <p className="discret">{sujet}</p>}
        <div className="minuteur" style={{ "--progres": pourcentage + "%" }}>
          <span>
            {minutes}:{secondes}
          </span>
        </div>
        <p className="discret">Reste avec toi-même. Le téléphone peut attendre 🌙</p>
        <div className="boutons">
          <button className="bouton" onClick={() => setEnPause(!enPause)}>
            {enPause ? "▶️ Reprendre" : "⏸️ Pause"}
          </button>
          <button className="bouton" onClick={arreter}>
            Arrêter
          </button>
        </div>
      </div>
    )
  }

  // L'écran de préparation
  const grands = objectifs.filter((o) => o.type === "grand")
  return (
    <div>
      <h1>Mode concentration ⏳</h1>
      <p className="discret">Choisis une durée, et on s'y met ensemble.</p>

      <div className="choix-type">
        {DUREES.map((d) => (
          <button key={d} className={duree === d ? "puce active" : "puce"} onClick={() => setDuree(d)}>
            {d} min
          </button>
        ))}
      </div>

      <label className="formulaire">
        Sur quoi je travaille ? (facultatif)
        <input value={sujet} onChange={(e) => setSujet(e.target.value)} placeholder="Réviser le chapitre 3" list="mes-objectifs" />
        <datalist id="mes-objectifs">
          {grands.map((g) => (
            <option key={g.id} value={g.titre} />
          ))}
        </datalist>
      </label>

      <div className="carte rappel-ndd">
        📵 Avant de commencer, active le mode <strong>Ne pas déranger</strong> de ton téléphone.
      </div>

      <button className="bouton plein grand-bouton" onClick={lancer}>
        Je me concentre
      </button>
    </div>
  )
}

export default Concentration
