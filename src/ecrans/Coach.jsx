import { useState, useEffect, useRef } from "react"
import { supabase } from "../supabase"
import { useStockage } from "../useStockage"
import { dateDuJour, enMinutes, serieDeJours, CATEGORIES, jourDeLaSemaine, blocCeJour } from "../outils"
import { avancement } from "../actions"

// Des idées de questions pour démarrer
const SUGGESTIONS = [
  "Par quoi je commence aujourd'hui ?",
  "Je n'ai pas envie aujourd'hui 😔",
  "Aide-moi à organiser ma journée",
  "Fais le point sur mes objectifs",
]

// Le coach IA : une conversation avec Claude ou Gemini, qui connaît tes objectifs du jour
function Coach({ utilisateur, profil, objectifs, blocs, points }) {
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
        setMessages([...conversation, { auteur: "coach", texte: donnees.texte }])
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
