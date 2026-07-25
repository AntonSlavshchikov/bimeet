COMPOSE := docker compose

.DEFAULT_GOAL := help

.PHONY: help dev up down restart rebuild logs ps \
	backend-logs frontend-logs backend-shell frontend-shell db-shell \
	test lint

help:
	@echo "Bimeet development commands:"
	@echo "  make dev             Build and run the full stack in the foreground"
	@echo "  make up              Build and run the full stack in the background"
	@echo "  make down            Stop and remove containers (keeps data volumes)"
	@echo "  make restart         Restart all running services"
	@echo "  make rebuild         Rebuild images and recreate containers"
	@echo "  make logs            Follow logs (optionally: make logs SERVICE=backend)"
	@echo "  make ps              Show container status"
	@echo "  make backend-logs    Follow backend logs"
	@echo "  make frontend-logs   Follow frontend logs"
	@echo "  make backend-shell   Open a shell in the backend container"
	@echo "  make frontend-shell  Open a shell in the frontend container"
	@echo "  make db-shell        Open psql in the development database"
	@echo "  make test            Run backend and frontend tests"
	@echo "  make lint            Run backend and frontend linters"

dev:
	$(COMPOSE) up --build

up:
	$(COMPOSE) up -d --build

down:
	$(COMPOSE) down --remove-orphans

restart:
	$(COMPOSE) restart

rebuild:
	$(COMPOSE) up -d --build --force-recreate

logs:
	$(COMPOSE) logs -f $(SERVICE)

ps:
	$(COMPOSE) ps -a

backend-logs:
	$(COMPOSE) logs -f backend

frontend-logs:
	$(COMPOSE) logs -f frontend

backend-shell:
	$(COMPOSE) exec backend sh

frontend-shell:
	$(COMPOSE) exec frontend sh

db-shell:
	$(COMPOSE) exec postgres psql -U bimeet -d bimeet

test:
	$(COMPOSE) run --rm --no-deps backend go test ./...
	$(COMPOSE) run --rm --no-deps frontend npm test

lint:
	$(COMPOSE) run --rm --no-deps backend go tool golangci-lint run ./...
	$(COMPOSE) run --rm --no-deps frontend npm run lint
