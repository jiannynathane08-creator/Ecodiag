// EcoDiag — moteur de calcul du diagnostic énergétique
// Toutes les valeurs par défaut sont éditables : elles ne doivent jamais
// être considérées comme définitives, seulement comme point de départ.

export const EQUIPEMENTS_TYPES = [
  { id: "refrigerateur", nom: "Réfrigérateur", puissanceKw: 0.15, heuresParDefaut: 8 },
  { id: "climatiseur", nom: "Climatiseur", puissanceKw: 1.2, heuresParDefaut: 4 },
  { id: "led", nom: "Ampoules LED", puissanceKw: 0.01, heuresParDefaut: 5 },
  { id: "incandescent", nom: "Ampoules incandescentes", puissanceKw: 0.06, heuresParDefaut: 5 },
  { id: "television", nom: "Télévision", puissanceKw: 0.1, heuresParDefaut: 4 },
  { id: "fer_a_repasser", nom: "Fer à repasser", puissanceKw: 1.0, heuresParDefaut: 0.5 },
  { id: "pompe_a_eau", nom: "Pompe à eau", puissanceKw: 0.75, heuresParDefaut: 1 },
  { id: "ordinateur", nom: "Ordinateur", puissanceKw: 0.15, heuresParDefaut: 4 },
  { id: "ventilateur", nom: "Ventilateur", puissanceKw: 0.07, heuresParDefaut: 6 },
  { id: "congelateur", nom: "Congélateur", puissanceKw: 0.2, heuresParDefaut: 8 },
];

// Paramètres par défaut — à rendre modifiables dans un écran "Paramètres"
export const PARAMETRES_PAR_DEFAUT = {
  tarifJiramaArParKwh: 500, // moyenne indicative, l'utilisateur doit pouvoir la corriger
  ensoleillementKwhM2Jour: 5.5, // moyenne Madagascar
  rendementSysteme: 0.75,
  coutSolaireMinArParKwc: 2000000,
  coutSolaireMaxArParKwc: 4000000,
  seuilAnomaliePct: 20,
};

export function calculerConsoTheorique(equipementsSelectionnes) {
  const parEquipement = equipementsSelectionnes.map((eq) => {
    const kwhMois = eq.puissanceKw * eq.heuresParJour * 30 * (eq.quantite || 1);
    return { ...eq, kwhMois };
  });
  const totalKwhMois = parEquipement.reduce((sum, eq) => sum + eq.kwhMois, 0);
  return { parEquipement, totalKwhMois };
}

export function convertirFactureEnKwh(factureAr, tarifArParKwh) {
  if (!tarifArParKwh) return 0;
  return factureAr / tarifArParKwh;
}

export function detecterAnomalie(consoTheoriqueKwh, consoFactureeKwh, seuilPct) {
  if (consoTheoriqueKwh <= 0) return { ecartKwh: 0, ecartPct: 0, anomalie: false };
  const ecartKwh = consoFactureeKwh - consoTheoriqueKwh;
  const ecartPct = (ecartKwh / consoTheoriqueKwh) * 100;
  return { ecartKwh, ecartPct, anomalie: Math.abs(ecartPct) > seuilPct };
}

export function dimensionnerSolaire(consoTheoriqueKwhMois, ensoleillement, rendement) {
  const consoJournaliereKwh = consoTheoriqueKwhMois / 30;
  const puissanceCreteKwc = consoJournaliereKwh / (ensoleillement * rendement);
  return Math.round(puissanceCreteKwc * 100) / 100;
}

export function estimerCoutEtRoi({
  puissanceCreteKwc,
  coutMinArParKwc,
  coutMaxArParKwc,
  consoTheoriqueKwhMois,
  tarifArParKwh,
}) {
  const coutMinAr = puissanceCreteKwc * coutMinArParKwc;
  const coutMaxAr = puissanceCreteKwc * coutMaxArParKwc;
  const economieMensuelleAr = consoTheoriqueKwhMois * tarifArParKwh;
  const roiMoisMin = economieMensuelleAr > 0 ? coutMinAr / economieMensuelleAr : null;
  const roiMoisMax = economieMensuelleAr > 0 ? coutMaxAr / economieMensuelleAr : null;
  return { coutMinAr, coutMaxAr, economieMensuelleAr, roiMoisMin, roiMoisMax };
}

export function formaterAriary(valeur) {
  if (valeur == null || Number.isNaN(valeur)) return "—";
  return new Intl.NumberFormat("fr-FR").format(Math.round(valeur)) + " Ar";
      }
