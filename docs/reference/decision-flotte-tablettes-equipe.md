# Flotte tablettes Edaya — plan détaillé équipe

**Complément du mandat 1-pager.**  
**Lot 1 verrouillé le 16 août 2026 :** 50 unités · mixte CA+CI · propriété **Edaya** · **64 Go min** · **3 ans min** · **pas de pilote client**

Préférence iPad conservée au Canada. En CI le défaut est Tab A11+ LTE (3 ans + 4G + SAV). iPad partout = option devis C.

Edaya = **ABM** (pas Apple School Manager). L’école cliente n’est pas propriétaire de ce lot.

---

## 0. Décisions verrouillées / encore ouvertes

| Statut | Item |
|---|---|
| **Lock** | Mixte Canada + Côte d’Ivoire |
| **Lock** | Propriété Edaya (ABM + Knox + MDM Edaya) |
| **Lock** | Horizon 3 ans minimum (OS, SAV, MDM) |
| **Lock** | Stockage 64 Go minimum |
| **Lock** | 50 unités d’un coup, pas de pilote 5+45 |
| **Ouvert** | Split 50 : défaut **25 CA / 25 CI** |
| **Ouvert** | CI en A11+ (défaut) vs iPad (devis C) |
| **Ouvert** | iPad 10 64 Go vs A16 128 Go au Canada (A16 si on veut marge OS 2029) |

Sans pilote école : les **2 premières unités** servent de **lab wipe** (prélevées sur les 50), puis les 48 partent. Pas un pilote établissement.

---

## 1. Ce qu’on décide (et ce qu’on ne décide pas)

| Déjà tranché | Encore ouvert |
|---|---|
| Mixte CA+CI, 50 u., Edaya proprio, 64 Go, 3 ans | Split 25/25 vs autre |
| Pas de pilote client | CI = A11+ (défaut) vs iPad |
| Pas d’iPad 8 / pas de 32 Go | iPad 10 vs A16 au Canada |
| ABM + MDM Edaya | Forfait SIM CI, couleurs |

Les apps Flutter tournent sur **iOS et Android**. Le mixte iPad CA + Android CI est volontaire (réseau + SAV), pas un lock-in produit.

---

## 2. Cible 4 Go / 32 Go et « iPad dès la 8e gen »

La cible est compréhensible (coût). Elle **ne se traduit pas** en un iPad 8e gen 32 Go achetable en 2026 pour 3 ans.

### Générations iPad « normal » (pas Air / Pro)

| Gen | Année | Puce | RAM | Stockage min | En 2026 | Pour Edaya 2026–2029 |
|---|---|---|---|---|---|---|
| **8** | 2020 | A12 | **3 Go** | **32 Go** (dernier 32 Go) | ~6 ans, fin de cycle iPadOS | **Non** — RAM, 32 Go, plus de MAJ de sécurité sur 3 ans |
| **9** | 2021 | A13 | **3 Go** | **64 Go** | ~5 ans | Limite — 3 Go, support OS court |
| **10** | 2022 | A14 | **4 Go** | **64 Go** | ~4 ans | **Oui, plancher** — colle à la cible RAM |
| **11 (A16)** | 2025 | A16 | 6–8 Go | **128 Go** | Neuf | **Oui, zéro risque OS** — au-dessus de la cible stockage |

Faits utiles pour l’équipe :

- **Aucun iPad neuf n’existe en 32 Go** depuis la 9e gen.
- L’iPad 8 est le seul de la liste en 32 Go, et il a **3 Go de RAM**, pas 4.
- iPadOS + mise à jour OTA + cache d’app : **32 Go saturent** (échec de MAJ, pas de marge Flutter).
- Un iPad 8 acheté en 2026 a déjà consommé l’essentiel de sa fenêtre de correctifs Apple. L’amortissement 3 ans exige des **patchs jusqu’en 2029**.

**Traduction de la cible :**

- 4 Go RAM → **iPad 10e gen** (pas 8, pas 9).
- 32 Go → **abandonner** ; plancher **64 Go** (10e) ou **128 Go** (A16).
- « À partir de la 8e gen » → **plancher réel = 10e gen** pour une flotte neuve/recond. 2026.

---

## 3. Options (même grille que le 1-pager, avec le pourquoi)

### Option A — iPad 10e gen 64 Go (recommandé) ou iPad A16 128 Go

**Pour :** préférence iPad ; 4 Go (10e) ; écran 10,9–11" ; ABM + MDM ; SAV Apple Canada ; app iOS identique à Android.

**Contre :** en CI, prix et SAV Apple plus faibles que Samsung ; Wi-Fi only sur le modèle éducation/retail courant (cellulaire = +200 $).

