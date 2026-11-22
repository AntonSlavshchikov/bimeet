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
| Yandex Cloud | **~1860 ₽** estimate: "starter" package 1659 ₽ (2 vCPU at 50% share / 2 GB, dynamic IP included) + 15 GB network SSD at ~13–14 ₽/GB | `ru-central1` (zones `ru-central1-a`, `-b`, `-d`) | Yes (official `yandex-cloud/yandex`) | Not started: would be a rewrite of `infra/terraform/` comparable to Timeweb's |
| Selectel | **6087.61 ₽** for the configuration originally planned (Standard, 2 vCPU / 4 GB, 20 GB "Universal v2" SSD), Selectel control panel calculator, 2026-11-17: vCPU 1470.38 ₽ + RAM 1069.36 ₽ + disk 209.68 ₽ + 11 000 IOPS on that disk 2948.62 ₽ + public IP 189.57 ₽ + router 200 ₽. TODO: the smaller Shared Line option (`ru-7a`, 1 vCPU / 2 GB, minimum IOPS) was not priced | Moscow (`ru-6`, `ru-7`) or Saint Petersburg (`ru-9`) | Yes (`selectel/selectel` + OpenStack + AWS for buckets) | Fully written (branch history up to `9eea517`): ~12 files, three providers |
| **Timeweb Cloud** | **1780 ₽** (1 CPU 3.3 GHz / 2 GB / 15 GB NVMe — 1580 ₽, IP — 200 ₽), hourly billing | Moscow (`ru-3`, zone `msk-1`) | Yes (`timeweb-cloud/timeweb-cloud` 1.8.4) | Rewrite `infra/terraform/` (~1 day); app code, compose, deploy and backups unchanged |

Selectel and Timeweb prices are from the providers' control panels on 2026-11-16. The Yandex Cloud figure is an estimate from public pages checked on 2026-11-17: the package price on the Compute Cloud page plus the network SSD rate published for Yandex managed services (13.01–14.05 ₽/GB/month); the calculator itself was not used. No yearly-billing discounts.

**Same-configuration comparison (secondary source).** Tproger compared the providers on an identical server: 2 vCPU, 4 GB RAM, 40 GB NVMe, Ubuntu 24.04, one public IPv4, Moscow [4]. The order matches the table above:

| Provider | Price/month (VAT included) | Traffic |
|---|---|---|
| Timeweb Cloud | 3000 ₽ (Premium, with IPv4) | free and unlimited |
| Selectel | 3230.91 ₽ (Standard line, `ru-7a`) | 3 TB/month free, then 0.8962 ₽/GB |
| Yandex Cloud | ~3449.89 ₽ for 720 h (Ice Lake, network SSD, OS image fee excluded) | not compared here |

### Why Yandex Cloud was dropped

- **Physical risk to data centers (realised in October 2026).** Within four days drones put three Yandex data centers out of action: Sasovo, Ryazan region (7–8 October, fully stopped; zone `ru-central1-b`), Kaluga (9 October, partly disabled) and Vladimir (10–11 October, fully stopped; zone `ru-central1-a`) [1][2]. Yandex Cloud stated in its alerts channel: "Оставшуюся конфигурацию ресурсов считаем неустойчивой. Режим работы платформы является аварийным" ("we consider the remaining resource configuration unstable; the platform is in emergency mode") and advised customers to use their own disaster recovery plans [3]. Customer services such as Dodo Pizza, Lamoda and the state system VetIS were disrupted [3]. Quota management for compute and disks was switched to manual mode with limits on expansion [1]; reports that capacity for new customers was paused came from an unnamed source and were denied by Yandex [2]. Yandex Cloud also agreed with Selectel, K2Cloud and VK Cloud to speed up moving customers [2]. For a project with a single VM and no off-site backup ([0003](0003-minio-on-server.md)), the zone a startup would pick by default (`ru-central1-a`) was exactly the one that went down.
- **Price.** About 1860 ₽/month for a 50% CPU share against 1780 ₽ at Timeweb for a full core (see the table).
- **Trust.** The author does not trust Yandex as a provider for this project. This is a subjective driver, recorded as stated.

