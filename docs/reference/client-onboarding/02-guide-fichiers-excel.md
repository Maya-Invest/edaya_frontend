# Guide des fichiers Excel — import EDAYA

**Public :** établissement client + ops EDAYA  
**Présentation pack :** [presentation-pack-import.md](./presentation-pack-import.md)  
**Délai de retour :** J+3 après envoi du kit  
**Import produit :** Configuration → Outils → Importer

Ce guide détaille **tous** les types d’import actifs de la webapp, plus le fichier complémentaire professeurs principaux.

## Règles générales

1. **Ne pas renommer les en-têtes** de la première ligne (casse et orthographe exactes).
2. Une ligne = un enregistrement. Pas de cellules fusionnées.
3. Identifiants uniques **par école** : voir tableau ci-dessous.
4. Téléphones : format international recommandé (`+225 07 …`).
5. Dates : `AAAA-MM-JJ` (ex. `2013-04-12`).
6. Classes, matières, matricules et codes référencés doivent **exister** (ou être importés avant).
7. Fichiers multi-valeurs (tuteurs) : séparer par `;` (ex. `CI-2025-001;CI-2025-002`).

### Niveau vs classe

Deux colonnes différentes, à ne pas confondre :

| Colonne | Contenu attendu | Où la vérifier |
|---------|-----------------|----------------|
| `niveau` | **Nom** du niveau tel qu'enregistré (`Sixième`) | Configuration → Niveaux, colonne *Nom* |
| `nom` (classes) / `classe` | **Nom complet de la classe** = libellé court du niveau + section | Configuration → Classes |

Chaque niveau porte un **libellé court** (`6ème`) qui sert de racine aux noms de classes : `6ème 1`, `6ème 2` par défaut, ou `6ème A`, `6ème B` si l'établissement préfère les lettres. Reprenez dans vos fichiers les noms exacts affichés dans l'application.

### Clés d’unicité

| Module | Clé |
|--------|-----|
| Élèves | `matricule` |
| Tuteurs / Personnel / Enseignants | `code` |
| Affectations | `code` + `classe` + `matiere` |
| Chapitres | `titre` + `matiere` + `niveau` |
| Paiements | `reference` |
| Professeurs principaux *(complémentaire)* | `classe` (un PP par classe) |

## Ordre d’envoi / d’import

| # | Fichier modèle | Module Importer | Prérequis |
|---|----------------|-----------------|-----------|
| 01 | `01-classes.xlsx` | Classes | Niveaux configurés |
| 02 | `02-matieres.xlsx` | Matières | Classes du niveau existantes |
| 03 | `03-eleves.xlsx` | Élèves | Classes existantes |
| 04 | `04-tuteurs.xlsx` | Tuteurs | Élèves (matricules) |
| 05 | `05-personnel.xlsx` | Personnel | Aucun |
| 06 | `06-enseignants.xlsx` | Enseignants | Aucun |
| 07 | `07-affectations-enseignants.xlsx` | Affectations enseignants | Enseignants + classes + matières |
| 00 | `00-professeur-principal.xlsx` | *Hors Importer — collecte UI* | Enseignants + classes |
| 08 | `08-chapitres.xlsx` | Chapitres | Matières |
| 09 | `09-facturation.xlsx` | Facturation | Élèves + **types de frais** Finances |
| 10 | `10-paiements.xlsx` | Paiements | Facturation (ou assignation équivalente) |

Les modèles (en-têtes + ligne d’exemple) : [`excel-templates/`](./excel-templates/).

---

## 01 — Classes

| Colonne | Obligatoire | Description | Exemple |
|---------|-------------|-------------|---------|
| `nom` | Oui | Nom complet de la classe (libellé du niveau + section) | `6ème 1` |
| `niveau` | Oui | Nom du niveau tel qu'enregistré | `Sixième` |
| `capacite` | Non | Capacité cible | `40` |

---

## 02 — Matières

| Colonne | Obligatoire | Description | Exemple |
|---------|-------------|-------------|---------|
| `nom` | Oui | Libellé matière | `Mathématiques` |
| `niveau` | Oui | Niveau concerné (nom enregistré) | `Sixième` |
| `abbreviation` | Non | Abréviation | `MATH` |
| `coefficient` | Non | Coefficient (> 0) | `3` |

Si template **collège / lycée CI** accepté : ce fichier peut être omis.

---

## 03 — Élèves

| Colonne | Obligatoire | Description | Exemple |
|---------|-------------|-------------|---------|
| `prenom` | Oui | | `Kouadio` |
| `nom` | Oui | | `Yao` |
| `matricule` | Oui | Unique école | `CI-2025-001` |
| `classe` | Oui* | Nom de classe exact | `6ème 1` |
| `date_naissance` | Non | `AAAA-MM-JJ` | `2013-04-12` |
| `genre` | Non | `M` ou `F` | `M` |

\*Classe vide possible seulement si inscription sans affectation acceptée ; pour le go-live, renseigner la classe.

---

## 04 — Tuteurs

| Colonne | Obligatoire | Description | Exemple |
|---------|-------------|-------------|---------|
| `code` | Oui | Identifiant unique | `TUT-001` |
| `prenom` | Oui | | `Aminata` |
| `nom` | Oui | | `Koné` |
| `eleve_matricule` | Oui | Un ou plusieurs matricules | `CI-2025-001` ou `CI-2025-001;CI-2025-002` |
| `email` | Non* | Pour invitation | `parent@email.com` |
| `telephone` | Non* | Canal contact | `+225 07 08 12 34 56` |

