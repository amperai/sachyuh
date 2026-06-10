# CLAUDE.md — sachyuh

Statický JS šachový turnajový systém (`sachyuh.cz`).  
Projekt "osel-chess". Repo: `git@github.com:amperai/sachyuh.git`

## Spuštění lokálně

```bash
python3 -m http.server 8080
# Otevři http://127.0.0.1:8080/
```

## Build

```bash
nix build
# Výstup v result/
```

## Verze

Aktuální verze je v souboru `VERSION` a v `package.json`.

## Větve

| Větev | Účel |
|-------|------|
| `dev` | Aktivní vývoj (výchozí) |
| `testing` | Testovací prostředí |
| `release` | Produkce |
| `main` | Starší strom — nepoužívat |

### Synchronizace release ← dev

```bash
git checkout release
git merge dev
git push origin release
```

## Klíčové soubory

- `index.html` — hlavní stránka
- `app.js` — hlavní logika
- `tournament.js` / `ratings.js` — turnaje a rating
- `styles.css` — styly
- `turnaj/`, `turnaje/` — data turnajů
- `turnaj_rust/` — Rust verze turnajové logiky
- `scripts/` — pomocné skripty
- `tests/` — testy

## Vztah k battleuh

Toto je **samostatné repo** (`amperai/sachyuh`).  
Soubory z tohoto repa jsou manuálně kopírovány do `static/sachyuh/` v repu `amperai/battleuh`.  
Po každé změně je třeba kopii v battleuh aktualizovat ručně.  
Deploy konfigurace je v repu `amperai/hosting_gaudi`.
