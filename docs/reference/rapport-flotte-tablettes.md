# Flottes tablettes Edaya — Côte d’Ivoire et Canada

**Document interne — aide à la décision d’achat**  
**Date :** 12 août 2026  
**Périmètre :** tablettes pour installer `edaya_teacher` et `edaya_guardian`  
**Horizon :** amortissement 3 ans  
**Données concernées :** élèves, notes, absences, familles, frais scolaires (confidentielles)

Les apps Flutter tournent sur Android et iOS. La donnée vit surtout côté serveur, mais la tablette conserve session, jetons et cache : un vol sans MDM est une fuite.

---

## Recommandations

| Marché | Flotte standard (80 %) | Démo / direction | À écarter |
|---|---|---|---|
| **Côte d’Ivoire** | Samsung Galaxy Tab A11+ 11" **6 Go / 128 Go LTE**, coque, MDM Knox | 2–3 iPad A16 ou Tab S10 FE | Tab A11 8,7" 4/64, Fire, no-name |
| **Canada** | **iPad A16 11" 128 Go Wi-Fi**, Apple Business Manager (flotte Edaya) ou Apple School Manager **côté école**, AppleCare+, MDM | Tab A11+ si l’école est déjà Android | Tab S10 FE (plus cher que l’iPad), Fire, BYOD seul |

Le choix inverse selon le pays n’est pas un caprice : en CI le 4G, le prix et le SAV Samsung l’emportent ; au Canada l’écosystème scolaire Apple, le SAV national et (côté client) Apple School Manager l’emportent. **Edaya n’ouvre pas un compte Apple School Manager** : voir § 2.1.

---

## 1. Prix

Prix relevés août 2026. Côte d’Ivoire = TTC retail. Canada = CAD **hors taxes** (ajouter TPS/TVH/TVQ : 5 % AB, 13 % ON, 14,975 % QC).

### Côte d’Ivoire (F CFA)

| Modèle | Achat | TCO 3 ans / appareil | TCO mensuel |
|---|---:|---:|---:|
| Galaxy Tab A11 8,7" 4/64 | 100 000 | ~200 000 | ~5 600 |
| **Galaxy Tab A11+ 6/128** | **198 000** | **~313 000** | **~8 700** |
| Galaxy Tab S10 FE 8/128 | 350 000 | ~485 000 | ~13 500 |
| iPad A16 128 Go Wi-Fi | 320 000 | ~481 000 | ~13 400 |

Sources : Jumia CI, IvoireMobiles, e-bma, Negoce.ci. Volume Samsung Business : −5 à −15 %.

**Collège type CI (20 postes + 2 spares) en A11+ :** ~6,3 millions F CFA sur 3 ans.

### Canada (CAD HT)

| Modèle | Achat | TCO 3 ans / appareil | TCO mensuel |
|---|---:|---:|---:|
| Galaxy Tab A11 8,7" | 199 $ | ~500 $ | ~14 $ |
| Galaxy Tab A11+ 6/128 Wi-Fi | 350 $ | ~700 $ | ~19 $ |
| Galaxy Tab S10 FE 10,9" 128 Go | 700 $ | ~1 200 $ | ~33 $ |
| **iPad A16 128 Go Wi-Fi éducation** | **469 $** | **~830 $** | **~23 $** |

Sources : Apple Education Store (469 $ **si l’école achète** vs 499,99 $ Best Buy / ~500 $ si **Edaya** achète en ABM), Canada Computers / Amazon / CDW pour l’A11+ (250–386 $), Best Buy 699,99 $ et Visions 549 $ en promo pour le S10 FE — **700 $ retenu comme prix liste**.

Le TCO Canada inclut coque, MDM (~4 $/mois), AppleCare+ ou Samsung Care+ 3 ans, enrôlement, spare 10 %. La garantie constructeur canadienne n’est que **12 mois** : sans Care+/AppleCare+, l’amortissement 3 ans n’est pas tenable.

**École type CA (20 postes + 2 spares) en iPad A16 éducation :** ~18 000 $ CAD HT sur 3 ans (~20 300 $ TVH Ontario 13 %).

