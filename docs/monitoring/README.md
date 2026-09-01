# Loki + Grafana Monitoring for Abstract ETL

Self-hosted, free log aggregation for the `abstract-etl` stack. Loki + Grafana
run in a **separate** stack on `sr1`; promtail ships the app containers' logs
into Loki via the Docker socket.

## Architecture

```
abstract_backend ─┐  stdout/stderr (pino JSON)      ┌─→ Loki (retention 30d)
abstract_frontend ─┼── Docker socket ── promtail ────┤
                  └  nginx access log                └─→ Grafana (dashboards)
```

- The backend emits **one JSON object per line** (pino): `level, method, path,
  status, ms, requestId, msg` plus `user` and `tenantId` (both null when
  unauthenticated). Levels are strings (`info`, `error`) so LogQL
  `{level="error"}` works. `tenantId` enables per-tenant tracing/usage in Loki.
- nginx forwards `X-Request-Id` and logs `$request_id`, so a single request is
  traceable across both containers.
- Health-check requests and non-API 404 scanner noise are **excluded at the
  source**, so they don't pollute the store.

## Your current state

You already have a working Loki + Grafana stack. Two things are missing:

1. **Promtail pipeline** — your current `promtail-config.yml` has no `service`
   label and **no pipeline stages**, so pino JSON arrives as unparsed raw text
   and `{level="error"}`, `{status="500"}`, and the dashboard won't work.
   → Replace it with `config/promtail/promtail-config.yml` (drop-in).
2. **Grafana datasource + dashboard** — nothing is wired to visualize the logs.
   → Add the provisioning files and restart Grafana (or import the dashboard).

## Files

| Path | Purpose |
|------|---------|
| `config/promtail/promtail-config.yml` | **Drop-in promtail replacement**: adds `service` label + JSON pipeline stages |
| `config/loki/loki-config.yml` | Reference single-node Loki (your running config is fine) |
| `config/grafana/provisioning/datasources/loki.yml` | Loki datasource (with requestId drill-down) |
| `config/grafana/provisioning/dashboards/dashboards.yml` | Dashboard provider |
| `config/grafana/dashboards/abstract-etl-troubleshooting.json` | "Abstract ETL Troubleshooting" dashboard |
| `docker-compose.yml` | Reference stack (for fresh installs only) |
| `docs/prompts/loki-grafana-setup-prompt.md` | Original setup prompt (reference) |

---

## Part 1 — Update promtail (do this first)

Replace the contents of your running promtail config with
`docs/monitoring/config/promtail/promtail-config.yml`. It keeps your existing
scrape config (all containers, `container`/`stream` labels) and adds:

- a `service` label from the container's compose service name,
- a **pipeline** that parses backend pino JSON into `level`, `status`, `method`,
  `path`, `request_id`, and nginx access logs into `status`, `request_id`.

Then restart promtail in your monitoring stack:

```sh
cd <your-loki-stack-dir>
# edit your promtail config (copy the file above into place)
docker compose restart promtail
docker compose logs -f promtail    # confirm no config errors
```

> Your promtail scrapes all containers (no label filter), so the app stack does
> not need the `logging=promtail` label to be scraped. The app stack already
> carries it anyway — harmless, and useful if you later switch promtail to a
> label filter.

## Part 2 — Confirm logs are flowing into Loki

In Grafana → **Explore** → datasource **Loki**, try:

```logql
{service="backend"}
```

Then filter to real API traffic (health checks are excluded at the source):

```logql
{service="backend"} |= "request"
```

Expand any line → **Parsed Fields** should show `level`, `status`, `method`,
`path`, `requestId`, `ms`. If you see those, the pipeline is working.

## Part 3 — Add the Loki datasource & dashboard to Grafana

Two options:

**A. Provisioning (recommended, auto-loads everything)** — mount these into your
Grafana container (add to your Grafana service in the monitoring compose):

