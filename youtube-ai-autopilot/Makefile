VENV ?= .venv
PY := $(VENV)/bin/python

.PHONY: install install-backend install-frontend dev api worker frontend build test demo

install: install-backend install-frontend

install-backend:
	python3 -m venv $(VENV)
	$(PY) -m pip install -r backend/requirements.txt

install-frontend:
	cd frontend && npm install

api:            ## API + worker embutido em http://localhost:8000
	cd backend && ../$(VENV)/bin/uvicorn app.main:app --reload --port 8000

worker:         ## worker separado (use EMBEDDED_WORKER=false na API)
	cd backend && ../$(PY) -m app.worker

frontend:       ## painel em modo desenvolvimento (http://localhost:5173)
	cd frontend && npm run dev

build:          ## gera frontend/dist, servido pela própria API
	cd frontend && npm run build

test:
	cd backend && ../$(PY) -m pytest -q

demo:           ## gera um Short de demonstração sem servidor
	cd backend && ../$(PY) -m app.cli demo --format short
