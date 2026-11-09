// ===== La fonction serveur du coach (elle tourne sur Vercel, pas dans le navigateur) =====
// Elle garde la clé de l'IA secrète : le navigateur ne la voit jamais.
// 1. Elle vérifie que la demande vient bien d'une personne connectée à NouD.
// 2. Elle envoie la conversation à l'IA (Claude ou Gemini) avec les consignes du coach.
// 3. Elle renvoie la réponse à l'app.

const ADRESSE_SUPABASE = process.env.SUPABASE_URL || "https://zgxgyxecmseqclplkpvy.supabase.co"
const CLE_SUPABASE = process.env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable_TKgGRmoyjzMWOnPpKhurKw_6_kX_Uhe"

// Le coach sait parler avec deux IA :
// - Claude (Anthropic), si la variable ANTHROPIC_API_KEY existe sur Vercel (payant, très fiable) ;
// - sinon Gemini (Google), avec la variable GEMINI_API_KEY (gratuit, mais parfois surchargé).

// Claude Haiku : le modèle le plus rapide et le moins cher de Claude.
const MODELE_CLAUDE = process.env.ANTHROPIC_MODELE || "claude-haiku-5-5"

// Les modèles Gemini essayés dans l'ordre : si l'un est surchargé ou trop lent, on passe au suivant.
const MODELES_GEMINI = [
  process.env.GEMINI_MODELE,
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
].filter((m, i, liste) => m && liste.indexOf(m) === i)

// Les messages d'erreur montrés dans l'app
const ERREURS = {
  quota: "Le coach a beaucoup parlé aujourd'hui (limite atteinte). Réessaie un peu plus tard 🌙",
  surcharge: "L'IA est très demandée en ce moment. Réessaie dans une minute 🌙",
  lent: "Le coach a mis trop de temps à répondre. Réessaie dans un instant 🌙",
  vide: "Le coach n'a pas trouvé ses mots. Reformule ta question 🌿",
  cle: "La clé de l'IA est refusée. Vérifie-la dans les variables Vercel.",
  credit: "Le crédit Claude est épuisé. Ajoute un peu de crédit sur console.anthropic.com.",
  erreur: "Le coach n'arrive pas à répondre pour l'instant. Réessaie dans un instant.",
}
const CODES = { quota: 429, surcharge: 503, lent: 504, vide: 502, cle: 500, credit: 502, erreur: 502 }

// Envoie une requête avec un temps maximum
async function envoyer(url, options, millisecondes) {
  const minuteur = new AbortController()
  const delai = setTimeout(() => minuteur.abort(), millisecondes)
  try {
    const reponse = await fetch(url, { ...options, signal: minuteur.signal })
    return { reponse, donnees: await reponse.json().catch(() => ({})) }
  } finally {
    clearTimeout(delai)
  }
}

