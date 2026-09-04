import { useMemo, useState } from "react";
import {
  EQUIPEMENTS_TYPES,
  PARAMETRES_PAR_DEFAUT,
  calculerConsoTheorique,
  convertirFactureEnKwh,
  detecterAnomalie,
  dimensionnerSolaire,
  estimerCoutEtRoi,
  formaterAriary,
} from "./calculations";

const ETAPES = ["logement", "equipements", "facture", "resultats"];

export default function App() {
  const [vue, setVue] = useState("accueil");
  const [etapeIndex, setEtapeIndex] = useState(0);

  const [logement, setLogement] = useState({ type: "maison", superficie: "", localisation: "" });
  const [equipementsChoisis, setEquipementsChoisis] = useState(() =>
    Object.fromEntries(
      EQUIPEMENTS_TYPES.map((eq) => [
        eq.id,
        { selectionne: false, heuresParJour: eq.heuresParDefaut, quantite: 1 },
      ])
    )
  );
  const [facture, setFacture] = useState({ montantAr: "", tarifArParKwh: PARAMETRES_PAR_DEFAUT.tarifJiramaArParKwh });
  const [budget, setBudget] = useState("");

  const equipementsSelectionnes = useMemo(() => {
    return EQUIPEMENTS_TYPES.filter((eq) => equipementsChoisis[eq.id]?.selectionne).map((eq) => ({
      id: eq.id,
      nom: eq.nom,
      puissanceKw: eq.puissanceKw,
      heuresParJour: Number(equipementsChoisis[eq.id].heuresParJour) || 0,
      quantite: Number(equipementsChoisis[eq.id].quantite) || 1,
    }));
  }, [equipementsChoisis]);

  const resultats = useMemo(() => {
    if (equipementsSelectionnes.length === 0) return null;
    const { parEquipement, totalKwhMois } = calculerConsoTheorique(equipementsSelectionnes);
    const consoFactureeKwh = convertirFactureEnKwh(Number(facture.montantAr) || 0, Number(facture.tarifArParKwh) || 0);
    const anomalie = detecterAnomalie(totalKwhMois, consoFactureeKwh, PARAMETRES_PAR_DEFAUT.seuilAnomaliePct);
    const puissanceCreteKwc = dimensionnerSolaire(
      totalKwhMois,
      PARAMETRES_PAR_DEFAUT.ensoleillementKwhM2Jour,
      PARAMETRES_PAR_DEFAUT.rendementSysteme
    );
    const cout = estimerCoutEtRoi({
      puissanceCreteKwc,
      coutMinArParKwc: PARAMETRES_PAR_DEFAUT.coutSolaireMinArParKwc,
      coutMaxArParKwc: PARAMETRES_PAR_DEFAUT.coutSolaireMaxArParKwc,
      consoTheoriqueKwhMois: totalKwhMois,
      tarifArParKwh: Number(facture.tarifArParKwh) || 0,
    });
    return { parEquipement, totalKwhMois, consoFactureeKwh, anomalie, puissanceCreteKwc, cout };
  }, [equipementsSelectionnes, facture]);

  function demarrerDiagnostic() {
    setVue("diagnostic");
    setEtapeIndex(0);
  }

  function etapeSuivante() {
    setEtapeIndex((i) => Math.min(i + 1, ETAPES.length - 1));
  }
  function etapePrecedente() {
    if (etapeIndex === 0) {
      setVue("accueil");
      return;
    }
    setEtapeIndex((i) => i - 1);
  }

  const etape = ETAPES[etapeIndex];

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Eco<span>Diag</span></div>
        <div className="tagline">Diagnostic énergétique — Madagascar</div>
      </div>

      {vue === "accueil" && <Accueil onStart={demarrerDiagnostic} />}

      {vue === "diagnostic" && (
        <>
          <ProgressRail total={ETAPES.length} current={etapeIndex} />
          {etape === "logement" && (
            <EtapeLogement
              logement={logement}
              setLogement={setLogement}
              onNext={etapeSuivante}
              onBack={etapePrecedente}
            />
          )}
          {etape === "equipements" && (
            <EtapeEquipements
              equipementsChoisis={equipementsChoisis}
              setEquipementsChoisis={setEquipementsChoisis}
              onNext={etapeSuivante}
              onBack={etapePrecedente}
            />
          )}
          {etape === "facture" && (
            <EtapeFacture
              facture={facture}
              setFacture={setFacture}
              budget={budget}
              setBudget={setBudget}
              onNext={etapeSuivante}
              onBack={etapePrecedente}
            />
          )}
          {etape === "resultats" && (
            <EtapeResultats resultats={resultats} onBack={etapePrecedente} onRestart={() => { setVue("accueil"); setEtapeIndex(0); }} />
          )}
        </>
      )}
    </div>
  );
}

