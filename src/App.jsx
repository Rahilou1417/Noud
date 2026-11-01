import { useState, useEffect, useRef } from "react"
import { supabase } from "./supabase"
import { useStockage } from "./useStockage"
import { useRappels } from "./useRappels"
import Connexion, { NouveauMotDePasse } from "./ecrans/Connexion"
import Aujourdhui from "./ecrans/Aujourdhui"
import Objectifs from "./ecrans/Objectifs"
import Planning from "./ecrans/Planning"
import Kanban from "./ecrans/Kanban"
import Concentration from "./ecrans/Concentration"
import Reglages from "./ecrans/Reglages"

// Les 6 écrans de l'app, affichés dans le menu en haut à droite
const ONGLETS = [
  { id: "aujourdhui", nom: "Aujourd'hui", emoji: "🏠" },
  { id: "objectifs", nom: "Objectifs", emoji: "🎯" },
  { id: "planning", nom: "Planning", emoji: "🗓️" },
  { id: "kanban", nom: "Tableau", emoji: "📋" },
  { id: "concentration", nom: "Focus", emoji: "⏳" },
  { id: "reglages", nom: "Moi", emoji: "🌙" },
]

// Le nom de la table Supabase où chaque compte range ses données
const TABLE = "donnees_noud"

// ===== 1. App : vérifie si quelqu'un est connecté =====
function App() {
  const [session, setSession] = useState(undefined) // undefined = on vérifie encore
  const [recuperation, setRecuperation] = useState(false) // true = on choisit un nouveau mot de passe

  useEffect(() => {
    if (!supabase) return
    // Y a-t-il déjà quelqu'un de connecté sur cet appareil ?
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    // On écoute les connexions et déconnexions
    const { data } = supabase.auth.onAuthStateChange((evenement, nouvelleSession) => {
      setSession(nouvelleSession)
      if (evenement === "PASSWORD_RECOVERY") setRecuperation(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  if (!supabase) return <ConfigurationManquante />
  if (session === undefined) return <Chargement texte="Un instant…" />
  if (recuperation) return <NouveauMotDePasse onFini={() => setRecuperation(false)} />
  if (!session) return <Connexion />
  // « key » : si on change de compte, tout l'espace repart de zéro
  return <Espace key={session.user.id} utilisateur={session.user} />
}

// ===== 2. Espace : l'app d'une personne connectée =====
function Espace({ utilisateur }) {
  const uid = utilisateur.id

  // L'écran affiché en ce moment
  const [onglet, setOnglet] = useState("aujourdhui")
  // Le menu en haut à droite : ouvert ou fermé
  const [menuOuvert, setMenuOuvert] = useState(false)

  // Toutes les données. Elles sont gardées sur l'appareil (pour aller vite)
  // ET en ligne dans Supabase (pour les retrouver partout).
  const prenomInscription = utilisateur.user_metadata?.prenom || ""
  const [profil, setProfil] = useStockage(uid + "-profil", { prenom: prenomInscription, coucher: "23:00", reveil: "07:00" })
  const [objectifs, setObjectifs] = useStockage(uid + "-objectifs", [])
  const [blocs, setBlocs] = useStockage(uid + "-blocs", [])
  const [points, setPoints] = useStockage(uid + "-points", 0)
  const [cartes, setCartes] = useStockage(uid + "-kanban", [])

  // L'état de la sauvegarde en ligne
  const [charge, setCharge] = useState(false) // les données en ligne sont-elles arrivées ?
  const [synchro, setSynchro] = useState("chargement") // "chargement", "enregistrement", "ok" ou "hors-ligne"
  const [essai, setEssai] = useState(0) // pour réessayer après une coupure
  // true = des changements ont été faits hors ligne et doivent partir en ligne
  const [aEnvoyer, setAEnvoyer] = useStockage(uid + "-a-envoyer", false)

  // --- Au démarrage : on récupère les données en ligne ---
  useEffect(() => {
    let annule = false
    supabase
      .from(TABLE)
      .select("contenu")
      .eq("user_id", uid)
      .maybeSingle()
      .then(({ data, error }) => {
        if (annule) return
        if (error) {
          // Pas de réseau : on garde ce qu'il y a sur l'appareil, sans rien écraser en ligne
          setSynchro("hors-ligne")
          return
        }
        if (aEnvoyer) {
          // Des changements faits hors ligne attendent : ce sont eux les plus récents, on les envoie
          setAEnvoyer(false)
          setCharge(true)
          return
        }
        const contenu = data?.contenu
        if (contenu && Object.keys(contenu).length > 0) {
          if (contenu.profil) setProfil(contenu.profil)
          if (contenu.objectifs) setObjectifs(contenu.objectifs)
          if (contenu.blocs) setBlocs(contenu.blocs)
          if (typeof contenu.points === "number") setPoints(contenu.points)
          if (contenu.cartes) setCartes(contenu.cartes)
        } else {
          recupererAnciennesDonnees()
        }
        setCharge(true)
      })
    return () => {
      annule = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, essai])

  // Les données d'avant les comptes (rangées sans nom de compte) sont reprises une seule fois
  function recupererAnciennesDonnees() {
    try {
      const lire = (cle) => {
        const valeur = localStorage.getItem("noud-" + cle)
        return valeur === null ? null : JSON.parse(valeur)
      }
      const anciens = { profil: lire("profil"), objectifs: lire("objectifs"), blocs: lire("blocs"), points: lire("points"), cartes: lire("kanban") }
      if (anciens.profil) setProfil({ ...anciens.profil, prenom: anciens.profil.prenom || prenomInscription })
      if (anciens.objectifs) setObjectifs(anciens.objectifs)
      if (anciens.blocs) setBlocs(anciens.blocs)
      if (typeof anciens.points === "number") setPoints(anciens.points)
      if (anciens.cartes) setCartes(anciens.cartes)
      ;["profil", "objectifs", "blocs", "points", "kanban"].forEach((cle) => localStorage.removeItem("noud-" + cle))
    } catch {
      // Rien à reprendre
    }
  }

  // --- À chaque changement : on enregistre en ligne (1 seconde après le dernier changement) ---
  const contenu = { profil, objectifs, blocs, points, cartes }
  const dernierContenu = useRef(contenu)
  dernierContenu.current = contenu

  async function enregistrer() {
    const { error } = await supabase
      .from(TABLE)
      .upsert({ user_id: uid, contenu: dernierContenu.current, maj: new Date().toISOString() })
    setSynchro(error ? "hors-ligne" : "ok")
    return !error
  }

  useEffect(() => {
    if (!charge) return
    setSynchro("enregistrement")
    const minuteur = setTimeout(enregistrer, 1000)
    return () => clearTimeout(minuteur)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [charge, profil, objectifs, blocs, points, cartes])

  // Changement fait alors que les données en ligne n'ont pas pu être chargées : on le note
  useEffect(() => {
    if (!charge && synchro === "hors-ligne") setAEnvoyer(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profil, objectifs, blocs, points, cartes])

  function reessayer() {
    if (charge) {
      // Les données sont là : on renvoie simplement la sauvegarde
      setSynchro("enregistrement")
      enregistrer()
    } else {
      // Les données en ligne n'étaient jamais arrivées : on les redemande
      setSynchro("chargement")
      setEssai(essai + 1)
    }
  }

  // --- Se déconnecter : on enregistre une dernière fois, puis on nettoie l'appareil ---
  async function seDeconnecter() {
    setMenuOuvert(false)
    const sauve = charge ? await enregistrer() : false
    // On ne nettoie l'appareil que si tout est bien enregistré en ligne (sinon on garderait rien !)
    if (sauve) ["profil", "objectifs", "blocs", "points", "kanban", "a-envoyer"].forEach((cle) => {
      try {
        localStorage.removeItem(`noud-${uid}-${cle}`)
      } catch {
        // rien
      }
    })
    await supabase.auth.signOut()
  }

  // La touche Échap ferme le menu
  useEffect(() => {
    if (!menuOuvert) return
    function touche(e) {
      if (e.key === "Escape") setMenuOuvert(false)
    }
    window.addEventListener("keydown", touche)
    return () => window.removeEventListener("keydown", touche)
  }, [menuOuvert])

  // Change de page, ferme le menu et remonte en haut
  function allerA(id) {
    setOnglet(id)
    setMenuOuvert(false)
    window.scrollTo(0, 0)
  }

  // Les rappels tournent en fond, quel que soit l'écran
  useRappels({ blocs, coucher: profil.coucher, reveil: profil.reveil })

  // Ajoute des points (ou en retire si le nombre est négatif)
  function gagnerPoints(nombre) {
    setPoints((p) => Math.max(0, p + nombre))
  }

  // On attend les données en ligne avant d'afficher (sauf si on est hors ligne)
  if (!charge && synchro === "chargement") return <Chargement texte="Je récupère tes données…" />

  // Ce qu'on donne à chaque écran
  const donnees = {
    profil, setProfil, objectifs, setObjectifs, blocs, setBlocs, cartes, setCartes,
    points, gagnerPoints, setOnglet: allerA, utilisateur, seDeconnecter,
  }

  const etiquettesSynchro = {
    chargement: "⏳",
    enregistrement: "☁️ …",
    ok: "☁️ ✓",
    "hors-ligne": "⚠️",
  }

  return (
    <div className="app">
      {/* La barre du haut */}
      <header className="entete">
        <div className="entete-gauche">
          <button className="logo" onClick={() => allerA("aujourdhui")}>
            NouD 🌙
          </button>
          <span
            className="synchro"
            title={synchro === "ok" ? "Tout est enregistré en ligne" : synchro === "hors-ligne" ? "Hors ligne" : "Enregistrement…"}
          >
            {etiquettesSynchro[synchro]}
          </span>
        </div>
        <button
          className="bouton-menu"
          onClick={() => setMenuOuvert(!menuOuvert)}
          aria-label={menuOuvert ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={menuOuvert}
        >
          {menuOuvert ? "✕" : "☰"}
        </button>
      </header>

      {/* Bandeau si on n'arrive pas à joindre Supabase */}
      {synchro === "hors-ligne" && (
        <div className="bandeau">
          <span>Hors ligne : tes changements restent sur cet appareil pour l'instant.</span>
          <button className="lien" onClick={reessayer}>
            Réessayer
          </button>
        </div>
      )}

      {/* Le menu, visible seulement quand il est ouvert */}
      {menuOuvert && (
        <>
          <div className="voile" onClick={() => setMenuOuvert(false)} />
          <nav className="menu" aria-label="Menu">
            {ONGLETS.map((o) => (
              <button
                key={o.id}
                className={onglet === o.id ? "onglet actif" : "onglet"}
                onClick={() => allerA(o.id)}
              >
                <span className="onglet-emoji">{o.emoji}</span>
                <span>{o.nom}</span>
              </button>
            ))}
            <div className="menu-separateur" />
            <div className="menu-compte">{utilisateur.email}</div>
            <button className="onglet" onClick={seDeconnecter}>
              <span className="onglet-emoji">🚪</span>
              <span>Se déconnecter</span>
            </button>
          </nav>
        </>
      )}

      <main className="contenu">
        {onglet === "aujourdhui" && <Aujourdhui {...donnees} />}
        {onglet === "objectifs" && <Objectifs {...donnees} />}
        {onglet === "planning" && <Planning {...donnees} />}
        {onglet === "kanban" && <Kanban {...donnees} />}
        {onglet === "concentration" && <Concentration {...donnees} />}
        {onglet === "reglages" && <Reglages {...donnees} />}
      </main>
    </div>
  )
}

// ===== Petits écrans d'attente et d'aide =====
function Chargement({ texte }) {
  return (
    <div className="accueil">
      <div className="accueil-boite centre-texte">
        <div className="accueil-logo">NouD 🌙</div>
        <p className="discret">{texte}</p>
      </div>
    </div>
  )
}

function ConfigurationManquante() {
  return (
    <div className="accueil">
      <div className="accueil-boite">
        <div className="accueil-logo">NouD 🌙</div>
        <h1>Il manque la clé Supabase</h1>
        <p className="discret">
          Ajoute <code>VITE_SUPABASE_URL</code> et <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> dans le fichier{" "}
          <code>.env.local</code> (sur ton ordinateur) ou dans les « Environment Variables » de Vercel, puis relance
          l'app.
        </p>
      </div>
    </div>
  )
}

export default App