// ----- Claude -----
async function repondreAvecClaude(cle, systeme, conversation) {
  const options = {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": cle, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODELE_CLAUDE, max_tokens: 700, system: systeme, messages: conversation }),
  }
  const debut = Date.now()
  try {
    let { reponse, donnees } = await envoyer("https://api.anthropic.com/v1/messages", options, 30000)
    if (reponse.status === 529 || reponse.status === 503) {
      await new Promise((r) => setTimeout(r, 1500)) // Claude surchargé : un 2e essai
      ;({ reponse, donnees } = await envoyer("https://api.anthropic.com/v1/messages", options, 30000))
    }
    console.log(`Coach : Claude ${MODELE_CLAUDE} a répondu ${reponse.status} en ${Date.now() - debut} ms`)
    if (!reponse.ok) {
      const detail = JSON.stringify(donnees).slice(0, 300)
      console.error("Claude :", reponse.status, detail)
      if (reponse.status === 401) return { probleme: "cle" }
      if (detail.toLowerCase().includes("credit")) return { probleme: "credit" }
      if (reponse.status === 429) return { probleme: "quota" }
      if (reponse.status === 529 || reponse.status === 503) return { probleme: "surcharge" }
      return { probleme: "erreur" }
    }
    const texte = (donnees.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim()
    return texte ? { texte } : { probleme: "vide" }
  } catch (err) {
    console.error(`Coach : Claude, erreur après ${Date.now() - debut} ms :`, err?.name)
    return { probleme: err?.name === "AbortError" ? "lent" : "erreur" }
  }
}

// ----- Gemini -----
async function repondreAvecGemini(cle, systeme, conversation) {
  // Gemini appelle le coach « model » et attend des « parts »
  const contents = conversation.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }))
  const debut = Date.now()
  let probleme = "erreur"
  for (const modele of MODELES_GEMINI) {
    if (Date.now() - debut > 35000) break // on ne fait pas attendre plus de ~35 secondes au total
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modele}:generateContent`
    const corps = (reflexionLegere) => {
      const generationConfig = { temperature: 0.8, maxOutputTokens: 2048 }
      if (reflexionLegere) generationConfig.thinkingConfig = { thinkingLevel: "low" } // répondre vite
      return JSON.stringify({ systemInstruction: { parts: [{ text: systeme }] }, contents, generationConfig })
    }
    const options = (reflexionLegere) => ({
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": cle },
      body: corps(reflexionLegere),
    })
    try {
      let { reponse, donnees } = await envoyer(url, options(true), 15000)
      if (reponse.status === 400 && JSON.stringify(donnees).toLowerCase().includes("think")) {
        ;({ reponse, donnees } = await envoyer(url, options(false), 15000)) // modèle sans ce réglage
      }
      console.log(`Coach : Gemini ${modele} a répondu ${reponse.status} en ${Date.now() - debut} ms`)
      if (reponse.ok) {
        const texte = (donnees.candidates?.[0]?.content?.parts || [])
          .filter((p) => !p.thought)
          .map((p) => p.text || "")
          .join("")
          .trim()
        if (texte) return { texte }
        probleme = "vide"
        continue
      }
      console.error("Gemini :", modele, reponse.status, JSON.stringify(donnees).slice(0, 300))
      if (reponse.status === 429) probleme = "quota"
      else if (reponse.status === 503 || reponse.status === 500) probleme = "surcharge"
      else if (reponse.status === 400 || reponse.status === 403) return { probleme: "cle" } // inutile d'insister
      // 404 (modèle inconnu) : on essaie simplement le suivant
    } catch (err) {
      console.error(`Coach : Gemini ${modele} n'a pas répondu (${err?.name}) après ${Date.now() - debut} ms`)
      probleme = "lent"
    }
  }
  return { probleme }
}

// Les consignes données au coach
function consignes(contexte) {
  return `Tu es le coach de NouD, une app qui aide les personnes ambitieuses à organiser leur temps et à atteindre leurs objectifs.

Ta manière de parler :
- En français, en tutoyant, avec douceur et chaleur, comme une grande sœur ou un grand frère bienveillant.
- Des réponses courtes : 2 à 5 phrases, ou une petite liste de 3 points maximum.
- Concret : propose UNE prochaine action simple, faisable dans les 30 minutes.
- Jamais culpabilisant. Tu valorises chaque petit progrès.
- Tu peux utiliser quelques emojis, sans en abuser.

Tu peux aussi agir dans l'app. Quand tu fais une action, écris une phrase courte, puis, tout à la fin, sur une ligne à part :

1. Si la personne te demande d'ajouter ou de supprimer une tâche, fais-le tout de suite :
  ACTION: {"type":"ajouter","titre":"Appeler le médecin","date":"AAAA-MM-JJ"}
  ACTION: {"type":"supprimer","titre":"Appeler le médecin"}
- Pour « ajouter » : la date est au format AAAA-MM-JJ (la date d'aujourd'hui si la personne ne précise pas).
- Pour « supprimer » : le titre doit être exactement celui d'une tâche de la liste ci-dessous.

2. Si la personne se fixe un objectif (par exemple « je veux perdre du poids » ou « je veux mieux réviser »), propose-lui un petit plan adapté :
  ACTION: {"type":"plan","titre":"Mon plan révisions","elements":[{"genre":"habitude","titre":"Réviser 25 min chaque matin"},{"genre":"tache","titre":"Relire le chapitre 1","date":"AAAA-MM-JJ"},{"genre":"grand","titre":"Réussir l'examen","etapes":["Relire les cours","Faire 5 exercices"]}]}
- « genre » vaut « habitude » (à faire chaque jour), « tache » (une seule fois, à une date) ou « grand » (un objectif avec des étapes).
- Un plan contient 3 à 6 éléments, simples et réalistes.
- Pour un objectif de poids, de nutrition ou de santé : ne donne JAMAIS de calories, de régime, de chiffres sur le corps ni de programme alimentaire. Propose plutôt des habitudes simples (marcher, bouger, bien dormir, cuisiner maison) et conseille de voir un médecin ou un diététicien.
- La personne valide, modifie ou refuse le plan elle-même.

3. Si la personne ne demande rien de tel, n'écris jamais de ligne ACTION.

Tes limites :
- Tu n'es ni médecin, ni psychologue : pour la santé, la nutrition ou le poids, tu restes général et tu conseilles un professionnel si besoin.
- Si la personne semble en grande détresse ou parle de se faire du mal, réponds avec beaucoup de douceur, dis-lui qu'elle n'est pas seule, et encourage-la à appeler le 3114 (numéro national de prévention du suicide en France, gratuit, 24h/24) ou le 112 en cas d'urgence, ou à parler à une personne de confiance.

Voici ce que tu sais de la personne aujourd'hui (données de son app) :
${contexte || "Pas d'information pour l'instant."}`
}

