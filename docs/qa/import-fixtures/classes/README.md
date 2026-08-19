# Jeux de données — Import **Classes** (Excel)

Fichiers générés pour la QA manuelle du modal **Configuration → Outils → Importer → Classes**.

## Regénérer les fichiers

```bash
bun edaya_web/docs/qa/import-fixtures/classes/generate-fixtures.ts
```

Les `.xlsx` sont écrits dans `./xlsx/`.

## Prérequis école

- Au moins un **niveau** configuré (**Configuration → Niveaux**).
- Colonnes du fichier : `nom` = nom complet de la classe (`{libellé du niveau} {section}`), `niveau` = **nom** du niveau tel qu'enregistré.

## Convention de nommage

Les noms sont construits comme le fait le produit : la racine est le **libellé court du niveau** (`grade_levels.label`), le suffixe **poursuit la série déjà présente** en base pour ce niveau (chiffres ou lettres ; chiffres par défaut si le niveau n'a encore aucune classe).

Rien n'est deviné à partir du nom du niveau : si un niveau a des classes dont aucune ne commence par son libellé, le générateur échoue avec un message explicite plutôt que de produire des fixtures incohérentes.

Les sections utilisées par les fichiers d'erreur sont prises **après** celles du jeu nominal CL01, ce qui évite les collisions entre packs.

Jeux liés (élèves, tuteurs, paiements…) : voir [README parent](../README.md).

## Fichiers et scénarios

| Fichier | ID test | Scénario | Résultat attendu |
|---------|---------|----------|-------------------|
| `CL01-happy-all-valid.xlsx` | CL1 | Une nouvelle section par niveau de l'école | **Toutes créées** ; 0 erreur |
| `CL02-partial-import.xlsx` | CL8 | 2 sections libres + nom vide + niveau inconnu | **2 créées**, 2 erreurs |
| `CL03-error-unknown-niveau.xlsx` | CL5 | Deux niveaux absents du catalogue | **0 créée** ; suggestions de niveaux |
| `CL04-error-missing-required.xlsx` | CL6 | `nom` ou `niveau` manquant | **0 créée** |
| `CL05-error-invalid-capacity.xlsx` | CL7 | `abc`, `-5`, `0` | **0 créée** |
| `CL06-error-duplicate-in-file.xlsx` | CL4 | Même section deux fois dans le fichier | **1 créée** (1ʳᵉ ligne) ; 2ᵉ doublon fichier |
| `CL07-error-duplicate-existing.xlsx` | CL4b | Une classe déjà en base + une section libre | **1 créée** (la libre) ; l'existante rejetée |
| `CL08-headers-only.xlsx` | CL9 | En-têtes seuls | Erreur **fichier vide** |
| `CL09-trim-and-case.xlsx` | CL10 | Espaces autour du nom et du niveau | **2 créées** (valeurs trimées) |

### CL01 — Rejouer le pack

CL01 ne contient que des sections **libres au moment de la génération**. Après un premier import réussi, elles existent : régénérer les fixtures pour repartir sur les sections suivantes (`bun docs/qa/import-fixtures/classes/generate-fixtures.ts`).

### CL07 — Doublon classe existante

La première ligne reprend une classe **réellement présente** dans la base locale, la seconde une section libre. Aucun prérequis manuel : le générateur lit les deux depuis la base.

## Ordre de test suggéré

```text
CL08 → CL04 → CL05 → CL03 → CL06 → CL07 → CL02 → CL09 → CL01
```

Du plus bloquant au nominal ; **CL01 en dernier** (import structure complète).

## Prochaines séries

Voir le [README parent](../README.md) — élèves, matières, tuteurs, chapitres et paiements sont disponibles.
