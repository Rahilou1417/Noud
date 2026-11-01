import { useState } from "react"
import { supabase, messageErreur } from "../supabase"

// Le premier écran : se connecter, s'inscrire, ou retrouver son mot de passe
function Connexion() {
  const [mode, setMode] = useState("connexion") // "connexion", "inscription" ou "oubli"
  const [prenom, setPrenom] = useState("")
  const [email, setEmail] = useState("")
  const [motDePasse, setMotDePasse] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [voirMotDePasse, setVoirMotDePasse] = useState(false)
  const [erreur, setErreur] = useState("")
  const [info, setInfo] = useState("")
  const [enCours, setEnCours] = useState(false)

  // Change d'onglet et efface les messages
  function changerMode(nouveau) {
    setMode(nouveau)
    setErreur("")
    setInfo("")
  }

  // Vérifie les champs avant d'envoyer
  function verifier() {
    if (mode === "inscription" && !prenom.trim()) return "Écris ton prénom."
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return "Écris une adresse e-mail valide."
    if (mode === "oubli") return ""
    if (motDePasse.length < 6) return "Le mot de passe doit faire au moins 6 caractères."
    if (mode === "inscription" && motDePasse !== confirmation) return "Les deux mots de passe ne sont pas pareils."
    return ""
  }

  async function envoyer(e) {
    e.preventDefault()
    const probleme = verifier()
    if (probleme) return setErreur(probleme)
    setErreur("")
    setInfo("")
    setEnCours(true)

    try {
      if (mode === "connexion") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: motDePasse })
        if (error) setErreur(messageErreur(error))
        // Si tout va bien, App.jsx voit la nouvelle session et ouvre l'app tout seul
      }

      if (mode === "inscription") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: motDePasse,
          options: {
            data: { prenom: prenom.trim() }, // le prénom est gardé avec le compte
            emailRedirectTo: window.location.origin, // le lien de confirmation ramène ici
          },
        })
        if (error) {
          setErreur(messageErreur(error))
        } else if (data.user && data.user.identities?.length === 0) {
          // Supabase répond comme ça quand l'e-mail a déjà un compte
          setErreur("Un compte existe déjà avec cet e-mail. Connecte-toi plutôt.")
        } else if (!data.session) {
          // Le compte doit d'abord être confirmé par e-mail
          setInfo(`Presque fini ! Ouvre le mail envoyé à ${email.trim()} et clique sur le lien pour activer ton compte.`)
          setMode("connexion")
          setMotDePasse("")
          setConfirmation("")
        }
      }

      if (mode === "oubli") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin,
        })
        if (error) setErreur(messageErreur(error))
        else setInfo("Si un compte existe avec cet e-mail, tu vas recevoir un lien pour choisir un nouveau mot de passe.")
      }
    } catch (err) {
      setErreur(messageErreur(err))
    }
    setEnCours(false)
  }

  const titres = {
    connexion: "Bon retour 🌙",
    inscription: "Bienvenue sur NouD ✨",
    oubli: "Mot de passe oublié",
  }
  const boutons = {
    connexion: "Se connecter",
    inscription: "Créer mon compte",
    oubli: "Recevoir le lien",
  }

  return (
    <div className="accueil">
      <div className="accueil-boite">
        <div className="accueil-logo">NouD 🌙</div>
        <p className="discret centre-texte">Organise ton temps, atteins tes objectifs.</p>

        {/* Les deux onglets */}
        {mode !== "oubli" && (
          <div className="accueil-onglets" role="tablist">
            <button
              role="tab"
              aria-selected={mode === "connexion"}
              className={mode === "connexion" ? "actif" : ""}
              onClick={() => changerMode("connexion")}
            >
              Se connecter
            </button>
            <button
              role="tab"
              aria-selected={mode === "inscription"}
              className={mode === "inscription" ? "actif" : ""}
              onClick={() => changerMode("inscription")}
            >
              S'inscrire
            </button>
          </div>
        )}

        <h1>{titres[mode]}</h1>

        <form className="formulaire" onSubmit={envoyer} noValidate>
          {mode === "inscription" && (
            <label>
              Prénom
              <input value={prenom} onChange={(e) => { setPrenom(e.target.value); setErreur("") }} autoComplete="given-name" placeholder="Bouchra" />
            </label>
          )}

          <label>
            E-mail
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErreur("") }}
              autoComplete="email"
              placeholder="toi@exemple.com"
            />
          </label>

          {mode !== "oubli" && (
            <div className="champ-mdp">
              <label>
                Mot de passe
                <input
                  type={voirMotDePasse ? "text" : "password"}
                  value={motDePasse}
                  onChange={(e) => { setMotDePasse(e.target.value); setErreur("") }}
                  autoComplete={mode === "inscription" ? "new-password" : "current-password"}
                  placeholder="Au moins 6 caractères"
                />
              </label>
              <button
                type="button"
                className="lien"
                onClick={() => setVoirMotDePasse(!voirMotDePasse)}
                aria-label={voirMotDePasse ? "Cacher le mot de passe" : "Voir le mot de passe"}
              >
                {voirMotDePasse ? "🙈" : "👁️"}
              </button>
            </div>
          )}

          {mode === "inscription" && (
            <label>
              Confirme le mot de passe
              <input
                type={voirMotDePasse ? "text" : "password"}
                value={confirmation}
                onChange={(e) => { setConfirmation(e.target.value); setErreur("") }}
                autoComplete="new-password"
              />
            </label>
          )}

          {erreur && <p className="erreur" role="alert">{erreur}</p>}
          {info && <p className="info" role="status">{info}</p>}

          <button type="submit" className="bouton plein grand-bouton" disabled={enCours}>
            {enCours ? "Un instant…" : boutons[mode]}
          </button>
        </form>

        {mode === "connexion" && (
          <button className="lien lien-centre" onClick={() => changerMode("oubli")}>
            Mot de passe oublié ?
          </button>
        )}
        {mode === "oubli" && (
          <button className="lien lien-centre" onClick={() => changerMode("connexion")}>
            ← Retour à la connexion
          </button>
        )}
      </div>
    </div>
  )
}

// L'écran qui s'ouvre quand on clique sur le lien « mot de passe oublié » reçu par mail
export function NouveauMotDePasse({ onFini }) {
  const [motDePasse, setMotDePasse] = useState("")
  const [erreur, setErreur] = useState("")
  const [enCours, setEnCours] = useState(false)

  async function enregistrer(e) {
    e.preventDefault()
    if (motDePasse.length < 6) return setErreur("Le mot de passe doit faire au moins 6 caractères.")
    setEnCours(true)
    const { error } = await supabase.auth.updateUser({ password: motDePasse })
    setEnCours(false)
    if (error) setErreur(messageErreur(error))
    else onFini()
  }

  return (
    <div className="accueil">
      <form className="accueil-boite formulaire" onSubmit={enregistrer} noValidate>
        <div className="accueil-logo">NouD 🌙</div>
        <h1>Nouveau mot de passe</h1>
        <label>
          Choisis ton nouveau mot de passe
          <input
            type="password"
            value={motDePasse}
            onChange={(e) => { setMotDePasse(e.target.value); setErreur("") }}
            autoComplete="new-password"
            placeholder="Au moins 6 caractères"
          />
        </label>
        {erreur && <p className="erreur" role="alert">{erreur}</p>}
        <button type="submit" className="bouton plein grand-bouton" disabled={enCours}>
          {enCours ? "Un instant…" : "Enregistrer"}
        </button>
      </form>
    </div>
  )
}

export default Connexion
