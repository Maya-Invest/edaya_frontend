# EDAYA design language and writing standard

Normative for the staff `apps/webapp`. The desired UI must use the EDAYA palette, bundled fonts and official artwork. Domain meaning belongs to the feature contract; visual and language choices belong here. This spec must not authorize new business operations or reinterpret a calculation.

## 1. Foundations

| Role | Value | Required use |
| --- | --- | --- |
| Primary | `#2563EB`; hover `#1D4ED8`; pressed `#1E40AF` | Primary action, links, open-record marker and keyboard focus |
| Supporting sky | `#60A5FA` | Decoration; never small text on white |
| Amber | `#FBBF24` | Decoration under 10% of visible surface, navy foreground |
| Canvas / surface | `#F0F7FF` / `#FFFFFF` | Page canvas / chrome and content |
| Text / secondary text | `#1E293B` / `#5B6B82` | Essential information / supporting information |
| Base slate / separator | `#64748B` / `#E2E8F0` | Input outline / noninteractive divider |
| Success | `#15803D` on `#F0FDF4` | Confirmed success with text |
| Warning | `#92400E` on `#FEF3C7` | Caution or pending attention with text |
| Danger | `#B91C1C` on `#FEF2F2` | Failure, overdue and destructive meaning |
| Information | `#1D4ED8` on `#E0F2FE` | Informational state with text |

Poppins Semibold must be used for page/section headings. Inter Regular/Medium/Semibold/Bold must be used for body, controls, collection identities and numbers. Fonts must load from bundled files with their OFL licenses; no runtime third-party font requests. Actual code samples may use system monospace. Webapp surfaces are light-only.

The frontend token revision is **1.0.13**, including shared drawer motion, role-specific geometry and the prescribed primary pressed and destructive confirmation hover/pressed roles. The platform-neutral token manifest is `design-system/tokens.json`; generated local CSS is `apps/webapp/src/lib/design-system/tokens.css`, imported through `app.css`. Semantic tokens must own the values in this spec. Components must not introduce raw color literals, additional font dependencies or per-feature token forks. Generated files must not be edited directly. Shared mobile snapshots may include dark values without introducing a staff-webapp theme switch. Calendar vendor styling must use scoped semantic tokens, not patches to vendor CSS.

## 2. Measurable composition

All dimensions below are CSS pixels at the default text size. Text sizes must use scalable units, respect user enlargement and never become fixed-height clipping constraints. Spacing, corner radii and minimum interaction targets must use CSS-pixel tokens: enlarging text alone must not proportionally double them. Controls must grow naturally for enlarged or wrapped text; browser zoom must remain supported. Page, navigation and drawer breakpoints use viewport width. Collection headers and fact grids use available content width, including inside drawers.

