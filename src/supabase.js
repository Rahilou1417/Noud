import { createClient } from "@supabase/supabase-js"

// L'adresse de ton projet Supabase et sa clé publique (« publishable »).
// Cette clé est faite pour être visible dans une app : elle ne donne accès
// qu'à ce que les règles de sécurité (les « policy ») autorisent.
// ⚠️ Ne mets JAMAIS ici une clé « secret » ou « service_role ».
// (Si un fichier .env.local existe, ses valeurs passent en priorité.)
const adresse = import.meta.env.VITE_SUPABASE_URL || "https://zgxgyxecmseqclplkpvy.supabase.co"
const cle = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_TKgGRmoyjzMWOnPpKhurKw_6_kX_Uhe"

// Si l'adresse ou la clé manque, on ne crée pas de client :
// l'app affichera un message pour expliquer quoi faire.
export const supabase = adresse && cle ? createClient(adresse, cle) : null

// Traduit en français les erreurs de Supabase les plus courantes
export function messageErreur(erreur) {
  const code = erreur?.code || ""
  const texte = erreur?.message || ""
  if (code === "invalid_credentials" || texte.includes("Invalid login credentials"))
    return "E-mail ou mot de passe incorrect."
  if (code === "user_already_exists" || texte.includes("already registered"))
    return "Un compte existe déjà avec cet e-mail. Connecte-toi plutôt."
  if (code === "email_not_confirmed" || texte.includes("Email not confirmed"))
    return "Confirme d'abord ton e-mail : clique sur le lien reçu dans ta boîte mail."
  if (code === "weak_password" || texte.includes("Password should be"))
    return "Mot de passe trop faible : au moins 6 caractères."
  if (code.includes("rate_limit") || texte.toLowerCase().includes("rate limit"))
    return "Trop d'essais d'un coup. Attends quelques minutes puis réessaie."
  if (code === "validation_failed" || texte.includes("invalid format"))
    return "Cette adresse e-mail n'a pas l'air valide."
  if (texte.includes("Failed to fetch") || texte.includes("NetworkError"))
    return "Pas de connexion internet. Vérifie ton réseau puis réessaie."
  return "Oups, quelque chose n'a pas marché. Réessaie dans un instant."
}
