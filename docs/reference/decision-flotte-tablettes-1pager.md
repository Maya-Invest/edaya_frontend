# Mandat flotte tablettes Edaya — décisions verrouillées

**Lot 1 : 50 unités · propriété Edaya · mixte CA + CI · 64 Go min · 3 ans min · pas de pilote terrain**

---

## Décisions du 16 août 2026

| # | Question | Décision |
|---|---|---|
| 1 | Marché | **Mixte** Canada + Côte d’Ivoire |
| 2 | Propriétaire | **Edaya** → Apple Business Manager + MDM Edaya (pas ASM école) |
| 3 | Horizon | **3 ans minimum** (OS patché, SAV, amortissement) |
| 4 | Stockage | **64 Go minimum** (32 Go abandonné) |
| 5 | Pilote 5 puis 45 | **Non** — commande **50** d’un coup |

**Reste à figer (seul chiffre ouvert) :** répartition 50 = ? CA / ? CI. Défaut proposé : **25 / 25**.

---

## Ce que ça implique (non négociable)

| Règle | Application |
|---|---|
| Pas d’iPad 8e gen | Fin de cycle OS, 3 Go RAM, 32 Go |
| Pas de 32 Go | Plancher **64 Go** |
| Edaya possède | Achat canal **Business** (séries dans ABM / Knox à la commande) |
| 3 ans | AppleCare+ (CA) · Samsung 24 mois + Care+ si besoin (CI) · MDM 36 mois |
| Mixte | **Un seul MDM** (Hexnode ou équivalent iOS+Android) |
| Pas de pilote école | Test **lab interne** 2 unités (wipe) **avant** d’expédier les 48 — pas un pilote client |

---

## SKU retenu par marché (préférence iPad, 3 ans, mixte)

| | **Canada (défaut 25)** | **Côte d’Ivoire (défaut 25)** |
|---|---|---|
| Modèle | **iPad 10e gen 64 Go Wi-Fi** (4 Go RAM) | **Galaxy Tab A11+ 6/128 LTE** |
| Pourquoi pas iPad en CI | 4G + SAV 24 mois + 7 ans OS ; iPad CI = plus cher, SAV faible, souvent Wi-Fi only | |
| Si iPad partout | Possible : iPad 10/A16 **64 Go+** aussi en CI, TCO plus haut, LTE à spécifier | |
| Portail | **ABM** Edaya | **Knox / Android Enterprise** Edaya |
| Garantie 3 ans | **AppleCare+** (constructeur = 12 mois) | Garantie Samsung **24 mois** |
| Enrollment | Zero-touch ABM → MDM | Knox Mobile Enrollment → même MDM |

Alternative unique-SKU (plus simple ops, plus cher en CI) : **50× iPad 10 64 Go**. À chiffrer en devis, pas le défaut.

---

## Budget ordre de grandeur — 50 u. (25+25), 3 ans

Canada HT · CI TTC · MDM + coque + Care/AppleCare inclus. **Sans** les 5 spares (décision : 50 net).

| Poste | 25 iPad 10 CA | 25 A11+ CI | Total |
|---|---:|---:|---:|
| Matériel | ~8 800 $ | ~5,0 M F | — |
| Coques | ~1 250 $ | ~0,4 M F | — |
| AppleCare+ / garantie | ~2 500 $ | inclus 24 mois | — |
| MDM 36 mois | 25 × 4 $ × 36 ≈ 3 600 $ | 25 × 2 000 F × 36 ≈ 1,8 M F | — |
| Enrôlement | ~625 $ | ~0,2 M F | — |
| **TCO 3 ans** | **~17 000 $ CAD** | **~7,4 M F CFA** | **deux enveloppes** |

iPad 10 à ~350 $ u. · A11+ à ~198 000 F u. Devis réels J+5.

Si **50 iPad** (25 CA + 25 CI) : enveloppe CI passe vers **~10–12 M F** + SAV Apple CI à assumer.

---

## Plan d’action — 50 unités, pas de pilote client

| Quand | Action | Résultat |
|---|---|---|
| J0 | Confirmer split **25/25** ou autre | Quantités devis |
| J+2 | Ouvrir **ABM** Edaya + **Knox** entreprise + essai **MDM unique** | Socle sécu |
| J+5 | Devis A : 25× iPad 10 64 Go + AppleCare+ (CDW / Apple Business / Compugen) | Prix CA |
| J+5 | Devis B : 25× A11+ LTE + Knox (Samsung Business CI) | Prix CI |
| J+5 | Devis C (option) : 25× iPad 10/A16 64 Go+ en CI | Comparatif iPad partout |
| J+7 | **2 unités lab** (1 iPad, 1 Android) : image kiosque + **test wipe** | Go technique |
| J+10 | Commande ferme 50 (48 terrain + 2 lab/spare internes) | Bons de commande |
| J+20 | Enrôlement 100 % avant remise école | Aucune tablette « nue » |

**Interdit avant remise :** compte Apple/Google perso, Play/App Store ouvert, pas de PIN, pas de wipe testé.

*Détail équipe : `decision-flotte-tablettes-equipe.md`*
