# SOLUTION DE GESTION SCOLAIRE

**Fiche N° ____________**  **Date : ____________**

# Fiche d’ouverture d’établissement

Document à retourner sous **3 jours ouvrés**. L’équipe EDAYA crée l’école et les profils à partir de ces informations, puis envoie les invitations de connexion.

Champs alignés sur le wizard / import EDAYA (webapp).

---

## 1 · Établissement


|                          |                                |
| ------------------------ | ------------------------------ |
| **Nom officiel**         | obligatoire                    |
| **Sigle/nom commercial** | Optionnel                               |
| **Pays**                 | obligatoire                    |
| **Ville**                | obligatoire                    |
| **Fuseau horaire IANA**  | Optionnel                      |
| **Adresse / téléphone**  | Optionnel |
| **Site web**             | Optionnel                      |
| **réseaux sociaux**      | Optionnel                      |


---



## 2 · Contact et gouvernance


|                                                      |                                        |
| ---------------------------------------------------- | -------------------------------------- |
| **Décisionnaire** (nom, fonction, tél.)              |                                        |
| **Référent projet** (quotidien)                      |                                        |
| **Compte propriétaire** (nom, prénom, **email pro**) | Premier admin école (`ownerSubjectId`) |


**Invitations staff au go-live** — profils wizard uniquement (détail aussi dans `05-personnel.xlsx`) :


| Profil EDAYA       | Nom | Email |
| ------------------ | --- | ----- |
| Directeur adjoint  |     |       |
| Directeur d’études |     |       |
| CPE / Vie scolaire |     |       |
| Secrétaire         |     |       |
| Comptable          |     |       |
| Informaticien      |     |       |


Rôles reconnus à l’**import** personnel (ex.) : `Directeur`, `Directeur adjoint`, `Secrétaire`, `CPE / Vie scolaire`, …

---



## 3 · Calendrier scolaire


|                                 |                        |
| ------------------------------- | ---------------------- |
| **Année scolaire**              | Ex. `2025 — 2026`      |
| **Début / fin d’année**         | ________ / ________    |
| **Type de période**             | ☐ Trimestre ☐ Semestre |
| **Période active au démarrage** | À publier en premier   |
| **Date de bascule souhaitée**   |                        |



| Période | Libellé | Début | Fin | Active ? |
| ------- | ------- | ----- | --- | -------- |
| 1       |         |       |     | ☐        |
| 2       |         |       |     | ☐        |
| 3       |         |       |     | ☐        |
| 4       |         |       |     | ☐        |


---



## 4 · Structure pédagogique

**Modèles structure wizard** (templates CI) :  
☐ **Collège** (6ème → 3ème) ☐ **Lycée** (2nde → Terminale) ☐ Les deux

> Hors Côte d’Ivoire : pas de template structure prêt — niveaux / classes / matières via configuration + Excel.


| Niveau (ex. `6eme`, `5eme`, `2nda`…) | Nb classes | Capacité |
| ------------------------------------ | ---------- | -------- |
|                                      |            |          |
|                                      |            |          |
|                                      |            |          |
|                                      |            |          |


**Matières :** ☐ Catalogue template CI ☐ Import `02-matieres.xlsx`  
**Affectations enseignants (classe + matière) :** ☐ Oui (`07-…`) ☐ Plus tard  
**Emplois du temps (onglet classe) au jour 1 :** ☐ Oui ☐ Plus tard

---



## 5 · Effectifs et accès


|                                                 |                         |
| ----------------------------------------------- | ----------------------- |
| **Élèves approx.**                              |                         |
| **Invitation comptes élèves**                   | ☐ Oui ☐ Non / plus tard |
| **Tuteurs / portail parents au go-live**        | ☐ Oui ☐ Plus tard       |
| **Enseignants approx.**                         |                         |
| **Invitation enseignants (portail) au go-live** | ☐ Oui ☐ Plus tard       |


---



## 6 · Fonctionnalités jour 1

Cocher ce qui doit être opérationnel au démarrage (reste = plus tard). Libellés = navigation EDAYA.

**École**


