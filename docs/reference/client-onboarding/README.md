# Kit d’onboarding client EDAYA

Documents opérationnels pour ouvrir un nouvel établissement lorsque le SaaS est déjà déployé et que **l’équipe EDAYA provisionne manuellement** l’école et les profils.

## Contenu du kit

| Document | Public | Usage |
|----------|--------|-------|
| [01 — Questionnaire d’ouverture](./01-questionnaire-ouverture-etablissement.md) | Client | Fiche d’intake (même style que la manifestation d’intérêt) |
| [Présentation pack import](./presentation-pack-import.md) | Client + Ops | Vue d’ensemble de tous les modules d’import |
| [02 — Guide fichiers Excel](./02-guide-fichiers-excel.md) | Client + Ops | Colonnes obligatoires, exemples, délai de retour |
| [03 — Runbook provisionnement](./03-runbook-provisionnement.md) | Interne EDAYA | Ordre de création, QA, invitations, go-live |
| [04 — Kickoff & sign-off](./04-kickoff-et-signoff.md) | CSM + Client | Agenda 45–60 min + checklist de validation |

## Pack Excel

Modèles à envoyer au client (en-têtes + ligne d’exemple) — **11 fichiers** :

[`excel-templates/`](./excel-templates/)

Régénérer :

```bash
bun edaya_web/docs/reference/client-onboarding/excel-templates/generate-client-templates.ts
```

Les colonnes sont alignées sur l’import produit (**Configuration → Outils → Importer**) et les fixtures QA [`docs/qa/import-fixtures/`](../../qa/import-fixtures/README.md).  
Exception : `00-professeur-principal.xlsx` (collecte PP, application UI).

## Parcours résumé

```text
Qualification → Questionnaire + Excel → Kickoff → Provisionnement EDAYA → Sign-off → Invitations → Go-live
```

Ordre technique d’import : **classes → matières → élèves → tuteurs → personnel → enseignants → affectations → (PP UI) → chapitres → facturation → paiements**.
