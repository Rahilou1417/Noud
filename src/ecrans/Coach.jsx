import { useState, useEffect, useRef } from "react"
import { supabase } from "../supabase"
import { useStockage } from "../useStockage"
import { dateDuJour, enMinutes, serieDeJours, CATEGORIES, jourDeLaSemaine, blocCeJour, nouvelId } from "../outils"
import { avancement, cartePourGrand } from "../actions"

// Des idées de questions pour démarrer
const SUGGESTIONS = [
  "Par quoi je commence aujourd'hui ?",
  "Je n'ai pas envie aujourd'hui 😔",
  "Aide-moi à organiser ma journée",
  "Fais le point sur mes objectifs",
]

// Le coach IA : une conversation avec Claude ou Gemini, qui connaît tes objectifs du jour
function Coach({ utilisateur, profil, objectifs, setObjectifs, cartes, setCartes, blocs, points }) {
  // La conversation reste sur cet appareil (elle n'est pas enregistrée en ligne)
  const [messages, setMessages] = useStockage(utilisateur.id + "-coach", [])
  const [texte, setTexte] = useState("")
  const [enAttente, setEnAttente] = useState(false)
  const [erreur, setErreur] = useState("")
  const finRef = useRef(null)

  // On descend tout en bas à chaque nouveau message
  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, enAttente])

  // Un petit résumé de la journée, envoyé au coach pour qu'il donne des conseils adaptés
  function contexte() {
    const jour = dateDuJour()
    const habitudes = objectifs.filter((o) => o.type === "habitude")
    const taches = objectifs.filter((o) => o.type === "ponctuel" && !o.fait && o.date <= jour)
    const grands = objectifs.filter((o) => o.type === "grand")
    const blocsDuJour = blocs
      .filter((b) => blocCeJour(b, jourDeLaSemaine()))
      .sort((a, b) => enMinutes(a.debut) - enMinutes(b.debut))
    const lignes = [
      `Date d'aujourd'hui : ${jour} (format AAAA-MM-JJ).`,
      `Prénom : ${profil.prenom || "inconnu"}`,
      `Nous sommes le ${new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}, il est ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}.`,
      `Points gagnés : ${points}. Coucher prévu : ${profil.coucher}, réveil : ${profil.reveil}.`,
      `Habitudes : ${habitudes.map((h) => `${h.titre} (${h.jours.includes(jour) ? "faite aujourd'hui" : "pas encore faite"}, série de ${serieDeJours(h.jours)} jours)`).join(" ; ") || "aucune"}.`,
      `Tâches à faire : ${taches.map((t) => `${t.titre}${t.date < jour ? " (en retard)" : ""}`).join(" ; ") || "aucune"}.`,
      `Grands objectifs : ${grands.map((g) => `${g.titre} (${avancement(g)} %, prochaine étape : ${g.etapes.find((e) => !e.fait)?.titre || "tout est fait"}${g.pourquoi ? `, pourquoi : ${g.pourquoi}` : ""})`).join(" ; ") || "aucun"}.`,
      `Planning d'aujourd'hui : ${blocsDuJour.map((b) => `${b.debut}-${b.fin} ${(CATEGORIES[b.categorie] || CATEGORIES.autre).nom} « ${b.titre} »`).join(" ; ") || "rien de prévu"}.`,
    ]
    return lignes.join("\n")
  }

  // Fait la chose demandée par le coach (après le « Oui » de la personne)
  function appliquerAction(action) {
    if (action.type === "ajouter") {
      const date = /^\d{4}-\d{2}-\d{2}$/.test(action.date || "") ? action.date : dateDuJour()
      const nouvelle = { id: nouvelId(), type: "ponctuel", titre: action.titre, date, fait: false, pourquoi: "", todo: [] }
      setObjectifs([...objectifs, nouvelle])
      return `Tâche ajoutée : « ${action.titre} » ✅`
    }
    const cible = objectifs.find(
      (o) => o.type === "ponctuel" && o.titre.trim().toLowerCase() === action.titre.trim().toLowerCase()
    )
    if (!cible) return `Je ne trouve pas la tâche « ${action.titre} » dans ta liste.`
    setObjectifs(objectifs.filter((o) => o.id !== cible.id))
    setCartes(cartes.filter((c) => c.tacheId !== cible.id)) // on retire aussi sa carte du tableau
    return `Tâche supprimée : « ${cible.titre} » 🗑️`
  }

  // Modifier un élément du plan proposé (titre, date, étapes)
  function modifierPlan(index, k, changements) {
    setMessages(
      messages.map((x, i) =>
        i === index
          ? { ...x, action: { ...x.action, elements: x.action.elements.map((e, j) => (j === k ? { ...e, ...changements } : e)) } }
          : x
      )
    )
  }

  // Retirer un élément du plan proposé
  function retirerElement(index, k) {
    setMessages(
      messages.map((x, i) =>
        i === index ? { ...x, action: { ...x.action, elements: x.action.elements.filter((_, j) => j !== k) } } : x
      )
    )
  }

  // Valider le plan : on crée les habitudes, tâches et grands objectifs
  function validerPlan(index) {
    const plan = messages[index]?.action
    if (!plan || plan.statut !== "attente") return
    const nouveaux = []
    const cartesNouvelles = []
    plan.elements.forEach((e) => {
      const titre = e.titre.trim()
      if (!titre) return
      if (e.genre === "habitude") {
        nouveaux.push({ id: nouvelId(), type: "habitude", titre, pourquoi: "", jours: [] })
      } else if (e.genre === "grand") {
        const etapes = e.etapes.map((t) => t.trim()).filter(Boolean).map((t) => ({ id: nouvelId(), titre: t, fait: false }))
        const grand = { id: nouvelId(), type: "grand", titre, pourquoi: "", date: "", etapes }
        nouveaux.push(grand)
        cartesNouvelles.push(cartePourGrand(grand, nouvelId())) // il va aussi dans le tableau
      } else {
        const date = /^\d{4}-\d{2}-\d{2}$/.test(e.date || "") ? e.date : dateDuJour()
        nouveaux.push({ id: nouvelId(), type: "ponctuel", titre, date, fait: false, pourquoi: "", todo: [] })
      }
    })
    if (nouveaux.length === 0) return
    setObjectifs([...objectifs, ...nouveaux])
    if (cartesNouvelles.length) setCartes([...cartes, ...cartesNouvelles])
    setMessages(
      messages.map((x, i) =>
        i === index ? { ...x, action: { ...plan, statut: "fait", bilan: `Plan ajouté : ${nouveaux.length} élément(s) ✅` } } : x
      )
    )
  }

  // Refuser le plan
  function refuserPlan(index) {
    setMessages(
      messages.map((x, i) =>
        i === index ? { ...x, action: { ...x.action, statut: "annule", bilan: "D'accord, on ne garde pas ce plan 🌿" } } : x
      )
    )
  }

  async function envoyer(contenu) {
    const message = (contenu ?? texte).trim()
    if (!message) return setErreur("Écris un message au coach")
    if (enAttente) return
    const nouveaux = [...messages, { auteur: "moi", texte: message }]
    setMessages(nouveaux)
    setTexte("")
    setErreur("")
    await demanderAuCoach(nouveaux)
  }

  async function demanderAuCoach(conversation) {
    setEnAttente(true)
    try {
      const { data } = await supabase.auth.getSession()
      // On n'attend pas plus de 50 secondes
      const minuteur = new AbortController()
      const delai = setTimeout(() => minuteur.abort(), 50000)
      const reponse = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token || ""}` },
        body: JSON.stringify({ messages: conversation, contexte: contexte() }),
        signal: minuteur.signal,
      }).finally(() => clearTimeout(delai))
      const donnees = await reponse.json().catch(() => ({}))
      if (!reponse.ok || !donnees.texte) {
        setErreur(donnees.erreur || "Le coach n'arrive pas à répondre pour l'instant. Réessaie dans un instant.")
      } else {
        const { texte, action } = lireAction(donnees.texte)
        let suite = null
        if (action?.type === "plan") suite = { ...action, statut: "attente" } // la personne décide
        else if (action) suite = { ...action, statut: "fait", bilan: appliquerAction(action) } // tout de suite
        setMessages([...conversation, { auteur: "coach", texte, action: suite }])
      }
    } catch (err) {
      setErreur(
        err?.name === "AbortError"
          ? "Le coach met trop de temps à répondre. Réessaie dans un instant 🌙"
          : "Pas de connexion internet. Vérifie ton réseau puis réessaie."
      )
    }
    setEnAttente(false)
  }

  // Réessayer : on renvoie la conversation telle quelle (le dernier message est le tien)
  function reessayer() {
    setErreur("")
    demanderAuCoach(messages)
  }

  function nouvelleConversation() {
    if (messages.length === 0 || confirm("Effacer cette conversation et en commencer une nouvelle ?")) {
      setMessages([])
      setErreur("")
    }
  }

  // Entrée = envoyer, Maj + Entrée = aller à la ligne
  function touche(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      envoyer()
    }
  }

  const prenom = profil.prenom ? ` ${profil.prenom}` : ""
  const dernierEstMoi = messages.length > 0 && messages[messages.length - 1].auteur === "moi"

  return (
    <div className="coach">
      <div className="carte-entete">
        <h1>Mon coach 💬</h1>
        {messages.length > 0 && (
          <button className="lien petit" onClick={nouvelleConversation}>
            Nouvelle conversation
          </button>
        )}
      </div>

      <div className="conversation" aria-live="polite">
        <div className="bulle coach-bulle">
          Coucou{prenom} 🌙 Je suis ton coach. Je connais tes objectifs du jour : dis-moi comment tu te sens, ou
          demande-moi par quoi commencer.
        </div>

        {messages.map((m, i) => (
          <div key={i} className={m.auteur === "moi" ? "bulle moi" : "bulle coach-bulle"}>
            {m.auteur === "coach" ? <TexteCoach texte={m.texte} /> : m.texte}
            {m.action?.type === "plan" && m.action.statut === "attente" && (
              <PlanCoach
                plan={m.action}
                onModifier={(k, changements) => modifierPlan(i, k, changements)}
                onRetirer={(k) => retirerElement(i, k)}
                onValider={() => validerPlan(i)}
                onRefuser={() => refuserPlan(i)}
              />
            )}
            {m.action && m.action.statut !== "attente" && (
              <p className="discret" style={{ margin: "8px 0 0" }}>
                {m.action.bilan}
              </p>
            )}
          </div>
        ))}

        {enAttente && (
          <div className="bulle coach-bulle ecrit" aria-label="Le coach écrit">
            <span />
            <span />
            <span />
          </div>
        )}

        {erreur && (
          <div className="erreur-coach" role="alert">
            {erreur}
            {dernierEstMoi && !enAttente && (
              <button className="lien" onClick={reessayer}>
                Réessayer
              </button>
            )}
          </div>
        )}
        <div ref={finRef} />
      </div>

      {/* Les suggestions, tant que la conversation est courte */}
      {messages.length < 2 && !enAttente && (
        <div className="suggestions">
          {SUGGESTIONS.map((s) => (
            <button key={s} className="puce" onClick={() => envoyer(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        className="coach-saisie"
        onSubmit={(e) => {
          e.preventDefault()
          envoyer()
        }}
      >
        <textarea
          rows={1}
          value={texte}
          onChange={(e) => { setTexte(e.target.value); setErreur("") }}
          onKeyDown={touche}
          placeholder="Écris au coach…"
          aria-label="Message au coach"
          maxLength={2000}
        />
        <button type="submit" className="bouton plein" disabled={enAttente} aria-label="Envoyer">
          ➤
        </button>
      </form>
      <p className="discret petit centre-texte">
        Le coach est une IA : il peut se tromper. Tes messages lui sont envoyés pour obtenir la réponse.
      </p>
    </div>
  )
}

// Sépare le texte du coach de sa ligne « ACTION: {…} » (si elle existe)
function lireAction(texte) {
  const lignes = texte.split("\n")
  let index = -1
  lignes.forEach((l, i) => {
    if (l.trim().startsWith("ACTION:")) index = i
  })
  if (index === -1) return { texte, action: null }
  let action = null
  try {
    action = JSON.parse(lignes[index].trim().slice("ACTION:".length).trim())
  } catch {
    action = null
  }
  const propre = lignes.filter((_, i) => i !== index).join("\n").trim() || "D'accord 🌿"
  return { texte: propre, action: normaliserAction(action) }
}

// Ne garde que les actions que l'app sait faire, avec des champs propres
function normaliserAction(action) {
  if (!action || typeof action !== "object") return null
  if (action.type === "ajouter" || action.type === "supprimer") {
    if (typeof action.titre !== "string" || !action.titre.trim()) return null
    return { type: action.type, titre: action.titre.trim(), date: typeof action.date === "string" ? action.date : "" }
  }
  if (action.type === "plan" && Array.isArray(action.elements)) {
    const elements = action.elements
      .filter((e) => e && typeof e.titre === "string" && e.titre.trim())
      .map((e) => ({
        genre: ["habitude", "tache", "grand"].includes(e.genre) ? e.genre : "tache",
        titre: e.titre.trim(),
        date: typeof e.date === "string" ? e.date : "",
        etapes: Array.isArray(e.etapes) ? e.etapes.filter((t) => typeof t === "string") : [],
      }))
    if (elements.length === 0) return null
    return { type: "plan", titre: typeof action.titre === "string" ? action.titre : "Mon plan", elements }
  }
  return null
}

// Les noms affichés pour chaque genre d'élément du plan
const GENRES = { habitude: "🔁 Habitude", tache: "📌 Tâche", grand: "🎯 Grand objectif" }

// Le plan proposé par le coach : on peut le modifier, le valider ou le refuser
function PlanCoach({ plan, onModifier, onRetirer, onValider, onRefuser }) {
  return (
    <div className="carte" style={{ marginTop: 8 }}>
      <div className="carte-titre">📝 {plan.titre}</div>
      <p className="discret petit">Modifie ce qui ne te convient pas, puis valide.</p>
      {plan.elements.map((e, k) => (
        <div key={k} style={{ borderTop: "1px solid #8884", paddingTop: 8, marginTop: 8 }}>
          <div className="discret petit">{GENRES[e.genre]}</div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              value={e.titre}
              onChange={(ev) => onModifier(k, { titre: ev.target.value })}
              aria-label="Titre"
              style={{ flex: 1, minWidth: 0 }}
            />
            <button className="lien" onClick={() => onRetirer(k)} aria-label="Retirer cet élément">
              ✕
            </button>
          </div>
          {e.genre === "tache" && (
            <input
              type="date"
              value={e.date}
              onChange={(ev) => onModifier(k, { date: ev.target.value })}
              aria-label="Date"
              style={{ marginTop: 6 }}
            />
          )}
          {e.genre === "grand" && (
            <textarea
              rows={2}
              value={e.etapes.join("\n")}
              onChange={(ev) => onModifier(k, { etapes: ev.target.value.split("\n") })}
              placeholder="Une étape par ligne"
              aria-label="Étapes"
              style={{ marginTop: 6, width: "100%" }}
            />
          )}
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button className="bouton plein" onClick={onValider}>
          Valider le plan
        </button>
        <button className="bouton" onClick={onRefuser}>
          Non merci
        </button>
      </div>
    </div>
  )
}

// Affiche la réponse du coach : retours à la ligne, listes et **gras**
function TexteCoach({ texte }) {
  const lignes = texte.split("\n")
  return (
    <>
      {lignes.map((ligne, i) => {
        const puce = /^\s*([-*•]|\d+\.)\s+/.test(ligne)
        const propre = ligne.replace(/^\s*[-*•]\s+/, "")
        const morceaux = propre.split(/(\*\*[^*]+\*\*)/g).map((m, j) =>
          m.startsWith("**") && m.endsWith("**") ? <strong key={j}>{m.slice(2, -2)}</strong> : m
        )
        if (!ligne.trim()) return <div key={i} className="espace" />
        return (
          <div key={i} className={puce ? "ligne-puce" : ""}>
            {puce && !/^\s*\d+\./.test(ligne) && "• "}
            {morceaux}
          </div>
        )
      })}
    </>
  )
}

export default Coach
