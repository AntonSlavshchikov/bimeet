#!/usr/bin/env bash

set -uo pipefail

usage() {
  cat <<'EOF'
Usage: check.sh [--full|--local]

  --full   Run local gates, build production Docker images, and smoke-test them.
           This is the default and the only mode that can produce READY.
  --local  Run linters, tests, and native builds only.
EOF
}

mode=full
case "${1:-}" in
  ""|--full) mode=full ;;
  --local) mode=local ;;
  -h|--help) usage; exit 0 ;;
  *) usage >&2; exit 2 ;;
esac

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
repo_root=$(git -C "$script_dir" rev-parse --show-toplevel 2>/dev/null) || {
  echo "ERROR: the checker must live inside a Git worktree" >&2
  exit 2
}

temp_dir=$(mktemp -d "${TMPDIR:-/tmp}/bimeet-readiness.XXXXXX")
cleanup() {
  rm -rf -- "$temp_dir"
}
trap cleanup EXIT

declare -a passed=()
declare -a failed=()

run_gate() {
  local label=$1
  local directory=$2
  shift 2

  printf '\n==> %s\n' "$label"
  if (cd "$directory" && "$@"); then
    passed+=("$label")
    printf '<== PASS: %s\n' "$label"
  else
    failed+=("$label")
    printf '<== FAIL: %s\n' "$label" >&2
  fi
}

require_tool() {
  local tool=$1
  if ! command -v "$tool" >/dev/null 2>&1; then
    failed+=("Required tool: $tool")
    printf 'MISSING TOOL: %s\n' "$tool" >&2
    return 1
  fi
}

echo "Bimeet deploy-readiness check ($mode mode)"
echo "Repository: $repo_root"

require_tool git || true
require_tool go || true
require_tool npm || true
require_tool yarn || true

if command -v go >/dev/null 2>&1; then
  run_gate "Backend lint" "$repo_root/backend" go tool golangci-lint run ./...
  run_gate "Backend vet" "$repo_root/backend" go vet ./...
  run_gate "Backend tests" "$repo_root/backend" go test ./...
  run_gate "Backend build" "$repo_root/backend" go build -o "$temp_dir/bimeet-server" ./cmd/server
fi

if command -v npm >/dev/null 2>&1; then
  run_gate "Frontend lint" "$repo_root/frontend" npm run lint
  run_gate "Frontend tests" "$repo_root/frontend" npm test
  run_gate "Frontend build" "$repo_root/frontend" npm run build
fi

if command -v yarn >/dev/null 2>&1; then
  run_gate "Landing build" "$repo_root/landing" yarn build
fi

if [[ "$mode" == full ]]; then
  require_tool docker || true

  if command -v docker >/dev/null 2>&1; then
    image_prefix=bimeet-readiness
    image_tag=local
    docker_failures_before=${#failed[@]}

    run_gate "Backend production image" "$repo_root" \
      docker build --tag "$image_prefix/bimeet-backend:$image_tag" backend
    run_gate "Frontend production image" "$repo_root" \
      docker build \
        --build-arg VITE_API_URL=https://api.example.invalid \
        --build-arg VITE_ADMIN_EMAILS=admin@example.invalid \
        --tag "$image_prefix/bimeet-frontend:$image_tag" frontend
    run_gate "Landing production image" "$repo_root" \
      docker build \
        --build-arg NEXT_PUBLIC_APP_URL=https://app.example.invalid \
        --tag "$image_prefix/bimeet-landing:$image_tag" landing

    if (( ${#failed[@]} == docker_failures_before )); then
      run_gate "Production image smoke test" "$repo_root" \
        "$repo_root/deploy/ci/smoke-images.sh" "$image_prefix" "$image_tag"
    else
      failed+=("Production image smoke test (blocked by image build failure)")
      echo "SKIP: Production image smoke test (an image build failed)" >&2
    fi
  fi
fi

printf '\nSummary\n'
printf '  Passed: %d\n' "${#passed[@]}"
for gate in "${passed[@]}"; do
  printf '    - %s\n' "$gate"
done
printf '  Failed: %d\n' "${#failed[@]}"
if [[ -n "${failed[*]-}" ]]; then
  for gate in "${failed[@]}"; do
    printf '    - %s\n' "$gate"
  done
fi

if [[ -n "${failed[*]-}" ]]; then
  echo "RESULT: NOT READY"
  exit 1
fi

if [[ "$mode" == full ]]; then
  echo "RESULT: READY"
else
  echo "RESULT: LOCALLY GREEN, FULL CHECK NOT RUN"
fi
