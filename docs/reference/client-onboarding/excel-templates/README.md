# Modèles Excel client — import EDAYA

Fichiers prêts à envoyer au client : **en-têtes d’import** + **une ligne d’exemple** (à remplacer ou supprimer).

Présentation : [../presentation-pack-import.md](../presentation-pack-import.md)  
Colonnes : [../02-guide-fichiers-excel.md](../02-guide-fichiers-excel.md)

## Régénérer

```bash
bun edaya_web/docs/reference/client-onboarding/excel-templates/generate-client-templates.ts
```

Prérequis : dépendances webapp (module `xlsx` via `apps/webapp`).

## Fichiers produits

| Fichier | Feuille | Module Importer |
|---------|---------|-----------------|
| `00-professeur-principal.xlsx` | ProfPrincipaux | *Complémentaire (UI PP)* |
| `01-classes.xlsx` | Classes | Classes |
| `02-matieres.xlsx` | Matieres | Matières |
| `03-eleves.xlsx` | Eleves | Élèves |
| `04-tuteurs.xlsx` | Tuteurs | Tuteurs |
| `05-personnel.xlsx` | Personnel | Personnel |
| `06-enseignants.xlsx` | Enseignants | Enseignants |
| `07-affectations-enseignants.xlsx` | Affectations | Affectations enseignants |
| `08-chapitres.xlsx` | Chapitres | Chapitres |
| `09-facturation.xlsx` | Facturation | Facturation |
| `10-paiements.xlsx` | Paiements | Paiements |
