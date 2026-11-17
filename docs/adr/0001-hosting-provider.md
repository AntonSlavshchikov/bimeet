# ADR 0001: Hosting provider — Timeweb Cloud

- Status: accepted
- Date: 2026-11-16
- Related: [0003](0003-minio-on-server.md), `infra/terraform/README.md`

## Context

Bimeet is a single `docker-compose.prod.yml` (Traefik, Postgres, MinIO, backend, frontend, landing) that needs one VM with a public IP. The old production server is down, so there is no data to migrate. The infrastructure has to be described as code and shown at the Capstone defense, without paying for resources the project doesn't need.

The selection went Yandex Cloud → Selectel → Timeweb Cloud.

## Decision drivers

- **User data stays in Russia.** Federal Law 242-FZ requires personal data of Russian citizens to be stored on servers in Russia. The database and uploaded files must live in a Russian data center.
- **Terraform.** The provider must have a working Terraform provider: infrastructure as code is part of the defense.
- **Price.** A student project paid for by the author. The smallest size that fits the stack is enough (estimate: 1 CPU / 2 GB RAM / 15 GB disk plus swap).
- **Moscow region.** Closer to users, and no waiting queue for resources.

## Considered options

| Option | Price/month (smallest fitting size + IP) | Region | Terraform | Migration effort |
|---|---|---|---|---|
| Yandex Cloud | TODO: price not recorded in the repo | TODO | TODO | TODO: why it was dropped is not recorded in the repo |
| Selectel | TODO: VM price not recorded. Billed separately: public IP 189.57 ₽ + router 200 ₽ | Moscow (`ru-6`, `ru-7`) or Saint Petersburg (`ru-9`) | Yes (`selectel/selectel` + OpenStack + AWS for buckets) | Fully written (branch history up to `9eea517`): ~12 files, three providers |
| **Timeweb Cloud** | **1780 ₽** (1 CPU 3.3 GHz / 2 GB / 15 GB NVMe — 1580 ₽, IP — 200 ₽), hourly billing | Moscow (`ru-3`, zone `msk-1`) | Yes (`timeweb-cloud/timeweb-cloud` 1.8.4) | Rewrite `infra/terraform/` (~1 day); app code, compose, deploy and backups unchanged |

Prices are from the providers' control panels on 2026-11-16, without yearly-billing discounts.

### Why Selectel was dropped (specifically)

- **Regions and price.** The default `ru-9` turned out to be Saint Petersburg and about twice as expensive as Moscow's `ru-6`. Cheap Shared configurations (10/20/50% of a core) are not available in `ru-6`; in Moscow they exist only in `ru-2c` and `ru-7a`, and `ru-2` is marked "capacity limited".
- **Router and IP billed separately.** The public IP (189.57 ₽/month) and the router (200 ₽/month) are charged on top of the VM, and the network disk is separate too.
- **S3 defaults to `kz-1`.** The bucket creation form defaults to Almaty (Kazakhstan), which contradicts the "data in Russia" driver. A bucket can't be created without topping up the balance, so the endpoint of a Russian pool was never verified.
- **Complexity.** Three Terraform providers (selectel, openstack, aws), service users, network, router and separate S3 keys: many moving parts for a single VM.

## Decision

**Timeweb Cloud, Moscow (`ru-3` / `msk-1`), one VM with 1 CPU / 2 GB / 15 GB NVMe**, described in `infra/terraform/` with a single `twc` provider: project, SSH key, floating IP, server, cloud firewall. State is local, DNS stays at reg.ru.

`terraform plan` against the real API succeeded: 12 resources to create. The API confirmed that `ru-3` is Moscow and configurator 31 is NVMe at 3.3 GHz.

## Consequences

**Positive**
- Cheaper than Selectel for a comparable size; one bill with no separate router charge.
- Simpler Terraform: one provider, 12 resources, no networks, routers or service users.
- Data (Postgres and MinIO files) physically in Moscow.
- Hourly billing: the server can be brought up shortly before the defense.

**Negative**
- The Selectel Terraform work was thrown away (it remains in the branch history).
- At the time of the choice some Timeweb regions had a queue ("pre-order"); Moscow did not.
- TODO: not verified whether a stopped Timeweb server is still billed (Selectel has "shelving" for this).
- CI/CD (GitHub Actions, GHCR) and certificate issuance (Let's Encrypt) run outside Russia. This is infrastructure traffic, not user data; see [0004](0004-ci-cd-and-registry.md).
