# Bimeet architecture (production)

Decisions behind this picture: [ADR](adr/). First launch: [runbooks/timeweb-launch.md](runbooks/timeweb-launch.md).

## 1. Containers on the server

```mermaid
flowchart LR
    user([Browser])

    subgraph vm["Timeweb Cloud VM, Moscow (msk-1): 1 CPU / 2 GB / 15 GB NVMe"]
        traefik["Traefik v3<br/>:80 → :443, Let's Encrypt"]
        landing["landing<br/>nginx, static Next.js export"]
        frontend["frontend<br/>nginx, static React + /api/ proxy"]
        backend["backend<br/>Go, :8080"]
        postgres[("Postgres 16<br/>volume postgres_data")]
        minio[("MinIO<br/>volume minio_data")]
    end

    user -- "bimeet.pro, www" --> traefik
    user -- "app.bimeet.pro" --> traefik
    user -- "s3.bimeet.pro (presigned)" --> traefik
    traefik --> landing
    traefik --> frontend
    traefik --> minio
    frontend -- "/api/*" --> backend
    backend --> postgres
    backend -- "PutObject / presign" --> minio
```

Every service is part of one `docker-compose.prod.yml` on a shared `app-net` network on a single VM; only Traefik's ports 80 and 443 are exposed, and Traefik also obtains the Let's Encrypt certificates. The backend is not published directly: the browser talks to `app.bimeet.pro`, and the frontend's nginx proxies `/api/*` to `backend:8080`. Data (Postgres and MinIO files) lives in Docker volumes on the same VM's disk, which is why an off-server backup is still an open question ([ADR 0003](adr/0003-minio-on-server.md)).

## 2. Deployment

```mermaid
flowchart LR
    dev([git push tag]) --> lint
    subgraph gha["GitHub Actions: deploy.yml"]
        lint["lint<br/>make lint vet · npm run lint"]
        build["build<br/>3 images, tag = SHA"]
        test["test<br/>unit tests · image smoke check"]
        deploy["deploy<br/>environment: production"]
        lint --> build --> test --> deploy
    end
    build -- push --> ghcr[("GHCR<br/>ghcr.io/&lt;owner&gt;/bimeet-*")]
    deploy -- "scp compose + deploy/" --> vm["VM: ~/bimeet"]
    deploy -- "ssh: compose pull && up -d" --> vm
    ghcr -- pull --> vm
```

The pipeline runs only on a tag push and goes through four jobs in order. Images reach GHCR in the `build` job, but they go to the server only after the tests and the smoke check pass, and always with the tag of the tested commit. Deployment is an `scp` of the compose file plus `docker compose pull && up -d` over SSH as the `deploy` user; see [ADR 0004](adr/0004-ci-cd-and-registry.md).

## 3. File upload and download

```mermaid
sequenceDiagram
    autonumber
    actor B as Browser
    participant F as frontend (nginx)
    participant API as backend
    participant DB as Postgres
    participant S3 as MinIO

    Note over B,S3: Upload (avatar, chat image, receipt)
    B->>F: POST /api/... (multipart)
    F->>API: proxy
    API->>S3: PutObject(key = avatars/… | chat/… | receipts/…)
    API->>DB: store key
    API-->>B: JSON with avatar_url = /api/files/<key>

    Note over B,S3: Download
    B->>F: GET /api/files/<key>
    F->>API: proxy
    API->>API: PresignGet(key) via S3_PRESIGN_ENDPOINT, TTL 5 min
    API-->>B: 302 Location: https://s3.bimeet.pro/…?X-Amz-Signature=…
    B->>S3: GET presigned URL (through Traefik)
    S3-->>B: file
```

The database stores only the object key, and clients get a stable path `/api/files/<key>`, so the frontend and old links don't depend on the storage or the domain. On every request the backend issues a new signed link valid for a few minutes, signed with the public address `s3.bimeet.pro` rather than the internal `minio:9000`. Details and the bugs found along the way: [ADR 0002](adr/0002-file-storage-private-presigned.md).

## 4. Infrastructure in Terraform

```mermaid
flowchart TB
    subgraph tf["infra/terraform (timeweb-cloud provider 1.8.4)"]
        project["twc_project<br/>bimeet-prod"]
        key["twc_ssh_key<br/>bimeet-prod-deploy"]
        ip["twc_floating_ip<br/>msk-1"]
        server["twc_server bimeet-prod<br/>Ubuntu 24.04 · configurator ru-3<br/>cloud-init · prevent_destroy"]
        fw["twc_firewall bimeet-prod"]
        r1["rule: tcp 22<br/>admin_cidrs only"]
        r2["rules: tcp 80, 443<br/>0.0.0.0/0"]
        r3["rule: icmp"]
        r4["rules: egress<br/>tcp / udp / icmp"]
    end
    project --> server
    key --> server
    ip -- "floating_ip_id (before creation)" --> server
    fw -- "link type = server" --> server
    fw --> r1 & r2 & r3 & r4
    dns["DNS at reg.ru (outside Terraform)<br/>A: @, www, app, s3"] -. "→ server_ip" .-> ip
```

Terraform creates 12 resources: a project, an SSH key, a floating IP, the server, and a cloud firewall with seven rules. The IP is created before the server and passed in through `floating_ip_id`, because cloud-init installs Docker on first boot and needs internet access right away. DNS stays with the registrar (reg.ru); four A records are set by hand to `server_ip` from `terraform output`.
