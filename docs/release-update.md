# Updating the catalogue release

Use only a published immutable `torch-dae` tag.

1. Verify the GitHub Release/tag exists and the intended Model Cards, Technical Cards, schemas, raw NPZ files, and provenance are present.
2. Resolve the tag independently:

   ```bash
   git ls-remote --tags https://github.com/StefanoGiacomelli/torch_dae.git
   ```

3. Update `catalogue-source.json` with the tag and its peeled commit SHA. Do not copy a remembered SHA or point production at `main`.
4. Run `npm run sync:data -- --ref <tag>`. The locked ref must resolve to the exact configured SHA.
5. Run the complete gate in `docs/development.md`, including the catalogue, content, performance, accessibility, browser, and Pages-base audits.
6. Review schema evolution before changing normalized contracts. Never infer ambiguous scientific meaning or coerce absent energy to zero.
7. Review generated counts, schema versions, comparison-context counts, provenance links, and screenshots. Directly re-verify the stable official GitHub, PyPI, and Read the Docs destinations at go-live; do not preserve a time-sensitive external-service version observation as an architectural fact.
8. Submit the ref/SHA change for review. CI syncs the release afresh; after acceptance, merge and trigger the Pages workflow.

Preferred sequence:

```text
new torch-dae release
    → update website ref + resolved SHA
    → CI sync, schema validation, audits, tests, build
    → human review
    → GitHub Pages deployment
```

The CI manual input can test another ref, but production deployment always uses the committed lock. Only manually dispatch deployment after CI / validate is green for the exact HEAD of `main` being deployed. No backend webhook or mutable live-source dependency is involved.