iPad cellulaire éducation : **669 $** — à réserver aux personnels itinérants, pas à la flotte salle de classe (Wi-Fi scolaire fiable).

---

## 2. MDM — ce que c’est et comment ça s’applique

**MDM** = *Mobile Device Management* (gestion de flotte mobile). Ce n’est pas une app Edaya, ni un antivirus. C’est un **logiciel d’administration** (console web + agent sur chaque tablette) qui permet à Edaya — ou à l’établissement — de piloter à distance les appareils comme un parc informatique, pas comme des tablettes grand public.

Sans MDM, chaque tablette est un téléphone perso : l’enseignant installe TikTok, se connecte à un compte Google/Apple personnel, et si l’appareil est volé personne ne peut l’effacer. Avec de la donnée élèves / notes / frais, ce n’est pas acceptable.

### Ce que le MDM fait concrètement sur une tablette Edaya

| Action | Effet pour Edaya |
|---|---|
| **Enrôlement (enrollment)** | Dès le premier allumage, la tablette se rattache à la console. L’utilisateur ne peut pas « sauter » cette étape (zero-touch / supervised). |
| **Allowlist d’apps** | Seules `edaya_teacher` (et éventuellement `edaya_guardian` démo) sont installables. Pas de Play Store / App Store libre. |
| **Mode kiosque** | L’écran n’affiche qu’Edaya. Pas de navigateur, pas de YouTube, pas de sideload d’APK. |
| **Politiques** | PIN 6 chiffres obligatoire, biométrie, verrouillage après 10 min, Wi-Fi d’école poussé, USB fichier interdit. |
| **Inventaire** | Liste des 20 ou 40 appareils : modèle, OS, dernière connexion, qui l’a. |
| **Wipe distant** | Vol / perte / départ d’un enseignant → effacement à distance (session, cache, apps). C’est *la* raison d’être du MDM ici. |
| **Mises à jour** | Pousser les correctifs OS pendant les 3 ans d’amortissement, sans dépendre de l’enseignant. |
| **Verrouillage / Lost Mode** | Écran bloqué + message « Appareil Edaya — contacter… » |

Le MDM **ne remplace pas** le serveur Edaya : les notes restent dans l’API. Il protège ce qui reste **sur l’appareil** (jeton de session, cache, captures d’écran, Wi-Fi enregistré).

### Comment ça se branche (deux couches)

```text
Achat tablette
    → inscription au portail constructeur (gratuit)
         CI : Knox Mobile Enrollment (Samsung)
         CA flotte Edaya : Apple Business Manager (entreprise)
         CA flotte école : Apple School Manager (l’établissement, pas Edaya)
    → la tablette est assignée à un MDM payant (Hexnode, Knox Manage, Jamf, Mosyle…)
    → au premier allumage, elle télécharge l’agent, les politiques, edaya_teacher
    → prête à donner à l’enseignant
```

- **Portail constructeur** (Knox / ABM / ASM) : dit « cet appareil appartient à telle organisation ». Gratuit. Empêche un reset usine de sortir l’appareil du parc.
- **MDM** (Hexnode, Jamf, etc.) : la console du quotidien. Payant, ~2 000 F/mois/appareil en CI, ~4 $/mois au Canada.

Les deux sont nécessaires. ABM/ASM ou Knox **sans** MDM = l’appareil est « à nous » mais on ne peut pas pousser l’app ni lancer un wipe. MDM **sans** enrollment constructeur = un reset usine vire l’agent, et le voleur a une tablette neuve avec éventuellement encore des fichiers.

### 2.1 Apple School Manager ne s’applique pas à Edaya

**Non.** Apple School Manager (ASM) est un portail **réservé aux établissements d’enseignement** (écoles, commissions scolaires, universités). Edaya est un **éditeur / fournisseur de logiciel** : on n’ouvre pas un compte ASM « au nom du produit ».

