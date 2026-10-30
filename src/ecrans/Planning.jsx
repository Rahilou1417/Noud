import { useState } from "react"
import { nouvelId, enMinutes, heureActuelle, CATEGORIES } from "../outils"
import { journeeReussie } from "../actions"

// Le planning de la journée, en blocs colorés
function Planning({ blocs, setBlocs, objectifs, profil }) {
  const [titre, setTitre] = useState("")
  const [categorie, setCategorie] = useState("etude")
  const [debut, setDebut] = useState("09:00")
  const [fin, setFin] = useState("10:00")
  const [erreur, setErreur] = useState("")

  const maintenant = enMinutes(heureActuelle())
  const reussie = journeeReussie(objectifs)
  const blocsTries = [...blocs].sort((a, b) => enMinutes(a.debut) - enMinutes(b.debut))

  function ajouter(e) {
    e.preventDefault()
    if (enMinutes(fin) <= enMinutes(debut)) return setErreur("L'heure de fin doit être après le début")
    const nom = titre.trim() || CATEGORIES[categorie].nom
    setBlocs([...blocs, { id: nouvelId(), titre: nom, categorie, debut, fin }])
    setTitre("")
    setErreur("")
  }

  function supprimer(id) {
    setBlocs(blocs.filter((b) => b.id !== id))
  }

  // Ajoute en un clic le bloc sommeil du soir à partir des réglages
  function ajouterSommeil() {
    setBlocs([
      ...blocs,
      { id: nouvelId(), titre: "Se préparer à dormir", categorie: "sommeil", debut: profil.coucher, fin: "23:59" },
    ])
  }

  return (
    <div>
      <h1>Ma journée 🗓️</h1>
      <p className="discret">Place tes blocs : NouD te prévient au début de chacun.</p>

      {/* La liste des blocs */}
      <div className="journee">
        {blocsTries.length === 0 && <p className="discret centre">Ta journée est vide pour l'instant 🌸</p>}
        {blocsTries.map((b) => {
          const cat = CATEGORIES[b.categorie] || CATEGORIES.autre
          const enCours = enMinutes(b.debut) <= maintenant && maintenant < enMinutes(b.fin)
          const verrouille = b.categorie === "plaisir" && !reussie
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
                  {cat.nom}
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
        {erreur && <p className="erreur">{erreur}</p>}
        <button type="submit" className="bouton plein">
          Ajouter le bloc
        </button>
      </form>

      <button className="bouton" onClick={ajouterSommeil}>
        😴 Ajouter mon heure de coucher ({profil.coucher})
      </button>
    </div>
  )
}

export default Planning
