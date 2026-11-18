# ADR 0004: CI/CD — GitHub Actions + GHCR, tag-triggered deploy over SSH

- Status: accepted
- Date: 2026-11-16
- Related: [0001](0001-hosting-provider.md)

## Context

The code is on GitHub (`AntonSlavshchikov/bimeet`), CI already runs on GitHub Actions, and images live in GitHub Container Registry. During the Selectel migration a second image push to Selectel Container Registry (CRaaS) was added, but after choosing Timeweb ([0001](0001-hosting-provider.md)) it lost its purpose.

## Decision drivers

- Don't break a working pipeline right before the defense.
- As few new services and secrets as possible.
- Understand the risk of depending on foreign services and have a way out.

## Considered options

1. **GitHub Actions + GHCR (as is).**
2. **GitHub Actions + Selectel CRaaS.** A registry in Russia, but the provider is no longer used.
3. **GitHub Actions + the Timeweb Cloud registry.** TODO: availability and price not investigated.
4. **Moving the repository and CI to a Russian service (e.g. GitVerse).**

## Decision

Option 1. The pipeline `.github/workflows/deploy.yml` runs **on a tag push**:

1. `lint`: `make lint vet` (Go), `npm run lint` (frontend);
2. `build`: builds three images (backend, frontend, landing) and pushes them to GHCR tagged with the commit SHA;
3. `test`: Go and frontend unit tests, then a smoke check of the built images (`deploy/ci/smoke-images.sh`);
4. `deploy` (environment `prod`): `scp` of `docker-compose.prod.yml` and `deploy/` to the server, then over SSH `docker compose pull && up -d` with the `IMAGE_TAG` of the tested commit.

The CRaaS push steps were removed (commit `5d1d5d1`). Besides being unneeded, they used the `secrets` context in a step-level `if:`, which GitHub Actions doesn't allow, so the first tag would have failed the workflow.

Separately, `.github/workflows/infra.yml` runs `terraform fmt`, `validate` and tflint on PRs that touch `infra/**`, with no credentials and no `plan`/`apply`.

## Consequences

**Positive**
- Nothing to migrate or set up again; the pipeline already worked.
- Exactly the image that passed the tests is deployed (tag = SHA).
- Manual deploy approval is possible through required reviewers on the `prod` environment.

**Negative / risks**
- **Dependence on foreign services.** GitHub runners and GHCR images are outside Russia. This is not user data (that stays in Russia, see 0001), but deploy availability depends on it. Precedent: in 2024 Docker Hub restricted access for users from Russia. TODO: exact dates and scope are not documented in the repo.
- **"build → test" order:** an image reaches GHCR before the tests. It goes to the server only after green tests, but untested tags may remain in the registry.
- SSH deploy with the key in GitHub secrets: compromising the repository gives access to the server. Mitigation: a separate CI key and the `deploy` user (runbook `timeweb-launch.md`).

### Way out

- Images: build and push to a Russian registry (Timeweb's or any registry in Russia) by changing `REGISTRY` and the login in `deploy.yml`; compose already reads the prefix from `IMAGE_REGISTRY`.
- CI: GitVerse claims compatibility with GitHub Actions syntax, so the workflow could move almost unchanged. TODO: compatibility not verified.
- Last resort: build images locally and roll them out over SSH by hand (the manual deploy section of `docs/deploy.md`).
