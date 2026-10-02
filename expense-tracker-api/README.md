# aflua — API

Laravel 13, Sanctum, and MySQL provide authenticated REST endpoints for accounts, user-owned categories, expenses, and dashboard aggregates. See the [project README](../README.md) for the product overview and data relationships.

## Run locally

```bash
composer install
cp .env.example .env
```

Configure the MySQL connection in `.env`, then run this for a fresh installation:

```bash
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

Registration creates a personal default category catalog. The category ownership migration preserves existing expenses while cloning the legacy shared catalog for each account. On an existing database, back up users, categories, and expenses before running `php artisan migrate`. Run `CategorySeeder` once only if an existing account still has no categories; rerunning it after someone deliberately deletes their entire catalog would recreate the defaults. Never use `migrate:fresh` with real data.

## Checks

```bash
php artisan test
```

The feature suite covers category ownership, registration defaults, legacy migration, and expense/category isolation. The API routes are declared in `routes/api.php`.