|               |                           |             |
| ------------- | ------------------------- | ----------- |
| ☐ Élèves      | ☐ Tuteurs                 | ☐ Personnel |
| ☐ Enseignants | ☐ Calendrier              | ☐ Activités |
| ☐ Annonces    | ☐ Événements (discipline) |             |


**Classes**


|                   |                   |                              |
| ----------------- | ----------------- | ---------------------------- |
| ☐ Élèves (classe) | ☐ Emploi du temps | ☐ Enseignement / progression |
| ☐ Évaluations     | ☐ Présences       | ☐ Bulletins                  |


**Finances**


|                  |               |             |
| ---------------- | ------------- | ----------- |
| ☐ Types de frais | ☐ Facturation | ☐ Paiements |


**Configuration** (si besoin dès le jour 1)


|                        |                    |                     |
| ---------------------- | ------------------ | ------------------- |
| ☐ École                | ☐ Année / périodes | ☐ Niveaux           |
| ☐ Classes              | ☐ Matières         | ☐ Échelles de notes |
| ☐ Modèles de bulletins | ☐ Notifications    | ☐ Discipline        |
| ☐ Outils (import)      |                    |                     |


---



## 7 · Fichiers joints

Voir [présentation pack import](./presentation-pack-import.md) + [guide Excel](./02-guide-fichiers-excel.md).

| Fichier | Joint | Quand |
|---------|-------|-------|
| `01-classes.xlsx` | ☐ | Nomenclature classes / hors template |
| `02-matieres.xlsx` | ☐ | Hors catalogue template CI |
| `03-eleves.xlsx` | ☐ | Effectifs au go-live |
| `04-tuteurs.xlsx` | ☐ | Tuteurs / portail parents |
| `05-personnel.xlsx` | ☐ | Toujours (owner + staff) |
| `06-enseignants.xlsx` | ☐ | Enseignants au go-live |
| `07-affectations-enseignants.xlsx` | ☐ | Liens enseignant ↔ classe ↔ matière |
| `00-professeur-principal.xlsx` | ☐ | PP connus (application UI) |
| `08-chapitres.xlsx` | ☐ | Programme / chapitres |
| `09-facturation.xlsx` | ☐ | Finances jour 1 |
| `10-paiements.xlsx` | ☐ | Paiements après facturation |

Colonnes = import **Configuration → Outils → Importer** (sauf `00` = collecte PP).

---



## 8 · Finances *(si frais / facturation / paiements au jour 1)*


|                                                      |                                                                                                                    |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Devise**                                           | Ex. FCFA                                                                                                           |
| **Catalogue de frais** (libellés, montants, niveaux) |                                                                                                                    |
| **Modes de paiement**                                | ☐ Espèces (`cash`) ☐ Carte (`card`) ☐ Virement (`bank_transfer`) ☐ Mobile Money (`mobile_money`) ☐ Autre (`other`) |
| **Qui consulte / encaisse**                          | Profil(s) staff                                                                                                    |


---



## 9 · Contraintes ops


|                                         |                     |
| --------------------------------------- | ------------------- |
| **Domaine email staff**                 | Ex. `@ecole-xyz.ci` |
| **Emails personnels staff autorisés ?** | ☐ Oui ☐ Non         |
| **Qui invite après go-live ?**          |                     |
| **Support / horaires**                  |                     |
| **Commentaires**                        |                     |


---



## CLAUSE D’OUVERTURE

La présente fiche autorise EDAYA à provisionner l’établissement et à envoyer les invitations aux adresses indiquées. Elle ne modifie pas les conditions commerciales déjà convenues. Les fonctions non cochées en section 6 pourront être activées ultérieurement.

---



## 10 · Validation


|                                      |     |
| ------------------------------------ | --- |
| **Nom du responsable établissement** |     |
| **Fonction**                         |     |
| **Signature**                        |     |
| **Date**                             |     |



|                               |     |
| ----------------------------- | --- |
| **Nom du représentant EDAYA** |     |
| **Fonction**                  |     |
| **Signature**                 |     |
| **Date**                      |     |


---

EDAYA · Solution de gestion scolaire  *Notre savoir-faire, votre devenir*