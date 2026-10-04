# aflua

**A personal cash-flow tracker built with Laravel and React.** Aflua helps people record income and expenses, manage monthly recurrences, and compare their realized balance with what is still expected for the month. This portfolio project began as Expense Tracker, gained a bilingual and more considered interface under the name cifra, and now evolves into aflua: a product identity inspired by the movement of money in and out.

The `expense-tracker-api` and `expense-tracker-frontend` directories retain their original technical names. The repository name can change independently of these paths; the application itself is branded aflua.

## Product evolution

The first version established the full-stack foundation: Sanctum authentication, protected REST endpoints, expense CRUD, category and date filters, and aggregated dashboard charts. The cifra iteration focused on product design and frontend experience. The current aflua iteration builds on that foundation with independent category catalogs, a unified income/expense form, monthly recurrences, and a cash-flow dashboard that distinguishes recorded money from projected money.

| Area | Evolution |
| --- | --- |
| Identity | An aflua wordmark and flowing `a` favicon, river-green and warm neutral palette, humanist serif headings, and restrained visual details. |
| Categories | Default categories are cloned on registration and belong to each user; names and colors can be customized without affecting other accounts. |
| Cash flow | Income and expense entries share one modal; the dashboard compares realized and projected balances with visible pending amounts. |
| Recurrences | Monthly rules create an initial confirmed entry, support editable confirmation and automatic processing, and preserve the history of completed cycles. |
| Themes | Light mode and a warm graphite dark mode, with the preference saved locally. |
| Language | Complete interface text in Brazilian Portuguese and English, including dates, month names, currency formatting, filters, forms, and charts. |
| Feedback | Loading skeletons, consistent success/error toasts, subtle modal and state transitions, and reduced-motion support. |
| Usability | Keyboard-accessible transaction modal with Escape handling and focus management; compact category/recurrence panels; period-aware links from the dashboard to pending entries; stale responses cannot replace newer results. |

This evolution demonstrates how an existing application can gain a stronger product identity and safer data ownership without a rewrite.

The visual system replaces the original violet, card-heavy UI with a warmer and quieter approach: Fraunces headings, DM Sans body text, paper-like surfaces, a river-green brand color, and a graphite dark theme.

## Interface gallery

| Area | Light theme | Dark theme |
| --- | --- | --- |
| Dashboard | <img src="./Screenshots/dashboard_light.png" alt="Aflua dashboard and spending charts in the light theme" width="420"> | <img src="./Screenshots/dashboard_dark.png" alt="Aflua dashboard and spending charts in the dark theme" width="420"> |
| Expenses | <img src="./Screenshots/expenses_light.png" alt="Aflua expense filters and list in the light theme" width="420"> | <img src="./Screenshots/expenses_dark.png" alt="Aflua expense filters and list in the dark theme" width="420"> |
| Add expense | <img src="./Screenshots/addexpense_light.png" alt="Aflua new-expense modal in the light theme" width="420"> | <img src="./Screenshots/addexpense_dark.png" alt="Aflua new-expense modal in the dark theme" width="420"> |

## Features

### Authentication

- User registration and login
- Laravel Sanctum token authentication
- Protected frontend routes and authenticated API endpoints

### Transaction management

- Create, edit, and delete income and expenses through the same modal
- Toggle between expense and income; categories apply only to expenses
- Record one-off income such as bonuses without repeating it in subsequent months
- Filter transactions by type, category, month, and year
- Category colors stay consistent between expense tags and dashboard charts

### Monthly recurrences

- Enable monthly repetition inside the transaction modal and set a day of the month
- Saving a new recurrence also confirms the first entry without creating a duplicate
- Short months use the last available day when the configured day does not exist
- Confirm pending entries with an editable amount, skip a month, or reopen it
- Adjust confirmed amounts or undo confirmation without silently auto-confirming the same cycle again
- Activate/deactivate rules without deleting confirmed history
- Delete a rule while keeping linked entries as one-offs, or delete the rule and its linked entries
- When deleting a recurring entry, choose whether to leave the month pending or skip that month
- Automatic confirmation runs through Laravel's scheduler; it does not happen inside a dashboard GET

### Categories

- Default categories cloned into every new account
- User-owned category CRUD with authorization checks
- Editable names and hex colors, used consistently in expense tags and dashboard charts
- Existing expenses preserved when legacy global categories are migrated to individual catalogs
- Deletion of a category with linked expenses or recurring rules is blocked until those links are resolved

### Dashboard analytics

- Received, spent, realized balance, and projected balance for the selected month
- Visible pending income and expense totals, with expandable transaction details
- A direct link to review recurrences in the selected month
- Expense distribution by category
- Income and expense history for six consecutive months ending in the selected period, including months with no activity
- Month and year filters
- Interactive Recharts pie and grouped bar charts, with a screen-reader-readable history table
- Raw month/year data from the API; period labels, dates, and money are formatted in the frontend

### Interface

- Responsive layout with light and dark themes
- PT-BR and EN language switcher
- Local persistence of language and theme preferences
- Skeleton loading states, operation feedback, and subtle transitions

## Tech stack

| Layer | Technologies |
| --- | --- |
| Frontend | React 19, Vite, React Router, Axios, Context API, Recharts |
| Backend | Laravel 13, Laravel Sanctum, REST API, authorization policies |
| Database | MySQL |

## Project structure