```yaml
    volumes:
      - ./config/grafana/provisioning:/etc/grafana/provisioning
      - ./config/grafana/dashboards:/var/lib/grafana/dashboards
```

Then `docker compose restart grafana`. Within ~30s the Loki datasource and the
"Abstract ETL Troubleshooting" dashboard appear (Dashboards → Abstract ETL).

**B. Manual (no compose edits)** — in the Grafana UI:

1. **Connections → Data sources → Add** → `Loki`, URL `http://loki:3100`,
   Save & test.
2. **Dashboards → New → Import** → upload
   `config/grafana/dashboards/abstract-etl-troubleshooting.json`.

## Part 4 — Redeploy the app stack

The app's `docker-compose.yml` already labels both services `logging: promtail`
(so promtail can find them if you add a label filter) and the latest image
already emits structured JSON. Redeploy the app stack via Portainer (Stack →
Edit → Deploy), or:

```sh
cd <app-stack-dir>
docker compose up -d --force-recreate
```

## Troubleshooting workflow (AI-assisted)

1. Find the failing request's ID:
   ```logql
   {level="error"} | json
   ```
2. Pull the full trace for that one request (replace the ID):
   ```logql
   {service=~"backend|frontend"} |= "3f9c2a5e-..."
   ```
   This includes the backend pino line AND the nginx access line (they share
   the same `requestId`), giving the complete round trip.
3. Hand that output to an AI model with your question.

## LogQL Cheat Sheet

```logql
# Everything from the backend
{service="backend"}

# Only request lines (excludes background/internal logs)
{service="backend"} |= "request"

# All error-level logs
{level="error"}

# Unhandled errors (with full stack in err.stack)
{level="error"} |= "unhandled error"

# All 5xx responses
{service=~"backend|frontend"} | json | status =~ "5.."

# A single request end-to-end (backend + nginx share the requestId)
{service=~"backend|frontend"} |= "REPLACE_WITH_REQUEST_ID"

# Errors in the last 1h, grouped by service
sum by (service) (count_over_time({level="error"} | json [1h]))

# Requests per minute by status
sum by (status) (rate({service="backend"} |= "request" | json [1m]))

# Slow requests (> 5s) — great for finding long AI extractions
{service="backend"} |= "request" | json | ms >= 5000 | line_format "{{.path}} took {{.ms}}ms requestId={{.requestId}}"

# Per-tenant traffic (multi-tenant): filter by tenantId
{service="backend"} |= "request" | json | tenantId == "REPLACE_WITH_TENANT_ID"

# All errors for a given tenant
{service="backend"} | json | level = "error" | tenantId == "REPLACE_WITH_TENANT_ID"

# Top slowest endpoint (by average ms)
{service="backend"} |= "request" | json | unwrap ms | avg_over_time(ms [1h]) by (path)
```

## FAQ

- **⚠️ Loki data persistence:** your running Loki config uses
  `path_prefix: /tmp/loki` — `/tmp` is wiped on container/host restart, so all
  log history is lost. Mount a Docker volume at `/loki` and change
  `path_prefix: /loki` (see `config/loki/loki-config.yml` for the reference).
- **Disk usage:** Loki TSDB on local filesystem. Budget roughly 1–2× the raw log
  size. 30 days of this app's traffic (health checks excluded) is typically a few
  hundred MB to a few GB. Adjust `limits_config.retention_period`
  (your config: `30d`).
- **Logs not showing?**
  1. `docker logs promtail` → check for config errors.
  2. `curl -s http://127.0.0.1:3100/ready` → confirm Loki is up.
  3. Confirm `service` label: `docker inspect abstract_backend` → compose label
     `com.docker.compose.service=backend`.
  4. In Grafana Explore, check the time range (defaults to last 1h).
- **Restarting promtail after config changes:**
  ```sh
  docker compose restart promtail
  docker compose logs -f promtail
  ```
