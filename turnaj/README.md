# Turnaj Koruna

Lokální verze běží bez Supabase. Sdílený stav se ukládá do SQLite databáze `db/shared-state.sqlite`.

## Spuštění

```sh
node server.js
```

Pak otevři `http://127.0.0.1:3000/`.

## Databáze

- `db/shared-state.sqlite` obsahuje jeden záznam se stavem turnaje
- databáze se vytvoří automaticky při prvním startu serveru
- frontend si state ukládá i do `localStorage`, takže funguje i při výpadku API
