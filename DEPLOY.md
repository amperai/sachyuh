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
Ale i to používej jen na feature větvích, nikdy na `release` nebo `testing`.

---

## Větve a prostředí

| Větev | URL | systemd služba | hosting_gaudi input |
|-------|-----|----------------|---------------------|
| `release` | sachyuh.cz | `sachyuh-turnaj` | `sachyuh` |
| `testing` | test1.sachyuh.cz | `sachyuh-turnaj-testing` | `sachyuh-testing` |

**Produkce používá větev `release`** — to je co hosting_gaudi sleduje jako `sachyuh` input v `flake.nix`.

---

## Automatická verze

Každý commit **automaticky** zvýší patch verzi (3.0.4 → 3.0.5 → 3.0.6...).

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
# hook automaticky zvýší verzi a přidá VERSION + index.html do commitu
git push origin release   # produkce
# nebo:
git push origin testing   # testovací prostředí
```

### 2. Aktualizace flake.lock v hosting_gaudi

Po každém push do sachyuh **musíš** aktualizovat `flake.lock` v hosting_gaudi —
jinak deploy nasadí starý commit, ne nový.

```sh
cd /workspace/projects/hosting_gaudi/dev

# produkce (release větev)
nix flake update sachyuh

# NEBO testovací prostředí (testing větev)
nix flake update sachyuh-testing

git add flake.lock
git commit -m "Update sachyuh flake input"
git push
```

> **Proč?** `flake.lock` zamkne konkrétní commit hash. Bez update by se nasadila stará verze
> i kdyby v GitHubu byl nový kód.

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
- stáhne sachyuh přímo z GitHubu (konkrétní commit z `flake.lock`)
- zkompiluje Rust backend + nix deps
- restartuje systemd služby + nginx

---

## Shrnutí CI pipeline

```
sachyuh: commit + push origin release
         ↓
hosting_gaudi: nix flake update sachyuh
               git commit flake.lock
               git push
               ↓
               nix run .#deploy
                        ↓
                      sachyuh.cz
```

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