### Why Selectel was dropped (specifically)

- **Regions and price.** The default `ru-9` turned out to be Saint Petersburg and about twice as expensive as Moscow's `ru-6`. Cheap Shared configurations (10/20/50% of a core) are not available in `ru-6`; in Moscow they exist only in `ru-2c` and `ru-7a`, and `ru-2` is marked "capacity limited".
- **Disk performance billed separately.** On the "Universal v2" SSD, IOPS are a paid reservation: 11 000 IOPS cost 2948.62 ₽/month, almost half of the 6087.61 ₽ total.
- **Router and IP billed separately.** The public IP (189.57 ₽/month) and the router (200 ₽/month) are charged on top of the VM, and the network disk is separate too.
- **S3 defaults to `kz-1`.** The bucket creation form defaults to Almaty (Kazakhstan), which contradicts the "data in Russia" driver. A bucket can't be created without topping up the balance, so the endpoint of a Russian pool was never verified.
- **Complexity.** Three Terraform providers (selectel, openstack, aws), service users, network, router and separate S3 keys: many moving parts for a single VM.

## Decision

**Timeweb Cloud, Moscow (`ru-3` / `msk-1`), one VM with 1 CPU / 2 GB / 15 GB NVMe**, described in `infra/terraform/` with a single `twc` provider: project, SSH key, floating IP, server, cloud firewall. State is local, DNS stays at reg.ru.

`terraform plan` against the real API succeeded: 12 resources to create. The API confirmed that `ru-3` is Moscow and configurator 31 is NVMe at 3.3 GHz.

## Update 2026-11-22: Ultra line instead of Premium

By launch time Timeweb had moved the Premium line in Moscow (`ru-3`) to pre-order, so it could no longer be ordered. The server uses the Ultra line in the same location instead: same size (1 CPU / 2 GB / 15 GB NVMe, 3.3 GHz), configurator 159 from `GET https://api.timeweb.cloud/api/v1/configurator/servers` (tag `ultra_msk_nvme`). The provider choice itself is unchanged.

Provider 1.8.4 (latest at the time) doesn't accept `ultra` as `twc_configurator.preset_type`, so `infra/terraform/server.tf` pins configurator 159.

## References

1. SecurityLab, 2026-10-11: <https://www.securitylab.ru/news/578584.php>
2. Kommersant, 2026-10-11: <https://kommersant.ru/doc/9024163>
3. Expert, 2026-10-11: <https://expert.ru/news/rabota-data-tsentra-yandeksa-vo-vladimire-ostanovlena-posle-ataki-bpla>
4. V. Turchak, "Облачные серверы в России: сравниваем провайдеров на одинаковой конфигурации", Tproger, 2026-10-30: <https://tproger.ru/articles/oblachnye-servery-v-rossii-sravnivaem-provajderov-na-odinakovoj>

## Consequences

**Positive**
- Cheaper than Selectel for a comparable size; one bill with no separate router charge.
- Simpler Terraform: one provider, 12 resources, no networks, routers or service users.
- Data (Postgres and MinIO files) physically in Moscow.
- Hourly billing: the server is created shortly before the defense and paid only from then on.

**Negative**
- The Selectel Terraform work was thrown away (it remains in the branch history).
- At the time of the choice some Timeweb regions had a queue ("pre-order"); Moscow did not.
- A stopped Timeweb server is still billed, so it can't be switched off between work sessions to save money (author's check, 2026-11-17). The saving comes from creating the server shortly before the defense instead. Selectel has "shelving" for this case.
- CI/CD (GitHub Actions, GHCR) and certificate issuance (Let's Encrypt) run outside Russia. This is infrastructure traffic, not user data; see [0004](0004-ci-cd-and-registry.md).
