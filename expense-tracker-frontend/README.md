# aflua — frontend

React 19, Vite, React Router, Axios, Context API, and Recharts power the bilingual interface for aflua. The [project README](../README.md) covers the product, architecture, and full setup.

## Run locally

Start the [Laravel API](../expense-tracker-api/README.md) first, then:

```bash
npm install
npm run dev
```

The Axios client in `src/api/axios.js` currently calls `http://localhost:8000/api`. The interface supports PT-BR/EN and light/dark themes; existing `cifra-*` browser preferences are read as a fallback and saved under `aflua-*` keys.

## Checks

```bash
npm run lint
npm run build
```

The UI is organized into pages, charts, reusable interface components, contexts, hooks, and translations under `src/`.
