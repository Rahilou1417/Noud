import { useState } from "react"
import { notifier } from "../useRappels"

// L'écran « Moi » : prénom, coucher, réveil, notifications
function Reglages({ profil, setProfil, points }) {
  const [permission, setPermission] = useState(
    "Notification" in window ? Notification.permission : "indisponible"
  )

  // Change un seul champ du profil (prénom, coucher ou réveil)
  function changer(champ, valeur) {
    setProfil({ ...profil, [champ]: valeur })
  }

  async function activerNotifications() {
    if (!("Notification" in window)) return
    const reponse = await Notification.requestPermission()
    setPermission(reponse)
    if (reponse === "granted") notifier("NouD 🌙", "Les rappels sont activés !")
  }

  return (
    <div>
      <h1>Moi 🌙</h1>

      <div className="carte formulaire">
        <label>
          Mon prénom
          <input value={profil.prenom} onChange={(e) => changer("prenom", e.target.value)} placeholder="Bouchra" />
        </label>
        <div className="deux-colonnes">
          <label>
            Je me couche à
            <input type="time" value={profil.coucher} onChange={(e) => changer("coucher", e.target.value)} />
          </label>
          <label>
            Je me réveille à
            <input type="time" value={profil.reveil} onChange={(e) => changer("reveil", e.target.value)} />
          </label>
        </div>
        <p className="discret">
          NouD te prévient 30 min avant le coucher, et te propose un petit défi au réveil.
        </p>
      </div>

      <div className="carte">
        <div className="carte-titre">🔔 Notifications</div>
        {permission === "granted" && <p className="discret">Activées ✅</p>}
        {permission === "denied" && (
          <p className="discret">Bloquées. Autorise-les dans les réglages de ton navigateur.</p>
        )}
        {permission === "default" && (
          <button className="bouton plein" onClick={activerNotifications}>
            Activer les rappels
          </button>
        )}
        {permission === "indisponible" && (
          <p className="discret">
            Sur iPhone, ajoute d'abord NouD à l'écran d'accueil (Partager → Sur l'écran d'accueil).
          </p>
        )}
        <p className="discret petit">
          Les rappels marchent quand NouD est ouvert ou en arrière-plan.
        </p>
      </div>

      <div className="carte">
        <div className="carte-titre">📱 Installer NouD</div>
        <p className="discret">
          Android : menu ⋮ → « Ajouter à l'écran d'accueil ».
          <br />
          iPhone : bouton Partager → « Sur l'écran d'accueil ».
        </p>
      </div>

      <p className="discret centre">⭐ {points} points gagnés depuis le début</p>
    </div>
  )
}

export default Reglages