**Quand A16 plutôt que 10e :** si on refuse tout risque de fin de support OS avant 2029, ou si on veut 128 Go sans débat. Surcoût ~100–200 $/u.

### Option B — iPad 8/9 reconditionné 32/64 Go

**Pour :** ticket d’entrée bas, « dès la 8e gen ».

**Contre :** 3 Go RAM ; 32 Go intenable ; garantie recond. courte ; batterie déjà cyclée ; **correctifs OS insuffisants sur 3 ans** ; incompatible avec donnée confidentielle (appareil non patché = surface d’attaque).

**Verdict équipe :** acceptable **uniquement** en maquette interne jetable, **pas** en flotte client / enseignants.

### Option C — Samsung Galaxy Tab A11+ 6 Go / 128 Go LTE

**Pour :** ~198 000 F CI ; 7 ans d’Android ; Knox ; 4G (Wi-Fi école CI souvent faible) ; garantie 24 mois CI ; au-dessus de 4/32.

**Contre :** moins « vitrine » qu’un iPad au Canada ; MDM Knox/Hexnode à industrialiser.

**Verdict :** **concurrent chiffré obligatoire en CI**. Au Canada, seulement si le plafond budgétaire casse l’iPad 10e.

---

## 4. Prix — lot 55 unités (50 + 10 % spare)

Ordres de grandeur **août 2026**. Relancer devis avant commande. Canada = CAD **HT** (+ taxes 5–15 %). CI = F CFA TTC retail.

### Canada (Edaya achète = tarif entreprise, pas 469 $ éducation école)

| Poste | A · iPad 10 64 Go ~350 $ | A+ · iPad A16 128 Go ~500 $ | C · A11+ ~350 $ |
|---|---:|---:|---:|
| Matériel 55 u. | 19 250 | 27 500 | 19 250 |
| Coques + films 55 × ~50 $ | 2 750 | 2 750 | 2 200 |
| AppleCare+ / Care+ 3 ans | ~5 500 | ~5 500 | ~5 000 |
| MDM 50 × 4 $ × 36 mois | 7 200 | 7 200 | 7 200 |
| Enrôlement 50 × 25 $ | 1 250 | 1 250 | 1 250 |
| **TCO 3 ans** | **~36 000 $** | **~44 000 $** | **~35 000 $** |
| **Par poste / mois** | ~20 $ | ~24 $ | ~19 $ |

Le tarif **469 $ éducation** ne s’applique **pas** à Edaya (réservé ASM / école).

### Côte d’Ivoire

| Poste | A · iPad A16 128 Go ~320 000 F | C · Tab A11+ ~198 000 F |
|---|---:|---:|
| Matériel 55 u. | 17,6 M F | 10,9 M F |
| Coques 55 | ~1,4 M | ~0,8 M |
| MDM 50 × 2 000 F × 36 | 3,6 M | 3,6 M |
| Setup | ~0,5 M | ~0,4 M |
| **TCO 3 ans** | **~23 M F** | **~16 M F** |

iPad 8/9 recond. en CI : prix bas, **à écarter** pour la même raison OS / 32 Go / SAV.

---

## 5. Caractéristiques à exiger (grille d’achat)

| Critère | Plancher lot 1 | Pourquoi |
|---|---|---|
| OS encore patché en 2029 | iPad **10e+** ou Android **5–7 ans de MAJ** | Donnée confidentielle |
| RAM | **4 Go min.** (6 Go mieux) | Flutter + OS en année 3 |
| Stockage | **64 Go min.** (128 Go recommandé) | 32 Go = MAJ impossibles |
| Écran | 10–11" | Saisie absences / notes |
| Réseau | CA : Wi-Fi · CI : **LTE** | Wipe MDM et sync |
| Enrollment | **ABM** (flotte Edaya) ou ASM (flotte école) | Reset usine ≠ sortie du parc |
| MDM | Fully managed / supervised + kiosque Edaya | Wipe, allowlist, inventaire |
| PIN + biométrie | PIN 6 chiffres | Vol / oubli |
| Protection | Coque + film dès J1 | Chutes classe |
| Garantie 3 ans | AppleCare+ / Care+ / Samsung 24 mois CI | Garantie CA constructeur = **12 mois** |

---

## 6. Sécurité — qui fait quoi

Les notes restent **sur le serveur Edaya**. La tablette garde session + cache. Sans MDM, un vol = compte teacher ouvert.

| Couche | Mesure lot 1 |
|---|---|
| Matériel | iPad Secure Enclave **ou** Samsung Knox |
| Portail | **ABM si Edaya possède** · ASM si l’école possède |
| MDM | Hexnode / Jamf / Knox Manage / Mosyle — **un** outil |
| Politique | Kiosque `edaya_teacher`, pas d’App Store libre, lock 10 min, wipe testé |
| App | Session courte, pas de logs PII (backlog mobile) |
| Org | Inventaire, étiquette, procédure vol **sous 1 h**, spare déjà enrôlé |

