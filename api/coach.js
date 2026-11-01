// ===== La fonction serveur du coach (elle tourne sur Vercel, pas dans le navigateur) =====
// Elle garde la clé Gemini secrète : le navigateur ne la voit jamais.
// 1. Elle vérifie que la demande vient bien d'une personne connectée à NouD.
// 2. Elle envoie la conversation à Gemini avec les consignes du coach.
// 3. Elle renvoie la réponse à l'app.

const ADRESSE_SUPABASE = process.env.SUPABASE_URL || "https://zgxgyxecmseqclplkpvy.supabase.co"
const CLE_SUPABASE = process.env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable_TKgGRmoyjzMWOnPpKhurKw_6_kX_Uhe"
// Flash-Lite : le modèle Gemini le plus rapide, idéal pour un coach qui répond en quelques secondes.
// (Pour en changer sans toucher au code : ajoute GEMINI_MODELE dans les variables Vercel.)
const MODELE = process.env.GEMINI_MODELE || "gemini-3.5-flash-lite"

// Les consignes données au coach
function consignes(contexte) {
  return `Tu es le coach de NouD, une app qui aide les personnes ambitieuses à organiser leur temps et à atteindre leurs objectifs.

Ta manière de parler :
- En français, en tutoyant, avec douceur et chaleur, comme une grande sœur ou un grand frère bienveillant.
- Des réponses courtes : 2 à 5 phrases, ou une petite liste de 3 points maximum.
- Concret : propose UNE prochaine action simple, faisable dans les 30 minutes.
- Jamais culpabilisant. Tu valorises chaque petit progrès.
- Tu peux utiliser quelques emojis, sans en abuser.

Tes limites :
- Tu n'es ni médecin, ni psychologue : pour la santé, la nutrition ou le poids, tu restes général et tu conseilles un professionnel si besoin.
- Si la personne semble en grande détresse ou parle de se faire du mal, réponds avec beaucoup de douceur, dis-lui qu'elle n'est pas seule, et encourage-la à appeler le 3114 (numéro national de prévention du suicide en France, gratuit, 24h/24) ou le 112 en cas d'urgence, ou à parler à une personne de confiance.

Voici ce que tu sais de la personne aujourd'hui (données de son app) :
${contexte || "Pas d'information pour l'instant."}`
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
  const cle = process.env.GEMINI_API_KEY
  if (!cle) return res.status(500).json({ erreur: "La clé Gemini n'est pas encore ajoutée sur Vercel." })

  const { messages = [], contexte = "" } = req.body || {}
  const derniers = messages
    .filter((m) => m && typeof m.texte === "string" && m.texte.trim())
    .slice(-12) // on n'envoie que les 12 derniers messages
    .map((m) => ({
      role: m.auteur === "coach" ? "model" : "user",
      parts: [{ text: m.texte.slice(0, 2000) }],
    }))
  if (derniers.length === 0 || derniers[derniers.length - 1].role !== "user") {
    return res.status(400).json({ erreur: "Écris un message au coach." })
  }

  // 3. Demander la réponse à Gemini
  // Les modèles Flash « réfléchissent » avant de répondre : on leur demande une réflexion légère,
  // plus rapide et largement suffisante pour un coach. Si le modèle ne connaît pas ce réglage,
  // on réessaie sans.
  async function demander(avecReflexionLegere) {
    const generationConfig = { temperature: 0.8, maxOutputTokens: 2048 }
    if (avecReflexionLegere) generationConfig.thinkingConfig = { thinkingLevel: "low" }
    const minuteur = new AbortController()
    const delai = setTimeout(() => minuteur.abort(), 25000) // 25 secondes maximum
    try {
      return await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODELE}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": cle.trim() },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: consignes(String(contexte).slice(0, 4000)) }] },
          contents: derniers,
          generationConfig,
        }),
        signal: minuteur.signal,
      })
    } finally {
      clearTimeout(delai)
    }
  }

  const debut = Date.now()
  try {
    let reponse = await demander(true)
    let donnees = await reponse.json()
    if (reponse.status === 400 && JSON.stringify(donnees).toLowerCase().includes("think")) {
      console.log("Coach : le modèle refuse le réglage de réflexion, nouvel essai sans")
      reponse = await demander(false)
      donnees = await reponse.json()
    }
    console.log(`Coach : ${MODELE} a répondu ${reponse.status} en ${Date.now() - debut} ms`)
    if (!reponse.ok) {
      console.error("Gemini :", reponse.status, JSON.stringify(donnees).slice(0, 500))
      const trop = reponse.status === 429
      return res.status(trop ? 429 : 502).json({
        erreur: trop
          ? "Le coach a beaucoup parlé aujourd'hui (limite gratuite atteinte). Réessaie un peu plus tard 🌙"
          : "Le coach n'arrive pas à répondre pour l'instant. Réessaie dans un instant.",
      })
    }
    const texte = (donnees.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("").trim()
    if (!texte) return res.status(502).json({ erreur: "Le coach n'a pas trouvé ses mots. Reformule ta question 🌿" })
    return res.status(200).json({ texte })
  } catch (err) {
    console.error("Erreur coach :", err)
    if (err?.name === "AbortError") {
      console.error(`Coach : ${MODELE} n'a pas répondu en ${Date.now() - debut} ms`)
      return res.status(504).json({ erreur: "Le coach a mis trop de temps à répondre. Réessaie dans un instant 🌙" })
    }
    return res.status(502).json({ erreur: "Le coach n'arrive pas à répondre pour l'instant. Réessaie dans un instant." })
  }
}