function Accueil({ onStart }) {
  return (
    <div className="hero">
      <h1>Comprenez votre facture d'électricité en 5 minutes.</h1>
      <p className="lede">
        EcoDiag analyse vos équipements et votre facture JIRAMA pour repérer le gaspillage
        et estimer si une installation solaire serait rentable pour vous.
      </p>
      <div className="hero-stats">
        <div>
          <span className="num">5 min</span>
          <span className="label">pour faire le diagnostic</span>
        </div>
        <div>
          <span className="num">0 Ar</span>
          <span className="label">pour le rapport de base</span>
        </div>
        <div>
          <span className="num">±20%</span>
          <span className="label">seuil de détection d'anomalie</span>
        </div>
      </div>
      <button className="btn-primary" onClick={onStart}>Faire mon diagnostic</button>
    </div>
  );
}

function ProgressRail({ total, current }) {
  return (
    <div className="progress-rail">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={"seg" + (i <= current ? " done" : "")} />
      ))}
    </div>
  );
}

function EtapeLogement({ logement, setLogement, onNext, onBack }) {
  const valide = logement.superficie !== "" && logement.localisation.trim() !== "";
  return (
    <div>
      <div className="step-label">Étape 1 sur 4 — Votre logement ou local</div>
      <div className="field">
        <label>Type de bien</label>
        <select
          value={logement.type}
          onChange={(e) => setLogement({ ...logement, type: e.target.value })}
        >
          <option value="maison">Maison individuelle</option>
          <option value="appartement">Appartement</option>
          <option value="local_commercial">Local commercial / PME</option>
          <option value="bureau">Bureau</option>
        </select>
      </div>
      <div className="field">
        <label>Superficie approximative (m²)</label>
        <input
          type="number"
          min="0"
          value={logement.superficie}
          onChange={(e) => setLogement({ ...logement, superficie: e.target.value })}
          placeholder="ex : 80"
        />
      </div>
      <div className="field">
        <label>Localisation (ville / région)</label>
        <input
          type="text"
          value={logement.localisation}
          onChange={(e) => setLogement({ ...logement, localisation: e.target.value })}
          placeholder="ex : Antsiranana"
        />
        <div className="hint">Utilisée pour estimer l'ensoleillement disponible.</div>
      </div>
      <div className="step-actions">
        <button className="btn-ghost" onClick={onBack}>Retour</button>
        <button className="btn-primary" disabled={!valide} onClick={onNext}>Continuer</button>
      </div>
    </div>
  );
}

