# Runbook provisionnement — onboarding client EDAYA

**Public :** ops / CSM EDAYA (interne)  
**Prémisse :** SaaS déployé ; provisionnement **manuel** (pas de dépendance au wizard self-serve public).  
**Entrées :** [questionnaire](./01-questionnaire-ouverture-etablissement.md) rempli + pack Excel validé.

## 1. Pré-requis

- [ ] Contrat / qualification commerciale OK
- [ ] Questionnaire blocs A–H (et I si finance J1) complets
- [ ] Fichiers Excel reçus et passés au contrôle §3
- [ ] Accès ops à l’environnement prod (ou staging miroir) avec droits de création école / import / invitation
- [ ] Email du **compte propriétaire** vérifié et joignable

## 2. Ordre de provisionnement

```text
School + owner
  → AcademicYear + AcademicPeriods (publish active)
  → Grade levels / structure (template CI ou import)
  → Classes
  → Subjects
  → Students (+ enrollments)
  → Guardians (+ links)
  → Staff
  → Teachers
  → Teacher assignments
  → QA interne
  → Invitations (staff → teachers → guardians/students)
  → Validation client + go-live
```

### Étape 1 — École et propriétaire

1. Créer la `School` : `name`, `timeZone`, `country`, `city`, `type`.
2. Créer le StaffMember propriétaire (prénom, nom, email) et lier `ownerSubjectId`.
3. Vérifier que le propriétaire peut s’authentifier (invitation ou lien auth selon procédure ops).

### Étape 2 — Année et périodes

1. Créer l’année scolaire (`name`, `startDate`, `endDate`).
2. Créer toutes les périodes (trimestres ou semestres) avec dates.
3. **Publier** la période active au démarrage (bloc C du questionnaire).

### Étape 3 — Structure

**Si template CI accepté** (`college` / `lycee`) :

1. Appliquer le template structure (`ci-college` / `ci-lycee`) avec niveaux, `classCount`, `capacity`.
2. Ajuster la nomenclature des classes si le client a fourni `01-classes.xlsx`.

**Si programme spécifique :**

1. S’assurer que les niveaux existent (libellés exacts).
2. Importer `01-classes.xlsx` puis `02-matieres.xlsx`.

### Étape 4 — Personnes et liens

Importer dans l’ordre (Configuration → Outils → Importer) — voir [présentation pack](./presentation-pack-import.md) :

| Ordre | Fichier | Contrôle immédiat |
|-------|---------|-------------------|
| 1 | Classes (si pas déjà fait) | Nb classes = attendu |
| 2 | Matières | Matières par niveau OK |
| 3 | Élèves | Matricules uniques ; classes résolues |
| 4 | Tuteurs | Liens matricules OK |
| 5 | Personnel | Codes uniques ; rôles OK |
| 6 | Enseignants | Codes uniques |
| 7 | Affectations | Trios code/classe/matière OK |
| 8 | PP (`00-…`) via UI | Une classe = un PP |
| 9 | Chapitres | Titres uniques par matière/niveau |
| 10 | Facturation | Factures créées ; types de frais OK |
| 11 | Paiements | Références uniques ; soldes OK |

### Étape 5 — Invitations

Ordre d’envoi :

1. Owner (si pas déjà connecté)
2. Staff jour 1 (secrétariat, CPE, compta, études, IT selon bloc H)
3. Enseignants (si J1)
4. Tuteurs / élèves (si portail famille / comptes élèves J1)

Consigne client : premier login sous **48 h** ; signaler les emails en échec à ops@ / CSM.

## 3. Contrôle qualité fichiers (avant import)

- [ ] En-têtes exacts (voir [guide Excel](./02-guide-fichiers-excel.md))
- [ ] Pas de doublons `matricule` / `code` dans un même fichier
- [ ] Références croisées : classes élèves ⊂ classes ; matricules tuteurs ⊂ élèves ; affectations ⊂ enseignants + classes + matières
- [ ] Emails owner + staff critiques présents et valides
- [ ] Fuseau IANA valide (ex. `Africa/Abidjan`)
- [ ] Dates année / périodes cohérentes (début < fin, périodes dans l’année)

## 4. Checklist QA post-provisionnement (interne)

| Contrôle | OK |
|----------|----|
| École visible ; `timeZone` correct | ☐ |
| Owner connecté ; droits élevés | ☐ |
| Année créée ; ≥ 1 période **publiée** | ☐ |
| Effectifs par classe ≈ fichier client (± écarts documentés) | ☐ |
| Au moins 1 profil par rôle critique J1 (direction, secrétariat, + CPE/compta si cochés) | ☐ |
| Enseignants + affectations si notes/EDT J1 | ☐ |
| Tuteurs liés si famille J1 | ☐ |
| Aucun email critique en bounce après invitation test | ☐ |
| Modules hors J1 non promis au client | ☐ |

## 5. Go-live

1. CSM envoie le récap + [checklist sign-off](./04-kickoff-et-signoff.md).
2. Client valide (sign-off).
3. Envoi des invitations restantes.
4. Session formation courte (cf. agenda kickoff / formation).
5. Ouvrir le ticket support / canal Slack/WhatsApp dédié.
6. Clôturer l’onboarding quand les [critères de fin](#6-critères-onboarding-terminé) sont verts.

## 6. Critères « onboarding terminé »

- [ ] École accessible, owner connecté
- [ ] Année + période active publiée
- [ ] Classes et effectifs cohérents avec les fichiers
- [ ] Profils critiques J1 créés et invitables / connectés
- [ ] Invitations livrées ; au moins un premier login validé côté client
- [ ] Checklist modules jour 1 signée

## 7. Escalades

| Problème | Action |
|----------|--------|
| Template CI insuffisant / curriculum custom | Import Excel + ticket produit si gaps |
| Doublons / données sales | Retour client avec lignes en erreur ; pas d’import forcé |
| Email invitation non reçu | Vérifier spam, domaine, renvoyer ; fallback OTP |
| Client demande branding / multi-campus | Reporter en P2 / roadmap ; ne pas bloquer le go-live |

## 8. Références techniques

- Domaine école : `edaya_backend/package/domain-core/src/domain/school/school.ts`
- Wizard / API onboarding (référence, usage ops possible) : `edaya_backend/apps/api/src/routes/onboarding.routes.ts`
- Fixtures import QA : `edaya_web/docs/qa/import-fixtures/README.md`
- Templates structure CI : `@edaya/fixtures/onboarding`
