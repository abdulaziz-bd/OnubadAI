.PHONY: setup dev build start docker-build docker-run

setup:
	cp -n .env.example .env.local || true
	npm install

dev:
	npm run dev

build:
	npm run build

start:
	npm run start

docker-build:
	docker build -t onubadai .

docker-run:
	docker run --env-file .env.local -p 3000:3000 onubadai
