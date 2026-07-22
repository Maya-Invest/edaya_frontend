# Fixtures — Import **Enseignants**

Fiche enseignant : identité et contact uniquement (pas de classe ni matière dans le fichier).

```bash
bun edaya_web/docs/qa/import-fixtures/teachers/generate-fixtures.ts
```

**Prérequis :** aucun (les affectations se font dans **École → Enseignants → fiche → Affectations**).

| Fichier | Scénario | Résultat attendu |
|---------|----------|------------------|
| `EN01-happy-all-valid.xlsx` | 6 enseignants | 6 enregistrés |
| `EN02-partial-import.xlsx` | 2 OK + prénom manquant | Import partiel (2 créés) |
| `EN03-error-missing-required.xlsx` | Prénom ou nom manquant | 0 enregistré |
| `EN04-invalid-email-warning.xlsx` | E-mail invalide sur une ligne | 2 enregistrés + 1 warning |
| `EN05-error-duplicate-in-file.xlsx` | Même enseignant deux fois | 1 enregistré + 1 erreur |
| `EN06-headers-only.xlsx` | En-têtes seuls | Fichier vide |
| `EN07-trim-and-case.xlsx` | Espaces autour des champs | 1 enregistré |

**Ordre suggéré :** EN06 → EN03 → EN05 → EN04 → EN02 → EN07 → **EN01**.

Colonnes : `prenom`, `nom`, `email`, `telephone`.
