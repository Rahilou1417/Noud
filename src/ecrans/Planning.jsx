import { useState } from "react"
import {
  nouvelId, enMinutes, heureActuelle, CATEGORIES,
  JOURS, TOUS_LES_JOURS, jourDeLaSemaine, blocCeJour, texteJours,
} from "../outils"
import { journeeReussie } from "../actions"

// Le planning de la semaine, en blocs colorés, jour par jour
function Planning({ blocs, setBlocs, objectifs, profil }) {
  const aujourdhui = jourDeLaSemaine()
  const [jourVu, setJourVu] = useState(aujourdhui) // le jour affiché dans la liste

  // Le formulaire
  const [titre, setTitre] = useState("")
  const [categorie, setCategorie] = useState("etude")
  const [debut, setDebut] = useState("09:00")
  const [fin, setFin] = useState("10:00")
  const [jours, setJours] = useState(TOUS_LES_JOURS)
  const [erreur, setErreur] = useState("")

  const maintenant = enMinutes(heureActuelle())
  const reussie = journeeReussie(objectifs)
  const blocsDuJour = blocs
    .filter((b) => blocCeJour(b, jourVu))
    .sort((a, b) => enMinutes(a.debut) - enMinutes(b.debut))

  // Coche ou décoche un jour dans le formulaire
  function basculerJour(n) {
    setErreur("")
    setJours(jours.includes(n) ? jours.filter((j) => j !== n) : [...jours, n].sort())
  }

  function ajouter(e) {
    e.preventDefault()
    if (jours.length === 0) return setErreur("Choisis au moins un jour")
    if (enMinutes(fin) <= enMinutes(debut)) return setErreur("L'heure de fin doit être après le début")
    const nom = titre.trim() || CATEGORIES[categorie].nom
    setBlocs([...blocs, { id: nouvelId(), titre: nom, categorie, debut, fin, jours }])
    setTitre("")
    setErreur("")
    // On affiche un jour où le nouveau bloc apparaît
    if (!jours.includes(jourVu)) setJourVu(jours[0])
  }

  function supprimer(id) {
    setBlocs(blocs.filter((b) => b.id !== id))
  }

  // Ajoute en un clic le bloc sommeil du soir à partir des réglages (tous les jours)
  function ajouterSommeil() {
    setBlocs([
      ...blocs,
      { id: nouvelId(), titre: "Se préparer à dormir", categorie: "sommeil", debut: profil.coucher, fin: "23:59", jours: TOUS_LES_JOURS },
    ])
  }

  // Les raccourcis du formulaire
  const RACCOURCIS = [
    { nom: "Tous les jours", jours: TOUS_LES_JOURS },
    { nom: "Lun → Ven", jours: [1, 2, 3, 4, 5] },
    { nom: "Week-end", jours: [6, 7] },
  ]

  return (
    <div>
      <h1>Ma semaine 🗓️</h1>
      <p className="discret">Place tes blocs : NouD te prévient au début de chacun, les bons jours.</p>

      {/* Le choix du jour à afficher */}
      <div className="semaine" role="tablist" aria-label="Jour affiché">
        {JOURS.map((j) => (
          <button
            key={j.n}
            role="tab"
            aria-selected={jourVu === j.n}
            className={["jour", jourVu === j.n && "actif", j.n === aujourdhui && "aujourdhui"].filter(Boolean).join(" ")}
            onClick={() => setJourVu(j.n)}
          >
            <span>{j.court}</span>
            <span className="jour-compte">{blocs.filter((b) => blocCeJour(b, j.n)).length || ""}</span>
          </button>
        ))}
      </div>

      <div className="colonnes">
      {/* La liste des blocs du jour choisi */}
      <div className="journee">
        <h2>
          {jourVu === aujourdhui ? "Aujourd'hui" : JOURS[jourVu - 1].nom.replace(/^./, (l) => l.toUpperCase())}
        </h2>
        {blocsDuJour.length === 0 && <p className="discret centre">Rien de prévu ce jour-là 🌸</p>}
        {blocsDuJour.map((b) => {
          const cat = CATEGORIES[b.categorie] || CATEGORIES.autre
          const enCours = jourVu === aujourdhui && enMinutes(b.debut) <= maintenant && maintenant < enMinutes(b.fin)
          const verrouille = jourVu === aujourdhui && b.categorie === "plaisir" && !reussie
          return (
            <div
              key={b.id}
              className={enCours ? "bloc en-cours" : "bloc"}
              style={{ background: cat.couleur + "33", borderColor: cat.couleur }}
            >
              <div className="bloc-heures">
                {b.debut}
                <br />
                {b.fin}
              </div>
              <div className="bloc-texte">
                <strong>
                  {cat.emoji} {b.titre} {verrouille && "🔒"}
                </strong>
                <span className="discret">
                  {cat.nom} · {texteJours(b.jours)}
                  {enCours && " · en cours"}
                </span>
              </div>
              <button className="lien" onClick={() => supprimer(b.id)} aria-label="Supprimer">
                ✕
              </button>
            </div>
          )
        })}
      </div>

      {/* Le formulaire d'ajout */}
      <div>
      <form className="carte formulaire" onSubmit={ajouter}>
        <h2>Ajouter un bloc</h2>
        <div className="choix-type">
          {Object.entries(CATEGORIES).map(([cle, c]) => (
            <button
              type="button"
              key={cle}
              className={categorie === cle ? "puce active" : "puce"}
              onClick={() => setCategorie(cle)}
            >
              {c.emoji} {c.nom}
            </button>
          ))}
        </div>
        <label>
          Nom (facultatif)
          <input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder={CATEGORIES[categorie].nom} />
        </label>
        <div className="deux-colonnes">
          <label>
            Début
            <input type="time" value={debut} onChange={(e) => { setDebut(e.target.value); setErreur("") }} />
          </label>
          <label>
            Fin
            <input type="time" value={fin} onChange={(e) => { setFin(e.target.value); setErreur("") }} />
          </label>
        </div>

        {/* Les jours où le bloc a lieu */}
        <fieldset className="choix-jours">
          <legend>Les jours</legend>
          <div className="pastilles">
            {JOURS.map((j) => (
              <button
                type="button"
                key={j.n}
                className={jours.includes(j.n) ? "pastille active" : "pastille"}
                onClick={() => basculerJour(j.n)}
                aria-pressed={jours.includes(j.n)}
                aria-label={j.nom}
                title={j.nom}
              >
                {j.lettre}
              </button>
            ))}
          </div>
          <div className="raccourcis">
            {RACCOURCIS.map((r) => (
              <button
                type="button"
                key={r.nom}
                className={jours.join() === r.jours.join() ? "puce active" : "puce"}
                onClick={() => { setJours(r.jours); setErreur("") }}
              >
                {r.nom}
              </button>
            ))}
          </div>
        </fieldset>

        {erreur && <p className="erreur">{erreur}</p>}
        <button type="submit" className="bouton plein">
          Ajouter le bloc
        </button>
      </form>

      <button className="bouton" onClick={ajouterSommeil}>
        😴 Ajouter mon heure de coucher ({profil.coucher})
      </button>
      </div>
      </div>
    </div>
  )
}

export default Planning