| Acteur | Portail Apple | Pourquoi |
|---|---|---|
| **Edaya (Softilab)** | **Apple Business Manager (ABM)** | Entreprise. Flotte démo, tablettes qu’on possède et qu’on prête, apps custom vers *notre* org. |
| **L’établissement client** | **Apple School Manager** | *Leur* parc iPad. Ils enrôlent, ils achètent au tarif éducation, ils installent Edaya. |
| **Edaya en prestataire TI de l’école** | Pas d’ASM Edaya | L’école ouvre ASM et **ajoute Edaya comme administrateur**. Le contrat Apple est au nom du propriétaire des appareils. |

Conséquences :

1. **Tablettes fournies par Edaya** (on achète, on gère, on prête) → **ABM** + notre MDM. Tarif **entreprise / retail** (~500 $), pas le tarif éducation 469 $ (réservé aux écoles).
2. **Tablettes déjà chez l’école** → l’école a (ou ouvre) **ASM** + *leur* MDM. Edaya livre l’app (App Store, ou Custom App ciblée sur l’Organization ID ASM du client). On ne gère leur flotte que par contrat d’infogérance.
3. **App Edaya** : un compte **Apple Developer** suffit. Les apps App Store sont achetables en volume dans ASM *et* ABM. Option −50 % éducation (20+ licences) pour *l’acheteur école*, pas pour Edaya.
4. Ne pas s’inscrire à ASM en se faisant passer pour une école : rejet à la vérification, hors contrat Apple.

Samsung équivalent : Edaya utilise **Knox** / Android Enterprise **en tant qu’entreprise**, pas un programme « school » Google.

### Trois modes d’application pour Edaya

| Mode | Qui possède la tablette | Réglage MDM | Quand l’utiliser |
|---|---|---|---|
| **A. Flotte Edaya / école (retenu)** | Edaya ou l’établissement | *Fully managed* (Android) / *Supervised* (iPad) + kiosque | Tablettes qu’on met à disposition — cas du présent rapport |
| **B. BYOD enseignant** | Téléphone perso | *Work profile* Android : seul le « profil travail » (Edaya) est gérable / effaçable | Complément, pas le standard : moins de contrôle, hétérogène |
| **C. Démo commerciale** | Edaya | Même kiosque + compte démo + timeout court | Prêt à un établissement : wipe dès le retour |

Pour le rapport d’achat, on parle du **mode A**.

### Produits cités — rôle de chacun

| Nom | Rôle | Marché |
|---|---|---|
| **Knox / Knox Manage** | Sécurité matérielle Samsung + MDM Samsung | CI (flotte A11+) |
| **Android Enterprise** | Cadre Google : kiosque, work profile, zero-touch | CI, et Canada si Android |
| **Apple Business Manager (ABM)** | Portail Apple **entreprise** : enrollment supervised de *notre* flotte | Edaya (Softilab) |
| **Apple School Manager (ASM)** | Portail Apple **éducation** : même rôle, mais pour l’établissement | Client école, pas Edaya |
| **Jamf / Mosyle** | MDM iPad, très répandu dans les écoles CA | Canada |
| **Hexnode / Scalefusion** | MDM Android + iOS, un seul outil pour les deux pays | CI et CA |
| **Intune** | MDM Microsoft, souvent déjà payé via M365 Éducation | Canada si l’école a M365 |

**Knox n’est pas un MDM à lui seul** : c’est le coffre-fort matériel Samsung. Knox Manage (ou Hexnode branché sur Knox) est le MDM.

### Scénario type : vol d’une tablette teacher

1. L’enseignant signale la perte (procédure sous 1 h).
2. Ops ouvre la console MDM, identifie l’appareil dans l’inventaire.
3. **Lock** immédiat (inutilisable), puis **wipe** (session Edaya + cache détruits).
4. Si l’appareil est Samsung + Knox Guard : même un reset usine le laisse bloqué.
5. On sort un spare déjà enrôlé ; l’enseignant se reconnecte à Edaya (les notes sont sur le serveur).

Sans MDM, l’étape 3 n’existe pas : la tablette ouverte reste avec le compte teacher jusqu’à expiration de session.

### Ce que le MDM ne fait pas

- Il ne chiffre pas la base Edaya (c’est le backend).
- Il ne remplace pas un PIN / biométrie (il les *impose*).
- Il n’empêche pas une capture d’écran si on n’a pas interdit cette fonction dans les politiques.
- Un wipe exige que l’appareil se connecte un jour (Wi-Fi ou 4G) — d’où le LTE en CI.

