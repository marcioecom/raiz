SHELL := /bin/bash
API   := apps/api

.DEFAULT_GOAL := help
.PHONY: help env up down logs api migrate seed psql docs test vet fmt check

help: ## Show this help
	@grep -hE '^[a-z-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-9s\033[0m %s\n", $$1, $$2}'

env: ## Create apps/api/.env from the example when missing
	@test -f $(API)/.env || cp $(API)/.env.example $(API)/.env
	@echo "$(API)/.env ready"

up: ## Start PostgreSQL 16
	docker compose up -d

down: ## Stop PostgreSQL (keeps the data volume)
	docker compose down

logs: ## Follow the database logs
	docker compose logs -f postgres

api: env ## Run the API on :8080 (applies migrations at boot)
	cd $(API) && go run ./cmd/api

migrate: env ## Apply pending migrations
	cd $(API) && go run ./cmd/migrate

seed: env ## Apply the demo dataset (idempotent)
	cd $(API) && go run ./cmd/seed

psql: ## Open a psql session on the local database
	docker exec -it raiz-postgres psql -U raiz -d raiz

docs: ## Open the interactive API reference
	open http://localhost:8080/docs

test: ## Run Go tests
	cd $(API) && go test ./...

vet: ## Run go vet
	cd $(API) && go vet ./...

fmt: ## Format Go code
	cd $(API) && gofmt -w .

check: ## Verify formatting, vet and tests (CI-style)
	@cd $(API) && test -z "$$(gofmt -l .)" || { echo "unformatted files, run: make fmt"; exit 1; }
	@cd $(API) && go vet ./...
	@cd $(API) && go test ./...
