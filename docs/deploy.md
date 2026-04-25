# Деплой

## Обзор

| Сервис | Образ | Порт |
|---|---|---|
| Backend (Go API) | `bimeet-backend` | внутренний :8080 |
| Frontend (React SPA) | `bimeet-frontend` | :80 |
| Landing (Next.js static) | `bimeet-landing` | :3000 |
| PostgreSQL | `postgres:16-alpine` | внутренний |
| MinIO (S3-совместимое хранилище) | `minio/minio` | внутренний |

Образы хранятся в GitHub Container Registry (GHCR). Деплой запускается автоматически при пуше в `master` через GitHub Actions.

---

## Первоначальная настройка

### 1. Подготовка VPS

Установить Docker и Docker Compose:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

Создать рабочую директорию и скопировать файлы:

```bash
mkdir ~/bimeet && cd ~/bimeet
```

Скопировать на VPS два файла из репозитория:
- `docker-compose.prod.yml`
- `.env.prod` (создать по шаблону `.env.prod.example`)

### 2. Создать `.env.prod`

```bash
cp .env.prod.example .env.prod
nano .env.prod
```

Обязательно заполнить:

```env
# База данных
DSN=postgres://bimeet:<пароль>@postgres:5432/bimeet?sslmode=disable
POSTGRES_PASSWORD=<тот же пароль>

# JWT
JWT_SECRET=<случайная строка 32+ символа>

# URL приложения
FRONTEND_URL=https://app.your-domain.com

# GITHUB (для pull образов из GHCR)
GITHUB_REPOSITORY_OWNER=<ваш github username>
```

Для S3 выбрать один из двух вариантов:

**Вариант A — AWS S3:**
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>
S3_BUCKET=<bucket>
S3_PUBLIC_BASE_URL=https://<bucket>.s3.<region>.amazonaws.com
```

**Вариант B — MinIO (встроенный):**
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=<пароль>
S3_BUCKET=avatars
S3_ENDPOINT=http://minio:9000
S3_PUBLIC_BASE_URL=https://app.your-domain.com/minio/avatars
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=<тот же пароль>
```

### 3. Настроить GitHub Secrets

В репозитории: **Settings → Secrets and variables → Actions → New repository secret**

| Секрет | Значение |
|---|---|
| `SSH_HOST` | IP или домен VPS |
| `SSH_USER` | имя пользователя на VPS (например `ubuntu`) |
| `SSH_KEY` | приватный SSH-ключ (содержимое `~/.ssh/id_rsa`) |
| `VITE_API_URL` | URL бэкенда, например `https://api.your-domain.com` |
| `NEXT_PUBLIC_APP_URL` | URL SPA, например `https://app.your-domain.com` |

### 4. Настроить SSH-ключ на VPS

На локальной машине:
```bash
ssh-keygen -t ed25519 -C "github-actions"
cat ~/.ssh/id_ed25519.pub
```

На VPS добавить публичный ключ в `~/.ssh/authorized_keys`.

В GitHub Secrets добавить содержимое `~/.ssh/id_ed25519` как `SSH_KEY`.

---

## Автоматический деплой (CI/CD)

После настройки секретов — деплой происходит автоматически при каждом `git push` в `master`:

1. GitHub Actions собирает три Docker-образа
2. Пушит в GHCR (`ghcr.io/<owner>/bimeet-*:latest`)
3. По SSH заходит на VPS
4. Выполняет `docker compose pull && docker compose up -d`

Статус деплоя: вкладка **Actions** в репозитории GitHub.

---

## Ручной деплой

Если нужно задеплоить без пуша в `master`:

```bash
# На VPS
cd ~/bimeet
echo "<GITHUB_TOKEN>" | docker login ghcr.io -u <username> --password-stdin
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

Или запустить GitHub Actions вручную: **Actions → Deploy → Run workflow**.

---

## Обновление приложения

Просто пушим изменения в `master` — CI/CD сделает остальное:

```bash
git push origin master
```

---

## Откат

На VPS сохраняются только образы с тегом `:latest`. Для отката вернуть нужный коммит и запустить деплой:

```bash
git revert HEAD
git push origin master
```

Или откатить образ вручную, указав конкретный SHA:

```bash
docker pull ghcr.io/<owner>/bimeet-backend:<sha>
docker tag ghcr.io/<owner>/bimeet-backend:<sha> ghcr.io/<owner>/bimeet-backend:latest
docker compose -f docker-compose.prod.yml up -d backend
```

---

## Мониторинг

```bash
# Статус всех сервисов
docker compose -f docker-compose.prod.yml ps

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
