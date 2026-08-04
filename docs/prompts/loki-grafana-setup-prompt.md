# Loki + Grafana Setup Prompt (for Gemini)

Paste the following prompt into Gemini to get step-by-step instructions for setting up
self-hosted Loki + Grafana on your Ubuntu Droplet as a **separate** Docker Compose stack
from the `abstract-etl` app stack.

---

You are a DevOps engineer. I need step-by-step instructions to set up self-hosted
Loki + Grafana for centralized log aggregation and troubleshooting on my Ubuntu
Droplet. I will NOT put Loki/Grafana in the same Docker Compose stack as my app —
they must be a separate stack.

## My environment

- Ubuntu 22.04 Droplet (single host), root SSH access.
- Docker Engine + Docker Compose v2 installed.
- Existing app stack `abstract-etl` managed by Portainer, with two containers:
  - `abstract_backend` — Node.js/Express API (logs to stdout/stderr, port 3001 internal)
  - `abstract_frontend` — nginx SPA + reverse proxy to the backend (port 8080 internal)
- I will soon add structured JSON logging to the backend (one JSON object per line)
  and correlation IDs (an `X-Request-Id` header from nginx through to the backend).
- I want to keep this free. No Grafana Cloud, no hosted Loki.

## What I need you to produce

1. **Recommended log shipping method** for Docker containers that is free and low-footprint.
   Compare `loki-docker-driver` (Docker logging plugin) vs running `promtail` as a sidecar
   vs a standalone `promtail` container reading the Docker socket. Recommend ONE and explain
   why. I want to capture both `abstract_backend` and `abstract_frontend` stdout/stderr.
   If you recommend the Docker logging plugin, give the exact `docker plugin install` command.

2. **A separate `docker-compose.yml`** (in a new directory like `/opt/loki-stack/`) containing:
   - `loki` (single binary, single-node mode, local filesystem storage, with sensible retention
     config — e.g. 30 days, and a note on expected disk usage for ~1 GB/day of logs).
   - `grafana` (with a persistent volume for its data, port 3000).
   - `promtail` (if recommended) with a config that scrapes the Docker socket.
   - Restart policies, healthchecks, and a named network. All three should NOT be exposed to
     the public internet — bind Grafana to `127.0.0.1` or explain how to put it behind
     Cloudflare Access / a reverse proxy with auth.

3. **Grafana setup steps**: how to add Loki as a datasource (HTTP URL from within the compose
   network, e.g. `http://loki:3100`), and a minimal dashboard for troubleshooting — live
   tail/Explore usage, and a simple "errors & 5xx by service" panel using LogQL.

4. **A short LogQL cheat sheet** for my troubleshooting use case:
   - view all errors in the last hour,
   - view all 5xx responses,
   - view a single request by `requestId`,
   - filter to one container/service.

5. **Port/firewall guidance** (UFW rules if applicable) so Grafana/Loki are not exposed to the
   internet.

6. **How to start/stop/update the stack** (docker compose commands) and how to confirm logs
   are flowing into Loki.

Use numbered commands I can copy-paste, and include the final complete `docker-compose.yml`
(and `promtail` config if used) as code blocks. Keep it concise and correct for current stable
Loki/Grafana versions.

---
