import { useState, useEffect } from "react"

// Comme useState, mais la valeur est gardée dans le navigateur (localStorage).
// Elle est donc toujours là quand on rouvre l'app.
export function useStockage(cle, valeurParDefaut) {
  const [valeur, setValeur] = useState(() => {
    try {
      const sauvegarde = localStorage.getItem("noud-" + cle)
      return sauvegarde !== null ? JSON.parse(sauvegarde) : valeurParDefaut
    } catch {
      return valeurParDefaut
    }
  })

  // À chaque changement, on sauvegarde
  useEffect(() => {
    try {
      localStorage.setItem("noud-" + cle, JSON.stringify(valeur))
    } catch {
      // Le stockage n'est pas disponible : l'app marche quand même
    }
  }, [cle, valeur])

  return [valeur, setValeur]
}
