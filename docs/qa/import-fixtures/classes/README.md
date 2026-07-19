# Jeux de données — Import **Classes** (Excel)

Fichiers générés pour la QA manuelle du modal **Configuration → Outils → Importer → Classes**.

## Regénérer les fichiers

```bash
bun edaya_web/docs/qa/import-fixtures/classes/generate-fixtures.ts
```

Les `.xlsx` sont écrits dans `./xlsx/`.

## Prérequis école

- Des **niveaux** configurés : `6ème`, `5ème`, `4ème`, `3ème` (vérifier les libellés exacts dans **Configuration → Niveaux**).
- Colonnes du fichier : `nom` = libellé complet de la classe (ex. `6ème A`), `niveau` = niveau scolaire (ex. `6ème`).

## Convention de nommage

Noms **réalistes type collège ivoirien** : `{niveau} {section}` — ex. `6ème A`, `5ème B`, `3ème C`.

Les fichiers d'erreur utilisent des sections **J, K, L, F, D** pour limiter les conflits avec le jeu nominal **CL01**.

Jeux liés (élèves, tuteurs, paiements…) : voir [README parent](../README.md).

## Fichiers et scénarios

| Fichier | ID test | Scénario | Résultat attendu |
|---------|---------|----------|-------------------|
| `CL01-happy-all-valid.xlsx` | CL1 | 18 classes (6ème A→I, 5ème A→E, 4ème B/C, 3ème A/B) | **18 classes créées** ; 0 erreur |
| `CL02-partial-import.xlsx` | CL8 | 3 OK (`6ème J`, `5ème F`, `4ème D`) + nom vide + niveau inconnu | **3 créées**, 2 erreurs |
| `CL03-error-unknown-niveau.xlsx` | CL5 | Niveaux `7ème Z`, `Terminale X` | **0 créée** ; suggestions de niveaux |
| `CL04-error-missing-required.xlsx` | CL6 | `nom` ou `niveau` manquant | **0 créée** |
| `CL05-error-invalid-capacity.xlsx` | CL7 | `abc`, `-5`, `0` | **0 créée** |
| `CL06-error-duplicate-in-file.xlsx` | CL4 | `6ème J` en double dans le fichier | **1 créée** (1ʳᵉ ligne) ; 2ᵉ doublon fichier |
| `CL07-error-duplicate-existing.xlsx` | CL4b | `6ème A` déjà en base + `6ème J` nouvelle | **1 créée** (`6ème J`) ; `6ème A` rejetée |
| `CL08-headers-only.xlsx` | CL9 | En-têtes seuls | Erreur **fichier vide** |
| `CL09-trim-and-case.xlsx` | CL10 | Espaces autour de `6ème K` / `6ème` | **2 créées** (`6ème K`, `6ème L`) |

### CL01 — École déjà peuplée

Si vous avez **déjà importé** des classes (`6ème A`, etc.), CL01 échouera en doublons. Deux options :

1. Tester CL01 sur une **école vierge** (recommandé pour le jeu complet).
2. Supprimer les classes existantes, ou adapter les noms dans Excel vers des sections libres (`6ème J`, …).

### CL07 — Doublon classe existante

Utilise `6ème A` comme classe déjà présente. Si votre école n'a pas encore `6ème A`, importer d'abord CL01 ou créer `6ème A` manuellement, puis lancer CL07.

## Ordre de test suggéré

```text
CL08 → CL04 → CL05 → CL03 → CL06 → CL07 → CL02 → CL09 → CL01
```

Du plus bloquant au nominal ; **CL01 en dernier** (import structure complète).

## Prochaines séries

Voir le [README parent](../README.md) — élèves, matières, tuteurs, chapitres et paiements sont disponibles.
