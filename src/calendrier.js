import { CATEGORIES, TOUS_LES_JOURS } from "./outils"

// Crée un fichier calendrier (format .ics, compris par Google Agenda,
// Calendrier d'Apple, Samsung Calendar, Outlook…) à partir du planning.

// Les codes des jours dans le format .ics : lundi = MO … dimanche = SU
const CODES_JOURS = { 1: "MO", 2: "TU", 3: "WE", 4: "TH", 5: "FR", 6: "SA", 7: "SU" }

// 2026-11-01 → 20261101
function dateIcs(date) {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`
}

// "09:30" → 093000
function heureIcs(heure) {
  return heure.replace(":", "") + "00"
}

// Le format .ics demande d'échapper certains caractères dans les textes
function texteIcs(texte) {
  return String(texte).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n")
}

// Le format .ics coupe les lignes trop longues (75 octets maximum, en comptant les accents et emojis)
function plier(ligne) {
  const encodeur = new TextEncoder()
  const morceaux = []
  let courant = ""
  for (const caractere of ligne) {
    const limite = morceaux.length === 0 ? 75 : 74 // les lignes suivantes commencent par un espace
    if (encodeur.encode(courant + caractere).length > limite) {
      morceaux.push(courant)
      courant = caractere
    } else {
      courant += caractere
    }
  }
  morceaux.push(courant)
  return morceaux.join("\r\n ")
}

// Le premier jour, à partir d'aujourd'hui, qui fait partie des jours du bloc
function premiereDate(jours) {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  for (let i = 0; i < 7; i++) {
    const n = date.getDay() === 0 ? 7 : date.getDay()
    if (jours.includes(n)) return date
    date.setDate(date.getDate() + 1)
  }
  return date
}

// Fabrique le texte complet du fichier .ics
export function genererCalendrier({ blocs = [], taches = [], rappel = true }) {
  const maintenant = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "") // horodatage UTC
  const lignes = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NouD//Planning//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:NouD",
  ]

  // Les blocs du planning : un événement qui se répète chaque semaine
  for (const bloc of blocs) {
    const jours = bloc.jours?.length ? bloc.jours : TOUS_LES_JOURS
    const cat = CATEGORIES[bloc.categorie] || CATEGORIES.autre
    const jour = dateIcs(premiereDate(jours))
    lignes.push(
      "BEGIN:VEVENT",
      `UID:bloc-${bloc.id}@noud`,
      `DTSTAMP:${maintenant}`,
      `DTSTART:${jour}T${heureIcs(bloc.debut)}`,
      `DTEND:${jour}T${heureIcs(bloc.fin)}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${[...jours].sort().map((n) => CODES_JOURS[n]).join(",")}`,
      `SUMMARY:${texteIcs(`${cat.emoji} ${bloc.titre}`)}`,
      `DESCRIPTION:${texteIcs(`${cat.nom} · ajouté depuis NouD 🌙`)}`
    )
    if (rappel) {
      lignes.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${texteIcs(bloc.titre)}`, "TRIGGER:-PT0M", "END:VALARM")
    }
    lignes.push("END:VEVENT")
  }

  // Les tâches avec une date : un événement « toute la journée »
  for (const tache of taches) {
    if (!tache.date) continue
    const debut = new Date(tache.date + "T00:00:00")
    const lendemain = new Date(debut)
    lendemain.setDate(lendemain.getDate() + 1)
    lignes.push(
      "BEGIN:VEVENT",
      `UID:tache-${tache.id}@noud`,
      `DTSTAMP:${maintenant}`,
      `DTSTART;VALUE=DATE:${dateIcs(debut)}`,
      `DTEND;VALUE=DATE:${dateIcs(lendemain)}`,
      `SUMMARY:${texteIcs(`📌 ${tache.titre}`)}`,
      `DESCRIPTION:${texteIcs("Tâche ajoutée depuis NouD 🌙")}`,
      "END:VEVENT"
    )
  }

  lignes.push("END:VCALENDAR")
  return lignes.map(plier).join("\r\n") + "\r\n"
}

// Télécharge le fichier (ou ouvre directement le calendrier sur iPhone)
export function telechargerCalendrier(texte) {
  const fichier = new Blob([texte], { type: "text/calendar;charset=utf-8" })
  const adresse = URL.createObjectURL(fichier)
  const lien = document.createElement("a")
  lien.href = adresse
  lien.download = "noud-planning.ics"
  document.body.appendChild(lien)
  lien.click()
  lien.remove()
  setTimeout(() => URL.revokeObjectURL(adresse), 60000)
}