```text
repository-root/
├── expense-tracker-api/
│   ├── app/
│   │   ├── Http/Controllers/       # Auth, categories, transactions, recurrences, dashboard
│   │   ├── Models/                 # User, Category, Expense, Income, recurring rules/occurrences
│   │   ├── Policies/               # Ownership authorization
│   │   └── Services/               # Recurrence preparation, confirmation, and deletion
│   ├── database/
│   │   ├── migrations/
│   │   └── seeders/
│   └── routes/api.php
├── expense-tracker-frontend/
│   └── src/
│       ├── api/                    # Axios client and token interceptor
│       ├── components/charts/      # Category and monthly cash-flow charts
│       ├── components/ui/          # Navigation, language, protected route, pending cash flow
│       ├── contexts/               # Authentication and theme
│       ├── hooks/                  # Fetching, dashboard preparation, and form errors
│       ├── i18n/                   # PT-BR / EN translations and formatting
│       └── pages/                  # Auth, dashboard, transactions, unified modal
└── Screenshots/                   # Aflua light and dark UI captures
```

## Architecture

The React single-page application calls the Laravel REST API through Axios. The client attaches a Sanctum bearer token to authenticated requests. Laravel validates requests, scopes categories, transactions, and recurring rules to the authenticated user, applies authorization policies, and reads or writes MySQL data. Recurrence confirmation creates the real transaction and links it to its occurrence in one database transaction. The dashboard endpoint returns aggregates and pending entries for the frontend.

```text
React 19 + Router + Context API + Recharts
                  │ HTTP / JSON
                  ▼
Laravel 13 REST API + Sanctum + Policies
                  │
                  ▼
                MySQL
```

### Data relationships

- A `User` has many `Category`, `Expense`, `Income`, and `RecurringRule` records.
- A `Category` belongs to a user and can be used by expenses and expense recurrence rules.
- An `Expense` belongs to a user and a category.
- An `Income` belongs to a user and does not require a category.
- A `RecurringRule` belongs to a user and has monthly `RecurringOccurrence` records.
- Each occurrence is pending, confirmed, or skipped; a confirmed occurrence links to an expense or income.
- A unique rule/year/month constraint prevents duplicate monthly occurrences.

Registration creates the user and their default category catalog in one transaction. The ownership migration clones legacy global categories per existing account and remaps historical expenses to the correct copies.

### Dashboard queries

The dashboard uses sums, category grouping, and date-based filtering scoped to the authenticated user. Balance arithmetic uses integer cents. The selected period returns both balances:

```text
realized balance  = recorded income − recorded expenses
projected balance = realized balance + pending income − pending expenses
```

Pending occurrences of active, valid rules contribute to the projection. Confirmed and skipped occurrences do not; paused or expired rules do not add expected money. Pending values follow the current rule amount, while confirmed values come from the historical transaction.

The frontend first calls `POST /api/recurring-occurrences/prepare` with the selected month/year, then calls `GET /api/dashboard`. Preparation is idempotent and separate from reading; the dashboard GET does not generate or confirm occurrences. API consumers should use the same sequence before reading a period that has not been prepared yet.

The response retains `total_this_month`, `total_income`, `net_balance`, `by_category`, and `last_six_months`, and adds:

| Field | Meaning |
| --- | --- |
| `month`, `year` | Selected period as numbers. |
| `realized_balance` | Recorded income minus recorded expenses; also returned as `net_balance`. |
| `projected_balance` | Realized balance plus pending income minus pending expenses. |
| `pending_income`, `pending_expense` | Separate expected totals. |
| `pending_incomes`, `pending_expenses` | Separate lists with description, amount, effective date, and category where applicable. |

Each `last_six_months` item contains numeric `month`/`year`, `total_income`, `total_expenses`, and `realized_balance`. The previous `total` expense value is retained; the old localized `label` is replaced by frontend formatting. The six-month window now follows the selected period instead of the current date.

## Engineering concepts

Full-stack development · REST API design · SPA authentication with Sanctum · React Context API · protected routes · custom hooks · CRUD · SQL aggregation · authorization policies · transactional recurrence confirmation · idempotency · cash-flow projections · component-based UI · data visualization · internationalization · accessible interaction states.

## Run locally

### Backend

From the repository root:

```bash
cd expense-tracker-api
composer install
cp .env.example .env
```

Configure the MySQL connection in `expense-tracker-api/.env`, then run:

```bash
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

The API runs at `http://localhost:8000` by default.

For automatic monthly confirmation, keep Laravel's scheduler running in a separate terminal during local development:

```bash
php artisan schedule:work
```

The recurrence processor is scheduled daily at 00:10 in the application's timezone. To process due occurrences once manually:

```bash
php artisan recurrences:process
```

Without the scheduler, pending occurrences can still be prepared and confirmed manually through the interface. Future months can be inspected without confirming their projected entries.

### Frontend

In a second terminal, from the repository root:

```bash
cd expense-tracker-frontend
npm install
npm run dev
```

The Axios client currently points to `http://localhost:8000/api`.

### Verification

```bash
# In expense-tracker-api (tests use isolated in-memory SQLite)
php artisan test

# In expense-tracker-frontend
npm run lint
npm run build
```

For a manual cash-flow check, record December salary of R$ 5,000, rent of R$ 1,800, a one-off bonus of R$ 5,000, and other expenses of R$ 600. December should show R$ 10,000 received, R$ 2,400 spent, and R$ 7,600 realized. In January, the bonus must not repeat; pending rent contributes to projected expenses without reducing the realized balance until confirmed.

## Next steps

- Budget planning, financial goals, and report exports
- Pagination and server-side filtering for larger transaction histories
- Route-level code splitting to reduce the frontend bundle
- Environment-based API configuration
- Broader automated coverage for transaction and recurrence flows
- Query/index profiling and database-side aggregation for larger cash-flow histories

## About

Built as a portfolio project to practice Laravel, React, Sanctum authentication, REST APIs, data visualization, and full-stack application architecture. The source code uses English identifiers; the product interface supports Brazilian Portuguese and English.