---

## 3. Sécurité

Cinq couches, **toutes** obligatoires, CI comme Canada.

| Couche | Mesure | Si absente |
|---|---|---|
| Matériel | Knox (Samsung) ou Secure Enclave (Apple) ; chiffrement ; biométrie + PIN 6 chiffres | Dump / vol = fuite brute |
| MDM | Fully managed / supervised ; allowlist Edaya ; wipe distant ; lock 10 min | Appareil perdu reste ouvert |
| Application | Session courte, cache chiffré, pas de logs PII, pinning TLS | Jeton réutilisable hors MDM |
| Réseau | HTTPS only ; pas de Wi-Fi ouvert | Interception hotspot |
| Organisation | Inventaire, NDA utilisateur, vol/perte sous 1 h, spare déjà enrôlé | Délai de wipe trop long |

**Politique minimale :** aucune tablette Edaya ne sort sans MDM enrôlé (zero-touch), PIN, magasin d’apps verrouillé, et test de wipe distant. Les comptes démo ne restent jamais connectés sur un prêt établissement.

### Spécifique Canada

- **PIPEDA** (fédéral, activités commerciales).
- **Québec — Loi 25 :** évaluation des facteurs relatifs à la vie privée (EFVP) **avant** déploiement MDM, et avant tout transfert de renseignements personnels **hors Québec** (Ontario ou USA inclus).
- Autres provinces : FIPPA (BC), MFIPPA (Ontario), lois scolaires provinciales — l’établissement reste responsable.
- **Apple School Manager** : s’applique à **l’école cliente**, pas à Edaya. Apple est sous-traitant ; l’établissement reste responsable des données élèves. Edaya : **Apple Business Manager** pour sa propre flotte (voir § 2.1).
- Jamf School convient au K-12. Pour du **personnel avec facturation / dossiers familles**, viser Jamf Pro, Hexnode ou Intune (M365 Éducation).
- Exiger un DPA MDM et une résidence des télémétries documentée.

### Spécifique Côte d’Ivoire

- Knox Mobile Enrollment + Knox Guard (verrouillage même après reset).
- 4G obligatoire : le Wi-Fi établissement est souvent trop faible pour un wipe ou une sync de politiques.
- SAV Apple hors Abidjan trop mince pour en faire la flotte.

---

## 4. Fiabilité — amortissement 3 ans

L’appareil doit encore être **patché, fluide et réparable localement** en 2029.

| Risque | A11 8,7" | A11+ | S10 FE | iPad A16 |
|---|---|---|---|---|
| Correctifs OS | 7 ans Samsung | 7 ans | 7 ans | 5–7 ans iPadOS |
| RAM année 3 | Faible (4 Go) | Correct (6 Go) | Bon (8 Go) | Bon (8 Go) |
| Stockage | Critique (64 Go) | OK 128 + microSD | OK 128 + microSD | OK 128, pas de SD |
| SAV CI | Samsung 24 mois | Samsung 24 mois | Samsung 24 mois | Réseau Apple mince |
| SAV Canada | Care+ conseillé | Care+ ~90 $ / 3 ans | Care+ ~190 $ / 3 ans | AppleCare+ + Apple Store / Best Buy |

Règles communes : coque + film dès J1, spare **10 %** (min. 1), pas de charge 24/7 (batterie).

**4 Go / 64 Go saturent en 12–18 mois** (OS + cache Flutter) : incompatible avec 3 ans.

---

## 5. Caractéristiques clés à exiger

