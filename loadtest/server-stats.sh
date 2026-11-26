#!/usr/bin/env bash
# Samples per-container CPU/RAM and open HTTPS connections on the server
# every 5 s while a load test runs. Output: CSV on stdout.
#   SSH_KEY=~/.ssh/bimeet-admin HOST=deploy@<ip> loadtest/server-stats.sh > stats.csv
set -euo pipefail
: "${HOST:?set HOST, e.g. deploy@1.2.3.4}"
KEY=${SSH_KEY:-~/.ssh/bimeet-admin}
echo "time,container,cpu_pct,mem_used,conns_443"
ssh -i "$KEY" "$HOST" 'while true; do
  t=$(date -u +%H:%M:%S)
  c=$(ss -Htn state established "( sport = :443 )" | wc -l)
  docker stats --no-stream --format "{{.Name}},{{.CPUPerc}},{{.MemUsage}}" |
    sed "s/ \/ [^,]*$//; s/%//; s/^/$t,/; s/$/,$c/"
  sleep 4
done'
