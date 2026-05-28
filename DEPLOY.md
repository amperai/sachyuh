# Deploy sachyuh

## ⛔ ZAKÁZÁNO

**Nikdy nepoužívej `git push --force`.**

Force push přepíše historii na remote větvi — smaže commity které tam byly, ale ne lokálně.
Pokud omylem smažeš commity, obnova je možná jen přes `git reflog` (a jen dočasně).

Bezpečná alternativa pokud potřebuješ přepsat historii:
```sh
git push --force-with-lease
```
Selže pokud remote obsahuje commity které nemáš lokálně — ochrana před přepsáním cizí práce.
Ale i to používej jen na feature větvích, nikdy na `dev` nebo `testing`.

---

## Automatická verze

Každý commit **automaticky** zvýší patch verzi (0.1.5 → 0.1.6 → 0.1.7...).

Dělá to pre-commit hook v `.git/hooks/pre-commit`:
- přečte `VERSION` soubor
- zvýší patch číslo
- zapíše novou verzi do `VERSION` i `index.html`
- přidá oba soubory do commitu

Verzi nikdy nepřepisuj ručně — hook to udělá sám.

---

## Jak probíhá deploy (krok za krokem)

### 1. Změny v sachyuh

Uprav soubory, commitni normálně:
```sh
git add <soubory>
git commit -m "popis změny"
# hook automaticky bumpe verzi a přidá VERSION + index.html do commitu
git push
```

**Dev větev** → `git@github.com:amperai/sachyuh.git` branch `dev`  
**Testing větev** → `git@github.com:amperai/sachyuh.git` branch `testing`

### 2. Aktualizace flake.lock v hosting_gaudi

Po každém push do sachyuh musíš aktualizovat `flake.lock` v hosting_gaudi — jinak deploy nasadí starou verzi.

```sh
cd /workspace/projects/hosting_gaudi/dev

# aktualizuj sachyuh input (stáhne nejnovější commit z dev/testing)
nix flake update sachyuh

git add flake.lock
git commit -m "Update sachyuh flake input"
git push
```

### 3. Deploy na server

```sh
cd /workspace/projects/hosting_gaudi/dev
nix run .#deploy
```

Deploy interně dělá:
```
nixos-rebuild switch \
  --flake .#gaudi \
  --target-host root@92.243.27.144 \
  --build-host root@92.243.27.144
```

Server buildí sám sebe:
- stáhne sachyuh a battleuh přímo z GitHubu přes SSH
- zkompiluje (Rust backend, nix deps)
- restartuje systemd služby + nginx

### 4. Co se nasadí

| Větev | URL | systemd služba | DB |
|-------|-----|----------------|-----|
| `dev` | sachyuh.cz | `sachyuh-turnaj` | `/var/lib/sachyuh-turnaj/` |
| `testing` | test1.sachyuh.cz | `sachyuh-turnaj-testing` | `/var/lib/sachyuh-turnaj-testing/` |
| `dev` (dev instance) | test2.sachyuh.cz | `sachyuh-turnaj-dev` | `/var/lib/sachyuh-turnaj-dev/` |

---

## Časté chyby

### Deploy nasadil starou verzi
→ Zapomněl jsi spustit `nix flake update sachyuh` v hosting_gaudi a commitnout `flake.lock`.

### Push selhal (rejected)
→ Remote má commity které nemáš lokálně. Udělej `git pull --rebase`, vyřeš konflikty, pak pushni.  
→ **Nepoužívej `--force`.**

### Verze se nezměnila na webu
→ Zkontroluj že hook je spustitelný: `ls -la .git/hooks/pre-commit`  
→ Zkontroluj `VERSION` soubor: `cat VERSION`
