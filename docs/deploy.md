# Деплой

## Обзор

| Сервис | Образ | Доступ |
|---|---|---|
| Traefik (reverse proxy) | `traefik:v3.3` | :80, :443 |
| Backend (Go API) | `bimeet-backend` | внутренний :8080 |
| Frontend (React SPA) | `bimeet-frontend` | `app.bimeet.pro` |
| Landing (Next.js static) | `bimeet-landing` | `bimeet.pro`, `www.bimeet.pro` |
| PostgreSQL | `postgres:16-alpine` | внутренний |
| MinIO (S3-совместимое хранилище) | `minio/minio` | `s3.bimeet.pro` |

Образы хранятся в GitHub Container Registry (GHCR). Полный pipeline запускается автоматически при публикации Git-тега. Каждый образ получает неизменяемый тег с SHA коммита, и в production разворачиваются ровно те образы, которые прошли проверки.

---

## Маршрутизация

Traefik принимает весь входящий трафик на портах 80 и 443 и маршрутизирует по доменам:

| Домен | Сервис | Описание |
|---|---|---|
| `bimeet.pro`, `www.bimeet.pro` | landing | Лендинг |
| `app.bimeet.pro` | frontend | SPA, `/api/*` → backend (через nginx) |
| `s3.bimeet.pro` | minio | Публичные аватарки |

HTTP автоматически редиректится на HTTPS. SSL-сертификаты выпускаются через Let's Encrypt (HTTP challenge) и хранятся в Docker volume `acme_data`.

---

## Первоначальная настройка

### 1. DNS

Добавить A-записи у регистратора домена, указывающие на IP вашего VPS:

```
bimeet.pro      → <server-ip>
www.bimeet.pro  → <server-ip>
app.bimeet.pro  → <server-ip>
s3.bimeet.pro   → <server-ip>
```

### 2. Подготовка VPS

Установить Docker и Docker Compose:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

Открыть порты в firewall (нужны для Traefik и Let's Encrypt):

```bash
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 22
sudo ufw enable
```

Создать рабочую директорию:

```bash
mkdir ~/bimeet && cd ~/bimeet
```

Скопировать на VPS файл из репозитория:
- `docker-compose.prod.yml`

### 3. Создать `.env.prod`

```bash
nano .env.prod
```

Обязательно заполнить:

```env
# База данных
DSN=postgres://bimeet:<пароль>@postgres:5432/bimeet?sslmode=disable
POSTGRES_PASSWORD=<тот же пароль>

# JWT
JWT_SECRET=<случайная строка 32+ символа>
JWT_EXP_HOURS=72

# URL приложения
FRONTEND_URL=https://app.bimeet.pro

# GITHUB (для pull образов из GHCR)
GITHUB_REPOSITORY_OWNER=<ваш github username>
```

`IMAGE_TAG` хранить в `.env.prod` не требуется: GitHub Actions передаёт SHA проверенного коммита непосредственно при деплое.

Для S3 выбрать один из двух вариантов:

**Вариант A — MinIO (встроенный, рекомендуется):**
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=<надёжный пароль>
S3_BUCKET=avatars
S3_ENDPOINT=http://minio:9000
S3_PUBLIC_BASE_URL=https://s3.bimeet.pro/avatars
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=<тот же пароль>
```

**Вариант B — AWS S3:**
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>
S3_BUCKET=<bucket>
S3_PUBLIC_BASE_URL=https://<bucket>.s3.<region>.amazonaws.com
```

### 4. Настроить GitHub Secrets

В репозитории: **Settings → Secrets and variables → Actions → New repository secret**

| Секрет | Значение |
|---|---|
| `SSH_HOST` | IP или домен VPS |
| `SSH_USER` | имя пользователя на VPS (например `ubuntu`) |
| `SSH_KEY` | приватный SSH-ключ (содержимое `~/.ssh/id_ed25519`) |
| `VITE_API_URL` | `https://app.bimeet.pro` |
| `NEXT_PUBLIC_APP_URL` | `https://app.bimeet.pro` |

### 5. Настроить SSH-ключ на VPS

На локальной машине:
```bash
ssh-keygen -t ed25519 -C "github-actions"
cat ~/.ssh/id_ed25519.pub
```

На VPS добавить публичный ключ в `~/.ssh/authorized_keys`.

В GitHub Secrets добавить содержимое `~/.ssh/id_ed25519` как `SSH_KEY`.

---

## Автоматический деплой (CI/CD)

После настройки секретов pipeline запускается при публикации любого Git-тега:

1. Проверяет линтерами backend и frontend
2. Собирает три Docker-образа и публикует их в GHCR с тегом `<commit-sha>`
3. Запускает unit-тесты backend/frontend и smoke-тесты собранных контейнеров
4. По SSH разворачивает на VPS те же образы с тегом `<commit-sha>`

Каждый этап зависит от предыдущего: deploy не запустится, если lint, build или test завершились с ошибкой.

Статус деплоя: вкладка **Actions** в репозитории GitHub.

---

## Ручной деплой

Если нужно вручную повторно развернуть уже собранный и проверенный commit SHA:

```bash
# На VPS
cd ~/bimeet
echo "<GITHUB_TOKEN>" | docker login ghcr.io -u <username> --password-stdin
export GITHUB_REPOSITORY_OWNER=<username-в-нижнем-регистре>
export IMAGE_TAG=<commit-sha>
docker compose --env-file .env.prod -f docker-compose.prod.yml pull
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d
```

---

## Обновление приложения

Создаём и отправляем Git-тег — CI/CD сделает остальное:

```bash
git tag v1.2.3
git push origin v1.2.3
```

---

## Откат

Для отката укажите SHA ранее проверенного образа и повторно поднимите сервисы:

```bash
cd ~/bimeet
export GITHUB_REPOSITORY_OWNER=<username-в-нижнем-регистре>
export IMAGE_TAG=<предыдущий-commit-sha>
docker compose --env-file .env.prod -f docker-compose.prod.yml pull
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d
```

---

## Мониторинг

```bash
# Статус всех сервисов
docker compose -f docker-compose.prod.yml ps

# Логи Traefik (SSL-сертификаты, маршрутизация)
docker compose -f docker-compose.prod.yml logs -f traefik

# Логи бэкенда (live)
docker compose -f docker-compose.prod.yml logs -f backend

# Логи всех сервисов
docker compose -f docker-compose.prod.yml logs -f

# Использование ресурсов
docker stats
```

---

## Локальная разработка

Для локального запуска используется отдельный `backend/docker-compose.yml` (только инфраструктура: postgres, mailhog, minio):

```bash
cd backend
docker compose up -d

# Backend
go run ./cmd/server

# Frontend
cd ../frontend
npm run dev
```

Переменные окружения для локальной разработки — в `backend/.env` (скопировать из `backend/.env.example`).