**ABM vs ASM (rappel) :** Edaya n’ouvre **pas** Apple School Manager. Si on **prête** nos iPad → ABM. Si l’école **a déjà** des iPad → ils installent Edaya via **leur** ASM/MDM ; on livre l’app (App Store ou custom app).

Québec : EFVP Loi 25 **avant** MDM si données de résidents QC.

---

## 7. Fournisseurs

### Canada

| Besoin | Qui |
|---|---|
| iPad neuf volume + ABM | Apple Business, CDW, Compugen, Softchoice |
| Recond. **certifié** (10e gen) | Apple Refurbished, revendeur Apple Authorized |
| MDM | Hexnode, Jamf, Mosyle, Intune (si M365) |
| Coques volume | OtterBox / STM via le même revendeur |

Éviter : marketplace sans facture société, iPad 8 « comme neuf » sans date de batterie ni éligibilité ABM.

### Côte d’Ivoire

| Besoin | Qui |
|---|---|
| Samsung volume + Knox | Samsung Business CI, revendeur agréé Abidjan |
| iPad | Revendeur Apple agréé (Negoce.ci et équivalents) — vérifier facture + IMEI |
| MDM | Hexnode ou Knox Manage (même console que CA si mixte) |

Règle : **numéro de série dans ABM/Knox à l’achat**, pas après coup. Acheter « grand public » puis enrôler à la main = reset usine qui sort l’appareil du parc.

### Chine — partenaires officiels (et pourquoi ce n’est pas le canal du lot 50)

Des **partenaires officiels** existent en Chine. Acheter *en Chine* pour déployer *au Canada / en CI* casse en général : garantie, ROM, enrollment ABM, Play Store.