// Claude veut une conversation qui commence par la personne et qui alterne personne / coach :
// on regroupe les messages qui se suivent du même côté.
function preparerConversation(messages) {
  const liste = []
  for (const m of messages) {
    if (!m || typeof m.texte !== "string" || !m.texte.trim()) continue
    const role = m.auteur === "coach" ? "assistant" : "user"
    const texte = m.texte.slice(0, 2000)
    if (liste.length && liste[liste.length - 1].role === role) {
      liste[liste.length - 1].content += "\n" + texte
    } else {
      liste.push({ role, content: texte })
    }
  }
  while (liste.length && liste[0].role !== "user") liste.shift()
  return liste.slice(-12) // on n'envoie que les 12 derniers échanges
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ erreur: "Méthode non autorisée" })

  // 1. Vérifier la personne connectée (avec le jeton de Supabase envoyé par l'app)
  const jeton = (req.headers.authorization || "").replace("Bearer ", "")
  if (!jeton) return res.status(401).json({ erreur: "Connecte-toi pour parler au coach." })
  try {
    const verif = await fetch(`${ADRESSE_SUPABASE}/auth/v1/user`, {
      headers: { apikey: CLE_SUPABASE, Authorization: `Bearer ${jeton}` },
    })
    if (!verif.ok) return res.status(401).json({ erreur: "Ta session a expiré. Reconnecte-toi." })
  } catch {
    return res.status(502).json({ erreur: "Impossible de vérifier ta session pour l'instant." })
  }

  // 2. Préparer la conversation
  const cleClaude = (process.env.ANTHROPIC_API_KEY || "").trim()
  const cleGemini = (process.env.GEMINI_API_KEY || "").trim()
  if (!cleClaude && !cleGemini) {
    return res.status(500).json({ erreur: "Aucune clé d'IA n'est ajoutée sur Vercel (GEMINI_API_KEY ou ANTHROPIC_API_KEY)." })
  }

  const { messages = [], contexte = "" } = req.body || {}
  const conversation = preparerConversation(messages)
  if (conversation.length === 0 || conversation[conversation.length - 1].role !== "user") {
    return res.status(400).json({ erreur: "Écris un message au coach." })
  }
  const systeme = consignes(String(contexte).slice(0, 4000))

  // 3. Demander la réponse (Claude si sa clé existe, sinon Gemini)
  const resultat = cleClaude
    ? await repondreAvecClaude(cleClaude, systeme, conversation)
    : await repondreAvecGemini(cleGemini, systeme, conversation)

  if (resultat.texte) return res.status(200).json({ texte: resultat.texte })
  return res.status(CODES[resultat.probleme]).json({ erreur: ERREURS[resultat.probleme] })
}