| Critère | Seuil Edaya | CI | Canada |
|---|---|---|---|
| Updates OS | ≥ 5 ans (idéalement 7) | Samsung 7 ans | iPadOS 5–7 ans |
| MDM / enrollment | Zero-touch + wipe | Knox / Hexnode | **ABM (Edaya)** ou **ASM (école)** + Jamf / Mosyle / Hexnode |
| RAM / stockage | **6 Go / 128 Go min.** | A11+ 6/128 | iPad 8/128 |
| Écran | 10–11 pouces | 11" A11+ | 11" iPad |
| Batterie | Journée scolaire | 7 040 mAh + coupures | Journée ; froid hivernal |
| Réseau | Selon le Wi-Fi local | **LTE obligatoire** | Wi-Fi ; LTE pour itinérants |
| Protection 3 ans | Coque + SAV | Garantie 24 mois | **AppleCare+ / Care+** |
| Mode kiosque | Apps Edaya only | COSU Android | iPad supervised, allowlist |
| Langue | — | FR | FR + EN (Québec / ROC) |

---

## 6. Pourquoi pas le même modèle partout

| Critère | Côte d’Ivoire | Canada |
|---|---|---|
| Prix | A11+ ~198 000 F vs iPad ~320 000 F | iPad éducation **469 $** vs S10 FE **700 $** |
| Réseau | 4G plus fiable que le Wi-Fi école | Wi-Fi école généralement suffisant |
| SAV 3 ans | Samsung 24 mois, pièces locales | Garantie 12 mois → Care+ ; Apple Store national |
| Enrollment | Knox mature | **ASM chez le client** ; **ABM chez Edaya** |
| Culture établissement | Android / prix | iPad déjà dans le K-12 et le privé |

Le Tab S10 FE au Canada (~700 $) coûte **plus cher que l’iPad éducation** sans gagner l’écosystème scolaire : à écarter comme flotte.

---

## 7. Scénarios de volume (modèle retenu)

Spare = 10 %, minimum 1.

### Côte d’Ivoire — Tab A11+

| Scénario | Postes | Unités achetées | TCO 3 ans (ordre de grandeur) |
|---|---:|---:|---:|
| Kit démo | 5 | 6 | ~1,3 M F |
| Pilote | 10 | 11 | ~2,4 M F |
| Collège type | 20 | 22 | ~6,3 M F |
| Lycée / campus | 40 | 44 | ~12,5 M F |

### Canada — iPad A16 éducation (HT)

| Scénario | Postes | Unités achetées | TCO 3 ans (ordre de grandeur) |
|---|---:|---:|---:|
| Kit démo | 5 | 6 | ~4 500 $ |
| Pilote | 10 | 11 | ~8 300 $ |
| École type | 20 | 22 | ~18 000 $ |
| Campus | 40 | 44 | ~36 000 $ |

MDM, coques, Care+/AppleCare+ et enrôlement inclus. Forfaits SIM et formation exclus.

---

## 8. Décision

| Question | Côte d’Ivoire | Canada |
|---|---|---|
| 80 % de la flotte ? | Tab A11+ 6/128 LTE | iPad A16 128 Go Wi-Fi éducation |
| Coût réel / appareil / 3 ans | ~313 000 F, pas 198 000 F | ~830 $ HT, pas 469 $ |
| Données protégées ? | Oui si Knox + wipe | Oui si ABM ou ASM + MDM + EFVP Québec |
| Tient 3 ans ? | Oui (7 ans OS, SAV 24 mois) | Oui **avec** AppleCare+ |
| 5G / cellulaire ? | LTE suffit | Wi-Fi suffit ; cellulaire 669 $ edu si itinérant |

---

## 9. Prochaines étapes

| # | Côte d’Ivoire | Canada |
|---|---|---|
| 1 | Devis Samsung Business CI (A11+ LTE, volume, Knox Suite) | Devis Apple Education / CDW / Compugen (iPad A16 128 Go) |
| 2 | MDM Hexnode ou Knox Manage + test de wipe | Ouvrir **Apple Business Manager** (Edaya) ; ASM seulement si l’école gère sa flotte |
| 3 | Image kiosque `edaya_teacher` | Catalogue MDM / app custom (pas de compte Apple perso) |
| 4 | NDA utilisateur + procédure vol | EFVP Loi 25 si Québec ; DPA MDM |
| 5 | Pilote 4 semaines, 1 établissement | Pilote 4 semaines, 1 école (FR ou EN) |

Hors scope de ce document : forfaits SIM, formation utilisateurs, assurance hors Care+/AppleCare+.
