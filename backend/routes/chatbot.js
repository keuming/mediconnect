const express = require('express');
const router = express.Router();

const KB_FAQ = [
  {
    mots_cles: ["presentation","plateforme","mediconnect","cest quoi","quest-ce"],
    reponse: "MediConnect Africa est une plateforme de sante numerique panafricaine (v3.0, en production depuis mai 2026). Elle connecte patients, medecins, cliniques, pharmacies, livreurs, assureurs, cabinets optiques et ministeres de la sante dans un ecosysteme numerique unifie. Elle couvre 14 pays UEMOA/CEMAC et 843 villes. Proprietaire : CDC Compagnie des Services Numeriques, gerant : M. TOMA KEUMINGO REMI."
  },
  {
    mots_cles: ["creer","compte","inscrire","inscription","register","rejoindre","adherer","commencer"],
    reponse: "Pour creer votre compte, rendez-vous sur manager.mediconnect4africa.cloud/register. Choisissez votre profil (patient, clinique, medecin, pharmacie...), renseignez votre pays et vos informations. La creation prend moins de 5 minutes."
  },
  {
    mots_cles: ["tarif","prix","cout","combien","fcfa","abonnement","payer","mensuel"],
    reponse: "Tarifs MediConnect Africa :\n- Patient : 2 500 FCFA/mois | 6 500 FCFA/3 mois | 20 000 FCFA/an\n- Medecin Conseil (MC) : 5 000 FCFA/mois\n- Clinique / Hopital : 10 000 FCFA/mois\n- Pharmacie : 10 000 FCFA/mois\n- Laboratoire : 5 000 FCFA/mois\n- Imagerie medicale : 5 000 FCFA/mois\n- Cabinet Optique : 5 000 FCFA/mois\n- Compagnie Assurance : 50 000 FCFA/mois\n- Livreur : 1 000 FCFA par livraison"
  },
  {
    mots_cles: ["pays","disponible","couvert","afrique","uemoa","cemac","senegal","cameroun","mali"],
    reponse: "MediConnect Africa couvre 14 pays :\nUEMOA : Cote d'Ivoire, Senegal, Burkina Faso, Mali, Togo, Benin, Guinee, Niger\nCEMAC : Cameroun, Gabon, Congo, Tchad, Centrafrique, Guinee Equatoriale\nExtension vers les 54 pays africains en cours. Base geo : 843 villes."
  },
  {
    mots_cles: ["rendez-vous","rdv","reserver","consultation","prendre rdv"],
    reponse: "Pour prendre un RDV : creez un compte patient sur manager.mediconnect4africa.cloud, recherchez une clinique ou un medecin dans votre ville, consultez les creneaux disponibles et reservez en ligne. Le medecin est notifie automatiquement."
  },
  {
    mots_cles: ["mediconnect card","carte","qr","urgence","recharge","wave","orange money","prepayee"],
    reponse: "La MediConnect Card est une carte prepayee physique (verte ou noire) qui permet de payer vos soins chez les prestataires du reseau. Elle integre un QR Code donnant acces aux contacts d'urgence sans connexion.\nRecharge : Wave, Orange Money, MTN MoMo, Especes.\nCompte famille : jusqu'a 10 membres (parents + enfants de 18 ans max)."
  },
  {
    mots_cles: ["clinique","hopital","proprietaire","gerant","etablissement","dashboard clinique"],
    reponse: "Pour les cliniques et hopitaux :\n- Dashboard complet : planning medecins, caisse, dossiers patients, statistiques\n- Visibilite publique : specialites, medecins et horaires visibles par les patients\n- Prise de RDV en ligne automatique\n- Facturation automatique pour les assurances\n- Abonnement : 10 000 FCFA/mois"
  },
  {
    mots_cles: ["medecin independant","medecin conseil","mc","sans clinique","liberal"],
    reponse: "Le Medecin Conseil (MC) est independant, non rattache a une clinique. Il a son propre planning en ligne, ses patients prennent RDV directement, et il gere ses consultations et ordonnances de facon autonome. Tarif : 5 000 FCFA/mois."
  },
  {
    mots_cles: ["assurance","tiers-payant","remboursement","mutuelle","prise en charge"],
    reponse: "Le tiers-payant sur MediConnect Africa est automatise :\n1. Patient presente sa couverture assurance\n2. La clinique enregistre - prise en charge identifiee automatiquement\n3. Prestation visible en temps reel dans le dashboard assureur\n4. Fin de mois : facture par assurance generee en 1 clic\n5. Assureur valide et rembourse\nPlus besoin de rediger manuellement des dizaines de factures."
  },
  {
    mots_cles: ["pharmacie","medicament","ordonnance","livraison medicament","commande"],
    reponse: "Les pharmacies recoivent les ordonnances electroniques des medecins, gerent les commandes et le stock. La livraison a domicile est integree via les livreurs MediConnect. Tarif : 10 000 FCFA/mois."
  },
  {
    mots_cles: ["optique","lunettes","verres","montures","vue","opticien"],
    reponse: "Le module Cabinet Optique est complet : stock montures/verres/accessoires, ventes, facturation, assurances optiques, dossiers patients, ordonnances optiques. Tarif : 5 000 FCFA/mois."
  },
  {
    mots_cles: ["application","app","mobile","android","telecharger","apk"],
    reponse: "L'application MediConnect Africa est disponible sur Android. Elle couvre les profils patient, medecin, pharmacie et livreur. Telechargez l'APK depuis la vitrine ou scannez le QR code affiche sur le site. Contact : keumingo@gmail.com"
  },
  {
    mots_cles: ["securite","donnees","confidentialite","securise","protection","rgpd"],
    reponse: "MediConnect Africa applique un niveau de securite hospitalier :\n- Chiffrement TLS 1.3 bout en bout\n- Authentification JWT securisee\n- Controle acces par role\n- Conformite RGPD + legislations africaines\n- Sauvegardes automatiques toutes les 24h\n- Disponibilite 99,9%"
  },
  {
    mots_cles: ["tester","demo","essai","test","comptes demo","identifiant"],
    reponse: "12 comptes de demonstration disponibles :\n- admin@demo.ci / demo1234\n- patient@demo.ci / demo1234\n- clinique@demo.ci / demo1234\n- medecin@demo.ci / demo1234\n- medecin.indep@demo.ci / demo1234\n- pharmacie@demo.ci / demo1234\n- livreur@demo.ci / demo1234\n- laboratoire@demo.ci / demo1234\n- imagerie@demo.ci / demo1234\n- assureur@demo.ci / demo1234\n- optique@demo.ci / demo1234\n- ministere@sante.ci / MinistereCI2024\nConnexion : manager.mediconnect4africa.cloud/login"
  },
  {
    mots_cles: ["profil","acteur","qui peut","utilisateur","role","type de compte"],
    reponse: "MediConnect Africa connecte 12 types d'acteurs :\n1. Patient\n2. Medecin Resident (MR) - rattache a une clinique\n3. Medecin Conseil (MC) - independant\n4. Clinique / Hopital\n5. Pharmacie\n6. Livreur\n7. Assureur\n8. Imagerie medicale\n9. Laboratoire\n10. Cabinet Optique\n11. Ministere de la Sante\n12. Admin"
  },
  {
    mots_cles: ["contact","joindre","email","contacter","support","aide"],
    reponse: "Contact MediConnect Africa :\nEmail : keumingo@gmail.com\nPlateforme : manager.mediconnect4africa.cloud\nCDC Compagnie des Services Numeriques\nRCCM : CI-ABJ-03-2022-B12-04961"
  },
  {
    mots_cles: ["facturation automatique","fin de mois","plusieurs assurances","avant le 5","avant le 7","generer facture","comptabilite","facturation assurance","comment fonctionne facturation"],
    reponse: "MediConnect Africa resout un probleme majeur des cliniques et pharmacies : la facturation multi-assurances en fin de mois.\n\nSans MediConnect :\n- Cliniques et pharmacies travaillent avec plusieurs assurances simultanement\n- Rediger manuellement une facture par assurance est epuisant et chronophage\n- Les assurances imposent des delais stricts : facture avant le 5 ou 7 du mois\n- Un retard = paiement reporte au mois suivant\n\nAvec MediConnect :\n- Chaque acte medical genere automatiquement sa ligne de facturation\n- Fin de mois : selectionnez l'assurance, la facture est prete en 1 clic\n- Comptabilite integree et mise a jour en temps reel\n- Zero saisie manuelle, zero retard, zero stress"
  },
  {
    mots_cles: ["logiciel clinique","logiciel pharmacie","logiciel assurance","gestion clinique","logiciel complet"],
    reponse: "MediConnect Africa est un logiciel complet de gestion pour chaque acteur :\n\nClinic : planning medecins, dossiers patients, caisse, facturation, statistiques\nPharmacie : ordonnances electroniques, stock, commandes, livraisons, facturation\nAssurance : suivi prestations temps reel, tiers-payant, remboursements, factures auto\n\nLes 3 systemes sont interconnectes et communiquent en temps reel."
  },
  {
    mots_cles: ["specialite","orl","trouver medecin","info clinique","clinique man","clinique ville","connaitre specialite","disponibles","propose","quelle clinique"],
    reponse: "Avant MediConnect, impossible de savoir depuis chez soi si une clinique propose l'ORL, la cardiologie ou la pediatrie.\n\nAvec MediConnect Africa :\n- Chaque clinique publie ses specialites, ses medecins et leurs horaires\n- Le patient consulte depuis son telephone avant de se deplacer\n- Il sait exactement ce qu'il va trouver\n- Il prend RDV avec le medecin de son choix via l'application\n- A la clinique, il scanne le QR Code a l'accueil\n- Son rang dans la file d'attente s'affiche en temps reel sur son ecran\n- Quand son tour arrive, la secretaire l'appelle"
  },
  {
    mots_cles: ["file attente","rang","qr code clinique","scanner clinique","position attente","tour medecin"],
    reponse: "MediConnect digitalise l'accueil et la file d'attente en clinique :\n\n1. Le patient prend RDV via l'application\n2. Il arrive et scanne le QR Code a l'accueil\n3. Son rang s'affiche sur son telephone (1ere, 4eme position...)\n4. Il suit l'evolution en temps reel\n5. Quand son tour arrive, la secretaire l'appelle\n6. Il entre chez le medecin\n\nPlus de stress ni d'attente dans l'incertitude."
  },
  {
    mots_cles: ["dossier medical","code secret","partager dossier","dossier digitalise","historique medical","voyage"],
    reponse: "MediConnect Africa digitalise entierement le dossier medical :\n\n- Le medecin saisit les donnees de consultation dans son logiciel\n- Le dossier est accessible depuis n'importe quelle ville ou pays\n- Si le patient voyage (ex : de Man a Abidjan), le nouveau medecin peut consulter le dossier complet avec le code secret du patient\n- Contenu : diagnostics, ordonnances, constantes vitales, antecedents, allergies\n\nLe code secret garantit que seul le patient decide qui accede a ses donnees."
  },
  {
    mots_cles: ["ordonnance electronique","pharmacie proche","mobilepay","wallet","livreur medicament","algo pharmacie","lien paiement","livrer","domicile","recevoir medicament","commander medicament"],
    reponse: "MediConnect couvre tout le parcours de la prescription a la livraison :\n\n1. Le medecin redige l'ordonnance electronique dans son logiciel\n2. L'algorithme identifie la pharmacie partenaire la plus proche\n3. La pharmacie recoit l'ordonnance et prepare les medicaments\n4. Elle envoie une facture avec lien de paiement au patient\n5. Le patient paie via MobilePay (Wave, Orange Money, MTN MoMo...)\n6. Le livreur MediConnect est alerte automatiquement\n7. Il livre les medicaments a domicile\n\nDe la consultation a la livraison : tout dans un seul ecosysteme, sans papier."
  },
  {
    mots_cles: ["ecosysteme","reseau sante","acteurs connectes","interaction temps reel","clinique pharmacie assurance livreur"],
    reponse: "L'ecosysteme MediConnect Africa connecte en temps reel tous les acteurs :\n\nClinic : enregistre consultation et ordonnance\nAssurance : voit la prestation en temps reel, facture automatique\nPharmacie : recoit ordonnance electronique, prepare et facture\nMobilePay : paiement via wallet multi-canal\nLivreur : alerte automatiquement, livre a domicile\nPatient : informe a chaque etape\n\nUn flux fluide et automatise - le premier ecosysteme de sante numerique d'Afrique de l'Ouest et Centrale."
  },
  {
    mots_cles: ["livreur","livraison","gain","commission livreur"],
    reponse: "Le profil Livreur permet de gerer les commandes de medicaments, suivre les livraisons et consulter ses gains. Remuneration : 1 000 FCFA par livraison. Inscription gratuite sur manager.mediconnect4africa.cloud/register."
  },
  {
    mots_cles: ["ministere","sante publique","epidemio","statistiques nationales"],
    reponse: "Le profil Ministere de la Sante donne acces a un dashboard epidemiologique national anonymise : morbidite par pathologie, medicaments les plus prescrits, evolution mensuelle, repartition demographique, geo-morbidite par ville."
  }
];

