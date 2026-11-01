import { useEffect, useRef } from "react"
import { dateDuJour, heureActuelle, enMinutes, enHeure, DEFIS_REVEIL, CATEGORIES, jourDeLaSemaine, blocCeJour } from "./outils"

// Envoie une notification (si l'utilisatrice l'a autorisée)
export function notifier(titre, texte) {
  if (!("Notification" in window) || Notification.permission !== "granted") return
  // Sur téléphone, il faut passer par le service worker
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.ready.then((sw) =>
      sw.showNotification(titre, { body: texte, icon: "/icon.svg" })
    )
  } else {
    new Notification(titre, { body: texte, icon: "/icon.svg" })
  }
}

// Regarde l'heure toutes les 20 secondes et envoie les rappels.
// ⚠️ Ça ne marche que si l'app est ouverte (ou en arrière-plan).
export function useRappels({ blocs, coucher, reveil }) {
  const dejaEnvoyes = useRef(new Set())

  useEffect(() => {
    function verifier() {
      const maintenant = heureActuelle()
      const jour = dateDuJour()

      function envoyerUneFois(cle, titre, texte) {
        const id = jour + cle
        if (dejaEnvoyes.current.has(id)) return
        dejaEnvoyes.current.add(id)
        notifier(titre, texte)
      }

      // 1. Début de chaque bloc du planning
      blocs.forEach((bloc) => {
        if (bloc.debut === maintenant && blocCeJour(bloc, jourDeLaSemaine())) {
          const cat = CATEGORIES[bloc.categorie] || CATEGORIES.autre
          envoyerUneFois("bloc-" + bloc.id, `${cat.emoji} C'est l'heure : ${bloc.titre}`, `Jusqu'à ${bloc.fin}`)
        }
      })

      // 2. 30 minutes avant le coucher
      if (coucher && enHeure(enMinutes(coucher) - 30) === maintenant) {
        envoyerUneFois("coucher", "🌙 On lâche la série", `Coucher à ${coucher}. Demain, tu te remercieras.`)
      }

      // 3. Le réveil, avec un petit défi
      if (reveil && reveil === maintenant) {
        const defi = DEFIS_REVEIL[new Date().getDate() % DEFIS_REVEIL.length]
        envoyerUneFois("reveil", "☀️ Bonjour ! Ton défi du réveil", defi)
      }
    }

    verifier()
    const minuteur = setInterval(verifier, 20000)
    return () => clearInterval(minuteur)
  }, [blocs, coucher, reveil])
}
