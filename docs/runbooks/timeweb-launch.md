# Первый запуск на Timeweb Cloud

Минимальный прод: одна VM в Москве, всё приложение в `docker-compose.prod.yml`
(Traefik, Postgres, MinIO, backend, frontend, landing). База пустая, переносить
нечего. Порядок важен: DNS меняется в самом конце, когда сервер уже отвечает.

## 0. Что нужно заранее

- Аккаунт Timeweb Cloud с деньгами на балансе (~1800 ₽/мес за 1 CPU / 2 ГБ /
  15 ГБ и публичный IP, оплата почасовая).
- API-токен: панель → «API и Terraform» → создать токен.
- Доступ к reg.ru, где лежит DNS `bimeet.pro` (`ns1/ns2.reg.ru`). Если домен
  не твой, нужен владелец аккаунта: он поменяет четыре A-записи в шаге 4.
- Права в GitHub-репозитории на секреты и теги.

## 1. Terraform

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars   # токен, свой IP, свой ssh-ключ
terraform init
terraform plan        # читать: только создание, без удалений
terraform apply
terraform output
```

Создаётся: проект, SSH-ключ, публичный IP, сервер, файрвол (22 только со
своего IP, 80/443 всем).

После `apply` скопируй `terraform.tfstate` в надёжное место (не в git): без
него Terraform больше не знает, что создал.

Если на `plan` ошибка про конфигуратор или ОС, значит в Москве другой код
локации: поправь `location` в `terraform.tfvars` и повтори.

Если API ругается, что такой SSH-ключ уже есть, удали ключ, добавленный
руками в панели («SSH-ключи»), и повтори `apply`.

## 2. Сервер готов

Cloud-init ставит Docker, ufw, fail2ban и swap 2 ГБ, это занимает 3–5 минут.

```bash
ssh deploy@<server_ip>
docker version && sudo ufw status && swapon --show
```

## 3. Приложение

На сервере:

```bash
mkdir -p ~/bimeet && cd ~/bimeet
```

1. Скопировать с ноутбука `docker-compose.prod.yml` и папку `deploy/` (дальше
   их копирует CI сам):
   ```bash
   scp -r docker-compose.prod.yml deploy deploy@<server_ip>:~/bimeet/
   ```
2. Создать `~/bimeet/.env.prod` по `docs/deploy.md`, раздел «Создать
   `.env.prod`», вариант A (MinIO). Обязательно:
   - `S3_PRESIGN_ENDPOINT=https://s3.bimeet.pro`: без этого ссылки на файлы
     будут вести на внутренний `minio:9000`;
   - сгенерировать секреты, а не оставлять примеры:
     ```bash
     openssl rand -base64 32   # JWT_SECRET, POSTGRES_PASSWORD, MINIO_ROOT_PASSWORD
     ```
   - `chmod 600 .env.prod`.

## 4. DNS (reg.ru)

В DNS-зоне `bimeet.pro` на reg.ru поставить A-записи на `server_ip`:

| Имя | Зачем |
|---|---|
| `@` | лендинг |
| `www` | лендинг |
| `app` | приложение |
| `s3` | MinIO, через него браузер получает файлы |

TTL 300. Проверка: `dig +short app.bimeet.pro` возвращает `server_ip`. Пока
DNS не обновился, Let's Encrypt не выдаст сертификаты.

## 5. Деплой

Для CI отдельный ключ, чтобы личный ключ не лежал в GitHub:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/bimeet-ci -N "" -C bimeet-ci
ssh-copy-id -i ~/.ssh/bimeet-ci.pub deploy@<server_ip>
```

GitHub → Settings → Secrets → Actions:

| Секрет | Значение |
|---|---|
| `SSH_HOST` | `server_ip` |
| `SSH_USER` | `deploy` |
| `SSH_KEY` | содержимое `~/.ssh/bimeet-ci` (приватный) |
| `VITE_API_URL`, `NEXT_PUBLIC_APP_URL` | `https://app.bimeet.pro` |

Остальные (`GHCR_TOKEN`, `VITE_ADMIN_EMAILS`) уже есть. Потом смержить PR и
поставить тег: `deploy.yml` соберёт образы и выкатит их на сервер.

## 6. Проверка

- `https://bimeet.pro` открывает лендинг, `https://app.bimeet.pro` — приложение,
  сертификат валидный.
- Регистрация, создание встречи.
- Загрузка аватара: в DevTools → Network запрос `/api/files/...` отвечает 302
  на `s3.bimeet.pro`, картинка показывается.

Логи: `docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f backend traefik`.

## Чего здесь нет (сознательно)

- **Бэкапы БД**: скрипты готовы (`infra/backup/`), но им нужен бакет вне
  сервера, см. `backup-restore.md`. Перед защитой хотя бы раз снять дамп
  руками: `docker compose ... exec -T postgres pg_dump -Fc -U bimeet bimeet > bimeet.dump`
  и забрать его на ноутбук через `scp`.
- **Файлы вне сервера**: MinIO лежит на диске VM. Переезд в S3-бакет Timeweb —
  поменять пять переменных S3 в `.env.prod`, код уже это умеет.
