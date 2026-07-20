# Fixtures — Import **Enseignants**

Enseignants du collège — matières alignées sur le catalogue SU01.

```bash
bun edaya_web/docs/qa/import-fixtures/teachers/generate-fixtures.ts
```

**Prérequis :** matières importées ([SU01](../subjects/xlsx/SU01-happy-all-valid.xlsx)) pour que la colonne `matieres` soit résolue sans warning.

| Fichier | Scénario | Résultat attendu |
|---------|----------|------------------|
| `EN01-happy-all-valid.xlsx` | 6 enseignants ; Kouadio Yao = Maths + PC en **5ème A** | 6 enregistrés ; 2 affectations pour Yao |
| `EN02-partial-import.xlsx` | 2 OK + matière inconnue + prénom manquant | Import partiel + warnings |
| `EN03-error-missing-required.xlsx` | Prénom ou nom manquant | 0 enregistré |
| `EN04-unknown-subject-warning.xlsx` | `Espagnol`, `Allemand` hors catalogue | 2 enregistrés + warnings |
| `EN05-multi-subjects.xlsx` | `Mathématiques; Physique-Chimie` en **5ème A** | 2 affectations créées |
| `EN06-error-duplicate-in-file.xlsx` | Même enseignant deux fois | 1 enregistré |
| `EN07-headers-only.xlsx` | En-têtes seuls | Fichier vide |
| `EN08-trim-and-case.xlsx` | Espaces autour des champs | 1 enregistré |
| `EN09-multi-subjects-without-class.xlsx` | Kouadio Yao : `Maths; Physique-Chimie` **sans classe** | 2 enregistrés + warning `multiSubjectsNeedClass` ; 0 affectation auto |

**Ordre suggéré :** EN07 → EN03 → EN06 → EN04 → EN09 → EN02 → EN05 → EN08 → **EN01**.

### Test manuel EN09 (cas Kouadio Yao)

**Prérequis :** SU01 importé (catalogue matières).

1. Outils → Import → **Enseignants** → `EN09-multi-subjects-without-class.xlsx`
2. **Validation** — vérifier pour les lignes 2 et 3 :
   - warning : *« Plusieurs matières détectées — renseignez la colonne classe… »*
   - import toujours possible (non bloquant)
3. **Exécuter** l'import → 2 enseignants créés
4. Fiche **Kouadio Yao** → onglet **Affectations** :
   - **0 affectation** créée par l'import
   - profil : hint `subjectId` = Mathématiques seulement
5. (Contrôle positif) Réimporter la même ligne avec `classe` = `5ème A` → 2 affectations (Maths + PC)

L'affectation à une classe se fait via la colonne `classe` (une affectation par matière **proposée dans cette classe**).

> **Physique-Chimie** n'existe qu'à partir de la **5ème** (SU01). Si `classe` = `6ème A` et `matieres` contient `Physique-Chimie`, seule la matière disponible en 6ème sera affectée (warning à la validation).
