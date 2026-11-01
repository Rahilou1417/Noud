import { useState, useEffect } from "react"
import { dateDuJour, heureActuelle, enMinutes, enHeure, serieDeJours, nouvelId, CATEGORIES, jourDeLaSemaine, blocCeJour } from "../outils"
import { basculerHabitude, basculerTache, basculerEtape, synchroniserCartes, synchroniserCarteTache, journeeReussie, avancement, cartePourGrand, lignesEnTodo, POINTS } from "../actions"

// L'écran d'accueil : tout ce qui compte aujourd'hui
function Aujourdhui({ profil, objectifs, setObjectifs, cartes, setCartes, blocs, points, gagnerPoints, setOnglet }) {
  const jour = dateDuJour()
  const maintenant = enMinutes(heureActuelle())
  const heure = new Date().getHours()
  const salut = heure < 5 || heure >= 18 ? "Bonsoir" : "Bonjour"

  const habitudes = objectifs.filter((o) => o.type === "habitude")
  const taches = objectifs.filter((o) => o.type === "ponctuel" && !o.fait && o.date <= jour)
  const grands = objectifs.filter((o) => o.type === "grand")
  const reussie = journeeReussie(objectifs)

  // Le bloc en cours, ou le prochain
  // Seulement les blocs prévus pour aujourd'hui (selon le jour de la semaine)
  const blocsTries = blocs
    .filter((b) => blocCeJour(b, jourDeLaSemaine()))
    .sort((a, b) => enMinutes(a.debut) - enMinutes(b.debut))
  const enCours = blocsTries.find((b) => enMinutes(b.debut) <= maintenant && maintenant < enMinutes(b.fin))
  const prochain = blocsTries.find((b) => enMinutes(b.debut) > maintenant)

  // La progression du jour : habitudes + tâches prévues aujourd'hui (ou en retard)
  const tachesDuJour = objectifs.filter(
    (o) => o.type === "ponctuel" && (o.date === jour || (o.date < jour && !o.fait))
  )
  const total = habitudes.length + tachesDuJour.length
  const faits = habitudes.filter((h) => h.jours.includes(jour)).length + tachesDuJour.filter((t) => t.fait).length

  // La date en toutes lettres : « dimanche 1 novembre »
  const dateTexte = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })

  // La fenêtre d'ajout rapide
  const [ajoutOuvert, setAjoutOuvert] = useState(false)

  function ajoutRapide(objectif) {
    setObjectifs([...objectifs, objectif])
    // Un grand objectif va aussi dans le tableau, comme depuis la page Objectifs
    if (objectif.type === "grand") setCartes([...cartes, cartePourGrand(objectif, nouvelId())])
    setAjoutOuvert(false)
  }

  // La meilleure série de jours parmi les habitudes
  const meilleureSerie = Math.max(0, ...habitudes.map((h) => serieDeJours(h.jours)))

  function cocherHabitude(h) {
    const dejaFait = h.jours.includes(jour)
    setObjectifs(basculerHabitude(objectifs, h.id))
    gagnerPoints(dejaFait ? -POINTS.habitude : POINTS.habitude)
  }

  function cocherTache(t) {
    setObjectifs(basculerTache(objectifs, t.id))
    setCartes(synchroniserCarteTache(cartes, t.id, true)) // la carte du tableau passe dans « Terminé »
    gagnerPoints(POINTS.tache)
  }

  function cocherEtape(objectif, etape) {
    setObjectifs(basculerEtape(objectifs, objectif.id, etape.id))
    setCartes(synchroniserCartes(cartes, etape.id, !etape.fait)) // la carte du tableau suit
    gagnerPoints(etape.fait ? -POINTS.etape : POINTS.etape)
  }

  return (
    <div>
      <h1>
        {salut}
        {profil.prenom ? ` ${profil.prenom}` : ""} 🌙
      </h1>
      <p className="date-du-jour">{dateTexte}</p>

      {/* La progression de la journée + les récompenses */}
      <div className="resume">
        <Progression faits={faits} total={total} onAjouter={() => setAjoutOuvert(true)} />
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
      </div>

      {/* Ma journée en un coup d'œil */}
      <h2>Ma journée</h2>
      <Frise blocs={blocsTries} maintenant={maintenant} onOuvrir={() => setOnglet("planning")} />

      {/* Le bloc en cours */}
      {(enCours || prochain) && (
        <BlocActuel bloc={enCours || prochain} enCours={!!enCours} reussie={reussie} />
      )}

      {/* Deux colonnes sur grand écran, une seule sur téléphone debout */}
      <div className="colonnes">
      <div>
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
          {t.todo?.length > 0 && (
            <span className="discret">☑️ {t.todo.filter((x) => x.fait).length}/{t.todo.length}</span>
          )}
          {t.date < jour && <span className="badge-retard">en retard</span>}
        </label>
      ))}

      </div>

      <div>
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
      </div>

      {/* Le bouton + d'ajout rapide, toujours en bas à droite */}
      <button className="bouton-plus" onClick={() => setAjoutOuvert(true)} aria-label="Ajout rapide">
        +
      </button>
      {ajoutOuvert && <AjoutRapide onAjouter={ajoutRapide} onFermer={() => setAjoutOuvert(false)} />}
    </div>
  )
}

