# Локальный CI

Команды повторяют шаги из [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Всё сразу (frontend + backend)

Из корня репозитория:

```bash
npm run ci
```

Только frontend:

```bash
npm run ci:frontend
```

Только backend:

```bash
npm run ci:backend
```

## Frontend

Из папки `frontend/`:

```bash
npm run ci
```

Или по шагам:

```bash
npm run format:check
npm run lint
npm run steiger
npm run test
npm run build
```

## Backend

Из папки `backend/`:

```bash
npm run ci
```

Или по шагам:

```bash
npm run prisma:generate
npm run lint:ci
npm run test
npm run build
```

## Перед первым запуском

Установите зависимости в обеих частях проекта:

```bash
cd frontend && npm ci
cd ../backend && npm ci
```

После этого `npm run ci` из корня можно запускать без перехода в подпапки.
