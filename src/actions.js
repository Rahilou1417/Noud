import { dateDuJour } from "./outils"

// Les actions sur les objectifs, partagées entre les écrans.
// Chaque fonction reçoit la liste, et renvoie une NOUVELLE liste
// (en React, on ne modifie jamais directement une liste : on la remplace).

// Coche ou décoche une habitude pour aujourd'hui
export function basculerHabitude(objectifs, id) {
  const jour = dateDuJour()
  return objectifs.map((o) => {
    if (o.id !== id) return o
    const dejaFait = o.jours.includes(jour)
    return { ...o, jours: dejaFait ? o.jours.filter((j) => j !== jour) : [...o.jours, jour] }
  })
}

// Coche ou décoche une tâche ponctuelle
export function basculerTache(objectifs, id) {
  return objectifs.map((o) => (o.id === id ? { ...o, fait: !o.fait } : o))
}

// Coche ou décoche une étape d'un grand objectif
export function basculerEtape(objectifs, idObjectif, idEtape) {
  return objectifs.map((o) => {
    if (o.id !== idObjectif) return o
    return { ...o, etapes: o.etapes.map((e) => (e.id === idEtape ? { ...e, fait: !e.fait } : e)) }
  })
}

// Les habitudes du jour sont-elles toutes faites ? (pour débloquer le plaisir)
export function journeeReussie(objectifs) {
  const habitudes = objectifs.filter((o) => o.type === "habitude")
  const taches = objectifs.filter((o) => o.type === "ponctuel" && o.date === dateDuJour())
  const toutes = [...habitudes.map((h) => h.jours.includes(dateDuJour())), ...taches.map((t) => t.fait)]
  return toutes.length > 0 && toutes.every(Boolean)
}

// Le pourcentage d'avancement d'un grand objectif
export function avancement(objectif) {
  if (!objectif.etapes.length) return 0
  const faites = objectif.etapes.filter((e) => e.fait).length
  return Math.round((faites / objectif.etapes.length) * 100)
}

// Les points gagnés par action
export const POINTS = { habitude: 10, tache: 5, etape: 20, focus: 15 }

// Coche (fait = true) ou décoche (fait = false) une étape précise
export function reglerEtape(objectifs, idObjectif, idEtape, fait) {
  return objectifs.map((o) => {
    if (o.id !== idObjectif) return o
    return { ...o, etapes: o.etapes.map((e) => (e.id === idEtape ? { ...e, fait } : e)) }
  })
}

// Range dans la bonne colonne les cartes du tableau liées à une étape :
// étape faite → « Terminé », étape décochée → retour dans « À faire »
export function synchroniserCartes(cartes, idEtape, fait) {
  return cartes.map((c) => {
    if (c.etapeId !== idEtape) return c
    if (fait) return { ...c, colonne: "termine" }
    return c.colonne === "termine" ? { ...c, colonne: "afaire" } : c
  })
}

// Retrouve l'objectif et l'étape liés à une carte (ou rien si l'objectif a été supprimé)
export function lienDeCarte(objectifs, carte) {
  const objectif = objectifs.find((o) => o.id === carte.objectifId)
  const etape = objectif?.etapes?.find((e) => e.id === carte.etapeId)
  return objectif && etape ? { objectif, etape } : null
}
