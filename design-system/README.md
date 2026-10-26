# Brand inputs and maintenance

Frontend token revision **1.0.2** adds action, field, collection, dialog, menu, badge and message geometry roles alongside the existing interaction colors. Destructive triggers remain outlined; final destructive confirmations use the filled danger role. Busy buttons retain role colors and prevent duplicate activation.

The frontend `tokens.json` is the canonical platform-neutral manifest. Mobile keeps a reviewed local snapshot; frontend verification/builds never read a mobile checkout. The staff webapp is light-only. Dark manifest values support mobile and component compatibility checks; they do not enable a web theme switch.

## Tokens and assets

From the frontend root:

```sh
bun repo generate brand
bun repo check brand
```

Edit the manifest rather than generated `apps/webapp/src/lib/design-system/tokens.css`. The generated CSS is imported by the webapp stylesheet. A coordinated token-version change supplies the matching snapshot to mobile.

`assets.json` records SHA-256 integrity for bundled logos, fonts and OFL licenses. `visual-literals.json` records reviewed existing per-file literals; it is not permission to add new per-screen palettes. Checks reject increases, changed/missing assets, remote font loading, generated drift and inaccessible semantic text pairs. After explicitly reviewing changed assets/literals, use `bun repo generate reviewed-brand-baseline` and inspect its diff.

Use supplied outlined EDAYA SVG artwork, bundled Poppins headings and Inter UI, existing semantic tokens and reusable components. Full visual requirements live in the [design-language spec](../docs/specs/design-language-spec.md); the [component registry](../docs/specs/shared-components-spec.md) identifies the production building blocks. Styling preserves product behavior, permissions, data and effective layouts.

## Visual review

The development-only `/__design` page previews the revised geometry through `reference-geometry.css`, scoped to the reference document and its portaled overlays. Its `ReferenceButton` composes the production Button with the proposed fixed status slot. Application routes retain their current styling until this visual review is accepted and the shared primitives adopt the norm. The older `control`, `base`, `surface` and `overlay` radius tokens remain compatibility values; new roles are additive and must be used for the revised geometry. Do not change compatibility values to roll out this preview implicitly.

Review the FR/EN controls, busy toggle, List/Table, Filter, record drawer, short/wide form and focused task examples. The viewport and text-size controls exercise the same reference, including overlays. Text-only enlargement must not multiply fixed spacing; browser zoom remains independent.


Use the [screenshot runner](../apps/webapp/tests/README.md#capture-commands) for dated, source-identified runs under ignored `apps/webapp/.screenshots/<run-id>/`. Review relevant FR/EN, compact/wide, focus, error/empty/busy and enlarged-text states. Captures are evidence, not normative requirements or proof that a mutation succeeded.

`bun repo generate gallery` maintains a separate curated local gallery:

1. Place reviewed PNG captures in `apps/webapp/.screenshots/design-review/current/`. Preserve their original manifest provenance when curating existing captures; do not relabel old images as current-source evidence.
2. Run `bun repo generate gallery` from the repository root.
3. Open `apps/webapp/.screenshots/design-review/index.html` and inspect `manifest.json`.

The generator requires at least one PNG, records image hashes/pixels and source/token identity, and retains existing metadata for unchanged captures. New captures use filename conventions such as `students-desktop-fr.png`, `login-phone-en.png`, or `components-tablet-fr.png` for inferred viewing conditions; inspect/correct those metadata against the actual capture. The command indexes existing captures and does not take screenshots. It leaves dated screenshot runs untouched.

Historical committed galleries are preserved in the external documentation archive. Current reviews remain ignored outputs and can be retained with release evidence. A design-system change updates tokens/version, generated outputs, asset inventory, affected specs, this README and relevant visual evidence together. Finish with `bun run verify` and inspect the actual captures.
