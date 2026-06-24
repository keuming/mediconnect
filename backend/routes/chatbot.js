const express = require('express');
const router = express.Router();

const KB_FAQ = [
  {
    mots_cles: ["cest quoi mediconnect","quest-ce que mediconnect","presentation generale"],
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
    mots_cles: ["tiers-payant","remboursement assurance","mutuelle","prise en charge assurance","couverture maladie"],
    reponse: "Le tiers-payant sur MediConnect Africa est automatise :\n1. Patient presente sa couverture assurance\n2. La clinique enregistre - prise en charge identifiee automatiquement\n3. Prestation visible en temps reel dans le dashboard assureur\n4. Fin de mois : facture par assurance generee en 1 clic\n5. Assureur valide et rembourse\nPlus besoin de rediger manuellement des dizaines de factures."
  },
  {
    mots_cles: ["pharmacie","ordonnance","commande pharmacie","gestion pharmacie"],
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
    mots_cles: ["ordonnance electronique","pharmacie proche","mobilepay","wallet","livreur medicament","algo pharmacie","lien paiement","livrer","domicile","recevoir medicament","commander medicament","medicament","livraison medicament","livraison","me livrer"],
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
,
  {
    mots_cles: ["moniteur assurance","suivi temps reel assurance","etat factures","milliers cliniques","milliers factures","montant assurance","total pharmacie","total clinique","dashboard assureur","combien payer"],
    reponse: "Les compagnies d'assurance travaillent avec des milliers de cliniques, pharmacies, laboratoires et centres d'imagerie. Sans MediConnect, elles doivent attendre la fin du mois pour recevoir toutes les factures et savoir combien elles vont payer.\n\nAvec MediConnect Africa, l'assureur dispose d'un tableau de bord en temps reel :\n\n- A chaque consultation ou acte medical, le montant se met a jour automatiquement\n- En fin de journee, l'assureur sait exactement ce que chaque pharmacie a genere\n- Il voit le total par pharmacie avec le detail de chaque transaction\n- Il voit le total par clinique avec le detail par clinique\n- Idem pour les laboratoires et les centres d'imagerie medicale\n\nPlus besoin d'attendre la fin du mois pour connaitre son exposition financiere. L'assureur pilote ses remboursements en temps reel, detecte les anomalies immediatement et optimise sa tresorerie."
  }
,
  {
    mots_cles: ["pharmacie facture automatique","facture pharmacie assurance","facture en un clic","envoyer facture assurance","pharmacie assurance paiement"],
    reponse: "Pour les pharmacies, le fonctionnement est identique aux cliniques :\n\n1. La pharmacie sert les medicaments couverts par les assurances tout au long du mois\n2. Chaque delivrance est enregistree automatiquement dans le systeme\n3. En fin de mois : la facture globale par compagnie d'assurance est generee automatiquement\n4. En un seul clic, la facture est envoyee directement a la compagnie d'assurance\n5. La compagnie recoit la facture et procede au paiement\n\nAvec le wallet multicanal MobilePay integre a MediConnect, les assurances paient directement les cliniques et pharmacies via la plateforme. Plus besoin de cheques, de virements manuels ou de relances."
  },
  {
    mots_cles: ["wallet multicanal","mobilepay","paiement assurance","payer clinique","payer pharmacie","plateforme paiement","se faire payer","paiement prestation"],
    reponse: "MediConnect Africa integre un wallet multicanal (MobilePay) qui centralise tous les paiements de l'ecosysteme sante :\n\nCe que le wallet permet :\n- Les assurances paient directement les cliniques et pharmacies via la plateforme\n- Les patients paient leurs prestations en clinique (consultation, actes medicaux)\n- Les patients paient leurs medicaments en pharmacie\n- Paiement via Wave, Orange Money, MTN MoMo, Moov Money ou especes\n\nC'est un ecosysteme financier complet qui connecte cliniques, pharmacies, assurances et patients dans un seul flux de paiement fluide et securise."
  },
  {
    mots_cles: ["livraison ordonnance","envoyer ordonnance","devis pharmacie","lien paiement pharmacie","se faire livrer","patient ordonnance domicile","nouveaute livraison","ne se fatigue plus"],
    reponse: "La livraison de medicaments a domicile est une nouveaute majeure de MediConnect Africa :\n\nAvant MediConnect : le patient devait se deplacer a la pharmacie avec son ordonnance papier, faire la queue, attendre.\n\nAvec MediConnect :\n1. Le patient envoie son ordonnance electronique a la pharmacie via l'application\n2. La pharmacie prepare les medicaments et envoie un devis au patient\n3. Le devis est accompagne d'un lien de paiement direct\n4. Le patient paie en ligne (Wave, Orange Money, MTN MoMo...)\n5. Le livreur MediConnect est alerte automatiquement\n6. Les medicaments sont livres a domicile\n\nLe patient ne se fatigue plus. De chez lui, il gere toute sa sante numeriquement."
  },
  {
    mots_cles: ["ecosysteme complet","mise en relation","clinique pharmacie assurance patient","ensemble","comment ca marche","fonctionnement global","tout en un"],
    reponse: "MediConnect Africa est un ecosysteme complet qui met en relation tous les acteurs de la sante :\n\nClinic : gestion complete, facturation automatique, visibilite specialites\nPharmacie : ordonnances electroniques, stock, livraison, facturation auto assurances\nAssurance : dashboard temps reel, factures automatiques, paiement via wallet\nPatient : RDV en ligne, dossier medical digitalise, livraison medicaments, paiement mobile\nLivreur : commandes automatiques, livraison domicile, gains par course\n\nLe wallet multicanal MobilePay connecte financierement tous ces acteurs :\n- Assurances paient cliniques et pharmacies via la plateforme\n- Patients paient prestations et medicaments via mobile money\n\nC'est le premier ecosysteme de sante numerique integre d'Afrique de l'Ouest et Centrale."
  }
,
  {
    mots_cles: ["avantages assurance","avantages pour assurance","pourquoi assurance","assurance rejoindre","assurance benefice","avantages mediconnect assurance","mediconnect assurance","avantages compagnie","avantages pour compagnie","interet assurance","assurance maladie avantages"],
    reponse: "Avantages de MediConnect Africa pour une compagnie d'assurance maladie :\n\n1. SUIVI EN TEMPS REEL\nA chaque consultation ou acte medical chez un prestataire partenaire, votre tableau de bord se met a jour automatiquement. En fin de journee, vous connaissez le total exact genere par chaque pharmacie, chaque clinique, chaque laboratoire et chaque centre d'imagerie. Plus besoin d'attendre la fin du mois pour decouvrir votre exposition financiere.\n\n2. FACTURES AUTOMATIQUES STANDARDISEES\nChaque prestataire genere sa facture en 1 clic en fin de mois. Elle arrive directement dans votre tableau de bord au format standardise. Fini les factures papier, les emails multiples et les formats disparates entre prestataires.\n\n3. PAIEMENT SIMPLIFIE VIA MOBILEPAY\nValidez les dossiers de tiers-payant et reglez vos prestataires directement via le wallet multicanal MobilePay (Wave, Orange Money, MTN MoMo). Tracabilite complete de chaque paiement effectue.\n\n4. DETECTION IMMEDIATE DES ANOMALIES\nChaque prestation est tracee et horodatee. L'audit trail complet vous permet de detecter immediatement les anomalies et les abus, sans attendre la fin du mois.\n\n5. OPTIMISATION DE LA TRESORERIE\nAnticipez vos decaissements, optimisez vos provisions et negociez mieux avec vos prestataires grace aux statistiques de consommation en temps reel.\n\nTarif : 250 000 FCFA (mise en service) + 10 000 FCFA/mois"
  },
  {
    mots_cles: ["avantages clinique","avantages pour clinique","pourquoi clinique","clinique rejoindre","clinique benefice","avantages mediconnect clinique"],
    reponse: "Avantages de MediConnect Africa pour une clinique ou hopital :\n\n1. DASHBOARD COMPLET DE GESTION\nPlanning des medecins, dossiers patients, caisse, statistiques d'activite et gestion des specialites — tout centralise en un seul outil.\n\n2. VISIBILITE AUPRES DES PATIENTS\nPubliez vos specialites, vos medecins et leurs horaires. Les patients vous trouvent et reservent en ligne avant de se deplacer.\n\n3. FILE D'ATTENTE DIGITALISEE\nQR Code a l'accueil : le patient scanne et suit son rang en temps reel sur son telephone. Plus de stress a l'accueil.\n\n4. FACTURATION AUTOMATIQUE MULTI-ASSURANCES\nChaque acte medical genere automatiquement sa ligne de facturation. Fin de mois : facture complete par assurance en 1 clic. Fini les nuits a saisir des factures avant le 5 ou le 7 du mois.\n\n5. ECOSYSTEME CONNECTE\nLes ordonnances partent electroniquement a la pharmacie, les resultats des labos arrivent dans le dossier patient, l'assureur voit tout en temps reel.\n\nTarif : 250 000 FCFA (mise en service) + 10 000 FCFA/mois"
  },
  {
    mots_cles: ["avantages pharmacie","avantages pour pharmacie","pourquoi pharmacie","pharmacie rejoindre","pharmacie benefice","avantages mediconnect pharmacie"],
    reponse: "Avantages de MediConnect Africa pour une pharmacie :\n\n1. ORDONNANCES ELECTRONIQUES\nReceptionnez les ordonnances directement depuis les medecins du reseau. Plus de risque de perte, falsification ou illisibilite.\n\n2. GESTION DE STOCK INTELLIGENTE\nSuivi en temps reel avec alertes automatiques quand un seuil minimum est atteint.\n\n3. LIVRAISON A DOMICILE INTEGREE\nLe patient envoie son ordonnance, recoit un devis avec lien de paiement, paie via MobilePay, et le livreur MediConnect est alerte automatiquement. Nouvelle source de revenus sans investissement logistique.\n\n4. FACTURATION AUTOMATIQUE MULTI-ASSURANCES\nChaque delivrance genere sa ligne de facturation. Fin de mois : facture par assurance en 1 clic, envoyee directement via la plateforme.\n\nTarif : 250 000 FCFA (mise en service) + 10 000 FCFA/mois"
  },
  {
    mots_cles: ["avantages laboratoire","avantages pour laboratoire","pourquoi laboratoire","laboratoire rejoindre","avantages mediconnect laboratoire"],
    reponse: "Avantages de MediConnect Africa pour un laboratoire d'analyses medicales :\n\n1. DEMANDES ELECTRONIQUES\nReceptionnez les demandes d'analyses directement depuis les medecins prescripteurs. Plus de feuilles papier perdues ou illisibles.\n\n2. RESULTATS EN TEMPS REEL\nSaisissez les resultats dans votre tableau de bord : le medecin et le patient les recoivent instantanement. Integration automatique dans le dossier medical du patient.\n\n3. GESTION ADMINISTRATIVE\nAgenda des prelevements, facturation automatique, integration avec les assurances pour le remboursement des analyses.\n\n4. SECURITE TOTALE\nChiffrement TLS 1.3, acces reserve aux acteurs autorises, audit trail complet.\n\nTarif : 250 000 FCFA (mise en service) + 10 000 FCFA/mois"
  },
  {
    mots_cles: ["avantages imagerie","avantages pour imagerie","pourquoi imagerie","imagerie rejoindre","avantages mediconnect imagerie","avantages radiologie"],
    reponse: "Avantages de MediConnect Africa pour un centre d'imagerie medicale :\n\n1. DEMANDES ELECTRONIQUES\nReceptionnez les demandes d'examens (radio, echo, scanner, IRM) directement depuis les medecins prescripteurs, sans papier.\n\n2. TRANSMISSION INSTANTANEE DES RAPPORTS\nRedigez vos comptes rendus dans votre interface et transmettez-les immediatement au medecin prescripteur. Integration automatique dans le dossier medical du patient.\n\n3. GESTION ET FACTURATION\nAgenda des examens, facturation automatique, integration avec les assurances pour la prise en charge.\n\nTarif : 250 000 FCFA (mise en service) + 10 000 FCFA/mois"
  },
  {
    mots_cles: ["avantages optique","avantages pour optique","pourquoi optique","optique rejoindre","avantages mediconnect optique","avantages cabinet optique"],
    reponse: "Avantages de MediConnect Africa pour un cabinet optique :\n\n1. GESTION DE STOCK COMPLETE\nInventaire en temps reel : montures, verres correcteurs, lentilles et accessoires. Alertes automatiques sur les seuils critiques.\n\n2. ORDONNANCES OPTIQUES NUMERIQUES\nReceptionnez les ordonnances optiques depuis les ophtalmologues partenaires. Dossier patient optique avec historique complet.\n\n3. VENTES ET FACTURATION\nDevis, factures, prise en charge des assurances optiques en 1 clic. Paiement via MobilePay.\n\n4. GESTION DES FOURNISSEURS\nSuivi des commandes et des delais de livraison par fournisseur.\n\nTarif : 250 000 FCFA (mise en service) + 10 000 FCFA/mois"
  },
  {
    mots_cles: ["avantages patient","avantages pour patient","pourquoi patient","patient benefice","avantages mediconnect patient"],
    reponse: "Avantages de MediConnect Africa pour un patient :\n\n1. TROUVER LE BON MEDECIN\nConsultez les specialites et disponibilites de chaque clinique depuis votre telephone avant de vous deplacer.\n\n2. RDV EN LIGNE 24H/24\nReservez votre creneau en quelques clics. Confirmation instantanee.\n\n3. FILE D'ATTENTE DIGITALISEE\nScannez le QR Code a l'accueil de la clinique et suivez votre rang en temps reel.\n\n4. DOSSIER MEDICAL NUMERIQUE\nDiagnostics, ordonnances, constantes vitales accessibles depuis n'importe quelle ville ou pays via votre code secret.\n\n5. LIVRAISON DE MEDICAMENTS A DOMICILE\nEnvoyez votre ordonnance, recevez un devis, payez en ligne, et recevez vos medicaments chez vous.\n\n6. MEDICONNECT CARD\nCarte prepayee avec QR Code urgence. Compte famille jusqu'a 10 membres.\n\nTarif : 1 000 FCFA (mise en service) + 500 FCFA/mois"
  },
  {
    mots_cles: ["avantages livreur","avantages pour livreur","pourquoi livreur","livreur rejoindre","avantages mediconnect livreur"],
    reponse: "Avantages de MediConnect Africa pour un livreur :\n\n1. ALERTES AUTOMATIQUES\nRecevez les commandes de livraison directement sur votre application mobile sans chercher du travail.\n\n2. FLUX SIMPLE\nRecuperez les medicaments a la pharmacie et livrez au domicile du patient. Tout est guide par l'application.\n\n3. REMUNERATION CLAIRE\n1 000 FCFA par livraison effectuee. Historique de vos gains en temps reel.\n\n4. INSCRIPTION GRATUITE\nAucun investissement initial. Un smartphone Android suffit.\n\nFrais de mise en service : 2 500 FCFA uniquement"
  }
,
  {
    mots_cles: ["parcours client","parcours patient","comment ca marche","etapes fonctionnement","exemple parcours","9 etapes"],
    reponse: "Parcours client complet sur MediConnect Africa :\n\n1. Le patient prend RDV en ligne → Medecin et Clinique notifies\n2. Il arrive et scanne le QR Code d'accueil → File d'attente digitalisee\n3. Le medecin consulte et saisit le diagnostic → Dossier patient mis a jour\n4. L'ordonnance electronique est generee → Pharmacie la plus proche notifiee\n5. La pharmacie envoie un devis + lien de paiement → Patient notifie\n6. Le patient paie via MobilePay → Pharmacie confirmee\n7. Le livreur est alerte automatiquement → Livraison a domicile\n8. L'assureur enregistre la prestation en temps reel → Facturation auto generee\n9. Fin de mois : facture par assurance en 1 clic → Clinique et Pharmacie regles\n\nTout ce parcours se deroule dans un seul ecosysteme numerique, sans papier et sans intervention manuelle."
  },
  {
    mots_cles: ["recapitulatif tarifs","tous les tarifs","tableau tarifs","grille tarifaire","resume tarifs","tarif complet","tous les prix"],
    reponse: "Recapitulatif complet des tarifs MediConnect Africa :\n\nPatient             : 1 000 FCFA (mise en service) + 500 FCFA/mois\nClinique / Hopital  : 250 000 FCFA (mise en service) + 10 000 FCFA/mois\nPharmacie           : 250 000 FCFA (mise en service) + 10 000 FCFA/mois\nCompagnie Assurance : 250 000 FCFA (mise en service) + 10 000 FCFA/mois\nLaboratoire Medical : 250 000 FCFA (mise en service) + 10 000 FCFA/mois\nImagerie Medicale   : 250 000 FCFA (mise en service) + 10 000 FCFA/mois\nCabinet Optique     : 250 000 FCFA (mise en service) + 10 000 FCFA/mois\nLivreur             : 2 500 FCFA (mise en service) + 1 000 FCFA/livraison\n\nInscription : manager.mediconnect4africa.cloud/register\nContact : info@nexova.com | +225 05 07 10 86 48"
  },
  {
    mots_cles: ["detail patient","fonctionnalites patient","services patient","que fait patient","acces patient"],
    reponse: "Detail complet du profil Patient sur MediConnect Africa :\n\n1. Trouver le bon medecin avant de se deplacer\n- Specialites disponibles dans chaque clinique consultables depuis le telephone\n- Horaires et disponibilites des medecins en temps reel\n\n2. RDV en ligne 24h/24 et 7j/7\n- Reservation en quelques clics, confirmation instantanee, rappel automatique\n\n3. File d'attente digitalisee\n- Scan QR Code a l'accueil, rang affiche en temps reel sur le telephone\n\n4. Dossier medical numerique et securise\n- Diagnostics, ordonnances, constantes vitales, antecedents, allergies\n- Accessible depuis n'importe quelle ville via code secret\n\n5. Livraison de medicaments a domicile\n- Ordonnance electronique → devis → paiement en ligne → livraison\n\n6. MediConnect Card\n- Carte prepayee avec QR Code urgence, compte famille jusqu'a 10 membres\n\nTarif : 1 000 FCFA (mise en service) + 500 FCFA/mois"
  },
  {
    mots_cles: ["detail clinique","fonctionnalites clinique","tableau de bord clinique","que fait clinique","acces clinique"],
    reponse: "Detail complet du profil Clinique sur MediConnect Africa :\n\n1. Tableau de bord complet : planning medecins, dossiers patients, caisse, statistiques, specialites\n\n2. Visibilite patients : specialites, medecins et horaires publies sur la plateforme\n\n3. RDV en ligne automatique : patients reservent 24h/24, medecin notifie immediatement\n\n4. Facturation automatique multi-assurances : chaque acte genere sa ligne, facture en 1 clic en fin de mois\n\n5. Ecosysteme connecte : assureur voit les prestations temps reel, ordonnances vers pharmacie, resultats labo dans dossier patient\n\nTarif : 250 000 FCFA (mise en service) + 10 000 FCFA/mois"
  },
  {
    mots_cles: ["detail pharmacie","fonctionnalites pharmacie","que fait pharmacie","acces pharmacie"],
    reponse: "Detail complet du profil Pharmacie sur MediConnect Africa :\n\n1. Ordonnances electroniques : receptions depuis les medecins, plus de perte ni falsification\n\n2. Gestion de stock intelligente : suivi temps reel, alertes sur seuils minimums\n\n3. Livraison a domicile integree : patient paie en ligne via MobilePay, livreur alerte automatiquement\n\n4. Facturation automatique assurances : fin de mois, facture par assurance en 1 clic, envoi direct\n\nTarif : 250 000 FCFA (mise en service) + 10 000 FCFA/mois"
  },
  {
    mots_cles: ["detail assurance","fonctionnalites assurance","dashboard assurance","que fait assurance","acces assurance"],
    reponse: "Detail complet du profil Assurance sur MediConnect Africa :\n\n1. Tableau de bord temps reel : montant mis a jour a chaque acte, total par pharmacie/clinique/labo/imagerie\n\n2. Factures automatiques standardisees : chaque prestataire genere sa facture en 1 clic, format uniforme\n\n3. Paiement via MobilePay : validation tiers-payant et reglement des prestataires en ligne\n\n4. Controle et conformite : audit trail horodate, detection fraudes, optimisation tresorerie\n\nTarif : 250 000 FCFA (mise en service) + 10 000 FCFA/mois"
  },
  {
    mots_cles: ["detail laboratoire","fonctionnalites laboratoire","que fait laboratoire","acces laboratoire"],
    reponse: "Detail complet du profil Laboratoire sur MediConnect Africa :\n\n1. Demandes electroniques : recues directement depuis les medecins, priorisation selon urgence\n\n2. Resultats en temps reel : saisie dans le dashboard, transmission instantanee medecin et patient\n\n3. Gestion administrative : agenda prelevements, facturation auto, integration assurances\n\n4. Securite totale : chiffrement TLS 1.3, acces reserve aux acteurs autorises, audit trail\n\nTarif : 250 000 FCFA (mise en service) + 10 000 FCFA/mois"
  },
  {
    mots_cles: ["detail imagerie","fonctionnalites imagerie","que fait imagerie","acces imagerie","radio numerique"],
    reponse: "Detail complet du profil Imagerie Medicale sur MediConnect Africa :\n\n1. Demandes electroniques : prescriptions (radio, echo, scanner, IRM) recues depuis les medecins\n\n2. Transmission des rapports : compte rendu redige dans l'interface, transmis instantanement au medecin, integre dans le dossier patient\n\n3. Gestion et facturation : agenda examens, facturation auto, integration assurances\n\nTarif : 250 000 FCFA (mise en service) + 10 000 FCFA/mois"
  },
  {
    mots_cles: ["detail optique","fonctionnalites optique","que fait optique","acces optique"],
    reponse: "Detail complet du profil Cabinet Optique sur MediConnect Africa :\n\n1. Gestion stock : inventaire temps reel montures/verres/lentilles/accessoires, alertes seuils critiques\n\n2. Ordonnances optiques numeriques : reception depuis ophtalmologues, archivage prescriptions, dossier patient optique\n\n3. Ventes et facturation : devis/factures depuis le dashboard, facturation automatique assurances optiques\n\n4. Gestion fournisseurs : suivi commandes et delais de livraison\n\nTarif : 250 000 FCFA (mise en service) + 10 000 FCFA/mois"
  },
  {
    mots_cles: ["detail livreur","fonctionnalites livreur","que fait livreur","acces livreur","devenir livreur"],
    reponse: "Detail complet du profil Livreur sur MediConnect Africa :\n\n1. Flux automatise : alerte reception commande → recuperation pharmacie → livraison domicile → confirmation application\n\n2. Remuneration : 1 000 FCFA par livraison (500 FCFA plateforme), historique gains temps reel\n\n3. Ecosysteme de confiance : livraisons tracees, patient informe en temps reel\n\nFrais de mise en service : 2 500 FCFA uniquement (pas d'abonnement mensuel)\nInscription gratuite : manager.mediconnect4africa.cloud/register"
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
    return "A bientot ! Contact : info@nexova.com";
  }

  // Score par mots individuels du message
  const words = msg.replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 3);

  let bestMatch = null;
  let bestScore = 0;

  for (const item of KB_FAQ) {
    let score = 0;
    // Matching exact sur les mots-cles complets
    for (const k of item.mots_cles) {
      if (msg.includes(k)) score += 3;
    }
    // Matching par mots individuels du message contre mots-cles
    for (const w of words) {
      for (const k of item.mots_cles) {
        if (k.includes(w) || w.includes(k)) score += 1;
      }
    }
    if (score > bestScore) { bestScore = score; bestMatch = item; }
  }

  if (bestMatch && bestScore >= 2) return bestMatch.reponse;

  return "Je n'ai pas trouve de reponse precise. Essayez : tarifs, profils, pays, carte, tests, inscription. Ou contactez-nous : info@nexova.com";
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