| Element | Required dimension |
| --- | --- |
| Page title | 28px, 1.3 line height; 24px below 768px |
| Section title / record drawer identity | 20px semibold, 1.3 line height |
| Collection identity | 14px Inter semibold, 1.5 line height |
| Body / controls | 14px, 1.5 line height |
| Supporting metadata | 12px, 1.5 line height; never the sole essential identity/value |
| Page padding | 24px; 16px below 768px |
| Section / internal / related-control gaps | 24px / 16px / 8px |
| Interaction target / action icon | At least 44 × 44px / 16 × 16px |
| List row | 16px padding on every side, content-driven height |
| Table header | 44px minimum height; 16px horizontal and zero vertical cell/control padding; grows for wrapped or enlarged text |
| Table row | 48px minimum outer height including its divider; 16px horizontal and zero vertical cell padding; vertically centered targets without nested padding; grows for wrapping |
| Table utility column | Stable 64px width; centered 44px targets; pinned right with an opaque row-matching background and subtle left divider |
| Fact grid | Two columns from 480px available content width, otherwise one; long values span both |
| Bounded dialog gutters | At least 16px on each viewport edge |
| Navigation | Desktop sidebar from 1024px viewport width; focus-managed sheet below |
| Drawer | 50vw from 1024px; full viewport width below 1024px |
| Form | Maximum 32rem; 48rem only for the wide forms assigned by the app-shell spec; viewport bounded |
| Text actions / quiet collection icons / search | 22px radius: 36px default visible button/search face within a 44px target; bounded corners when content grows |
| Select / combobox chevron | 16px, vertically centered, 12px inset from the trailing field edge; reserve 40px trailing content padding so text cannot touch the chevron |
| Standalone icon button | 36px circular visible face inside a 44px square target; centered 16px icon, 1px base-slate border, white fill |
| Ordinary form text inputs / custom select-combobox triggers | 44px default minimum outer height; 8px vertical / 12px horizontal padding, 14px type at 1.5 line height; white fill, 1px base-slate border, 8px radius; height grows with content |
| Filter / query date or interval controls | Pill-shaped trigger/field with the 22px action radius; retain the 44px default field height, white fill, outline and chevron spacing; search keeps its 36px face within a 44px target |
| Textareas | Same field treatment; multiline height follows required content |
| Collection containers / cards | 8px outer corners; square rows and row activation regions within the shared outline |
| Dialog / menu or popover | 12px / 8px radius |
| Drawer / full-screen workspace | Square corners; no artificial outer gutter |
| Menu items / tabs / record activation regions | Square corners; full-width row or tab treatment, not action capsules |
| Status badges / conversation bubbles | 4px / 12px radius; never styled as action buttons |
| Avatars / binary controls | Circular avatars and radio controls; 4px checkbox corners; capsule switch track |

The spacing vocabulary is 4/8/12/16/24/32/48; the required gaps above must not vary by feature. Collections must use one flat white surface with 8px outer corners and separators between square rows. The container must clip row backgrounds to its outer outline without rounding individual rows. Content sections must use headings, whitespace and dividers rather than nested bordered cards. A separately scoped summary may have a white card with 8px outer corners; it must not add a decorative shadow. Shadows are reserved for floating dialogs and menus and must remain restrained and neutral. Motion must communicate a state transition, honor reduced motion and never animate decoratively forever. Drawers slide horizontally from the right edge on opening and return to that edge on closing, using the 250ms enter-motion token and cubic-out easing in both directions. Their backdrop fades over the same interval. The panel and backdrop remain mounted through the exit transition, including URL-driven dismissal. With reduced motion enabled both transitions are immediate.

The standard collection header must place title/count left and Search, Filter, `···` right. From 768px of available content width they share a row when their content fits; below that width title/count occupies the first row and the toolbar follows. Search has a preferred minimum width of 12rem, constrained by its container. When search and actions cannot fit together, search occupies its own row and Filter then collection menu wrap beneath it. This rule applies to related collections inside drawers, independently of viewport width. Labels and targets must not be clipped at enlarged text or narrow widths. Filter must use an icon-only button at every collection width, circular in the main-page collection header and quiet in related-collection headers, with the shared action-icon size and minimum interaction target. Its accessible name is Filter / Filtrer. An active-facet count uses a compact badge without widening the button and is also described accessibly; zero has no badge. The panel retains its visible heading and field labels. The collection primary action belongs first in `···`.

## 3. Control treatments

