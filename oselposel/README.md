# Turnaj Koruna

Lokální verze běží bez Supabase. Sdílený stav se ukládá do `db/shared-state.json`.

## Spuštění

```sh
node server.js
```

Pak otevři `http://127.0.0.1:3000/`.

## Databáze

- `db/shared-state.json` obsahuje jeden záznam se stavem turnaje
- frontend si state ukládá i do `localStorage`, takže funguje i při výpadku API
