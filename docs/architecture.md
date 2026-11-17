# Архитектура Bimeet (прод)

Решения, на которых держится схема: [ADR](adr/). Запуск: [runbooks/timeweb-launch.md](runbooks/timeweb-launch.md).

## 1. Контейнеры на сервере

```mermaid
flowchart LR
    user([Браузер])

    subgraph vm["ВМ Timeweb Cloud, Москва (msk-1): 1 CPU / 2 ГБ / 15 ГБ NVMe"]
        traefik["Traefik v3<br/>:80 → :443, Let's Encrypt"]
        landing["landing<br/>nginx, статика Next.js"]
        frontend["frontend<br/>nginx, статика React + прокси /api/"]
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

Все сервисы — один `docker-compose.prod.yml` в общей сети `app-net` на одной ВМ; наружу открыты только порты 80 и 443 у Traefik, он же выпускает сертификаты Let's Encrypt. Backend не публикуется напрямую: браузер ходит на `app.bimeet.pro`, а nginx фронтенда проксирует `/api/*` в `backend:8080`. Данные (Postgres и файлы MinIO) лежат в Docker-томах на диске этой же ВМ, поэтому бэкап вне сервера — открытый вопрос ([ADR 0003](adr/0003-minio-on-server.md)).

## 2. Деплой

```mermaid
flowchart LR
    dev([git push tag]) --> lint
    subgraph gha["GitHub Actions: deploy.yml"]
        lint["lint<br/>make lint vet · npm run lint"]
        build["build<br/>3 образа, тег = SHA"]
        test["test<br/>юнит-тесты · smoke образов"]
        deploy["deploy<br/>environment: production"]
        lint --> build --> test --> deploy
    end
    build -- push --> ghcr[("GHCR<br/>ghcr.io/&lt;owner&gt;/bimeet-*")]
    deploy -- "scp compose + deploy/" --> vm["ВМ: ~/bimeet"]
    deploy -- "ssh: compose pull && up -d" --> vm
    ghcr -- pull --> vm
```

Пайплайн запускается только на push тега и проходит четыре джоба последовательно. Образы попадают в GHCR на шаге `build`, но на сервер уходят только после зелёных тестов и smoke-проверки, причём именно с тегом проверенного коммита. Деплой — это `scp` compose-файла и `docker compose pull && up -d` по SSH под пользователем `deploy`, см. [ADR 0004](adr/0004-ci-cd-and-registry.md).

## 3. Загрузка и отдача файла

```mermaid
sequenceDiagram
    autonumber
    actor B as Браузер
    participant F as frontend (nginx)
    participant API as backend
    participant DB as Postgres
    participant S3 as MinIO

    Note over B,S3: Загрузка (аватар, картинка в чат, чек)
    B->>F: POST /api/... (multipart)
    F->>API: proxy
    API->>S3: PutObject(key = avatars/… | chat/… | receipts/…)
    API->>DB: сохранить key
    API-->>B: JSON с avatar_url = /api/files/<key>

    Note over B,S3: Отдача
    B->>F: GET /api/files/<key>
    F->>API: proxy
    API->>API: PresignGet(key) через S3_PRESIGN_ENDPOINT, TTL 5 мин
    API-->>B: 302 Location: https://s3.bimeet.pro/…?X-Amz-Signature=…
    B->>S3: GET presigned URL (через Traefik)
    S3-->>B: файл
```

В БД хранится только ключ объекта, а наружу отдаётся стабильный путь `/api/files/<key>`, поэтому фронтенд и старые ссылки не зависят от хранилища и домена. На каждый запрос backend выпускает новую подписанную ссылку на несколько минут и подписывает её публичным адресом `s3.bimeet.pro`, а не внутренним `minio:9000`. Подробности и найденные баги — [ADR 0002](adr/0002-file-storage-private-presigned.md).

## 4. Инфраструктура в Terraform

```mermaid
flowchart TB
    subgraph tf["infra/terraform (провайдер timeweb-cloud 1.8.4)"]
        project["twc_project<br/>bimeet-prod"]
        key["twc_ssh_key<br/>bimeet-prod-deploy"]
        ip["twc_floating_ip<br/>msk-1"]
        server["twc_server bimeet-prod<br/>Ubuntu 24.04 · configurator ru-3<br/>cloud-init · prevent_destroy"]
        fw["twc_firewall bimeet-prod"]
        r1["rule: tcp 22<br/>только admin_cidrs"]
        r2["rules: tcp 80, 443<br/>0.0.0.0/0"]
        r3["rule: icmp"]
        r4["rules: egress<br/>tcp / udp / icmp"]
    end
    project --> server
    key --> server
    ip -- "floating_ip_id (до создания)" --> server
    fw -- "link type = server" --> server
    fw --> r1 & r2 & r3 & r4
    dns["DNS на reg.ru (вне Terraform)<br/>A: @, www, app, s3"] -. "→ server_ip" .-> ip
```

Terraform создаёт 12 ресурсов: проект, SSH-ключ, floating IP, сервер и облачный файрвол с семью правилами. IP создаётся раньше сервера и передаётся через `floating_ip_id`, потому что cloud-init при первой загрузке ставит Docker и ему сразу нужен интернет. DNS остаётся у регистратора (reg.ru), четыре A-записи ставятся вручную на `server_ip` из `terraform output`.