All controls must use the shared Button/Input/Select/Checkbox/Dialog primitives. Button labels are Inter medium 14px with 1.5 line height. Text buttons must have a 36px minimum visible face with 12px horizontal and 6px vertical padding, inside a non-overlapping interaction area at least 44px high. The extra 4px above and below the face belongs to the hit area, not the visible fill or border. Icon-label spacing is 8px. At 200% text or with wrapped labels, face and hit area grow with content; text must not be clipped. Table header cells and sortable header controls must have zero vertical padding and a 44px minimum height, without stacking cell padding on top of the control target. Width follows the visible label and declared icon slot; arbitrary minimum widths, hidden translated labels and stretched full-width buttons must not add idle bulk. Modal footers may stack full-width actions below 768px to preserve readable labels. Icon-only buttons have a 44px square target with a centered 16px icon. Labels must wrap without clipping; taller buttons retain the 22px corner radius. Search must match the default button face height, with a 36px visible field centered within a 44px interaction area. The 4px above and below must focus the field when activated, without extending its visible border or fill. Its text, icon and adjacent button icons share the same vertical center. At enlarged text, the field and target grow with content using the same fixed padding rather than clipping text. Search keeps its 22px corners and a 16px search icon. Filter fields and date/interval controls used to query or navigate displayed data must also use pill-shaped 22px corners, including both endpoints of a date range and controls inside Filter. They retain the default field height and white background; the compact search height must not shrink other fields. Ordinary create/edit fields, including date fields that edit record values, retain 8px corners. Horizontal padding remains 12px, with the reserved chevron space for selectors. Binary controls, popup containers and option rows retain their own treatments; the capsule applies to the query field or trigger, not every element inside Filter. Input and select outlines use base slate; focus is a 2px primary outline with a 2px surface-colored gap. Focus must be visible on every interactive surface, including menus and keyboard-operated rows.

| Variant | Rest | Hover / pressed | Assignment |
| --- | --- | --- | --- |
| Primary | Primary background, white text, matching border | Primary hover / pressed values above | Form/task submit; first non-destructive drawer action |
| Secondary | White background, primary text and 1px primary border | Information background / sky canvas with primary border | Second visible drawer action, Cancel, explicit secondary task action |
| Quiet | Transparent, text foreground; no visible border | Sky canvas / information background | Table-header, related-collection-header and row icon controls, including their Filter and `···`; text-only disclosure and inline navigation |
| Standalone icon | Circular white face, base-slate border and secondary-text icon | Sky canvas / information tint; expanded uses information tint | All icon-only buttons outside table headers, related-collection headers and rows, including Back, Close and overflow |
| Destructive | White, danger text and 1px danger border | Danger background tint / white with 2px danger inset | Destructive action trigger where explicitly visible |
| Destructive confirmation | Danger background, white text | `#991B1B` / `#7F1D1D` | Final Delete, Void, Reverse or other destructive confirmation only |

Menu entries must be neutral square-cornered full-width rows with text labels, minimum 44px targets and a sky-canvas hover/focus background. Destructive entries use danger text and are separated at the end. A primary collection action is first in the menu; it is not a filled button embedded in the menu. X-TEMPLATE-RESET-REVIEW is bounded to notification templates: the neutral first Reset all templates entry opens consequence review before Export CSV; only its final confirmation is destructive. Selected menu options show a check and text, not color alone.

Disabled controls must use the separator fill, secondary text and separator border, with no hover/pressed change. They must remain recognizable and expose the reason in adjacent text or a focus-accessible description. Unauthorized actions must be omitted, not represented as disabled. Busy controls must retain their role colors, visible action label and measured dimensions, expose busy state and prevent duplicate submission. A submit button must reserve one 16px trailing status slot with an 8px gap; it shows a spinner while busy. The localized ongoing-action message must be announced through a live status and shown in the form/task status area, outside the button. Hidden pending labels must not participate in button sizing. A button with a persistent action icon keeps that icon separate from its status slot. Busy controls must not look like an unexplained disabled control. Icons must come from the shared Lucide exports; no feature-specific substitutes for the same action.

Input errors use a danger outline and adjacent localized error text. Link text uses primary color and an underline on hover/focus; meaning must not depend solely on color.

Every icon-only button outside table headers, related-collection headers and rows must use a white circular face with a base-slate grey border and secondary-text grey icon. Main-page collection headers must use this circular treatment for Filter and collection `···`; these page-level controls are distinct from table column headers. This includes Back, Close, navigation, utility and overflow buttons in shell/page chrome, record headers, dialogs and task surfaces; the rule is not limited to `···` menus. Related-collection headers, the Table Customize header and collection rows retain quiet icon controls, including Filter and row menus. The variant changes appearance only; it must not add actions, duplicate actions or replace required visible action labels. Checkboxes, radio controls and non-interactive field adornments are not icon buttons. Hover uses sky canvas; pressed, expanded and toggled-on states use information tint; the grey outline/icon remain visible. Keyboard focus uses the shared primary indicator outside the face. Disabled controls use the shared disabled treatment. Pending commands retain their accessible action name, announce progress and prevent duplicate activation; menu/navigation controls have no artificial busy spinner.

