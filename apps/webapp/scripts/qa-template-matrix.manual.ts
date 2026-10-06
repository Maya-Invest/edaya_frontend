/**
 * Matrice QA complète — endpoints + actions par module.
 * Utilisée par generate-qa-template.ts
 *
 * Auth and onboarding run in their dedicated executable suite.
 * Tools and imports are required production scenarios.
 */
export type QaModule =
	| 'Auth'
	| 'Onboarding'
	| 'Shell'
	| 'Dashboard'
	| 'Compte'
	| 'École'
	| 'Classes'
	| 'Finance'
	| 'Configuration'
	| 'Outils & imports'
	| 'Permissions';

export interface QaTemplateRow {
	module: QaModule;
	endpoint: string;
	action: string;
}

const B = 'http://localhost:5173';

function rows(module: QaModule, endpoint: string, actions: string[]): QaTemplateRow[] {
	return actions.map(action => ({ module, endpoint, action }));
}

export const QA_TEMPLATE_MATRIX_MANUAL: QaTemplateRow[] = [
	// ─── Auth ───────────────────────────────────────────────────────────
	...rows('Auth', `${B}/`, ['Redirect vers /login']),
	...rows('Auth', `${B}/login`, [
		'Affichage page connexion',
		'Connexion OTP — succès',
		'Connexion OTP — erreur visible (message rouge inline)',
		'Onglet signup (si activé)',
		'Banner API indisponible',
	]),
	...rows('Auth', `${B}/login/demo`, [
		'Affichage comptes démo (dev)',
		'Connexion via picker démo',
	]),
	...rows('Auth', `${B}/invite/[token]`, [
		'Token invalide / expiré / révoqué',
		'Acceptation invitation (signup ou login)',
	]),

	// ─── Onboarding ─────────────────────────────────────────────────────
	...rows('Onboarding', `${B}/onboarding`, ['Redirect vers ?step=1']),
	...rows('Onboarding', `${B}/onboarding?step=1`, [
		'Formulaire profil école — validation',
		'Submit étape 1',
		'Draft persisté après refresh',
		'Type période trimestre — dates auto',
		'Type période semestre — dates S1 et S2 auto',
		'Ajout / suppression période',
	]),
	...rows('Onboarding', `${B}/onboarding?step=2`, [
		'Sélection template structure',
		'Drawer chapitres',
		'Submit étape 2',
	]),
	...rows('Onboarding', `${B}/onboarding?step=3`, [
		'Ajouter invites staff',
		'Skip invites',
		'Validation email',
	]),
	...rows('Onboarding', `${B}/onboarding?step=4`, [
		'Résumé provision',
		'Fin onboarding → application',
	]),
	...rows('Onboarding', `${B}/onboarding`, ['Navigation steps limitée à maxReachedStep']),

	// ─── Shell ──────────────────────────────────────────────────────────
	...rows('Shell', '(app)', [
		'Non connecté → redirect /login',
		'Onboarding incomplet → redirect /onboarding',
		'Sidebar — modules visibles selon permissions',
		'URL sans permission → redirect /dashboard',
		'Sélecteur école',
		'Sélecteur année scolaire',
		'Changement langue FR/EN',
		'Avatar — modal profil',
		'Logout',
		'?modal=account-profile ouvre profil',
	]),

	// ─── Dashboard ──────────────────────────────────────────────────────
	...rows('Dashboard', `${B}/dashboard`, [
		'Chargement KPIs',
		'Cartes actions cliquables',
		'États empty / erreur',
	]),

	// ─── Compte ─────────────────────────────────────────────────────────
	...rows('Compte', `${B}/account/inbox`, [
		'Liste notifications',
		'Ouvrir un message',
		'Marquer lu',
	]),
	...rows('Compte', `${B}/account/inbox/[deliveryId]`, ['Détail message sélectionné']),
	...rows('Compte', `${B}/account/notifications`, [
		'Charger préférences',
		'Sauver préférences',
	]),

	// ─── École ──────────────────────────────────────────────────────────
	...rows('École', `${B}/school/students`, [
		'Liste — affichage',
		'Recherche',
		'Filtre classe',
		'Filtre statut (actif / inactif / archivé)',
		'Tri colonnes',
		'Pagination / charger plus',
		'Créer élève (modal)',
		'Export sélection',
	]),
	...rows('École', `${B}/school/students/[id]/profile`, [
		'Ouvrir drawer profil',
		'Éditer profil',
		'Photo',
		'Notes pédagogiques — créer / éditer',
		'Changer classe',
		'Changer statut élève',
	]),
	...rows('École', `${B}/school/students/[id]/grades`, ['Consulter notes']),
	...rows('École', `${B}/school/students/[id]/attendance`, ['Consulter / enregistrer absence']),
	...rows('École', `${B}/school/students/[id]/incidents`, ['Consulter / créer incident']),
	...rows('École', `${B}/school/students/[id]/finances`, ['Consulter lignes finance']),
	...rows('École', `${B}/school/students/[id]/report-card`, ['Générer / publier bulletin']),
	...rows('École', `${B}/school/students/[id]/enrollments`, ['Historique inscriptions']),
	...rows('École', `${B}/school/students/[id]/documents`, ['Historique documents', 'Générer / télécharger / annuler']),

	...rows('École', `${B}/school/guardians`, [
		'Liste — affichage / recherche',
		'Créer tuteur',
	]),
	...rows('École', `${B}/school/guardians/[id]`, [
		'Drawer — éditer',
		'Élèves liés',
	]),

	...rows('École', `${B}/school/staff`, ['Liste', 'Créer personnel']),
	...rows('École', `${B}/school/staff/[id]/profile`, ['Éditer profil']),
	...rows('École', `${B}/school/staff/[id]/permissions`, ['Assigner permissions']),
	...rows('École', `${B}/school/staff/[id]/assignments`, ['Assignations classe/rôle']),

	...rows('École', `${B}/school/teachers`, ['Liste', 'Créer enseignant']),
	...rows('École', `${B}/school/teachers/[id]/profile`, ['Éditer profil']),
	...rows('École', `${B}/school/teachers/[id]/assignments`, ['CRUD affectations matière/classe']),
	...rows('École', `${B}/school/teachers/[id]/availability`, ['CRUD indisponibilités']),
	...rows('École', `${B}/school/teachers/[id]/timetable`, ['Emploi du temps']),
	...rows('École', `${B}/school/teachers/[id]/evaluations`, ['Évaluations']),
	...rows('École', `${B}/school/teachers/[id]/family-feedback`, ['Retour des familles']),
	...rows('École', `${B}/school/teachers/[id]/documents`, ['Documents']),
	...rows('École', `${B}/school/teacher-assignments`, [
		'Redirect vers /configuration/tools/teacher-assignments',
	]),

	...rows('École', `${B}/school/calendar`, [
		'Liste événements',
		'Filtres type',
		'Créer / éditer événement',
	]),
	...rows('École', `${B}/school/activities`, [
		'Liste — filtres catégorie',
		'Créer / éditer activité',
	]),
	...rows('École', `${B}/school/activities/[id]/profile`, ['Onglet profil']),
	...rows('École', `${B}/school/activities/[id]/students`, ['Onglet participants']),
	...rows('École', `${B}/school/activities/[id]/classes`, ['Onglet classes liées']),

	...rows('École', `${B}/school/announcements`, [
		'Liste — filtre statut',
		'Créer annonce',
	]),
	...rows('École', `${B}/school/announcements/[id]`, [
		'Éditer',
		'Gérer cibles',
		'Retirer destinataire',
		'Publier',
	]),

	...rows('École', `${B}/school/family-feedback`, [
		'Liste — filtre statut',
		'Créer campagne',
	]),
	...rows('École', `${B}/school/family-feedback/[id]/setup`, [
		'Paramétrage',
		'Éditer calendrier',
		'Désigner modérateur',
		'Planifier / ouvrir / clôturer',
	]),
	...rows('École', `${B}/school/family-feedback/[id]/audience`, ['Audience']),
	...rows('École', `${B}/school/family-feedback/[id]/moderation`, ['Thèmes et commentaires']),
	...rows('École', `${B}/school/family-feedback/[id]/results`, ['Agrégats et publication']),

	...rows('École', `${B}/school/events`, ['Liste incidents', 'Créer incident']),
	...rows('École', `${B}/school/events/[id]`, ['Éditer', 'Résoudre incident']),

	// ─── Classes ────────────────────────────────────────────────────────
	...rows('Classes', `${B}/classes/[classId]`, ['Redirect vers /students']),
	...rows('Classes', `${B}/classes/[classId]/students`, [
		'Liste élèves classe',
		'Filtres',
		'Créer élève (scope classe)',
	]),
	...rows('Classes', `${B}/classes/[classId]/students/[id]/profile`, ['Profil élève']),
	...rows('Classes', `${B}/classes/[classId]/students/[id]/grades`, ['Notes']),
	...rows('Classes', `${B}/classes/[classId]/students/[id]/attendance`, ['Assiduité']),
	...rows('Classes', `${B}/classes/[classId]/students/[id]/incidents`, ['Incidents']),
	...rows('Classes', `${B}/classes/[classId]/students/[id]/finances`, ['Finances']),
	...rows('Classes', `${B}/classes/[classId]/students/[id]/report-card`, ['Bulletin']),
	...rows('Classes', `${B}/classes/[classId]/students/[id]/enrollments`, ['Inscriptions']),
	...rows('Classes', `${B}/classes/[classId]/students/[id]/documents`, ['Documents']),

	...rows('Classes', `${B}/classes/[classId]/timetable`, [
		'Vue semaine',
		'Navigation semaine',
	]),
	...rows('Classes', `${B}/classes/[classId]/timetable/[sessionId]/details`, ['Détails séance']),
	...rows('Classes', `${B}/classes/[classId]/timetable/[sessionId]/attendance`, ['Présence séance']),
	...rows('Classes', `${B}/classes/[classId]/timetable/[sessionId]/logbook`, ['Cahier de texte séance']),

	...rows('Classes', `${B}/classes/[classId]/teaching`, [
		'Liste matières',
		'Recherche',
		'Offer / toggle matière',
	]),
	...rows('Classes', `${B}/classes/[classId]/teaching/[id]/progression`, ['Chapitres / progression']),
	...rows('Classes', `${B}/classes/[classId]/teaching/[id]/logbook`, ['Logbook matière']),

	...rows('Classes', `${B}/classes/[classId]/evaluations`, [
		'Liste — filtre type',
		'Créer évaluation',
		'Éditer / supprimer',
	]),
	...rows('Classes', `${B}/classes/[classId]/evaluations/[id]/details`, ['Métadonnées évaluation']),
	...rows('Classes', `${B}/classes/[classId]/evaluations/[id]/grading`, ['Saisie notes']),

	...rows('Classes', `${B}/classes/[classId]/attendance`, [
		'Liste jours',
		'Filtre completion',
	]),
	...rows('Classes', `${B}/classes/[classId]/attendance/[dayId]`, ['Prendre / éditer présence jour']),

	...rows('Classes', `${B}/classes/[classId]/report-cards`, [
		'Liste — filtre statut',
		'Générer bulletin élève',
		'Générer bulletin classe',
		'Publier',
	]),
	...rows('Classes', `${B}/classes/[classId]/report-cards/[id]`, [
		'Détail bulletin',
		'Commentaire',
		'Publier',
	]),

	// ─── Finance ──────────────────────────────────────────────────────────
	...rows('Finance', `${B}/finance`, ['Redirect vers /finance/billing']),
	...rows('Finance', `${B}/finance/fees`, [
		'Liste frais',
		'Filtre catégorie',
		'Créer frais (nom, montant, échéances %)',
		'Éditer / archiver frais',
	]),
	...rows('Finance', `${B}/finance/billing`, [
		'Liste facturations',
		'Assigner frais à élève',
		'Ouvrir drawer facturation',
	]),
	...rows('Finance', `${B}/finance/billing/[id]`, [
		'Enregistrer paiement',
		'Imputer le solde',
	]),
	...rows('Finance', `${B}/finance/payment`, [
		'Ledger paiements',
		'Recherche',
		'Filtre statut',
		'Filtre classe',
		'Extourner un paiement',
	]),
	...rows('Finance', `${B}/finance/reconciliation`, [
		'Rapprochement financier',
	]),

	// ─── Configuration ──────────────────────────────────────────────────
	...rows('Configuration', `${B}/configuration`, ['Redirect vers /configuration/subjects']),
	...rows('Configuration', `${B}/configuration/school`, [
		'Éditer nom, timezone, ville, type école',
	]),
	...rows('Configuration', `${B}/configuration/academic`, [
		'Créer année scolaire',
		'Publier année',
		'Filtres liste',
	]),
	...rows('Configuration', `${B}/configuration/period-grid`, [
		'Sélecteur année',
		'Définitions périodes (wizard)',
	]),
	...rows('Configuration', `${B}/configuration/other`, [
		'Liste des catalogues',
	]),
	...rows('Configuration', `${B}/configuration/grade-levels`, [
		'Liste niveaux',
		'Créer niveau',
	]),
	...rows('Configuration', `${B}/configuration/grade-levels/[id]`, ['Drawer — éditer / supprimer']),
	...rows('Configuration', `${B}/configuration/classes`, [
		'Liste classes',
		'Créer classe',
	]),
	...rows('Configuration', `${B}/configuration/classes/[id]/profile`, ['Profil classe — éditer']),
	...rows('Configuration', `${B}/configuration/classes/[id]/assignments`, ['Affectations staff']),
	...rows('Configuration', `${B}/configuration/subjects`, [
		'Liste matières',
		'Filtre niveau',
		'Créer matière',
	]),
	...rows('Configuration', `${B}/configuration/subjects/[id]/progression`, ['Chapitres CRUD']),
	...rows('Configuration', `${B}/configuration/subjects/[id]/logbook`, ['Redirection catalogue vers progression']),
	...rows('Configuration', `${B}/configuration/subjects/level/[level]`, [
		'Redirect vers /configuration/subjects?gradeLevel=[id]',
	]),
	...rows('Configuration', `${B}/configuration/other/grade-scales`, [
		'Liste barèmes',
		'CRUD barème',
	]),
	...rows('Configuration', `${B}/configuration/report-cards`, [
		'Liste définitions bulletins',
		'Créer / supprimer / publier',
	]),
	...rows('Configuration', `${B}/configuration/report-cards/[id]`, ['Drawer définition']),
	...rows('Configuration', `${B}/configuration/notifications`, ['Templates notifications école']),
	...rows('Configuration', `${B}/configuration/other/discipline`, [
		'Catalogue disciplinaire',
		'Filtre kind',
		'CRUD entrée',
	]),
	...rows('Configuration', `${B}/configuration/other/subject-categories`, [
		'Liste catégories',
		'CRUD catégorie',
	]),
	...rows('Configuration', `${B}/configuration/permission-profiles`, [
		'Catalogue des profils',
		'Recherche nom / description',
		'CRUD entrée',
	]),
	...rows('Configuration', `${B}/configuration/tools`, [
		'Hub outils visible',
		'Modal import données',
	]),
	...rows('Configuration', `${B}/configuration/tools/teacher-assignments`, [
		'Hub affectations enseignant (deep link)',
		'Créer / supprimer affectation',
	]),
	...rows('Configuration', `${B}/configuration/tools`, [
		'Planning EDT — générer brouillon',
		'Planning EDT — publier',
	]),

	// ─── Outils & imports ───────────────────────────────────────────────
	...rows('Outils & imports', `${B}/configuration/tools`, [
		'Import élèves — template, validation, import, rapport',
		'Import tuteurs',
		'Import personnel',
		'Import enseignants',
		'Import classes',
		'Import matières',
		'Import affectations enseignant',
		'Import chapitres',
		'Import facturation (prérequis: frais créés)',
		'Import paiements (prérequis: facturation élève)',
	]),

	// ─── Permissions ────────────────────────────────────────────────────
	...rows('Permissions', '(multi-comptes)', [
		'Compte enseignant — sidebar filtrée',
		'Compte éducateur — sidebar filtrée',
		'URL finance sans droit → /dashboard',
		'Boutons CRUD masqués (PermissionGate)',
	]),
];
