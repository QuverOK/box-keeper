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

Для backend скопируйте переменные окружения (или создайте `backend/.env` по образцу `backend/.env.example`):

```bash
cp backend/.env.example backend/.env
```

В `DATABASE_URL` укажите строку подключения к PostgreSQL. В CI используется placeholder-URL только для `prisma generate` и сборки — реальная БД в пайплайне не нужна.

После этого `npm run ci` из корня можно запускать без перехода в подпапки.

## GitHub Actions и push в feature-ветки

Workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) запускается при:

- push в `main`, `master` и `feature/**`;
- pull request в `main` / `master`.

Обязательные статусы **Frontend** и **Backend** всегда выполняются оба (без path-filter), чтобы совпадать с правилами репозитория «2 of 2 required status checks».

### Первый push в защищённую feature-ветку

Если GitHub отклоняет push с ошибкой `GH013` / `2 of 2 required status checks are expected`, проверки ещё не могли запуститься на удалённой ветке. Один раз ослабьте правило в [настройках репозитория](https://github.com/QuverOK/box-keeper/rules): уберите требование статус-чеков **перед push** или включите bypass для администратора. После успешного push CI будет запускаться автоматически на каждый следующий коммит.