Selects and comboboxes must use one shared custom control, with a white trigger and white popup; visible native HTML selects or browser/OS option pickers must not be used. A hidden form-serialization control is not a visible alternative. Trigger geometry must match ordinary text inputs in §2, including default height, outline and text. Its role determines corners: query/filter selectors use the capsule; ordinary form selectors use the field radius. Search retains its separate compact geometry. Disabled and invalid states use the shared field treatments. A chevron is an adornment, not a second focus stop; it must use §2 spacing without overlapping text, clear controls or the border. Long selected labels must wrap rather than displace the chevron. Text enlargement must not enlarge the icon, inset or padding; the field grows with content. Read-only fields without a popup must not show a chevron. Options use square rows, meaningful selected text and a checkmark, with a viewport-bounded scrolling popup. Search-enabled and multi-selection variants may be used only when the feature requires them; they retain this shared appearance and must not invent new matching or selection capabilities.

Confirmation dialogs use the default bounded-form width, dialog corners, section-title typography and body/control typography from §2. Their neutral header and body must not become an all-red danger panel. Cancel uses the secondary treatment; a non-destructive final action uses Primary, and a destructive final action uses Destructive confirmation. Required consequence text remains visible rather than hidden in tooltips or disclosures. The persistent footer contains Cancel before the explicit action; at narrow widths the actions wrap or stack in that same reading and keyboard order. Content scrolls while the title and footer remain reachable, including at 200% text. No decorative status icon or icon-only final command may replace the title, explanation or action label.

X-LANGUAGE-SWITCHER preserves the original shell language picker rather than applying form-selector or shared-button sizing. Its pill trigger is 36px high, with 12px text, 12px horizontal padding, 6px gaps, a 14px language icon and a 12px chevron. It uses the separator border, white surface, EN/FR code and existing open-state treatment. Its end-aligned popup is 11rem wide, separated by 8px, with 16px corners and the panel shadow. Options use 14px text, 16px horizontal and 10px vertical padding, decorative flags, a 14px selected checkmark and the existing primary-tint selected background. These dimensions and the local popup replace the generic selector/button geometry only for this control; they must not spread to filters or ordinary forms. Its popup remains inside the viewport gutters at narrow widths and enlarged text; Escape dismisses it and restores trigger focus. Language changes must preserve workspace, navigation and drafts.

### 3.1 Collection row states

List and Table must render these independent states with the same meaning:

| State | Required treatment |
| --- | --- |
| Rest | White surface |
| Hover | Sky-canvas background; pointer styling only on actual interactive targets |
| Open record | Sky-canvas background and a 2px inset primary leading marker; the identity target identifies the current record accessibly |
| Bulk selected | Information-tint background and checked checkbox |
| Open record and bulk selected | Information tint, open-record marker and checked checkbox |
| Keyboard focus | Separate primary focus indicator on the focused target |

Bulk-selection tint takes precedence over hover. The marker must not change column positions or row dimensions. Focus indicators must remain visible within clipped collection boundaries, using an inset treatment where an outer indicator would be clipped. Pinned cells must use the same opaque background as their row. Open-record state must not imply bulk selection, and focus must not imply either state. Single-line table rows must reach the §2 minimum without stacking cell padding around interaction targets; wrapped or enlarged essential content must increase height, never truncate to preserve density.

## 4. Data and content hierarchy

Student guardian related rows use two content rows separated by an 8px gap: name and a neutral relationship badge first, then email, phone and occupation in three equal-width fields separated by 16px gaps. Values and labels wrap within their field without introducing another fact row. The badge follows the shared badge radius and uses 4px/8px padding. The shared quiet row overflow is aligned to the first row; Edit belongs inside it. The related collection title carries the count without a redundant end summary.