function EtapeEquipements({ equipementsChoisis, setEquipementsChoisis, onNext, onBack }) {
  const auMoinsUn = Object.values(equipementsChoisis).some((eq) => eq.selectionne);

  function toggle(id) {
    setEquipementsChoisis((prev) => ({
      ...prev,
      [id]: { ...prev[id], selectionne: !prev[id].selectionne },
    }));
  }
  function updateField(id, field, value) {
    setEquipementsChoisis((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  }

  return (
    <div>
      <div className="step-label">Étape 2 sur 4 — Vos équipements électriques</div>
      <p className="lede" style={{ marginTop: 0, marginBottom: 20, fontSize: 14 }}>
        Coche ce que tu utilises. Les heures d'usage par jour sont pré-remplies avec des
        moyennes — modifie-les si tu connais tes habitudes réelles.
      </p>

      <div>
        {EQUIPEMENTS_TYPES.map((eq) => {
          const etat = equipementsChoisis[eq.id];
          return (
            <div className="equip-row" key={eq.id}>
              <input
                type="checkbox"
                checked={etat.selectionne}
                onChange={() => toggle(eq.id)}
              />
              <div>
                <div className="nom">{eq.nom}</div>
                <div className="puissance">{eq.puissanceKw} kW</div>
              </div>
              <input
                type="number"
                min="0"
                step="0.5"
                title="Heures par jour"
                value={etat.heuresParJour}
                onChange={(e) => updateField(eq.id, "heuresParJour", e.target.value)}
                disabled={!etat.selectionne}
              />
              <input
                type="number"
                min="1"
                title="Quantité"
                value={etat.quantite}
                onChange={(e) => updateField(eq.id, "quantite", e.target.value)}
                disabled={!etat.selectionne}
              />
            </div>
          );
        })}
      </div>

      <div className="step-actions">
        <button className="btn-ghost" onClick={onBack}>Retour</button>
        <button className="btn-primary" disabled={!auMoinsUn} onClick={onNext}>Continuer</button>
      </div>
    </div>
  );
}

function EtapeFacture({ facture, setFacture, budget, setBudget, onNext, onBack }) {
  const valide = facture.montantAr !== "" && Number(facture.tarifArParKwh) > 0;
  return (
    <div>
      <div className="step-label">Étape 3 sur 4 — Votre facture JIRAMA</div>
      <div className="field">
        <label>Montant de la facture mensuelle (Ar)</label>
        <input
          type="number"
          min="0"
          value={facture.montantAr}
          onChange={(e) => setFacture({ ...facture, montantAr: e.target.value })}
          placeholder="ex : 120000"
        />
      </div>
      <div className="field">
        <label>Tarif appliqué (Ar / kWh)</label>
        <input
          type="number"
          min="0"
          value={facture.tarifArParKwh}
          onChange={(e) => setFacture({ ...facture, tarifArParKwh: e.target.value })}
        />
        <div className="hint">
          Regarde ta facture JIRAMA pour le tarif exact — il dépend de ta tranche
          (social, économique, confort...). Une valeur par défaut est proposée.
        </div>
      </div>
      <div className="field">
        <label>Budget disponible pour investir (Ar, optionnel)</label>
        <input
          type="number"
          min="0"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          placeholder="ex : 3000000"
        />
      </div>
      <div className="step-actions">
        <button className="btn-ghost" onClick={onBack}>Retour</button>
        <button className="btn-primary" disabled={!valide} onClick={onNext}>Voir mon diagnostic</button>
      </div>
    </div>
  );
}

function EtapeResultats({ resultats, onBack, onRestart }) {
  if (!resultats) {
    return (
      <div>
        <p>Aucun équipement sélectionné — reviens à l'étape précédente pour continuer.</p>
        <button className="btn-ghost" onClick={onBack}>Retour</button>
      </div>
    );
  }

  const { totalKwhMois, consoFactureeKwh, anomalie, puissanceCreteKwc, cout } = resultats;
  const maxBar = Math.max(totalKwhMois, consoFactureeKwh, 1);

  return (
    <div>
      <div className="step-label">Résultats de votre diagnostic</div>

      <div className="result-block">
        <h3>Consommation mensuelle estimée</h3>
        <div>
          <span className="big-number">{Math.round(totalKwhMois)}</span>
          <span className="unit">kWh / mois (théorique, d'après vos équipements)</span>
        </div>

        <div className="compare-bars">
          <div className="compare-bar-row">
            <div className="bar-label"><span>Théorique</span><span>{Math.round(totalKwhMois)} kWh</span></div>
            <div className="compare-bar-track">
              <div className="compare-bar-fill theorique" style={{ width: `${(totalKwhMois / maxBar) * 100}%` }} />
            </div>
          </div>
          <div className="compare-bar-row">
            <div className="bar-label"><span>Facturée</span><span>{Math.round(consoFa
