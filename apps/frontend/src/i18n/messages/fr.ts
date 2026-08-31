import type { Messages } from './en';

/**
 * French dictionary. Typed against `Messages`, so any key missing here (or any
 * key renamed in `en.ts`) is a type error rather than a silent English string.
 */
const fr: Messages = {
  /* ─── SEO / cartes sociales ──────────────────────────────────────────── */
  seo: {
    title: 'Qurelio : l’OS IA de conformité et de qualité',
    description:
      'OS IA de conformité et qualité : vos documents deviennent une mémoire de conformité privée, évaluée face aux réglementations publiques, chaque sortie IA validée par un humain.',
    ogImageAlt: 'Qurelio : prouvez votre conformité, chaque produit, chaque marché, chaque jour.',
    demoTitle: 'Réserver une démo',
    demoDescription:
      'Réservez une démonstration de Qurelio : évaluation des preuves face aux clauses ISO et réglementaires, audits, non-conformités et registres prêts pour l’audit.',
  },

  /* ─── Partagé ────────────────────────────────────────────────────────── */
  common: {
    language: 'Langue',
    english: 'English',
    french: 'Français',
    loading: 'Chargement…',
    optional: 'Facultatif',
    required: 'Obligatoire',
    cancel: 'Annuler',
    continue: 'Continuer',
    previous: 'Précédent',
    retry: 'Réessayer',
    signIn: 'Se connecter',
    signUp: 'Créer un compte',
    backToHome: "Retour à l'accueil",
    backToSignIn: 'Retour à la connexion',
    showPassword: 'Afficher le mot de passe',
    hidePassword: 'Masquer le mot de passe',
  },

  /* ─── Barre de navigation ────────────────────────────────────────────── */
  nav: {
    links: ['Accueil', 'Pourquoi Qurelio', 'Comment ça marche', 'Tarifs', 'Contact'],
    searchPlaceholder: 'Rechercher…',
    getStarted: 'Commencer',
    openMenu: 'Ouvrir le menu',
    closeMenu: 'Fermer le menu',
    logoAlt: 'Qurelio',
  },

  /* ─── Hero ───────────────────────────────────────────────────────────── */
  hero: {
    titleLead: 'Prouvez votre',
    titleHighlight: 'conformité.',
    titleRest: 'Chaque produit, chaque marché, chaque jour.',
    subtitle:
      'Une seule plateforme pour démontrer que vos produits respectent les lois et règlements de chaque marché où vous vendez. Documents, audits, non-conformités et preuves : organisés, notés et prêts pour l’audit chaque jour, pas seulement au moment de la certification.',
    ctaDemo: 'Réserver une démo',
    ctaVideo: 'Voir la vidéo',
    socialProof:
      'Conçu avec des responsables qualité de l’industrie exportatrice tunisienne.',
  },

  /* ─── Pourquoi Qurelio ───────────────────────────────────────────────── */
  why: {
    sectionLabel: 'Pourquoi Qurelio',
    eyebrow: 'Pourquoi Qurelio',
    heading: 'Ce qui fait de Qurelio la plateforme de conformité <em>intelligente</em>',
    sub: 'Conçue de A à Z pour les équipes qualité qui ont besoin de plus que des tableurs. Qurelio réunit l’IA, l’automatisation et une intelligence réglementaire approfondie dans une plateforme unifiée. Et parce que la conformité est trop importante pour être laissée à une machine, chaque résultat de l’IA attend votre approbation avant de devenir réel.',
    trust:
      '<b>100 % légal par conception.</b> Qurelio n’exploite que des textes réglementaires publics et libres de droits : lois, décrets et règlements officiels. Les normes sous licence telles que l’ISO/IEC sont détectées automatiquement et ne sont jamais stockées ni analysées.',
    features: {
      compliance: {
        tag: 'Propulsé par l’IA',
        label: 'Moteur de conformité IA',
        headline: 'Restez prêt pour l’audit, tous les jours de l’année',
        cta: 'Découvrir le moteur de conformité',
        blocks: [
          {
            title: 'Réduisez de 70 % la préparation de la conformité',
            description:
              'Évaluation continue par l’IA de vos produits au regard des lois, décrets et règlements publics de vos marchés cibles : un exercice de 3 mois devient un contrôle réalisable le jour même, autant de fois que nécessaire.',
          },
          {
            title: 'Concret, pas abstrait',
            description:
              'Chaque écart s’accompagne d’une explication en langage clair, d’une action corrective recommandée, d’un responsable et d’une échéance. Fini les rapports d’audit de 80 pages que personne n’ouvre.',
          },
          {
            title: 'Vous gardez le contrôle',
            description:
              'Chaque résultat généré par l’IA (rapports, plans d’action, écarts détectés) arrive d’abord dans une file de revue. Rien ne devient un enregistrement officiel ou une action exécutable tant que votre responsable qualité ne l’a pas approuvé.',
          },
        ],
      },
      monitoring: {
        tag: 'Propulsé par l’IA',
        label: 'Veille réglementaire',
        headline: 'Ne soyez plus jamais surpris par une réglementation',
        cta: 'Découvrir la veille réglementaire',
        blocks: [
          {
            title: 'Surveille les textes qui vous concernent',
            description:
              'Qurelio suit les réglementations publiques pertinentes pour vos produits et vos marchés. Quand un texte évolue, vous êtes le premier à savoir précisément ce que cela implique pour vous.',
          },
          {
            title: 'Trouve ce que vous ne pensiez pas à chercher',
            description:
              'Lorsqu’une réglementation applicable que vous n’aviez jamais mentionnée apparaît, Qurelio la signale et vous indique exactement quels produits sont concernés, sous réserve de votre revue.',
          },
        ],
      },
      audit: {
        tag: 'Automatisé',
        label: 'Automatisation des audits',
        headline: 'Menez vos audits sans relancer un seul e-mail',
        cta: 'Découvrir l’automatisation des audits',
        blocks: [
          {
            title: 'Grilles et constats rédigés par l’IA',
            description:
              'Définissez vos programmes d’audit et désignez les auditeurs, puis laissez l’IA rédiger les grilles pendant que la plateforme envoie les rappels, collecte les réponses et compile les constats automatiquement.',
          },
          {
            title: 'De l’audit à l’action en un clic',
            description:
              'Les constats alimentent directement vos plans d’action, avec une traçabilité complète de l’observation à la clôture.',
          },
        ],
      },
      capa: {
        tag: 'Suivi',
        label: 'Non-conformités & CAPA',
        headline: 'Traitez la cause racine, pas le symptôme',
        cta: 'Découvrir les CAPA',
        blocks: [
          {
            title: '5 Pourquoi, Ishikawa et 8D intégrés',
            description:
              'Enregistrez les non-conformités de toutes provenances (audits, contrôle qualité, réclamations clients) et menez une analyse structurée des causes racines sans quitter la plateforme.',
          },
          {
            title: 'Efficacité vérifiée',
            description:
              'Pilotez les actions correctives et préventives jusqu’à leur mise en œuvre, puis vérifiez automatiquement qu’elles ont fonctionné. La boucle est bouclée, à chaque fois.',
          },
        ],
      },
      documents: {
        tag: 'Documents',
        label: 'Documents maîtrisés & bibliothèque',
        headline: 'Une source unique de vérité : versionnée, signée, diffusée',
        cta: 'Découvrir les documents',
        blocks: [
          {
            title: 'Des circuits d’approbation qui fonctionnent vraiment',
            description:
              'Revue multi-niveaux, signatures électroniques et diffusion automatique aux bonnes personnes, avec une piste d’audit complète. Privé par défaut.',
          },
          {
            title: 'Fini les versions parallèles',
            description:
              'Les anciennes versions sont archivées automatiquement. Chacun retrouve la procédure en vigueur en quelques secondes, et non dans un labyrinthe de disques partagés.',
          },
        ],
      },
      dashboards: {
        tag: 'Analytique',
        label: 'Tableaux de bord KPI en direct',
        headline: 'Visualisez votre situation qualité d’un coup d’œil',
        cta: 'Découvrir les tableaux de bord',
        blocks: [
          {
            title: 'Vues temps réel, adaptées à chaque rôle',
            description:
              'Scores de conformité, actions ouvertes, statut des audits et indicateurs qualité pour chaque site, chaque équipe et chaque réglementation : en direct, pas en fin de mois.',
          },
          {
            title: 'Du KPI à la preuve',
            description:
              'Cliquez sur n’importe quel chiffre pour remonter à sa source : audit, constat, document ou signature. Transparence totale.',
          },
        ],
      },
    },
  },

  /* ─── Comment ça marche ──────────────────────────────────────────────── */
  how: {
    sectionLabel: 'Comment fonctionne Qurelio',
    eyebrow: 'Comment ça marche',
    heading: 'Comment ça <em>marche</em>',
    sub: 'Trois étapes sereines. Du jour où vous décrivez votre organisation au rythme quotidien de la conformité, Qurelio guide chaque mouvement, et vous approuvez chaque décision.',
    steps: [
      {
        action: 'Démarrer',
        title: 'Apprenez votre organisation à Qurelio',
        lead: 'Partez de là où vous en êtes.',
        description:
          'Décrivez votre entreprise, vos produits et vos marchés, puis rassemblez vos dossiers produits et vos documents qualité dans un espace organisé. Qurelio construit une mémoire de conformité privée de votre organisation, pour que chaque réponse parle de votre réalité.',
        detailsLabel: 'Ce qui se passe ici',
        details: [
          'Un parcours guidé recueille votre activité, vos marchés et votre contexte qualité',
          'Import en masse par glisser-déposer des dossiers produits et des enregistrements',
          'Privé par défaut : votre mémoire n’appartient qu’à vous, jamais partagée',
        ],
      },
      {
        action: 'Évaluer',
        title: 'Déposez une réglementation, obtenez votre verdict',
        lead: 'Voyez les écarts clairement.',
        description:
          'Ajoutez n’importe quelle loi, décret ou règlement public qui vous concerne. Qurelio évalue vos produits au regard de ce texte, article par article, et renvoie un score de conformité et un niveau de maturité, chaque écart étant expliqué en langage clair.',
        detailsLabel: 'Ce que vous recevez',
        details: [
          'Évaluation de la conformité et de la maturité, article par article',
          'Explication en langage clair de chaque écart',
          'Des corrections proposées, chacune avec un responsable et une date, en attente de votre approbation',
        ],
      },
      {
        action: 'Surveiller & améliorer',
        title: 'Ne soyez plus jamais surpris par une réglementation',
        lead: 'Gardez l’élan.',
        description:
          'Qurelio continue de veiller. Quand une réglementation change, ou qu’un texte applicable que vous n’aviez jamais mentionné apparaît, vous recevez une alerte qui indique exactement quels produits sont concernés et quoi faire. Chaque écart clôturé devient un jalon visible.',
        detailsLabel: 'Ce qui vous reste',
        details: [
          'Des alertes quand une évolution réglementaire affecte votre conformité',
          'La détection des réglementations applicables que vous ignoriez',
          'Des KPI en direct et une piste de preuves en un clic, prête pour tout auditeur',
        ],
      },
    ],
  },

  /** Micro-libellés dessinés dans les illustrations de la page d’accueil. */
  illustrations: {
    dropFilesHere: 'Déposez vos fichiers ici',
    decree: 'Décret',
    regulation: 'Règlement',
    law: 'Loi',
    gapsFound: '3 écarts détectés',
    score: 'SCORE',
    closed: 'CLÔTURÉES',
    open: 'OUVERTES',
  },

  /* ─── Tarifs ─────────────────────────────────────────────────────────── */
  pricing: {
    sectionLabel: 'Tarifs',
    eyebrow: 'Tarifs',
    heading: 'Une tarification simple et <em>transparente</em>',
    sub: 'Choisissez l’offre adaptée à votre complexité réglementaire. Contrats annuels, sans frais de mise en œuvre, sans coûts cachés. Le garde-fou juridique, la quarantaine avec validation humaine et la piste d’audit sont inclus dans <b>toutes</b> les offres — ce qui évolue, c’est votre portefeuille, pas votre sécurité.',
    billingGroupLabel: 'Périodicité de facturation',
    annual: 'Annuel',
    quarterly: 'Trimestriel',
    quarterlyTag: '+5 %',
    perYear: 'par an',
    perQuarter: 'par trimestre',
    onRequest: 'Sur demande',
    tailored: 'Adapté à votre secteur',
    context:
      '<b>Comment Qurelio se compare-t-il ?</b> Les plateformes eQMS des industries réglementées vont de 5 000 à 15 000 $ / an pour les petites équipes à 25 000–100 000 $ et plus / an pour le mid-market (SimplerQMS, Qualio, Greenlight Guru). L’offre Professional de Qurelio, à 24 000 € / an pour 10 utilisateurs, inclut la veille réglementaire et l’analyse de conformité par IA — des capacités absentes des tarifs eQMS standards. Aucun frais de mise en œuvre. Aucun module payant supplémentaire pour les opérations qualité de base.',
    plans: [
      {
        name: 'Pilote Early Access',
        description:
          'Professional en intégralité, au tarif pilote — construisez le produit avec nous.',
        priceNote: 'équivalent 500 € / mois · 75 % de remise sur Professional',
        quarterlyNote: 'Facturation annuelle uniquement pour le programme pilote',
        scope: '5 utilisateurs · périmètre Professional par ailleurs · ouvert dans le monde entier',
        ctaLabel: 'Demander l’accès pilote',
        ctaNote: 'contact@qurelio.com · ouvert dans le monde entier',
        badge: 'Accès anticipé',
        features: [
          'L’offre Professional complète — aucune fonctionnalité en moins',
          'Session de démarrage dédiée, sans frais',
          'Ajout prioritaire de vos sources réglementaires au registre surveillé',
          'Ligne directe avec l’équipe produit + contribution à la feuille de route',
          'Périmètre sur mesure possible après le pilote',
          'Le tarif Professional standard s’applique à partir du 6ᵉ client',
        ],
      },
      {
        name: 'Starter',
        description:
          'Structurez vos opérations qualité et maîtrisez vos premières réglementations.',
        priceNote: 'équivalent 800 € / mois',
        quarterlyNote: 'Facturé tous les 3 mois · +5 % sur le tarif annuel',
        scope: '3 utilisateurs · 3 produits · 2 réglementations actives',
        ctaLabel: 'Démarrer l’essai gratuit',
        ctaNote: 'essai de 14 jours · sans carte bancaire',
        badge: '',
        features: [
          'Assistant de démarrage et profil organisationnel',
          'Intégration des dossiers produits → mémoire de conformité privée',
          'Moteur de conformité — obligations, liste d’écarts, score pondéré, chaque constat sourcé',
          'Garde-fou juridique et quarantaine humaine sur chaque sortie de l’IA',
          'Bibliothèque documentaire, non-conformités et cycle de vie CAPA',
          'Audits internes, outils d’analyse de causes racines, plans d’action',
          'Support par e-mail sous 48 h · accompagnement au démarrage inclus',
        ],
      },
      {
        name: 'Professional',
        description: 'Tout Starter — et le paysage réglementaire qui se surveille tout seul.',
        priceNote: 'équivalent 2 000 € / mois',
        quarterlyNote: 'Facturé tous les 3 mois · +5 % sur le tarif annuel',
        scope: '10 utilisateurs · 25 produits · réglementations illimitées · 3 sites',
        ctaLabel: 'Démarrer l’essai gratuit',
        ctaNote: 'essai de 14 jours · sans carte bancaire',
        badge: 'Le plus choisi',
        features: [
          'Tout Starter, sans compteur',
          'Veille réglementaire — filtrage des changements de fond vs cosmétiques',
          'Analyse d’impact sur vos obligations, vos produits et vos scores',
          'Détection des réglementations manquantes',
          'Assistant IA Qurelio — questions-réponses sourcées sur votre mémoire de conformité',
          'Dossier de préparation à l’audit + export PDF / Excel / PowerPoint',
          'Support prioritaire e-mail + chat · accompagnement au démarrage inclus',
        ],
      },
      {
        name: 'Enterprise',
        description: 'Multi-site, multi-fournisseurs, configuré selon votre système qualité.',
        priceNote: 'à partir de 5 000 € / mois · calibré selon sites, produits et marchés',
        quarterlyNote: 'Facturation semestrielle disponible sur demande',
        scope:
          'Utilisateurs, produits et réglementations illimités · consolidation multi-site',
        ctaLabel: 'Demander un devis',
        ctaNote: 'périmètre sur mesure · pas de prix fixe',
        badge: '',
        features: [
          'Tout Professional',
          'Qualité fournisseurs — AVL, scorecards, criticité, SCAR',
          'Portail fournisseurs externe avec accès isolé',
          'Portefeuille multi-site — scoring consolidé et par site',
          'Scoring configurable, rôles personnalisés et accès auditeur externe',
          'SSO (Google, Microsoft, SAML 2.0) · API publique et webhooks',
          'Customer Success Manager dédié + SLA contractuel',
        ],
      },
    ],
  },

  /* ─── Tableau comparatif ─────────────────────────────────────────────── */
  compare: {
    sectionLabel: 'Comparatif des offres',
    eyebrow: 'Comparer',
    heading: 'Chaque fonctionnalité, <em>chaque offre</em>',
    sub: 'Organisé selon les cinq piliers de la plateforme. Faites défiler horizontalement sur petits écrans.',
    legendIncluded: 'inclus',
    legendNotIncluded: 'non inclus',
    featureColumn: 'Fonctionnalité',
    scrollHint: 'Faites défiler le tableau pour voir toutes les offres →',
    ariaIncluded: 'inclus',
    ariaNotIncluded: 'non inclus',
    columns: [
      { name: 'Early Access', price: '6 000 € / an' },
      { name: 'Starter', price: '9 600 € / an' },
      { name: 'Professional', price: '24 000 € / an' },
      { name: 'Enterprise', price: 'Sur demande' },
    ],
    groups: [
      {
        title: 'Périmètre',
        rows: [
          { label: 'Utilisateurs', cells: ['5 · monde entier', '3', '10', 'Illimité'] },
          { label: 'Produits au registre', cells: ['25', '3', '25', 'Illimité'] },
          { label: 'Réglementations actives', cells: ['Illimité', '2', 'Illimité', 'Illimité'] },
          {
            label: 'Évaluations IA / an',
            cells: ['Usage raisonnable', '4', 'Usage raisonnable', 'Illimité'],
          },
          { label: 'Sites / entités juridiques', cells: ['3', '1', '3', 'Illimité'] },
        ],
      },
      {
        title: 'Pilier 1 — Contexte & mémoire',
        rows: [
          {
            label: 'Assistant de démarrage et profil organisationnel',
            cells: [true, true, true, true],
          },
          {
            label: 'Intégration des dossiers produits → mémoire de conformité',
            cells: [true, true, true, true],
          },
          { label: 'Registre produits et profil réglementaire', cells: [true, true, true, true] },
          { label: 'OCR et extraction de texte', cells: [true, true, true, true] },
        ],
      },
      {
        title: 'Pilier 2 — Moteur de conformité',
        rows: [
          {
            label: 'Dépôt et analyse de réglementations publiques',
            cells: [true, true, true, true],
          },
          {
            label: 'Extraction des obligations, sourcée au passage d’origine',
            cells: [true, true, true, true],
          },
          {
            label: 'Registre des obligations + acceptation de responsabilité',
            cells: [true, true, true, true],
          },
          { label: 'Liste des écarts et cartographie des preuves', cells: [true, true, true, true] },
          {
            label: 'Score de conformité (pondéré par criticité)',
            cells: [true, true, true, 'Configurable'],
          },
          { label: 'Modèle de maturité à 5 niveaux', cells: [true, true, true, 'Configurable'] },
          {
            label: 'Indicateurs de confiance sur chaque sortie de l’IA',
            cells: [true, true, true, true],
          },
          {
            label: 'Réévaluation et historique des scores',
            cells: ['+ automatique', 'À la demande', '+ automatique', '+ automatique'],
          },
          {
            label: 'NC et CAPA suggérées par l’IA à partir des écarts',
            cells: [true, true, true, true],
          },
        ],
      },
      {
        title: 'Pilier 3 — Veille réglementaire',
        rows: [
          { label: 'Registre des sources surveillées', cells: [true, false, true, true] },
          {
            label: 'Détection planifiée des changements (modifications cosmétiques filtrées)',
            cells: [true, false, true, true],
          },
          {
            label: 'Analyse d’impact sur vos obligations et vos scores',
            cells: [true, false, true, true],
          },
          { label: 'Détection des réglementations manquantes', cells: [true, false, true, true] },
          { label: 'Alertes selon la criticité', cells: [true, false, true, true] },
        ],
      },
      {
        title: 'Pilier 4 — Opérations qualité',
        rows: [
          {
            label: 'Bibliothèque documentaire — versions, approbation, droits, recherche',
            cells: [true, true, true, true],
          },
          { label: 'Non-conformités', cells: [true, true, true, true] },
          {
            label: 'Cycle de vie CAPA et vérification d’efficacité',
            cells: [true, true, true, true],
          },
          {
            label: 'Audits internes, grilles, constats → NC',
            cells: [true, true, true, true],
          },
          { label: 'Causes racines : 5 Pourquoi · Ishikawa', cells: [true, true, true, true] },
          { label: 'Causes racines : 8D', cells: [true, false, true, true] },
          { label: 'Centre de plans d’action · Kanban · calendrier', cells: [true, true, true, true] },
          { label: 'Portail formation et matrice de compétences', cells: [true, true, true, true] },
          {
            label: 'Qualité fournisseurs — AVL, scorecards, SCAR',
            cells: [false, false, false, true],
          },
          { label: 'Portail fournisseurs externe', cells: [false, false, false, true] },
          {
            label: 'Revue de direction · Gestion du changement · Métrologie · CSAT · HSE',
            cells: [false, false, false, true],
          },
        ],
      },
      {
        title: 'Pilier 5 — Intelligence & contrôle',
        rows: [
          {
            label: 'Garde-fou juridique — consentement de responsabilité avant dépôt',
            cells: [true, true, true, true],
          },
          {
            label: 'Garde-fou juridique — détection et blocage des normes sous licence',
            cells: [true, true, true, true],
          },
          {
            label: 'Quarantaine humaine sur chaque sortie de l’IA',
            cells: [true, true, true, true],
          },
          {
            label: 'Mention « généré par IA » sur chaque sortie',
            cells: [true, true, true, true],
          },
          {
            label: 'Boîte de quarantaine et historique des transitions',
            cells: [true, true, true, true],
          },
          {
            label: 'Assistant IA Qurelio (sourcé, limité à votre espace)',
            cells: [true, false, true, true],
          },
          {
            label: 'Tableau de bord et KPI',
            cells: [
              'Complet + heatmap',
              'Standard',
              'Complet + heatmap',
              'Complet + consolidé',
            ],
          },
          { label: 'Score de préparation à l’audit', cells: [true, false, true, true] },
          { label: 'Exploration détaillée et filtres par date', cells: [true, false, true, true] },
        ],
      },
      {
        title: 'Rapports & export',
        rows: [
          { label: 'Fiche de score PDF', cells: [true, false, true, '+ personnalisé'] },
          { label: 'Export Excel / PowerPoint', cells: [true, false, true, '+ personnalisé'] },
          { label: 'Dossier de préparation à l’audit', cells: [true, false, true, true] },
        ],
      },
      {
        title: 'Plateforme & sécurité',
        rows: [
          { label: 'Rôles', cells: ['5', '3', '5', 'Sur mesure'] },
          { label: 'Accès auditeur externe restreint', cells: [false, false, false, true] },
          { label: 'SSO — Google · Microsoft · SAML', cells: [false, false, false, true] },
          { label: 'Isolation des données par client', cells: [true, true, true, true] },
          { label: 'Piste d’audit en ajout seul', cells: [true, true, true, true] },
          {
            label: 'Export des journaux et configuration de rétention',
            cells: [false, false, false, true],
          },
          { label: 'API publique et webhooks', cells: [false, false, false, true] },
          {
            label: 'Langues de l’interface',
            cells: ['FR · EN', 'FR · EN', 'FR · EN', 'FR · EN'],
          },
        ],
      },
      {
        title: 'Support & démarrage',
        rows: [
          {
            label: 'Démarrage',
            cells: ['Dédié', 'En autonomie', '2 sessions', 'Programme complet'],
          },
          {
            label: 'Support',
            cells: ['E-mail prioritaire', 'E-mail · 48 h', 'E-mail + chat', 'CSM + SLA'],
          },
          { label: 'Essai', cells: ['Négocié', '14 jours', '14 jours', 'POC de 30 jours'] },
        ],
      },
    ],
  },

  /* ─── Évolutivité & facturation ──────────────────────────────────────── */
  scaleBilling: {
    sectionLabel: 'Évolutivité et facturation',
    eyebrow: 'Évolutivité & facturation',
    heading: 'Vous ne payez que <em>ce que vous surveillez</em>',
    sub: 'Chaque offre s’étend selon les quatre dimensions qui grandissent réellement avec votre portefeuille : utilisateurs, produits, réglementations et évaluations.',
    addOnsTitle: 'Options',
    addOnsSub: 'Ajoutables à tout moment, au prorata de votre période de facturation en cours.',
    addOnColumn: 'Option',
    starterColumn: 'Starter',
    professionalColumn: 'Professional',
    enterpriseColumn: 'Enterprise',
    notAvailable: 'non disponible',
    included: 'Inclus',
    billingTitle: 'Facturation',
    billingSub: 'Tous les prix sont en euros. Factures émises en euros.',
    addOns: [
      {
        label: 'Utilisateur supplémentaire',
        starter: '90 € / mois',
        professional: '80 € / mois',
        enterprise: '75 € / mois',
      },
      {
        label: 'Produits — pack de 10',
        starter: '1 200 € / an',
        professional: '900 € / an',
        enterprise: 'Inclus',
      },
      {
        label: 'Réglementations actives — pack de 5',
        starter: '1 800 € / an',
        professional: 'Inclus',
        enterprise: 'Inclus',
      },
      {
        label: 'Site / entité juridique supplémentaire',
        starter: null,
        professional: '2 400 € / an',
        enterprise: 'Inclus',
      },
      {
        label: 'Évaluations IA — pack de 10',
        starter: '600 €',
        professional: 'Usage raisonnable',
        enterprise: 'Inclus',
      },
      {
        label: 'Accès portail fournisseurs — pack de 25',
        starter: null,
        professional: null,
        enterprise: '3 000 € / an',
      },
    ],
    billingTerms: [
      { term: 'Standard', detail: 'Annuel, facturé une fois par an. Le tarif le plus bas.' },
      { term: 'Trimestriel', detail: 'Starter et Professional, +5 % sur le tarif annuel.' },
      { term: 'Semestriel', detail: 'Enterprise, sur demande.' },
      {
        term: 'Mise en œuvre',
        detail:
          '<b>Aucune.</b> Le démarrage est inclus dans chaque offre, sans frais supplémentaires.',
      },
      {
        term: 'Contrat',
        detail:
          'Durée minimale de 12 mois. Reconduction tacite sauf résiliation 30 jours avant la date de renouvellement.',
      },
      {
        term: 'Changements',
        detail:
          'Montée en gamme à tout moment, au prorata. Les passages à une offre inférieure prennent effet au renouvellement.',
      },
    ],
  },

  /* ─── FAQ tarifaire ──────────────────────────────────────────────────── */
  faq: {
    sectionLabel: 'Questions sur les tarifs',
    eyebrow: 'Questions',
    heading: 'Ce que les équipes AR & AQ <em>nous demandent en premier</em>',
    items: [
      {
        q: 'Le contenu réglementaire est-il utilisable en environnement réglementé ?',
        a: [
          'Qurelio n’intègre que des <b>textes juridiques publics et librement réutilisables</b>. Chaque réglementation de votre espace affiche son URL source et son statut juridique, pour que vous puissiez la vérifier vous-même à tout moment. Les normes sous licence — ISO, IEC et équivalentes — sont détectées automatiquement au dépôt et ne sont jamais stockées, jamais vectorisées, jamais transmises à un modèle d’IA. Cela est garanti par l’architecture de la plateforme, pas par une simple politique interne. Lorsqu’une norme dont vous avez besoin est sous licence, Qurelio vous indique laquelle acquérir et vous permet de travailler à partir de votre propre exemplaire.',
        ],
      },
      {
        q: 'Comment Qurelio traite-t-il les sorties de l’IA en environnement réglementé ?',
        a: [
          'Chaque sortie de l’IA porte une mention visible et est créée en <b>quarantaine</b>. Rien de ce que produit l’IA ne devient exécutable tant que votre responsable qualité ne l’a pas revu et accepté — avec des contrôles d’édition, d’acceptation et de rejet, et un historique complet des transitions indiquant qui a accepté quoi, et quand. Qurelio ne prend jamais de décision de conformité autonome, et chaque constat cite le passage du texte source dont il provient.',
          'L’IA vous aide à aller plus vite. Vous restez responsable. C’est exactement ce qu’attendent vos auditeurs.',
        ],
      },
      {
        q: 'Que deviennent nos données de conformité ?',
        a: [
          'Vos données sont isolées dans un environnement dédié — aucun autre client Qurelio ne peut accéder à vos produits, profils réglementaires, analyses d’écarts ou enregistrements d’audit. Nous signons un accord de traitement des données avant toute entrée de données dans le système, et la piste d’audit est en ajout seul. Vos documents ne servent jamais à entraîner un modèle.',
        ],
      },
      {
        q: 'Pourquoi le moteur de conformité est-il inclus dans toutes les offres ?',
        a: [
          'Parce que c’est la raison d’utiliser Qurelio. Les offres diffèrent par le volume que vous y faites passer — nombre de produits, de réglementations et d’évaluations — et non par le fait d’y avoir accès ou non. Un client Starter analyse deux réglementations pour trois produits ; un client Enterprise traite un portefeuille multi-site entier. Même moteur, mêmes garde-fous, même piste d’audit.',
        ],
      },
      {
        q: 'Puis-je changer d’offre à la hausse ou à la baisse ?',
        a: [
          'Oui. La montée en gamme est possible à tout moment — la différence est calculée au prorata de votre période de facturation en cours. Les passages à une offre inférieure prennent effet à la date de renouvellement suivante. Les clients Enterprise sont invités à en parler directement à leur Customer Success Manager.',
        ],
      },
      {
        q: 'Existe-t-il un essai gratuit, et le démarrage est-il facturé ?',
        a: [
          'Starter et Professional incluent un essai gratuit de 14 jours, sans carte bancaire. Les clients Enterprise bénéficient d’une preuve de concept de 30 jours construite autour de leur propre contexte réglementaire et de leur portefeuille produits.',
          'Le démarrage est inclus dans chaque offre sans frais supplémentaires — nous accompagnons chaque client personnellement, quelle que soit l’offre. Nous ne facturons pas de frais de mise en œuvre.',
        ],
      },
      {
        q: 'En quoi consiste le programme pilote Early Access ?',
        a: [
          'Un programme d’accès anticipé ouvert dans le monde entier — les cinq premiers industriels à nous rejoindre, quel que soit leur pays. Les clients pilotes obtiennent <b>l’offre Professional complète</b> à 6 000 € / an, avec l’ajout prioritaire de leurs sources réglementaires nationales au registre surveillé — chaque source étant soumise à une validation juridique avant sa mise en service. L’interface est aujourd’hui FR/EN ; l’arabe figure à la feuille de route. Le tarif Professional standard s’applique à partir du 6ᵉ client. Après le pilote, le périmètre peut être personnalisé — utilisateurs, modules et réglementations adaptés à votre système qualité exact. Écrivez à contact@qurelio.com pour candidater.',
        ],
      },
      {
        q: 'L’offre peut-elle être personnalisée après le pilote ?',
        a: [
          'Oui — et c’est tout l’intérêt du pilote. À l’issue de votre période de démarrage, les clients Early Access et Enterprise peuvent ajuster le périmètre avec nous : le nombre d’utilisateurs, les modules actifs dans leur espace, les sources réglementaires surveillées et les dimensions optionnelles (produits, réglementations, évaluations). Nous calibrons l’accord sur votre système qualité réel — et non sur un palier figé. Contactez votre interlocuteur de démarrage ou écrivez à contact@qurelio.com pour en discuter.',
        ],
      },
    ],
  },

  /* ─── Bloc « À propos » ──────────────────────────────────────────────── */
  about: {
    badge: 'Pourquoi Qurelio',
    headingLead: 'La gestion de la qualité,',
    headingHighlight: 'simplifiée',
    sub: 'Qurelio aide les organisations à démontrer que leurs produits respectent les lois et règlements publics de chaque marché où elles vendent. De la maîtrise documentaire aux audits et aux non-conformités, les équipes disposent d’un espace de travail unique qui reste prêt pour l’audit.',
    stats: [
      { value: '70 %', label: 'De préparation en moins' },
      { value: '100 %', label: 'D’IA validée par un humain' },
      { value: '24/7', label: 'De veille réglementaire' },
    ],
    benefits: [
      {
        title: 'Des flux structurés',
        description:
          'Des processus fluides pour les documents, les évaluations et les CAPA, qui gardent votre équipe alignée.',
      },
      {
        title: 'Accès par rôle',
        description:
          'Des permissions fines pour les administrateurs, les directeurs et les équipes de terrain : chacun voit ce qui le concerne.',
      },
      {
        title: 'Analyses propulsées par l’IA',
        description:
          'Une analyse intelligente de vos données qualité pour repérer les tendances avant qu’elles ne deviennent des problèmes.',
      },
    ],
  },

  /* ─── Contact ────────────────────────────────────────────────────────── */
  contact: {
    illustrationAlt: 'Envoyez-nous un message',
    heading: 'Contactez-nous',
    sub: 'Parlez-nous de vos produits, de vos marchés et de vos enjeux de conformité. Nous vous montrerons ce que Qurelio peut en faire.',
    nameLabel: 'Nom complet',
    namePlaceholder: 'Jeanne Dupont',
    emailLabel: 'Adresse e-mail',
    emailPlaceholder: 'vous@entreprise.com',
    companyLabel: 'Entreprise',
    companyPlaceholder: 'Votre entreprise',
    messageLabel: 'Message',
    messagePlaceholder: 'Parlez-nous de vos besoins...',
    replyNoteLead: 'Nous répondons généralement sous',
    replyNoteStrong: 'un jour ouvré.',
    submit: 'Envoyer le message',
    submitting: 'Envoi…',
    sentTitle: 'Message envoyé !',
    sentBody: 'Merci de nous avoir écrit. Nous revenons vers vous sous un jour ouvré.',
    sendAnother: 'Envoyer un autre message',
    toastSuccess: 'Message envoyé avec succès',
    toastError: 'Envoi impossible. Veuillez réessayer.',
    inquiryFrom: 'Demande de {company}',
  },

  /* ─── Pied de page ───────────────────────────────────────────────────── */
  footer: {
    tagline:
      'Conformité réglementaire, audits et opérations qualité : sereins, clairs, assistés par l’IA, et toujours sous votre contrôle.',
    newsletterLabel: 'Restez informé',
    newsletterEmailLabel: 'Adresse e-mail',
    newsletterPlaceholder: 'vous@entreprise.com',
    subscribe: 'S’abonner',
    subscribed: 'Abonné',
    newsletterNote: 'Un e-mail par mois. Pas de spam, désabonnement en un clic.',
    columns: [
      {
        heading: 'Produit',
        links: ['Fonctionnalités', 'Comment ça marche', 'Pourquoi Qurelio', 'Tarifs'],
      },
      {
        heading: 'Ressources',
        links: [
          'Blog',
          'Centre d’aide',
          'Témoignages clients',
          'Documentation',
          'Sécurité & conformité',
          'Newsletter',
          'Partenaires',
        ],
      },
      {
        heading: 'Entreprise',
        links: ['À propos', 'Carrières', 'Presse', 'Contact'],
      },
    ],
    copyright: '© {year} Qurelio. Propulsé par Pura Solutions.',
    terms: 'Conditions d’utilisation',
    privacy: 'Politique de confidentialité',
  },

  /* ─── Authentification ───────────────────────────────────────────────── */
  auth: {
    layout: {
      badge: 'Des flux qualité prêts pour l’ISO',
    },
    login: {
      heroTitle: 'La gestion de la qualité, simplifiée',
      heroSubtitle:
        'Connectez-vous pour piloter documents, audits, évaluations et actions correctives dans un espace unique.',
      title: 'Connectez-vous à votre compte',
      noAccount: 'Vous n’avez pas de compte ?',
      callout:
        'Utilisez les identifiants de votre organisation. Contactez votre administrateur si vous avez besoin d’un accès.',
      emailLabel: 'Adresse e-mail',
      emailPlaceholder: 'vous@entreprise.com',
      passwordLabel: 'Mot de passe',
      forgotPassword: 'Mot de passe oublié ?',
      remember: 'Se souvenir de moi',
      submit: 'Se connecter',
      submitting: 'Connexion…',
      newOrganization: 'Nouvelle organisation ?',
      errorMissingToken: 'La réponse de connexion ne contient pas de jeton',
      errorNetwork:
        'Impossible de joindre l’API. Si vous utilisez Docker, reconstruisez le frontend et vérifiez que la passerelle est démarrée.',
      errorNotVerified: 'Veuillez d’abord vérifier votre adresse e-mail',
      errorLocked:
        'Ce compte est temporairement verrouillé pendant 30 minutes après trop de tentatives de connexion échouées.',
      errorInvalid: 'E-mail ou mot de passe incorrect. Veuillez réessayer.',
      errorGeneric: 'Échec de la connexion. Veuillez réessayer.',
      welcome: 'Content de vous revoir !',
    },
    registerHub: {
      heroTitle: 'Choisissez comment démarrer',
      heroSubtitle:
        'Choisissez le parcours qui correspond à votre situation. Vous pouvez toujours contacter le support en cas de doute.',
      title: 'Créer un compte',
      sub: 'Sélectionnez l’une des options ci-dessous pour continuer.',
      alreadyHaveAccount: 'Vous avez déjà un compte ?',
      options: [
        {
          emphasis: 'Pour les dirigeants et propriétaires d’organisation',
          title: 'S’inscrire en tant qu’entreprise',
          description:
            'Créez un nouvel espace de travail pour votre organisation, invitez votre équipe et pilotez la qualité ISO au même endroit.',
        },
        {
          emphasis: 'Pour les collaborateurs et membres d’équipe',
          title: 'Rejoindre une entreprise',
          description:
            'Vous avez reçu une invitation ou votre administrateur vous a demandé de créer un compte au sein d’une organisation existante.',
        },
      ],
    },
    registerCompany: {
      heroTitle: 'Votre espace ISO commence ici',
      heroSubtitle:
        'Inscrivez votre organisation pour centraliser documents, audits et non-conformités dans Qurelio.',
      title: 'Créer un compte entreprise',
      alreadyHaveAccount: 'Vous avez déjà un compte ?',
      joiningInstead: 'Vous rejoignez plutôt une entreprise existante ?',
      joinAsMember: 'S’inscrire comme membre d’équipe',
      companyNameLabel: 'Nom de l’entreprise',
      fieldLabel: 'Secteur',
      fieldPlaceholder: 'Sélectionnez un secteur',
      emailLabel: 'E-mail',
      emailPlaceholder: 'entreprise@email.com',
      phoneLabel: 'Numéro de téléphone',
      descriptionLabel: 'Description',
      descriptionPlaceholder:
        'Décrivez brièvement votre entreprise et vos objectifs qualité...',
      capacityLabel: 'Taille de l’entreprise',
      capacityPlaceholder: 'Sélectionnez une taille',
      capacitySuffix: 'employés',
      passwordLabel: 'Mot de passe',
      confirmPasswordLabel: 'Confirmer le mot de passe',
      submit: 'Créer le compte',
      submitting: 'Création du compte…',
      success: 'Compte créé ! Veuillez vérifier votre e-mail.',
      error: 'Échec de l’inscription. Veuillez réessayer.',
      errors: {
        companyName: 'Nom de l’entreprise requis',
        field: 'Secteur requis',
        email: 'E-mail invalide',
        description: 'Description trop courte',
        capacity: 'Taille requise',
        passwordMismatch: 'Les mots de passe ne correspondent pas',
      },
    },
    registerUser: {
      heroTitle: 'Élevez vos standards qualité',
      heroSubtitle:
        'Rejoignez la plateforme pour fluidifier vos processus de management de la qualité.',
      title: 'Créer votre compte personnel',
      alreadyHaveAccount: 'Vous avez déjà un compte ?',
      creatingOrganization: 'Vous créez une nouvelle organisation ?',
      registerCompanyLink: 'Inscrivez votre entreprise',
      firstNameLabel: 'Prénom',
      firstNamePlaceholder: 'Jean',
      lastNameLabel: 'Nom',
      lastNamePlaceholder: 'Dupont',
      emailLabel: 'E-mail',
      emailPlaceholder: 'votre@email.com',
      phoneLabel: 'Numéro de téléphone',
      companyCodeLabel: 'Code d’espace de travail',
      companyCodePlaceholder: 'QUR12AB3',
      passwordLabel: 'Mot de passe',
      roleLabel: 'Sélectionnez votre rôle',
      rolePlaceholder: 'Choisissez un rôle…',
      submit: 'Créer le compte',
      submitting: 'Création du compte…',
      success: 'Compte créé ! Veuillez vérifier votre e-mail.',
      error: 'Échec de l’inscription. Veuillez réessayer.',
      errors: {
        firstName: 'Prénom requis',
        lastName: 'Nom requis',
        email: 'E-mail invalide',
        companyCode:
          'Utilisez le code d’espace de travail de 8 caractères fourni par votre directeur (QUR suivi de 5 lettres ou chiffres)',
        role: 'Veuillez sélectionner un rôle',
      },
    },
    forgotPassword: {
      title: 'Mot de passe oublié ?',
      sub: 'Saisissez l’adresse e-mail associée à votre compte et nous vous enverrons un lien de réinitialisation.',
      emailLabel: 'Adresse e-mail',
      emailPlaceholder: 'exemple@gmail.com',
      submit: 'Envoyer la demande',
      submitting: 'Envoi…',
      remembered: 'Vous vous souvenez de votre mot de passe ?',
      sentTitle: 'Consultez votre boîte mail',
      sentBody: 'Nous avons envoyé un lien de réinitialisation à',
      enterResetCode: 'Saisir le code de réinitialisation',
      returnToSignIn: '← Retour à la connexion',
      success: 'Lien de réinitialisation envoyé par e-mail',
      error: 'Échec de l’envoi de l’e-mail de réinitialisation',
      invalidEmail: 'E-mail invalide',
    },
    resetPassword: {
      back: 'Retour',
      title: 'Définir un nouveau mot de passe',
      sub: 'Saisissez le code reçu par e-mail et créez un nouveau mot de passe.',
      codeLabel: 'Code reçu par e-mail',
      newPasswordLabel: 'Nouveau mot de passe',
      confirmPasswordLabel: 'Confirmer le nouveau mot de passe',
      togglePassword: 'Afficher / masquer le mot de passe',
      passwordHint:
        '8 à 128 caractères, avec une majuscule, une minuscule, un chiffre et un caractère spécial.',
      submit: 'Définir le nouveau mot de passe',
      submitting: 'Réinitialisation…',
      returnToSignIn: 'Retour à la connexion',
      success: 'Mot de passe réinitialisé avec succès !',
      error: 'Échec de la réinitialisation. Veuillez réessayer.',
      errors: {
        code: 'Saisissez le code reçu par e-mail',
        passwordMismatch: 'Les mots de passe ne correspondent pas',
      },
    },
    setupAccount: {
      title: 'Définissez votre mot de passe',
      sub: 'Bienvenue sur Qurelio ! Créez un mot de passe pour',
      newPasswordLabel: 'Nouveau mot de passe',
      confirmPasswordLabel: 'Confirmer le mot de passe',
      passwordHint:
        '8 à 128 caractères, avec une majuscule, une minuscule, un chiffre et un caractère spécial.',
      submit: 'Activer mon compte',
      submitting: 'Activation…',
      backToSignIn: 'Retour à la connexion',
      invalidLink:
        'Lien d’activation invalide. Demandez à votre directeur de renvoyer l’invitation.',
      success: 'Mot de passe défini ! Vous pouvez maintenant vous connecter.',
      error: 'Échec de l’activation. Le lien a peut-être expiré.',
      errors: {
        passwordMismatch: 'Les mots de passe ne correspondent pas',
      },
    },
    verifyOtp: {
      back: '← Retour',
      title: 'Vérifiez votre e-mail',
      intro:
        'Si vous avez fermé cette page auparavant, votre compte est toujours enregistré. Saisissez la même adresse e-mail que lors de l’inscription, puis le code reçu par e-mail (valable 10 minutes). Utilisez <b>Renvoyer le code</b> s’il a expiré.',
      registrationEmailLabel: 'E-mail d’inscription',
      sentTo: 'Nous avons envoyé un code à 6 chiffres à',
      submit: 'Vérifier l’e-mail',
      submitting: 'Vérification…',
      noCode: 'Vous n’avez pas reçu de code ?',
      resendIn: 'Renvoyer dans {time}',
      resend: 'Renvoyer le code',
      changeEmail: 'Changer d’adresse e-mail',
      errorNoEmail: 'Saisissez l’e-mail utilisé lors de l’inscription',
      errorIncomplete: 'Veuillez saisir le code complet à 6 chiffres',
      errorInvalidCode: 'Code invalide ou expiré',
      errorResendNoEmail: 'Saisissez d’abord votre e-mail d’inscription',
      errorResend: 'Échec du renvoi du code',
      resendSuccess: 'Nouveau code envoyé !',
      successCompany:
        'E-mail vérifié. Un super administrateur doit encore approuver votre entreprise avant que vous puissiez vous connecter.',
      successUser:
        'E-mail vérifié. L’administrateur de votre entreprise doit activer votre compte avant que vous puissiez vous connecter.',
    },
    validation: {
      email: 'E-mail invalide',
      passwordMin: 'Au moins 8 caractères',
      passwordMax: '128 caractères maximum',
      passwordComplexity:
        'Utilisez 8 à 128 caractères avec une majuscule, une minuscule, un chiffre et un caractère spécial.',
      passwordMinLogin: 'Le mot de passe doit contenir au moins 6 caractères',
      phoneRequired: 'Téléphone requis',
      phoneInvalid: 'Saisissez un numéro de téléphone valide avec l’indicatif pays.',
      fixHighlighted: 'Veuillez corriger les champs en surbrillance.',
    },
  },

  /* ─── Réserver une démo ──────────────────────────────────────────────── */
  demo: {
    page: {
      backToQurelio: 'Retour à Qurelio',
      eyebrow: 'Réserver une démo',
      title: 'Choisissez un créneau qui vous convient',
      sub: 'Choisissez un créneau disponible et parlez-nous de votre entreprise. Nous confirmons chaque demande sous {hours} heures. Toutes les heures sont affichées dans votre fuseau horaire.',
      loading: 'Chargement des créneaux disponibles…',
      loadFailedTitle: 'Impossible de charger le calendrier',
      loadFailedBody: 'Vérifiez votre connexion et réessayez.',
      emptyTitle: 'Aucun créneau disponible pour le moment',
      emptyBody:
        'De nouveaux créneaux sont ouverts régulièrement. Revenez bientôt, ou écrivez-nous depuis la section contact de la page d’accueil.',
      previousMonth: 'Mois précédent',
      nextMonth: 'Mois suivant',
      weekdays: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
      legendAvailable: 'Jours avec des créneaux disponibles',
      selectDay: 'Sélectionnez un jour',
      pickHighlighted: 'Choisissez un jour mis en évidence dans le calendrier',
      timeAvailable: '{count} créneau disponible',
      timesAvailable: '{count} créneaux disponibles',
      minutesShort: 'min',
      sentTitle: 'Demande envoyée',
      sentBody:
        'Nous avons bien reçu votre demande pour le <b>{slot}</b>. Notre équipe confirmera par e-mail sous {hours} heures, et le créneau vous est réservé jusque-là.',
      sentNote:
        'Rien à préparer d’ici là. La démo sera construite à partir de ce que vous venez de nous dire.',
      pilotTitle: 'À propos du programme pilote',
      pilotBody:
        'Les participants bénéficient d’un accès anticipé, d’un tarif de lancement garanti et d’une session mensuelle avec l’équipe produit. En retour, nous attendons des retours réguliers sur l’usage réel. Nous vous en dirons plus lors de notre échange.',
      backToHome: 'Retour à l’accueil',
      bookAnother: 'Réserver un autre créneau',
    },
    modal: {
      title: 'Réservez votre démo',
      description:
        'Ces quelques questions nous aident à préparer une démo adaptée à votre activité réelle plutôt qu’une présentation générique.',
      slotDuration: '{minutes} minutes · affiché à votre heure locale',
      stepProgress: 'Étape {current} sur {total} : {label}',
      steps: [
        'Vous & votre entreprise',
        'Votre contexte réglementaire',
        'Vos priorités & votre démo',
      ],
      replyNote:
        'Nous répondons sous {hours} heures. Votre créneau est réservé jusque-là.',
      submit: 'Envoyer ma demande',
      q1: 'Nom et prénom',
      q1Placeholder: 'Votre nom',
      q2: 'Votre e-mail professionnel',
      q2Help: 'Aucune newsletter, aucune prospection automatisée.',
      q2Placeholder: 'vous@entreprise.com',
      q2PersonalHint:
        'Une adresse professionnelle nous aide à préparer votre démo, mais celle-ci convient si c’est l’adresse depuis laquelle vous travaillez réellement.',
      q3: 'Nom de l’entreprise',
      q3Placeholder: 'Votre entreprise',
      q4: 'Votre fonction',
      q4Other: 'Veuillez préciser votre fonction',
      q4Consulting:
        'Regardez-vous Qurelio pour votre propre cabinet, pour vos clients, ou les deux ?',
      q5: 'Téléphone / WhatsApp',
      q5Help:
        'Pour convenir plus vite d’un créneau. Indiquez l’indicatif pays, par ex. +216 XX XXX XXX.',
      q6: 'Secteur / Industrie',
      q7: 'Taille de l’entreprise',
      q8Active: 'Marchés sur lesquels vous êtes déjà présent',
      q8Help: 'Au moins une sélection parmi les deux listes de marchés.',
      q8Target: 'Marchés que vous visez d’ici 12 à 24 mois',
      q9: 'Certifications ou normes détenues ou visées',
      q10: 'Combien de produits ou références gérez-vous ?',
      q11: 'Comment gérez-vous la conformité aujourd’hui ?',
      q11Which: 'Lequel ?',
      q12: 'Vos principaux défis au quotidien ({max} réponses maximum)',
      q12Help: '{selected} sur {max} sélectionnés',
      q13: 'Quand souhaitez-vous disposer d’une solution ?',
      q14: 'Votre rôle dans cette décision',
      q15: 'Souhaitez-vous rejoindre le programme pilote ?',
      q15Help:
        'Accès anticipé, tarif de lancement préférentiel et sessions régulières avec l’équipe produit pour contribuer à la suite.',
      q16: 'Y a-t-il un point précis que vous aimeriez voir pendant la démo ?',
      q16Help:
        'Un cas concret, un texte réglementaire, un point de blocage précis. Nous construirons la démo autour.',
      q17: 'Langue souhaitée pour la démo',
      q18: 'Consentement',
      pleaseSpecify: 'Veuillez préciser',
      consentContact:
        'J’accepte que {entity}, éditeur de Qurelio, utilise les informations fournies pour préparer et planifier ma démo et me contacter à ce sujet. Ces données ne sont ni vendues ni partagées avec des tiers. Je peux en demander la rectification ou la suppression à tout moment à {email}.',
      consentMarketing:
        'Je souhaite recevoir les actualités produit et les mises à jour réglementaires de Qurelio.',
      errors: {
        fullName: 'Saisissez votre nom et votre prénom',
        email: 'Saisissez un e-mail professionnel valide',
        companyName: 'Saisissez le nom de votre entreprise',
        role: 'Sélectionnez votre fonction',
        roleOther: 'Veuillez préciser votre fonction',
        consultingScope:
          'Indiquez-nous s’il s’agit de votre propre cabinet, de vos clients, ou des deux',
        field: 'Sélectionnez votre secteur principal',
        companyCapacity: 'Sélectionnez la taille de votre entreprise',
        markets: 'Sélectionnez au moins un marché où vous êtes présent ou que vous visez',
        certificationsOther: 'Veuillez préciser l’autre certification',
        complianceToday: 'Indiquez-nous comment vous gérez la conformité aujourd’hui',
        qmsName: 'Quel QMS ou eQMS utilisez-vous ?',
        challenges: 'Sélectionnez au moins un défi',
        challengesOther: 'Veuillez préciser l’autre défi',
        timeline: 'Indiquez quand vous souhaitez disposer d’une solution',
        decisionRole: 'Sélectionnez votre rôle dans la décision',
        pilotInterest: 'Dites-nous ce que vous pensez du programme pilote',
        consent: 'Le consentement est requis pour traiter votre demande',
        submit: 'Impossible d’envoyer votre demande',
      },
    },
  },

  /* ─── Libellés d’options (valeurs API inchangées) ────────────────────── */
  optionLabels: {
    /* Secteurs d’activité */
    Manufacturing: 'Industrie manufacturière',
    Healthcare: 'Santé',
    Technology: 'Technologie',
    Finance: 'Finance',
    Retail: 'Commerce de détail',
    Construction: 'Construction',
    Education: 'Éducation',
    Logistics: 'Logistique',
    'Food & Beverage': 'Agroalimentaire',
    Other: 'Autre',

    /* Taille d’entreprise */
    '1-10': '1-10',
    '11-50': '11-50',
    '51-200': '51-200',
    '201-500': '201-500',
    '500+': '500+',

    /* Rôles membres d’équipe */
    'Quality Manager': 'Responsable qualité',
    Auditor: 'Auditeur',
    Operator: 'Opérateur',

    /* Fonctions Early Access */
    'Quality Manager / Quality Director (QM)':
      'Responsable qualité / Directeur qualité (QM)',
    'Quality Assurance Manager (QA)': 'Responsable assurance qualité (AQ)',
    'Regulatory Affairs Manager (RA)': 'Responsable affaires réglementaires (AR)',
    'Responsible Pharmacist / Market Release Manager':
      'Pharmacien responsable / Responsable de la libération des lots',
    'Executive management (CEO / Managing Director / owner)':
      'Direction générale (PDG / directeur général / dirigeant)',
    'Production or Operations Manager': 'Responsable production ou opérations',
    'Quality & regulatory consultant': 'Consultant qualité & réglementaire',

    /* Industries */
    'Pharmaceutical industry': 'Industrie pharmaceutique',
    'Cosmetic industry': 'Industrie cosmétique',
    'MedTech (Medical Technology)': 'MedTech (technologies médicales)',

    /* Périmètre du conseil */
    'For my own firm': 'Pour mon propre cabinet',
    'For my clients': 'Pour mes clients',
    Both: 'Les deux',

    /* Taille d’entreprise (Early Access) */
    '1 – 10 employees': '1 – 10 employés',
    '11 – 50': '11 – 50',
    '51 – 200': '51 – 200',
    '201 – 500': '201 – 500',
    'More than 500': 'Plus de 500',

    /* Marchés */
    'Tunisia (domestic market)': 'Tunisie (marché national)',
    'European Union': 'Union européenne',
    'United Kingdom': 'Royaume-Uni',
    'United States': 'États-Unis',
    'Gulf / Saudi Arabia (SFDA, GSO)': 'Golfe / Arabie saoudite (SFDA, GSO)',
    'North Africa (Algeria, Morocco, Libya, Egypt)':
      'Afrique du Nord (Algérie, Maroc, Libye, Égypte)',
    'Sub-Saharan Africa (WAEMU / ECOWAS)': 'Afrique subsaharienne (UEMOA / CEDEAO)',

    /* Certifications */
    'ISO 9001': 'ISO 9001',
    'ISO 13485 (medical devices)': 'ISO 13485 (dispositifs médicaux)',
    GMP: 'BPF (GMP)',
    'GDP (distribution)': 'BPD (distribution)',
    'ISO 22716 (cosmetics)': 'ISO 22716 (cosmétiques)',
    'HACCP / ISO 22000': 'HACCP / ISO 22000',
    'ISO 17025 (laboratories)': 'ISO 17025 (laboratoires)',
    'CE marking': 'Marquage CE',
    'None so far': 'Aucune pour l’instant',

    /* Nombre de produits */
    '1 – 5': '1 – 5',
    '6 – 20': '6 – 20',
    '21 – 100': '21 – 100',
    'More than 100': 'Plus de 100',
    'Not sure / not applicable': 'Je ne sais pas / non applicable',

    /* Gestion actuelle de la conformité */
    'Excel files and shared documents': 'Fichiers Excel et documents partagés',
    'Paper / physical binders': 'Papier / classeurs physiques',
    'A QMS or eQMS already in place': 'Un QMS ou eQMS déjà en place',
    'An external provider / a consultant': 'Un prestataire externe / un consultant',
    'Nothing structured so far': 'Rien de structuré pour l’instant',

    /* Défis */
    'Keeping up with regulatory changes: monitoring is manual and time-consuming':
      'Suivre les évolutions réglementaires : la veille est manuelle et chronophage',
    'Checking whether our products or files meet a given regulatory text':
      'Vérifier si nos produits ou dossiers respectent un texte réglementaire donné',
    'Redoing gap analyses in Excel, for every text and every product':
      'Refaire les analyses d’écarts sous Excel, pour chaque texte et chaque produit',
    'Managing non-conformities and CAPAs with reliable traceability':
      'Gérer les non-conformités et les CAPA avec une traçabilité fiable',
    'Rebuilding an audit or inspection file under time pressure':
      'Reconstituer un dossier d’audit ou d’inspection dans l’urgence',
    'Not missing an expiry or renewal date (certificates, authorisations, qualifications)':
      'Ne pas manquer une date d’expiration ou de renouvellement (certificats, autorisations, qualifications)',
    'Handling several markets with different requirements':
      'Gérer plusieurs marchés aux exigences différentes',
    'Finding the right document, in the right version, at the right time':
      'Trouver le bon document, dans la bonne version, au bon moment',
    'Tracking team training and qualifications':
      'Suivre les formations et les habilitations de l’équipe',

    /* Échéances */
    'Immediately (within a month)': 'Immédiatement (sous un mois)',
    'This quarter (1 to 3 months)': 'Ce trimestre (1 à 3 mois)',
    'In 3 to 6 months': 'Dans 3 à 6 mois',
    'Beyond 6 months / just gathering information for now':
      'Au-delà de 6 mois / simple prise d’informations pour l’instant',

    /* Rôle dans la décision */
    'I decide': 'Je décide',
    'I recommend / I co-decide': 'Je recommande / je co-décide',
    "I'm gathering information, others decide":
      'Je collecte des informations, d’autres décident',

    /* Programme pilote */
    "Yes, I'm interested": 'Oui, cela m’intéresse',
    "Maybe, I'd like to know more": 'Peut-être, j’aimerais en savoir plus',
    "No, I'd just like to see the product": 'Non, je souhaite simplement voir le produit',

    /* Langues de la démo */
    French: 'Français',
    English: 'Anglais',
    Arabic: 'Arabe',
  },
};

export default fr;
