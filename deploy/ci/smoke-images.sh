#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: $0 <image-prefix> <image-tag>" >&2
  exit 2
fi

image_prefix=$1
image_tag=$2
network=bimeet-ci
containers=(bimeet-ci-postgres bimeet-ci-backend bimeet-ci-frontend bimeet-ci-landing)

cleanup() {
  docker rm -f "${containers[@]}" >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
}

on_exit() {
  status=$?
  trap - EXIT
  if (( status != 0 )); then
    for container in "${containers[@]}"; do
      docker logs "$container" 2>/dev/null || true
    done
  fi
  cleanup
  exit "$status"
}

wait_for_http() {
  name=$1
  url=$2
  for _ in {1..60}; do
    if curl --fail --silent "$url" >/dev/null; then
      return 0
    fi
    sleep 1
  done
  echo "$name did not become ready: $url" >&2
  return 1
}

trap on_exit EXIT
cleanup

docker network create "$network" >/dev/null

docker run -d \
  --name bimeet-ci-postgres \
  --network "$network" \
  -e POSTGRES_DB=bimeet \
  -e POSTGRES_USER=bimeet \
  -e POSTGRES_PASSWORD=bimeet \
  postgres:16-alpine >/dev/null

for _ in {1..60}; do
  if docker exec bimeet-ci-postgres pg_isready -U bimeet >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
docker exec bimeet-ci-postgres pg_isready -U bimeet >/dev/null

docker run -d \
  --name bimeet-ci-backend \
  --network "$network" \
  --network-alias backend \
  -p 127.0.0.1:18080:8080 \
  -e DSN=postgres://bimeet:bimeet@bimeet-ci-postgres:5432/bimeet?sslmode=disable \
  -e JWT_SECRET=ci-smoke-test-secret \
  -e PORT=8080 \
  "$image_prefix/bimeet-backend:$image_tag" >/dev/null

wait_for_http backend http://127.0.0.1:18080/swagger/doc.json

docker run -d \
  --name bimeet-ci-frontend \
  --network "$network" \
  -p 127.0.0.1:18081:80 \
  "$image_prefix/bimeet-frontend:$image_tag" >/dev/null

docker run -d \
  --name bimeet-ci-landing \
  --network "$network" \
  -p 127.0.0.1:18082:80 \
  "$image_prefix/bimeet-landing:$image_tag" >/dev/null

wait_for_http frontend http://127.0.0.1:18081/
wait_for_http landing http://127.0.0.1:18082/