Essential names, identities, values and action labels must wrap. Secondary descriptions may use at most two lines of truncation only with an adjacent keyboard-accessible Read full text disclosure or an accessible full-content destination. A hover-only tooltip or `title` attribute is insufficient. Numeric amounts and scores must use Inter tabular numerals, right alignment in comparison columns, domain precision and units/currency. Formatting must not round away domain precision or invent a fallback currency.

Dates must use the active FR/EN locale and an unambiguous day/month/year presentation. Civil dates must not shift through UTC conversion. Academic sessions and deadlines use the school timezone, identified beside the date/time group or in its heading whenever the viewer could interpret another zone. Message/audit instants use the viewer timezone with a visible timezone label. Relative dates must have an accessible absolute date/time. Ranges include both endpoints and the applicable zone. Saved result precision, units and mentions come from captured results, not mutable grading configuration.

| Meaning | EN | FR | Rule |
| --- | --- | --- | --- |
| Numeric zero | `0` with unit | `0` with unit | Only a known measured/calculated zero |
| Boolean false | No | Non | Known negative; never a missing value |
| Boolean true | Yes | Oui | Known affirmative |
| Absent optional value | Not provided | Non renseigné | No supplied value |
| Missing required configuration | Not configured | Non configuré | Configuration is absent |
| Data cannot be obtained | Unavailable | Indisponible | Required capability or persisted detail is missing/unsupported; not denial, failed request or successful empty result |
| Denied field within authorized content | Restricted | Accès restreint | Do not expose hidden values/counts |
| Missing persisted audit actor | Not recorded | Non enregistré | Do not infer an actor |

Statuses must include meaningful text and a semantic tone. A dot, badge color or icon alone is insufficient. Essential facts are expanded. Secondary technical identifiers, processing metadata and audit detail belong in labeled, initially collapsed disclosures. Persisted business history required by a feature remains directly available in its History section/tab; it must not be replaced by raw technical logs.

Disclosures put the chevron before the label, right when closed and down when open, with `aria-expanded`, keyboard activation and a 44px target. Scoped actions are separate siblings at the right; activating an action must not toggle the disclosure. White content surfaces on the sky canvas establish hierarchy; do not wrap every field in a card.

## 5. FR/EN language contract

Every visible string, accessible name, validation message and state must have FR and EN translations. Each screen must use one active locale; backend error codes must map to localized domain messages. User-entered names and content must not be translated. Use sentence case, a direct verb and the object when context is insufficient. Avoid jargon, internal IDs, unexplained acronyms, celebratory copy and generic Success/Error/Confirm labels.

### 5.1 Domain glossary