\*Au moins un canal recommandé si invitations famille au go-live.

---

## 05 — Personnel

| Colonne | Obligatoire | Description | Exemple |
|---------|-------------|-------------|---------|
| `code` | Oui | Identifiant unique | `PER-KONE-001` |
| `prenom` | Oui | | `Aïcha` |
| `nom` | Oui | | `Koné` |
| `role` | Oui | Voir liste ci-dessous | `Secrétaire` |
| `email` | Non* | Pour invitation | `secretariat@ecole.ci` |
| `telephone` | Non | | `+225 07 20 30 40 50` |

\*Email **fortement recommandé** pour toute personne devant se connecter.

Rôles reconnus sans avertissement (ex.) : `Directeur`, `Directeur adjoint`, `Secrétaire`, `CPE / Vie scolaire`.

---

## 06 — Enseignants

| Colonne | Obligatoire | Description | Exemple |
|---------|-------------|-------------|---------|
| `code` | Oui | Identifiant unique | `ENS-AKA-001` |
| `prenom` | Oui | | `Jean` |
| `nom` | Oui | | `Aka` |
| `email` | Non* | Pour invitation | `j.aka@ecole.ci` |
| `telephone` | Non | | `+225 05 44 22 11 00` |

Matières / classes → fichier **07**. Rôle PP → fichier **00**.

---

## 07 — Affectations enseignants (matière)

| Colonne | Obligatoire | Description | Exemple |
|---------|-------------|-------------|---------|
| `code` | Oui | Code enseignant existant | `ENS-AKA-001` |
| `classe` | Oui | Libellé classe exact | `5eme A` |
| `matiere` | Oui | Libellé matière exact (dans cette classe) | `Mathématiques` |

Une ligne = un trio enseignant / classe / matière.

---

## 00 — Professeurs principaux *(complémentaire)*

**Pas un type du catalogue Importer** aujourd’hui. Fichier de collecte pour appliquer ensuite l’affectation **Professeur principal** (UI enseignant / classe).

| Colonne | Obligatoire | Description | Exemple |
|---------|-------------|-------------|---------|
| `code` | Oui | Code enseignant existant (`06-…`) | `ENS-AKA-001` |
| `classe` | Oui | Nom de classe exact (`01-…`) | `6ème 1` |

Une ligne = un PP pour une classe. Prérequis : enseignants et classes déjà créés.

---

## 08 — Chapitres

| Colonne | Obligatoire | Description | Exemple |
|---------|-------------|-------------|---------|
| `niveau` | Oui | Niveau (nom enregistré) | `Sixième` |
| `matiere` | Oui | Libellé matière | `Mathématiques` |
| `titre` | Oui | Titre du chapitre | `Les fractions` |
| `ordre` | Non | Ordre d’affichage | `1` |
| `description` | Non | Texte libre | `Introduction aux fractions` |

Unicité : `titre` + `matiere` + `niveau`.

---

## 09 — Facturation

Assigne un type de frais à un élève (crée la facture).

| Colonne | Obligatoire | Description | Exemple |
|---------|-------------|-------------|---------|
| `matricule` | Oui | Matricule élève | `CI-2025-001` |
| `type_frais` | Oui | Libellé exact du catalogue Finances | `Scolarité — Collège` |
| `montant` | Non | Montant ; vide = montant par défaut du frais | `150000` |
| `date_echeance` | Non | `AAAA-MM-JJ` | `2025-10-15` |

**Prérequis :** types de frais créés dans Finances (hors import Excel).

---

## 10 — Paiements

| Colonne | Obligatoire | Description | Exemple |
|---------|-------------|-------------|---------|
| `matricule` | Oui | Matricule élève | `CI-2025-001` |
| `type_frais` | Oui | Libellé frais (facture existante) | `Scolarité — Collège` |
| `reference` | Oui | Unique école | `MM-CI-2025-001` |
| `montant` | Non | Vide = solde restant | `75000` |
| `date` | Non | `AAAA-MM-JJ` | `2025-09-15` |
| `mode` | Non | Voir ci-dessous | `mobile_money` |
| `notes` | Non | Texte libre | `Orange Money — T1` |

**Modes acceptés** (aliases FR OK) : `cash` / `espèces`, `card`, `bank_transfer` / `virement`, `mobile_money`, `other`.

**Prérequis :** facturation importée (09) ou assignation manuelle équivalente.

---

## Contrôles avant envoi (client)

- [ ] Aucune ligne sans champs obligatoires
- [ ] Matricules, codes et références uniques dans chaque fichier
- [ ] Noms de classes cohérents entre `01`, `03`, `07`, `00`
- [ ] Noms de matières cohérents entre `02`, `07`, `08`
- [ ] Matricules tuteurs présents dans `03-eleves.xlsx`
- [ ] `type_frais` 09/10 = libellés Finances exacts
- [ ] Au moins un email pour le propriétaire et le secrétariat

## Régénérer les modèles

```bash
bun edaya_web/docs/reference/client-onboarding/excel-templates/generate-client-templates.ts
```
