const express = require('express');
const router = express.Router();

const KB_FAQ = [
  {
    mots_cles: ["c'est quoi","qu'est-ce","présentation","plateforme","mediconnect"],
    reponse: "MediConnect Africa est une plateforme de santé numérique panafricaine (v3.0, en production depuis mai 2026). Elle connecte patients, médecins, cliniques, pharmacies, livreurs, assureurs, cabinets optiques et ministères de la santé. Elle couvre 14 pays UEMOA/CEMAC et 843 villes répertoriées. Propriétaire : CDC Compagnie des Services Numériques, gérant : M. TOMA KEUMINGO REMI."
  },
  {
    mots_cles: ["créer","compte","inscrire","inscription","register","rejoindre","adhérer","commencer"],
    reponse: "Pour créer votre compte, rendez-vous sur manager.mediconnect4africa.cloud/register. Choisissez votre profil (patient, clinique, médecin, pharmacie...), renseignez votre pays et vos informations. La création prend moins de 5 minutes. Vous pouvez aussi tester gratuitement avec nos 12 comptes de démonstration."
  },
  {
    mots_cles: ["tarif","prix","coût","combien","fcfa","abonnement","payer","forfait","mensuel"],
    reponse: "Tarifs MediConnect Africa :\n• Patient : 2 500 FCFA/mois | 6 500 FCFA/3 mois | 20 000 FCFA/an\n• Médecin Conseil (MC) : 5 000 FCFA/mois\n• Clinique / Hôpital : 10 000 FCFA/mois\n• Pharmacie : 10 000 FCFA/mois\n• Laboratoire : 5 000 FCFA/mois\n• Imagerie médicale : 5 000 FCFA/mois\n• Cabinet Optique : 5 000 FCFA/mois\n• Compagnie d'Assurance : 50 000 FCFA/mois\n• Livreur : 1 000 FCFA par livraison"
  },
  {
    mots_cles: ["pays","disponible","couvert","afrique","uemoa","cemac","sénégal","cameroun","mali","burkina"],
    reponse: "MediConnect Africa couvre 14 pays :\nUEMOA : Côte d'Ivoire, Sénégal, Burkina Faso, Mali, Togo, Bénin, Guinée, Niger\nCEMAC : Cameroun, Gabon, Congo, Tchad, Centrafrique, Guinée Équatoriale\nL'extension vers les 54 pays africains est en cours. La base géo couvre déjà 843 villes."
  },
  {
    mots_cles: ["rendez-vous","rdv","réserver","consultation","prendre rendez","médecin disponible"],
    reponse: "Pour prendre un RDV : créez un compte patient sur manager.mediconnect4africa.cloud, recherchez une clinique ou un médecin dans votre ville, consultez les créneaux disponibles et réservez en ligne. Le médecin est notifié automatiquement. Les disponibilités sont publiées en temps réel par les médecins."
  },
  {
    mots_cles: ["mediconnect card","carte","qr","urgence","recharge","wave","orange money","prépayée","carte santé"],
    reponse: "La MediConnect Card est une carte prépayée physique (verte ou noire) qui permet de payer vos soins chez les prestataires du réseau. Elle intègre un QR Code donnant accès à vos contacts d'urgence sans connexion — indispensable en cas d'accident.\nRecharge : Wave, Orange Money, MTN MoMo, Espèces.\nCompte famille : jusqu'à 10 membres (parents + enfants ≤ 18 ans)."
  },
  {
    mots_cles: ["clinique","hôpital","propriétaire","gérant","établissement","dashboard clinique"],
    reponse: "Pour les cliniques et hôpitaux :\n• Dashboard complet : planning médecins, caisse, dossiers patients, statistiques\n• Visibilité publique : spécialités, médecins et horaires visibles par tous les patients\n• Prise de RDV en ligne automatique\n• Facturation automatique pour les assurances (tiers-payant)\n• Abonnement : 10 000 FCFA/mois\nInscription : manager.mediconnect4africa.cloud/register → profil Clinique"
  },
  {
    mots_cles: ["médecin indépendant","médecin conseil","mc","sans clinique","libéral","médecin privé"],
    reponse: "Le Médecin Conseil (MC) est un médecin indépendant, non rattaché à une clinique. Il a son propre planning en ligne, ses patients prennent RDV directement, et il gère ses consultations et ordonnances de façon autonome. Tarif : 5 000 FCFA/mois."
  },
  {
    mots_cles: ["assurance","tiers-payant","remboursement","facture assurance","mutuelle"],
    reponse: "Les assureurs ont un dashboard dédié sur MediConnect Africa. Ils suivent en temps réel le montant de leurs prestations, reçoivent les factures générées automatiquement après chaque consultation, et valident les remboursements en ligne. Fini le traitement manuel des dossiers papier. Tarif : 50 000 FCFA/mois."
  },
  {
    mots_cles: ["pharmacie","médicament","ordonnance","livraison médicament","commande pharmacie"],
    reponse: "Les pharmacies reçoivent les ordonnances électroniques des médecins, gèrent les commandes et le stock de médicaments. La livraison à domicile est intégrée via les livreurs MediConnect (1 500 FCFA par livraison). Tarif : 10 000 FCFA/mois."
  },
  {
    mots_cles: ["optique","lunettes","verres","montures","vue","opticien","cabinet optique"],
    reponse: "Le module Cabinet Optique est complet : stock de montures, verres et accessoires, ventes, facturation, assurances optiques, dossiers patients, ordonnances optiques et gestion des fournisseurs. Tarif : 5 000 FCFA/mois."
  },
  {
    mots_cles: ["application","app","mobile","android","télécharger","apk","smartphone"],
    reponse: "L'application MediConnect Africa est disponible sur Android. Elle couvre les profils patient, médecin, pharmacie et livreur. Téléchargez l'APK depuis la vitrine (section 'Télécharger l'app Android') ou scannez le QR code affiché sur le site. iOS est en cours de développement. Contact : keumingo@gmail.com"
  },
  {
    mots_cles: ["sécurité","données","confidentialité","sécurisé","protection","rgpd"],
    reponse: "MediConnect Africa applique un niveau de sécurité hospitalier :\n• Chiffrement TLS 1.3 bout en bout\n• Authentification JWT sécurisée\n• Contrôle d'accès par rôle (chaque acteur voit uniquement ses données)\n• Conformité RGPD + législations africaines\n• Sauvegardes automatiques toutes les 24h (rétention 90 jours)\n• Disponibilité 99,9% — infrastructure Cloud redondante"
  },
  {
    mots_cles: ["tester","démo","demo","essai","test","comptes demo","identifiant"],
    reponse: "12 comptes de démonstration disponibles :\n\n• admin@demo.ci / demo1234\n• patient@demo.ci / demo1234\n• clinique@demo.ci / demo1234\n• medecin@demo.ci / demo1234\n• medecin.indep@demo.ci / demo1234\n• pharmacie@demo.ci / demo1234\n• livreur@demo.ci / demo1234\n• laboratoire@demo.ci / demo1234\n• imagerie@demo.ci / demo1234\n• assureur@demo.ci / demo1234\n• optique@demo.ci / demo1234\n• ministere@sante.ci / MinistereCI2024\n\nConnexion : manager.mediconnect4africa.cloud/login"
  },
  {
    mots_cles: ["livreur","livraison","gain","commission livreur","course"],
    reponse: "Le profil Livreur permet de gérer les commandes de médicaments à livrer, suivre les livraisons et consulter ses gains. Rémunération : 1 000 FCFA par livraison (500 FCFA pour la plateforme). Inscription gratuite sur manager.mediconnect4africa.cloud/register."
  },
  {
    mots_cles: ["ministère","santé publique","épidémio","statistiques nationales","epidémiologie"],
    reponse: "Le profil Ministère de la Santé donne accès à un dashboard épidémiologique national anonymisé : morbidité par pathologie (top 20), médicaments les plus prescrits, évolution mensuelle, répartition démographique âge/sexe, et morbidité géographique par ville. Accès institutionnel sur demande."
  },
  {
    mots_cles: ["profil","acteur","qui peut","utilisateur","rôle","type de compte"],
    reponse: "MediConnect Africa connecte 12 types d'acteurs :\n1. Patient — RDV, dossier médical, MediConnect Card\n2. Médecin Résident (MR) — rattaché à une clinique\n3. Médecin Conseil (MC) — indépendant\n4. Clinique / Hôpital — gestion complète\n5. Pharmacie — ordonnances, stock, livraisons\n6. Livreur — commandes et gains\n7. Assureur — tiers-payant en temps réel\n8. Imagerie — radiologie, IRM\n9. Laboratoire — analyses biologiques\n10. Cabinet Optique — montures, verres, ventes\n11. Ministère de la Santé — épidémiologie nationale\n12. Admin — supervision totale"
  },
  {
    mots_cles: ["contact","joindre","email","contacter","support","aide","numéro"],
    reponse: "Pour contacter l'équipe MediConnect Africa :\nEmail : keumingo@gmail.com\nPlateforme : manager.mediconnect4africa.cloud\nCDC Compagnie des Services Numériques\nRCCM : CI-ABJ-03-2022-B12-04961\n\nPour une démonstration personnalisée, cliquez sur 'Demander une démo' en bas du site."
  },
  {
    mots_cles: ["famille","enfant","parent","compte famille","membres famille"],
    reponse: "La MediConnect Card propose un compte famille : père + mère (tout âge) + enfants de 18 ans maximum, jusqu'à 10 membres au total. Chaque membre a sa propre carte physique liée au compte famille. En cas d'urgence, le QR Code de n'importe quelle carte donne accès aux contacts d'urgence sans connexion requise."
  },
  {
    mots_cles: ["laboratoire","analyse","biologie","résultat analyse","bilan"],
    reponse: "Le profil Laboratoire permet de saisir et partager les résultats d'analyses biologiques avec les médecins prescripteurs et les patients. Les bulletins sont accessibles directement dans le dossier médical du patient. Tarif : 5 000 FCFA/mois."
  },
  {
    mots_cles: ["imagerie","radiologie","irm","scanner","radio","échographie"],
    reponse: "Le profil Imagerie Médicale permet de saisir et partager les bulletins et rapports de radiologie/IRM avec les médecins prescripteurs. Les résultats sont intégrés directement dans le dossier médical du patient. Tarif : 5 000 FCFA/mois."
  }
  ,
  {
    mots_cles: ['facturation automatique','facture assurance','fin de mois','facture par assurance','délai facture','avant le 5','avant le 7','factures assurances','générer facture','comptabilité'],
    reponse: 'MediConnect Africa résout l'un des plus grands problèmes des cliniques et pharmacies : la facturation par assurance en fin de mois.

Sans MediConnect :
• Chaque clinique/pharmacie travaille avec plusieurs assurances
• Rédiger les factures par assurance en fin de mois est chronophage et épuisant
• Les assurances imposent des délais stricts (avant le 5 ou 7 du mois)
• Si la facture arrive en retard → paiement reporté au mois suivant
• La comptabilité manuelle est source d'erreurs

Avec MediConnect :
✅ Génération automatique des factures par assurance
✅ Chaque acte médical génère immédiatement sa ligne de facturation
✅ En fin de mois : sélectionnez l'assurance → la facture est prête en 1 clic
✅ Comptabilité intégrée automatiquement
✅ Zéro saisie manuelle, zéro retard, zéro stress'
  },
  {
    mots_cles: ['logiciel clinique','logiciel pharmacie','logiciel assurance','logiciel gestion','gestion clinique','gestion pharmacie','gestion assurance maladie','outil gestion'],
    reponse: 'MediConnect Africa est bien plus qu'une plateforme de mise en relation. C'est un logiciel complet de gestion pour chaque acteur de la santé :

🏥 Clinique → logiciel complet de gestion clinique (planning, dossiers patients, caisse, facturation, statistiques, médecins)

💊 Pharmacie → logiciel complet de gestion pharmacie (ordonnances, stock, commandes, livraisons, facturation)

🛡️ Assurance maladie → logiciel complet de gestion assurance (dossiers tiers-payant, suivi prestations en temps réel, remboursements, factures automatiques)

Et surtout : les 3 sont interconnectés. Une consultation à la clinique → l'assurance voit la prestation en temps réel → la pharmacie reçoit l'ordonnance → la facture se génère automatiquement.'
  },
  {
    mots_cles: ['interaction','interconnexion','clinique pharmacie assurance','ecosystème','réseau santé','acteurs connectés','travaillent ensemble'],
    reponse: 'L'un des grands avantages de MediConnect Africa est l'interaction en temps réel entre tous les acteurs :

• La clinique enregistre une consultation → l'assurance voit immédiatement la prestation
• Le médecin rédige une ordonnance → la pharmacie la reçoit électroniquement
• La pharmacie délivre les médicaments → la facture assurance est générée automatiquement
• Le livreur prend en charge la commande → le patient est notifié

Chaque clinique et pharmacie travaille généralement avec plusieurs compagnies d'assurance. MediConnect gère toutes ces relations simultanément, sans confusion ni erreur.'
  },
  {
    mots_cles: ['tiers payant','remboursement pharmacie','remboursement clinique','prise en charge assurance','couverture maladie'],
    reponse: 'Le système tiers-payant sur MediConnect Africa fonctionne ainsi :

1. Le patient présente sa carte d'assurance lors de la consultation
2. La clinique enregistre l'acte — la prise en charge assurance est identifiée automatiquement
3. La prestation apparaît en temps réel dans le dashboard de l'assureur
4. En fin de mois : la facture globale par assurance est générée automatiquement
5. L'assureur valide et procède au remboursement

Plus besoin de rédiger manuellement des dizaines de factures par assurance. Tout est automatisé — la clinique et la pharmacie peuvent se concentrer sur les soins.'
  }
];

