---
name: check-deploy-readiness
description: Check whether the bimeet repository is ready for a production deployment by running frontend and backend linters, tests, native builds, landing build, and optionally the same Docker image builds and smoke test used by the deploy workflow. Use when the user asks to check production readiness, perform a pre-deploy/release check, run all quality gates, validate a release candidate, or says "проверь готовность к проду", "можно деплоить", "pre-deploy check", or "release readiness".
---

# Check deploy readiness

Run the repository checks and return an evidence-based deploy verdict. Treat this as a diagnostic task: do not fix failures unless the user also asks for fixes.

## Workflow

1. Read `.github/workflows/deploy.yml` before checking. If its lint, test, build, or smoke commands changed, use the workflow as the source of truth and update `scripts/check.sh` only when the user asked to maintain the checker.
2. Note whether the worktree is dirty with `git status --short`. Do not fail solely because it is dirty, but report that the verdict applies to the current local contents rather than only committed code.
3. Run the full check from the repository root:

   ```bash
   .agents/skills/check-deploy-readiness/scripts/check.sh --full
   ```

4. Use `--local` only when the user explicitly wants a quick/preliminary check or Docker is unavailable. Never call a successful local-only run fully production-ready.
5. Preserve complete failure output. Identify each failed gate and its actionable root cause; do not hide later failures after the first one.
6. If a failure appears caused by sandboxed network access or Docker access, request the required permission and retry the same gate before issuing the verdict.

## Verdict rules

- Report `READY` only when `--full` passes every gate, including all three production image builds and `deploy/ci/smoke-images.sh`.
- Report `LOCALLY GREEN, FULL CHECK NOT RUN` when `--local` passes.
- Report `NOT READY` when any required gate fails. List failed gates first, then passed gates, then environmental limitations.
- Keep warnings separate from blockers. A dirty worktree is a warning; failed lint, test, build, image build, or smoke check is a blocker.
- State that runtime secrets, external services, DNS/TLS, and the target VPS are outside this check unless they were independently validated.

## Checks performed

The bundled script runs all local gates in both modes:

- backend: `go tool golangci-lint run ./...`, `go vet ./...`, `go test ./...`, `go build ./cmd/server`
- frontend: `npm run lint`, `npm test`, `npm run build`
- landing: `yarn build`

Full mode additionally builds the backend, frontend, and landing production Dockerfiles and runs the repository's image smoke test. It uses placeholder public build-time URLs; it never reads or prints production secrets and never deploys or pushes images.
