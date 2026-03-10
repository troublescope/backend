SHELL := /bin/sh

# Override these if needed:
# make deploy-prod VERCEL_TOKEN=xxx
# make deploy-preview VERCEL=vercel
VERCEL ?= npx vercel
VERCEL_TOKEN ?=
VERCEL_SCOPE ?=
VERCEL_ENV ?=production

ifneq ($(strip $(VERCEL_TOKEN)),)
VERCEL_AUTH_FLAG := --token $(VERCEL_TOKEN)
endif

ifneq ($(strip $(VERCEL_SCOPE)),)
VERCEL_SCOPE_FLAG := --scope $(VERCEL_SCOPE)
endif

.PHONY: help deps build build-backend typecheck-frontend vercel-link vercel-pull deploy-preview deploy-prod logs clean

help:
	@echo "Available targets:"
	@echo "  make deps              - install backend and frontend dependencies"
	@echo "  make build             - run backend build + frontend typecheck"
	@echo "  make vercel-link       - link this directory to a Vercel project"
	@echo "  make vercel-pull       - pull Vercel env/config (default: production)"
	@echo "  make deploy-preview    - deploy preview to Vercel"
	@echo "  make deploy-prod       - deploy production to Vercel"
	@echo "  make logs              - show latest Vercel logs"

deps:
	npm install
	cd frontend && npm install

build: build-backend typecheck-frontend

build-backend:
	npm run build

typecheck-frontend:
	npx tsc -p frontend/tsconfig.json --noEmit

vercel-link:
	$(VERCEL) link $(VERCEL_SCOPE_FLAG) $(VERCEL_AUTH_FLAG)

vercel-pull:
	$(VERCEL) pull --yes --environment=$(VERCEL_ENV) $(VERCEL_SCOPE_FLAG) $(VERCEL_AUTH_FLAG)

deploy-preview: build
	$(VERCEL) deploy $(VERCEL_SCOPE_FLAG) $(VERCEL_AUTH_FLAG)

deploy-prod: build
	$(VERCEL) deploy --prod $(VERCEL_SCOPE_FLAG) $(VERCEL_AUTH_FLAG)

logs:
	$(VERCEL) logs $(VERCEL_SCOPE_FLAG) $(VERCEL_AUTH_FLAG)

clean:
	rm -rf dist