// Le cercle de progression : « 3 sur 5 faits aujourd'hui »
function Progression({ faits, total, onAjouter }) {
  const pourcentage = total ? Math.round((faits / total) * 100) : 0
  let message = "C'est parti ! Un premier pas suffit 🌱"
  if (total === 0) message = "Rien de prévu aujourd'hui."
  else if (faits === total) message = "Tout est fait, bravo ! 🎉"
  else if (faits > 0) message = "Continue, tu avances bien 💪"

  return (
    <div className="progression carte">
      <div
        className="anneau"
        style={{ "--progres": pourcentage + "%" }}
        role="img"
        aria-label={`${faits} sur ${total} faits aujourd'hui`}
      >
        <span>{total ? `${faits}/${total}` : "–"}</span>
      </div>
      <div>
        <div className="carte-titre">{total ? `${faits} sur ${total} faits aujourd'hui` : "Ta journée est libre"}</div>
        <p className="discret">{message}</p>
        {total === 0 && (
          <button className="lien" onClick={onAjouter}>
            + Ajouter un objectif
          </button>
        )}
      </div>
    </div>
  )
}

// La mini frise de la journée : les blocs du planning sur une ligne, avec un trait « maintenant »
function Frise({ blocs, maintenant, onOuvrir }) {
  if (blocs.length === 0) {
    return (
      <p className="discret">
        Aucun bloc dans ton planning.{" "}
        <button className="lien" onClick={onOuvrir}>
          Organiser ma journée
        </button>
      </p>
    )
  }

  // De 6 h à minuit, élargi si un bloc commence plus tôt
  const debut = Math.min(6 * 60, ...blocs.map((b) => Math.floor(enMinutes(b.debut) / 60) * 60))
  const fin = 24 * 60
  const duree = fin - debut
  const position = (minutes) => ((minutes - debut) / duree) * 100

  // Une graduation toutes les 3 heures
  const graduations = []
  for (let m = Math.ceil(debut / 180) * 180; m <= fin; m += 180) graduations.push(m)

  return (
    <button className="frise" onClick={onOuvrir} aria-label="Ouvrir le planning">
      <div className="frise-piste">
        {blocs.map((b) => {
          const cat = CATEGORIES[b.categorie] || CATEGORIES.autre
          const gauche = position(enMinutes(b.debut))
          const largeur = position(enMinutes(b.fin)) - gauche
          return (
            <span
              key={b.id}
              className="frise-bloc"
              style={{ left: gauche + "%", width: largeur + "%", background: cat.couleur }}
              title={`${b.titre} · ${b.debut} – ${b.fin}`}
            >
              <span className="frise-texte">
                {largeur > 7 && cat.emoji}
                {largeur > 12 && ` ${b.titre}`}
              </span>
            </span>
          )
        })}
        {maintenant >= debut && maintenant <= fin && (
          <span className="frise-maintenant" style={{ left: position(maintenant) + "%" }} />
        )}
      </div>
      <div className="frise-heures">
        {graduations.map((m) => (
          <span key={m} style={{ left: position(m) + "%" }}>
            {m === 24 * 60 ? "0h" : enHeure(m).slice(0, 2).replace(/^0/, "") + "h"}
          </span>
        ))}
      </div>
    </button>
  )
}