| EN | FR | Meaning |
| --- | --- | --- |
| Student / Students | Élève / Élèves | School pupil |
| Teacher / Teachers | Enseignant / Enseignants | Teaching actor, distinct from staff |
| Staff member / Staff | Membre du personnel / Personnel | Human staff workspace actor |
| Guardian / Guardians | Responsable légal / Responsables légaux | Student-associated adult |
| Class / Classes | Classe / Classes | Class group |
| Grade level / Grade levels | Niveau / Niveaux | Academic level, never a mark |
| Subject / Subjects | Matière / Matières | Grade/year-owned subject |
| Chapter / Chapters | Chapitre / Chapitres | Subject curriculum section |
| Academic discipline / Academic disciplines | Discipline académique / Disciplines académiques | Reference catalog, not sanctions |
| Placement status / Placement statuses | Statut de scolarisation / Statuts de scolarisation | Annual student declaration |
| Activity / Activities | Activité / Activités | School activity |
| Assessment / Assessments | Évaluation / Évaluations | Assessment definition |
| Mark / Marks | Note / Notes | Recorded grading value |
| Family feedback | Retour des familles | Campaign feedback, never assessments |
| Attendance | Présences | Daily/session attendance records |
| Logbook | Cahier de textes | Lesson record |
| Report card / Report cards | Bulletin / Bulletins | Captured academic result document |
| Module / Modules | Module / Modules | Flat subject grouping for report results |
| Fee / Fees | Frais / Frais | Configured charge offering |
| Billing | Facturation | Assigned student fees |
| Payment / Payments | Paiement / Paiements | Receipt or active allocation, labeled by context |
| Account credit | Crédit disponible | Unallocated account balance |
| Refund / Reversal | Remboursement / Annulation de paiement | Return of funds / reversal of a receipt; distinct commands |
| Incident / Incidents | Incident / Incidents | Recorded discipline event |
| Disciplinary action / Actions | Sanction disciplinaire / Sanctions disciplinaires | Sanction catalog/outcome |
| Permission profile / Profiles | Profil d’autorisations / Profils d’autorisations | Reusable permission bundle, not runtime authority |
| Announcement / Announcements | Annonce / Annonces | Published audience message |
| Inbox | Boîte de réception | Sidebar group for personal deliveries, school conversations and corrections |
| My inbox | Ma boîte de réception | Signed-in profile’s personal deliveries |
| School messages | Messages de l’école | School conversations and authorized teacher oversight |
| Conversation | Conversation | Immutable message thread |
| Account / Profile | Compte / Profil | Account container / identity section |
| Notifications / Security | Notifications / Sécurité | Personal settings / verified identity and authentication sections |
| Activity log | Journal d’activité | Read-only recorded business history, distinct from school activities and technical logs |
| Correction / Corrections | Correction / Corrections | Reviewed proposed change |
| Academic year / Term | Année scolaire / Période | Workspace year / academic period |

### 5.2 Status vocabulary

| EN | FR | Meaning |
| --- | --- | --- |
| Active / Inactive | Actif / Inactif | Explicit record availability, with grammatical agreement |
| Draft / Submitted | Brouillon / Soumis | Unsubmitted work / official submitted work |
| Published / Archived | Publié / Archivé | Released result/content / archived lifecycle |
| Pending review / Approved / Rejected | En attente de validation / Approuvé / Rejeté | Review workflow states |
| Present / Absent / Late / Unmarked | Présent / Absent / En retard / Non renseigné | Explicit attendance values; Unmarked is not Absent |
| Resolved / Cancelled | Résolu / Annulé | Resolution / cancellation, not deletion |
| Unpaid / Partially paid / Paid | Impayé / Partiellement payé / Payé | Obligation settlement states |
| Read / Unread | Lu / Non lu | Personal delivery read state |
| Loading… / Refreshing… | Chargement… / Actualisation… | Initial read / same-scope refresh |
| Updating / Completed / Failed | Mise à jour en cours / Terminé / Échec | Background calculation/job outcome |

Status labels must reflect the specific domain state, not collapse draft, submitted, published and approved into one generic Done. Translations must agree with the named entity and preserve distinctions between cancelled obligations, reversed receipts and refunded money.

### 5.3 Actions and reusable copy

| EN | FR |
| --- | --- |
| Add {entity} / Edit {entity} / Delete {entity} | Ajouter {entity} / Modifier {entity} / Supprimer {entity} |
| Save / Saving… / Cancel | Enregistrer / Enregistrement… / Annuler |
| Close / Back / Done | Fermer / Retour / Terminé |
| Filter / Reset filters / Clear search | Filtrer / Réinitialiser les filtres / Effacer la recherche |
| View / List / Table / Sort / Columns | Affichage / Liste / Tableau / Trier / Colonnes |
| Customize | Personnaliser |
| Export matching / Export selected | Exporter les résultats / Exporter la sélection |
| Select loaded rows / Clear selection / Exit selection | Sélectionner les lignes chargées / Effacer la sélection / Quitter la sélection |
| Retry / Refresh / Read full text | Réessayer / Actualiser / Lire le texte complet |
| Assign fee / Apply credit / Record payment | Attribuer des frais / Utiliser le crédit / Enregistrer un paiement |
| Download account invoice / Finance checks | Télécharger la facture du compte / Contrôles financiers |
| Publish / Archive / Activate | Publier / Archiver / Activer |
| Approve / Reject / Withdraw | Approuver / Rejeter / Retirer |
| Discard changes / Keep editing | Abandonner les modifications / Continuer la modification |
| Optional / Required | Facultatif / Obligatoire |