function findBestAnswer(message) {
  const msg = message.toLowerCase().trim();

  if (/^(bonjour|salut|hello|bonsoir|hi|coucou|hey)/.test(msg)) {
    return "Bonjour ! Je suis l'assistant MediConnect Africa. Je peux vous renseigner sur nos tarifs, les 12 profils, la MediConnect Card, les RDV en ligne, les 14 pays couverts, la creation de compte et les comptes de test. Que souhaitez-vous savoir ?";
  }
  if (/(merci|thank|parfait|super|excellent|bravo)/.test(msg)) {
    return "Avec plaisir ! Pour creer votre compte : manager.mediconnect4africa.cloud/register";
  }
  if (/(au revoir|bye|bonne soiree|a bientot)/.test(msg)) {
    return "A bientot ! Contact : keumingo@gmail.com";
  }

  let bestMatch = null;
  let bestScore = 0;
  for (const item of KB_FAQ) {
    const score = item.mots_cles.filter(k => msg.includes(k)).length;
    if (score > bestScore) { bestScore = score; bestMatch = item; }
  }
  if (bestMatch && bestScore >= 1) return bestMatch.reponse;

  return "Je n'ai pas trouve de reponse precise. Essayez : tarifs, profils, pays, carte, tests, inscription. Ou contactez-nous : keumingo@gmail.com";
}

router.post('/send', (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message manquant.' });
    }
    if (message.trim().length > 500) {
      return res.status(400).json({ success: false, message: 'Message trop long.' });
    }
    return res.json({ success: true, message: findBestAnswer(message.trim()) });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

router.get('/health', (req, res) => {
  res.json({ success: true, faq: KB_FAQ.length });
});

module.exports = router;