// Les textes de la fenêtre d'ajout rapide, selon le type choisi
const TEXTES = {
  habitude: { bouton: "🔁 Habitude", label: "Mon habitude", exemple: "Boire 1,5 L d'eau", quoi: "ton habitude" },
  ponctuel: { bouton: "📌 Tâche", label: "Ma tâche", exemple: "Appeler le médecin", quoi: "ta tâche" },
  grand: { bouton: "🎯 Grand objectif", label: "Mon grand objectif", exemple: "Réussir ma certif Azure", quoi: "ton objectif" },
}

// La fenêtre d'ajout rapide : une habitude, une tâche ou un grand objectif, sans changer de page
function AjoutRapide({ onAjouter, onFermer }) {
  const [type, setType] = useState("habitude")
  const [titre, setTitre] = useState("")
  const [date, setDate] = useState(dateDuJour())
  const [liste, setListe] = useState("") // to-do liste d'une tâche, ou étapes d'un grand objectif
  const [erreur, setErreur] = useState("")

  // La touche Échap ferme la fenêtre
  useEffect(() => {
    function touche(e) {
      if (e.key === "Escape") onFermer()
    }
    window.addEventListener("keydown", touche)
    return () => window.removeEventListener("keydown", touche)
  }, [onFermer])

  function valider(e) {
    e.preventDefault()
    if (!titre.trim()) return setErreur(`Écris ${TEXTES[type].quoi}`)
    if (type === "ponctuel" && !date) return setErreur("Choisis une date")
    const base = { id: nouvelId(), type, titre: titre.trim(), pourquoi: "" }
    if (type === "habitude") return onAjouter({ ...base, jours: [] })
    if (type === "ponctuel") return onAjouter({ ...base, date, fait: false, todo: lignesEnTodo(liste, nouvelId) })
    // Grand objectif : chaque ligne devient une étape
    const etapes = lignesEnTodo(liste, nouvelId).map((t) => ({ id: t.id, titre: t.texte, fait: false }))
    onAjouter({ ...base, date, etapes })
  }

  return (
    <>
      <div className="voile" onClick={onFermer} />
      <form className="fenetre formulaire" onSubmit={valider} role="dialog" aria-label="Ajout rapide">
        <div className="carte-entete">
          <h2>Ajout rapide ✨</h2>
          <button type="button" className="lien" onClick={onFermer} aria-label="Fermer">
            ✕
          </button>
        </div>
        <div className="choix-type">
          {Object.entries(TEXTES).map(([cle, t]) => (
            <button
              key={cle}
              type="button"
              className={type === cle ? "puce active" : "puce"}
              onClick={() => { setType(cle); setDate(cle === "grand" ? "" : dateDuJour()); setErreur("") }}
            >
              {t.bouton}
            </button>
          ))}
        </div>
        <label>
          {TEXTES[type].label}
          <input
            autoFocus
            value={titre}
            onChange={(e) => { setTitre(e.target.value); setErreur("") }}
            placeholder={TEXTES[type].exemple}
          />
        </label>
        {type !== "habitude" && (
          <label>
            {type === "grand" ? "Date visée (facultatif)" : "Pour quand"}
            <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setErreur("") }} />
          </label>
        )}
        {type !== "habitude" && (
          <label>
            {type === "grand" ? "Les étapes (une par ligne)" : "Ma to-do liste (facultatif, une par ligne)"}
            <textarea
              rows={3}
              value={liste}
              onChange={(e) => setListe(e.target.value)}
              placeholder={type === "grand" ? "Lister les chapitres\nRéviser le chapitre 1" : "Prendre la carte vitale\nNoter mes questions"}
            />
          </label>
        )}
        {type === "grand" && <p className="discret petit">Il apparaîtra aussi dans ton Tableau 📋, avec ses étapes en to-do liste.</p>}
        {erreur && <p className="erreur">{erreur}</p>}
        <button type="submit" className="bouton plein grand-bouton">
          Ajouter
        </button>
      </form>
    </>
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
