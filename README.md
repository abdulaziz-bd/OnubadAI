# Onubad AI

Real-time AI-powered translation app built with Next.js and OpenAI.

![Onubad AI translator](public/screenshot.png)

## Features

- Text translation with history
- Live voice translation with OpenAI Realtime API
- Text-to-speech output with configurable voice settings

## Stack

- Next.js 14, TypeScript, Tailwind CSS
- OpenAI API (GPT, Realtime, TTS)

## Getting Started

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Makefile

```bash
make setup        # copy .env.example → .env.local and install deps
make dev          # start dev server
make build        # production build
make start        # start production server
make docker-build # build Docker image
make docker-run   # run Docker container (loads .env.local)
```

## Docker

```bash
# build
docker build -t onubadai .

# run (pass your env file)
docker run --env-file .env.local -p 3000:3000 onubadai
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

See `.env.example` for required keys.

## License

MIT