| Type | Officiel en Chine | Utilisable pour Edaya CA+CI ? |
|---|---|---|
| Apple DEP / ABM | Oui — liste Apple Support [118207](https://support.apple.com/en-us/118207) | Non comme source du lot 50. L’ABM Edaya doit être lié au **revendeur du pays de déploiement**. iPad « gray » Chine ≠ zero-touch Canada. |
| Samsung Knox | Oui — [samsung.com.cn/business](https://www.samsung.com.cn/business/mobile-solutions/samsung-knox/) | Acheter via **Samsung Business Canada / CI**, pas import Chine (garantie + bandeaux LTE). |
| Lenovo commercial | Oui — Android Enterprise Gold, zero-touch | **Seul cas Chine raisonnable** : modèles *global* via Lenovo agréé CA/Afrique (usine Chine, canal local). |
| Huawei Qingyun / HarmonyOS | Oui — éducation Chine, 3 ans SAV *en Chine* | **Non** : pas de Google Play, apps Edaya Play/App Store. |
| Xiaomi / white-label / Alibaba | Marketplace | **Non** : ROM CN, pas de GMS, pas de MDM, 3 ans impossibles. |

**Ressources officielles à citer en réunion**

| Sujet | URL |
|---|---|
| Revendeurs Apple DEP Asie (Chine) | https://support.apple.com/en-us/118207 |
| Revendeurs Apple DEP EMEA (Afrique) | https://support.apple.com/en-us/118206 |
| Revendeurs Apple DEP Canada / Amériques | https://support.apple.com/en-us/118205 |
| Déploiement Apple ABM (doc CN) | https://support.apple.com/zh-cn/guide/deployment/depd3a5dd518/web |
| Apple Business Manager | https://business.apple.com/ |
| Samsung Knox (global) | https://www.samsungknox.com/ |
| Samsung Knox Chine | https://www.samsung.com.cn/business/mobile-solutions/samsung-knox/ |
| Samsung Knox Canada | https://www.samsung.com/ca/business/mobile-solutions/samsung-knox/ |
| Knox Partner Program | https://partner.samsungknox.com/ |
| Lenovo tablettes entreprise | https://techtoday.lenovo.com/ |
| Huawei Qingyun (marché CN) | https://qingyun.huawei.com/ |
| Android Enterprise | https://www.android.com/enterprise/ |
| Apple Developer (apps Edaya) | https://developer.apple.com/ |

Partenaires Apple **Chine continentale** (extrait officiel, juin 2026) : 倍升互联, 上海索电 (Mc2), 和诚诺信 (Sunpie), 蜂云启迪, 智懋, 易信通联, 方正艾普, **神州数码**, **京东耀弘**, 鸿宇博达, 麦连, 港宽, 仲晴, **China Mobile**, **China Unicom**.

Pour le lot 50 : devis **CDW / Compugen / Apple Business (CA)** et **Samsung Business CI** — pas un courtier Shenzhen.

---

## 8. Garantie et reconditionné

| Canal | Couverture typique | OK flotte 3 ans ? |
|---|---|---|
| Neuf Apple CA | 12 mois + **AppleCare+ 2–3 ans à acheter** | Oui **avec** AppleCare+ |
| Neuf Samsung CI | **24 mois** | Oui |
| Apple Refurbished | 1 an Apple | Oui si modèle 10e+ et Care+ |
| Recond. marketplace iPad 8/9 | 3–12 mois revendeur | **Non** comme standard |

Batterie : viser **cycle count bas** / capacité ≥ 85 % sur tout recond.

---

## 9. Qui possède les 50 tablettes ? (impact contrat)

| Modèle | Portail | Qui wipe | Tarif iPad | Quand |
|---|---|---|---|---|
| **Edaya possède** (prêt / pack hardware) | **ABM** + notre MDM | Edaya | Retail / business (~500 $ A16) | On « met à disposition » |
| **École possède** | **ASM** + MDM école | L’école | Éducation 469 $ | L’école équipe déjà |
| Infogérance | ASM école, Edaya **admin délégué** | Les deux (contrat) | Éducation | L’école veut qu’on opère |

Le lot de 50 « pour commencer » côté Edaya = **colonne 1 (ABM)** sauf si un client Canada achète lui-même.

---

## 10. Plan d’action 30 jours (lot 50, pas de pilote client)

Mandat déjà voté. Plus de go/no-go produit : exécution.

### Semaine 1

- [ ] Figer le split (défaut **25 CA / 25 CI**)
- [ ] Owner Ops (achats) + owner Tech (ABM / Knox / MDM)
- [ ] Ouvrir **Apple Business Manager** Edaya
- [ ] Compte Samsung Knox / Android Enterprise Edaya
- [ ] Essai MDM **unique** iOS+Android (Hexnode ou équivalent)

**Résultat :** identifiants org + MDM prêt à enrôler.

### Semaine 2

- [ ] Devis 25× iPad 10 64 Go Wi-Fi + AppleCare+ (Apple Business / CDW / Compugen)
- [ ] Devis 25× Tab A11+ LTE (Samsung Business CI)
- [ ] Devis option : 25× iPad 10/A16 64 Go+ CI
- [ ] Exiger : numéros de série poussés dans ABM / Knox **à la facture**
- [ ] 2 unités lab (1 iPad, 1 Android) : kiosque `edaya_teacher` + **wipe distant**

**Résultat :** 3 devis + wipe OK. Commande possible sans attendre un établissement.

### Semaine 3

- [ ] Commande ferme **50**
- [ ] 2 lab restent chez Edaya (spare interne) ; 48 destinés terrain
- [ ] Image unique par OS, étiquetage inventaire, procédure vol 1 page
- [ ] NDA / clause utilisateur tablette

**Résultat :** BDC signés, image figée.

### Semaine 4

- [ ] Réception → enrôlement **100 %** avant toute remise
- [ ] Check : PIN, kiosque, pas de compte perso, wipe rejoué sur 1 unité au hasard
- [ ] Expédition CA / CI

**Résultat :** 50 appareils dans le MDM, 0 carton « nu ».

---

## 11. Risques à dire en réunion

| Risque | Si on ignore | Mitigation |
|---|---|---|
| iPad 8 / 32 Go | Plus de MAJ, saturation, fuite si vol | Plancher 10e gen / 64 Go — **déjà lock** |
| Pas de MDM | Tablette perso avec notes élèves | ABM/Knox + MDM avant remise |
| Edaya s’inscrit à ASM | Rejet Apple, hors contrat | **ABM uniquement** |
| Garantie 12 mois CA | Casse année 2–3 à notre charge | AppleCare+ dès l’achat |
| Achat retail sans ABM | Impossible d’enrôler proprement | Canal Business |
| Mixte sans même MDM | Deux consoles, wipe raté | Un MDM multi-OS |
| Pas de pilote + pas de spare 10 % | Premier défaut = école bloquée | 2 u. lab/spare **dans** les 50 |
| iPad en CI sans LTE | Wipe/MDM si Wi-Fi école down | A11+ LTE en défaut CI |

---

## 12. Motion (déjà votée — à minuter)

> Lot 1 = **50 tablettes**, mixte, propriété **Edaya**. Plancher **64 Go**, horizon **3 ans**. Canada : **iPad 10e gen 64 Go Wi-Fi** + AppleCare+ + **ABM**. Côte d’Ivoire : **Tab A11+ LTE** + Knox (iPad CI = option devis). **Un MDM**. Pas de pilote client. Split défaut **25 / 25**. Deux unités lab wipe avant expédition des 48.

1-pager mandat : `decision-flotte-tablettes-1pager.md`.