function findBestAnswer(message) {
  const msg = message.toLowerCase().trim();

  // Salutations
  if (/^(bonjour|salut|hello|bonsoir|hi|coucou|hey|good morning|bonne journée)/.test(msg)) {
    return "Bonjour ! Je suis l'assistant MediConnect Africa. Je peux vous renseigner sur :\n\n• Nos tarifs et abonnements\n• Les 12 profils disponibles\n• La MediConnect Card\n• La prise de RDV en ligne\n• Les 14 pays couverts\n• Comment créer votre compte\n• Les comptes de test et démo\n\nQue souhaitez-vous savoir ?";
  }

  // Merci
  if (/(merci|thank|parfait|super|excellent|bravo|génial)/.test(msg)) {
    return "Avec plaisir ! N'hésitez pas si vous avez d'autres questions. Pour créer votre compte : manager.mediconnect4africa.cloud/register";
  }

  // Au revoir
  if (/(au revoir|bye|bonne soirée|à bientôt|bonne nuit)/.test(msg)) {
    return "À bientôt ! Pour tout renseignement : keumingo@gmail.com. Bonne journée !";
  }

  // Recherche par score de mots-clés
  let bestMatch = null;
  let bestScore = 0;
  for (const item of KB_FAQ) {
    const score = item.mots_cles.filter(k => msg.includes(k)).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = item;
    }
  }
  if (bestMatch && bestScore >= 1) return bestMatch.reponse;

  // Réponse par défaut
  return "Je n'ai pas trouvé de réponse précise à votre question. Voici ce que je peux vous expliquer :\n\n💰 Tarifs — \"Quels sont vos prix ?\"\n👥 Profils — \"Quels profils existent ?\"\n🌍 Pays — \"Quels pays sont couverts ?\"\n💳 Carte — \"C'est quoi la MediConnect Card ?\"\n🧪 Tests — \"Comment tester la plateforme ?\"\n📝 Inscription — \"Comment créer un compte ?\"\n\nOu contactez-nous : keumingo@gmail.com";
}

// POST /api/chatbot/send
router.post('/send', (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message manquant.' });
    }
    if (message.trim().length > 500) {
      return res.status(400).json({ success: false, message: 'Message trop long (max 500 caractères).' });
    }
    const reponse = findBestAnswer(message.trim());
    return res.json({ success: true, message: reponse });
  } catch (e) {
    console.error('Chatbot error:', e);
    return res.status(500).json({ success: false, message: 'Erreur serveur. Contactez keumingo@gmail.com' });
  }
});

// GET /api/chatbot/health
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'Chatbot MediConnect opérationnel', faq: KB_FAQ.length });
});

module.exports = router;
// ⚠️ NE PAS MODIFIER — ajout automatique de connaissances