Entity placeholders in this table designate complete localized messages, not English-word concatenation: translations must supply articles, gender, elision and plural forms. Use locale-aware plurals for counts, including zero; never append `(s)`. A collection count must name its unit and scope, for example “1 student” / “1 élève”, “2 students” / “2 élèves”, and “No students” / “Aucun élève”.

Empty copy must name the scoped collection: “No students in this class” / “Aucun élève dans cette classe”. No-match copy: “No results match your search and filters” / “Aucun résultat ne correspond à votre recherche et à vos filtres”. Access denial: “You do not have access to this content” / “Vous n’avez pas accès à ce contenu”. A failure names the operation and recovery, such as “Could not load payments. Try again.” / “Impossible de charger les paiements. Réessayez.”

Confirmations must name the record and actual consequence, then use the action verb: “Delete {name}?” / “Supprimer {name} ?”. Permanent deletion must explicitly say it cannot be undone only when that is true. Reversible archive, cancellation, reversal and refund must use their own terms. A saved-write/read-failure message must say “Saved. Could not refresh the display.” / “Enregistré. Impossible d’actualiser l’affichage.” and offer Refresh without resubmitting. Validation must name the field and remedy; errors must not expose raw solver messages, payloads or stack traces.

## 6. Brand and specialized presentation

Student Profile sections follow the shared section-title, body, metadata and fact-grid geometry: 24px between sections, 16px internal gaps, and two fact columns only from 480px of available content width. Long medical text remains complete and spans readable lines. The drawer has one vertical body scroller; the identity/tab region is pinned only when it occupies no more than half that region and leaves at least 240px for body content. Otherwise identity/actions scroll with the body while Close remains fixed. Proposed portraits use the existing preview size and the published portrait appears only in the identity header.

Official outlined EDAYA artwork is authoritative. Use vertical artwork for spacious authentication, horizontal in headers/sidebar, symbol only in compact contexts already identified as EDAYA. Minimum widths are 88/128/32px respectively; favicon sizes may use 16/24/32px. Preserve clear space and aspect ratio; no reconstructed wordmarks, recoloring, stretching, shadow or text overlay. White artwork requires a dark or royal-blue surface.

The app header uses a navigation target, flexible school identity and a rightmost language/account group. Targets retain their shared minimum sizes and fixed gaps. Header padding is 12px horizontally and 8px vertically below the desktop navigation breakpoint, otherwise 24px horizontally with a 56px minimum header height. The language/account group remains a single row aligned to the trailing padding. Below 32rem of available header width, school identity occupies a second left-aligned row; above that it shares the navigation row. Profile metadata appears only from 48rem of available header width; otherwise its named avatar control remains. School identity and visible profile metadata wrap, and the header grows rather than clipping enlarged text.

Under X-SCHOOL-YEAR-SWITCHER, the expanded sidebar year uses a supporting School year / Année scolaire label above one body-sized primary text link with transparent fill, no outline/chevron and zero extra field padding. The label follows supporting-metadata typography and a fixed 4px gap. Its hit area retains the shared minimum target and focus treatment. The collapsed trigger uses the standalone circular icon treatment. The centered dialog retains default bounded-form geometry, wrapping headings/options, one body scroller and reachable Cancel/Switch year actions at narrow/short sizes and 200% text. This exception changes only the shell year trigger and transient selection dialog; school/term selectors retain their own presentation.

Under X-ACCOUNT, account settings use a maximum 52rem dialog from 768px, with 24px outer gutters and height bounded by the lesser of 40rem and 80dvh. Below 768px use the full viewport. The header is My account / Mon compte with one persistent circular Close button. Horizontal Profile / Profil, Notifications / Notifications and Security / Sécurité tabs remain above one body scroller, with at least 44px targets and an underlined current state. Content uses 24px desktop and 16px mobile padding. Names and long contacts wrap, section headings align, and flat sections use spacing/dividers without nested cards. Notification Save/Discard actions appear only for dirty drafts; Sign out is a quiet action in Security's Current session section. There is no global footer or Save. Short heights, narrow widths and 200% text must keep Close, tabs and all scrolling content/actions reachable. The account dialog must not reuse the authentication brand/form split.

