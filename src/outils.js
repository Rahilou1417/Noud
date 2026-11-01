// Petits outils utilisés partout dans l'app

// La date du jour au format "2026-10-30"
export function dateDuJour(decalage = 0) {
  const d = new Date()
  d.setDate(d.getDate() + decalage)
  const mois = String(d.getMonth() + 1).padStart(2, "0")
  const jour = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${mois}-${jour}`
}

// L'heure actuelle au format "08:30"
export function heureActuelle() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

// Transforme "08:30" en nombre de minutes (510)
export function enMinutes(heure) {
  const [h, m] = heure.split(":").map(Number)
  return h * 60 + m
}

// Transforme 510 en "08:30"
export function enHeure(minutes) {
  const total = (minutes + 24 * 60) % (24 * 60)
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

// Un identifiant unique pour chaque objectif, bloc, étape...
export function nouvelId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

// Nombre de jours d'affilée où une habitude a été faite
export function serieDeJours(joursFaits) {
  let serie = 0
  // Si ce n'est pas encore fait aujourd'hui, on compte à partir d'hier
  let decalage = joursFaits.includes(dateDuJour()) ? 0 : -1
  while (joursFaits.includes(dateDuJour(decalage))) {
    serie++
    decalage--
  }
  return serie
}

// Les catégories de blocs du planning, avec leur couleur
export const CATEGORIES = {
  sommeil: { nom: "Sommeil", emoji: "😴", couleur: "#9B8CE8" },
  travail: { nom: "Cours / travail", emoji: "💼", couleur: "#6CA8F0" },
  etude: { nom: "Devoirs / révisions", emoji: "📚", couleur: "#4FC1C9" },
  sport: { nom: "Sport", emoji: "🏃‍♀️", couleur: "#7CCB8A" },
  priere: { nom: "Prière", emoji: "🤲", couleur: "#E8C15A" },
  plaisir: { nom: "Plaisir", emoji: "🎬", couleur: "#7FD3F5" },
  autre: { nom: "Autre", emoji: "✨", couleur: "#B0B4C8" },
}

// Les petits défis du réveil
export const DEFIS_REVEIL = [
  "Bois un grand verre d'eau 💧",
  "Ouvre les rideaux et regarde dehors 30 secondes ☀️",
  "Fais 10 étirements avant de prendre ton téléphone 🙆‍♀️",
  "Lève-toi et fais ton lit 🛏️",
  "Écris ton objectif du jour en une phrase ✍️",
]
