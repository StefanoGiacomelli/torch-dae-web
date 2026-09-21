# Deployment

## Target

The initial target is GitHub Pages for `StefanoGiacomelli/torch-dae-web`:

```text
https://stefanogiacomelli.github.io/torch-dae-web/
```

`.github/workflows/deploy-pages.yml` builds a static site with:

```text
ASTRO_SITE_URL=https://stefanogiacomelli.github.io
ASTRO_BASE_PATH=/torch-dae-web/
TORCH_DAE_SOURCE=github
```

Internal links are derived from Astro's base path, and `npm run test:pages` verifies navigation plus reload of `/torch-dae-web/technical-cards/` with URL query state.

## Human enablement

After Phase 05 review and commit:

1. In GitHub repository Settings → Pages, choose **GitHub Actions** as the source.
2. Protect `main` and require the `CI / validate` check before merge.
3. In Settings → Environments → `github-pages`, add a deployment branch/tag rule allowing `main` only.
4. Review the committed production catalogue ref/SHA and the Pages build configuration.
5. Confirm CI / validate is green for the exact `main` HEAD to be deployed. Only then manually dispatch **Deploy GitHub Pages** from that `main` ref.
6. Confirm the workflow's `github-pages` environment URL.
7. Smoke-test `/`, `/technical-cards/`, theme persistence, a copied comparison URL, and a direct deep-route reload.
8. Re-verify the stable official GitHub, PyPI, and Read the Docs destinations at go-live, then verify Model Card, Technical Card, and raw NPZ links.

No repository secret is required; the workflow uses GitHub's Pages OIDC token and minimal permissions. Deployment is manual-only; its build job rejects any ref other than `refs/heads/main`, while pull requests and ordinary pushes run CI but cannot deploy. Only the deploy job targets the protected `github-pages` environment. The repository owner—not the workflow—enables Pages, environment rules, and branch protection.

The navbar uses the stable official project/latest URLs. External GitHub, PyPI, and Read the Docs publication state is operational state and must be checked directly at go-live rather than recorded as a durable version claim here.

If a custom domain is introduced, set `ASTRO_SITE_URL` to the origin and `ASTRO_BASE_PATH=/`, update the workflow, then rerun the base-path test with the final arrangement before deployment.

## Cache behavior

Actions caches npm's download cache through `setup-node`; it does not cache generated catalogue output. Every CI/deployment run resolves, validates, and normalizes canonical data. Browsers receive hashed Astro assets suitable for long-lived immutable caching; HTML remains the deployment entry point and should use normal Pages revalidation.
