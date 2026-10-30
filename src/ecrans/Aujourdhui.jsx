import { dateDuJour, heureActuelle, enMinutes, serieDeJours, CATEGORIES } from "../outils"
import { basculerHabitude, basculerTache, basculerEtape, journeeReussie, avancement, POINTS } from "../actions"

// L'écran d'accueil : tout ce qui compte aujourd'hui
function Aujourdhui({ profil, objectifs, setObjectifs, blocs, points, gagnerPoints, setOnglet }) {
  const jour = dateDuJour()
  const maintenant = enMinutes(heureActuelle())
  const heure = new Date().getHours()
  const salut = heure < 5 || heure >= 18 ? "Bonsoir" : "Bonjour"

  const habitudes = objectifs.filter((o) => o.type === "habitude")
  const taches = objectifs.filter((o) => o.type === "ponctuel" && !o.fait && o.date <= jour)
  const grands = objectifs.filter((o) => o.type === "grand")
  const reussie = journeeReussie(objectifs)

  // Le bloc en cours, ou le prochain
  const blocsTries = [...blocs].sort((a, b) => enMinutes(a.debut) - enMinutes(b.debut))
  const enCours = blocsTries.find((b) => enMinutes(b.debut) <= maintenant && maintenant < enMinutes(b.fin))
  const prochain = blocsTries.find((b) => enMinutes(b.debut) > maintenant)

  // La meilleure série de jours parmi les habitudes
  const meilleureSerie = Math.max(0, ...habitudes.map((h) => serieDeJours(h.jours)))

  function cocherHabitude(h) {
    const dejaFait = h.jours.includes(jour)
    setObjectifs(basculerHabitude(objectifs, h.id))
    gagnerPoints(dejaFait ? -POINTS.habitude : POINTS.habitude)
  }

  function cocherTache(t) {
    setObjectifs(basculerTache(objectifs, t.id))
    gagnerPoints(POINTS.tache)
  }

  function cocherEtape(objectif, etape) {
    setObjectifs(basculerEtape(objectifs, objectif.id, etape.id))
    gagnerPoints(etape.fait ? -POINTS.etape : POINTS.etape)
  }

  return (
    <div>
      <h1>
        {salut}
        {profil.prenom ? ` ${profil.prenom}` : ""} 🌙
      </h1>
      <p className="discret">Un pas après l'autre, tu y arrives.</p>

      {/* Les récompenses */}
      <div className="stats">
        <div className="stat jaune">
          <span className="stat-nombre">{points}</span>
          <span>points</span>
        </div>
        <div className="stat jaune">
          <span className="stat-nombre">🔥 {meilleureSerie}</span>
          <span>jours d'affilée</span>
        </div>
      </div>

      {/* Le bloc en cours */}
      {(enCours || prochain) && (
        <BlocActuel bloc={enCours || prochain} enCours={!!enCours} reussie={reussie} />
      )}

      {/* Les habitudes du jour */}
      <h2>Mes habitudes du jour</h2>
      {habitudes.length === 0 && (
        <p className="discret">
          Aucune habitude pour l'instant.{" "}
          <button className="lien" onClick={() => setOnglet("objectifs")}>
            En ajouter une
          </button>
        </p>
      )}
      {habitudes.map((h) => (
        <label key={h.id} className="ligne-coche">
          <input type="checkbox" checked={h.jours.includes(jour)} onChange={() => cocherHabitude(h)} />
          <span>{h.titre}</span>
          <span className="discret">🔥 {serieDeJours(h.jours)}</span>
        </label>
      ))}

      {/* Les tâches à faire */}
      {taches.length > 0 && <h2>À faire</h2>}
      {taches.map((t) => (
        <label key={t.id} className="ligne-coche">
          <input type="checkbox" checked={false} onChange={() => cocherTache(t)} />
          <span>{t.titre}</span>
          {t.date < jour && <span className="badge-retard">en retard</span>}
        </label>
      ))}

      {/* La prochaine étape de chaque grand objectif */}
      {grands.length > 0 && <h2>Mes grands objectifs</h2>}
      {grands.map((g) => {
        const etape = g.etapes.find((e) => !e.fait)
        return (
          <div key={g.id} className="carte">
            <div className="carte-titre">🎯 {g.titre}</div>
            <div className="barre-progres">
              <div style={{ width: avancement(g) + "%" }} />
            </div>
            {etape ? (
              <label className="ligne-coche sans-bord">
                <input type="checkbox" checked={false} onChange={() => cocherEtape(g, etape)} />
                <span>Prochaine étape : {etape.titre}</span>
              </label>
            ) : (
              <p className="discret">Toutes les étapes sont faites 🎉</p>
            )}
          </div>
        )
      })}

      {reussie && <div className="bravo">Journée réussie ! Ton moment plaisir est débloqué 🎬✨</div>}
    </div>
  )
}

// Petite carte qui montre le bloc en cours ou le prochain
function BlocActuel({ bloc, enCours, reussie }) {
  const cat = CATEGORIES[bloc.categorie] || CATEGORIES.autre
  const verrouille = bloc.categorie === "plaisir" && !reussie
  return (
    <div className="carte" style={{ borderLeft: `6px solid ${cat.couleur}`, borderRadius: 0 }}>
      <div className="discret">{enCours ? "En ce moment" : "Ensuite"}</div>
      <div className="carte-titre">
        {cat.emoji} {bloc.titre} {verrouille && "🔒"}
      </div>
      <div className="discret">
        {bloc.debut} – {bloc.fin}
        {verrouille && " · termine tes habitudes pour le débloquer"}
      </div>
    </div>
  )
}

export default Aujourdhui