Under X-ACCOUNT, authentication uses an approximately 1040px-wide composition from 1024px: 40% quiet sky brand panel and 60% white form area. Below that use a compact horizontal branded header above the form. Authentication form content is capped at 420px, with 48px inputs/submit targets and a visible language selector. One active form is visible; inactive sign-in/sign-up panels remain hidden and inert to retain drafts. OTP is one paste-friendly field; recipient confirmation, resend, change-contact and existing authenticator/recovery steps remain explicit. Connection checking is neutral; unavailable is a localized warning; available is not a warning. Neither styling nor demo account selection may bypass explicit authentication actions.

My inbox and Corrections use the shared Table geometry and row states. The primary title receives the greatest column width; supporting content stays secondary, and essential titles and identities wrap. Personal-message unread titles use stronger weight than read titles, with explicit Unread/Read status labels. Types/workflows use plain text; only status and actual consequence warnings receive semantic emphasis. Correction reasons and repeated no-consequence text must not inflate rows. Date cells show date above smaller time/timezone. Columns stay stable until the user customizes them; narrow screens scroll within the table.

Inbox labels and child counts must remain consistent in desktop and mobile navigation; no aggregate group badge may imply that unread deliveries, conversations and correction requests share one measure. Report modules are headers in the grade-level Subjects List, with bounded action forms. Notification templates retain their standard List and detail drawers.

Activity-log rows must identify the viewer timezone and use localized action/outcome labels with meaningful text. Actor, action, time, affected record and outcome are primary historical facts. Event context, reason and recorded changes are read-only, with missing values labeled Not recorded / Non enregistré and denied values Restricted / Accès restreint. Only ancillary technical identifiers belong in a collapsed disclosure. Empty copy must say No recorded events / Aucun événement enregistré and identify the current scope; it must not claim that no business activity occurred.

Message history must use right-aligned blue-container staff replies and left-aligned neutral guardian messages, with actual author before selectable content and localized time after it. Position, participant label and accessible description distinguish direction without color. Teacher oversight identifies participant roles; no invented delivery/read indicators. Conversation bubbles cap width at 90% compact / 75% wide and 560px; compact enlarged text can use the available width.

Finance summaries must label net obligations Billed / Montant facturé, active charge allocations Payments / Paiements, remaining obligations Outstanding / Solde restant, and overdue obligations Overdue / En retard. The assigned-student count is a chip on Billed; overdue-student count is a chip on Overdue. Overdue uses the danger text token. No Received/Refunded captions or duplicate summary cards on Billing/Payments. Financial scope and calculation rules remain in the feature contract.

## 7. Accessibility and conformance

Text must meet 4.5:1 contrast for ordinary text and 3:1 for large text; essential active control boundaries need 3:1. Shared typography, control treatment and status tones must be evaluated on their actual backgrounds. Focus must follow reading order, icon controls must have contextual names, and modal/task dismissal and focus restoration must obey the app-shell contract.

The X-DESIGN-SPECIMEN gallery must apply the same wrapping and fixed page/section padding as the shared composition. Its viewport/text preview must enlarge text without doubling its layout gutters. Specimen grids must be bounded by their container so native fields and long French copy cannot widen the page. It must demonstrate production controls without clipping overflowing text or overriding control geometry to conceal failures.

At narrow widths, short heights, 200% text, long FR/EN labels and large values, essentials must wrap and every action must remain reachable. No hidden essential columns, overlapping content, clipped modal actions or hover-only access. Tables retain accessible horizontal scrolling; the page itself must not acquire accidental horizontal scrolling. Reduced motion must preserve state meaning. Every variation must have a named exception in the app-shell spec and a bounded surface assignment; no local styling exception is implicit.
