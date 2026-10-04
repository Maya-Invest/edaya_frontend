# Current EDAYA staff webapp review

Design system **1.0.0**. [Open gallery](index.html) · [Capture provenance](manifest.json) · [UI brief](../edaya-ui-brief.md) · [Normative web specification](../../specs/design-language-spec.md).

These captures show the current working tree. Each manifest entry identifies the source revision plus source digest, locale, viewport, theme, image size and capture time. Staff data is disposable local seed data, not a production school. Component compositions use fictional data and are labeled separately from actual routes. Before/after comparison files remain in temporary QA storage; old design packs are not current references.

| Example | Review annotations |
|---|---|
| Desktop login FR/EN | Official vertical artwork; 40/60 split; quiet brand copy; one active form; visible language selector; persistent labels; 48px controls. |
| Phone login and registration | Compact horizontal artwork; content grows vertically; all existing registration fields remain; registration is secondary to sign-in. |
| OTP and error | Single paste-friendly code field, recipient confirmation, resend and change-email actions; inline error text and preserved pending states. |
| Phone registration error | A service failure is announced as an alert beside the submit action. Entered fields remain available for retry. |
| Phone navigation | Existing groups/links in a focus-managed overlay; Escape restores trigger focus. Main content retains full width, context controls remain available. |
| Student list | Existing sidebar groups, school/year context, filters, row actions and information density remain. Inter tabular numbers, blue selection and quieter surfaces unify presentation. At narrow widths, columns scroll horizontally instead of crushing names and labels. |
| Correction review | URL-driven workflow/status filters and read-only Official → Proposed drawer; decisions retain the review outcome. Phone layout wraps fields and action buttons; Corrections is the last School navigation item. |
| Student drawer | Existing URL-driven tabs and actions remain. Clear heading, grouped labels and readable numerical summaries. |
| Student edit modal | Existing fields, focus and dismissal behavior; white surface, visible input boundaries, neutral overlay, scroll-safe dimensions. |
| Phone account dialog | Existing profile fields, photo action, shortcuts and logout callback. Header and actions remain visible; the middle content scrolls when the viewport is shorter. |
| Component gallery | Actual shared primitives: default/selected rows, action variants, disabled/busy, labeled and invalid fields, empty/error states, and all approved logo variants. Keyboard-focus styles can be reviewed interactively. |

## Refreshing evidence

Run the current webapp locally against isolated fixtures. Capture through the browser at the viewports recorded in the manifest; never point review writes at production. The `/__design` component gallery is available only in development and returns 404 in production. It does not call APIs or add a product feature.

Store captures as encoded PNG files; normalize the image encoding first if the capture tool returns JPEG. After replacing captures, run `python3 scripts/brand-gallery.py` from the repository root to refresh the manifest and HTML index. Review the source digest and viewing conditions; do not relabel old screenshots as current. Run `bun run verify`. A design change updates tokens, specifications, registry and current evidence together.
