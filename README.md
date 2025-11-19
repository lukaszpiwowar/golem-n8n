# Golem n8n Setup

Projekt zawiera konfigurację Docker Compose dla n8n z Caddy jako reverse proxy.

## Struktura projektu

- `docker-compose.yml` - Konfiguracja serwisów (Postgres, n8n, Caddy)
- `Caddyfile` - Konfiguracja reverse proxy Caddy
- `static/` - Katalog ze statyczną stroną HTML
- `setup-server.sh` - Skrypt konfiguracyjny serwera
- `.github/workflows/deploy.yml` - GitHub Actions workflow do automatycznego wdrażania

## Domeny

- **n8n**: `https://n8n.piwowar.ovh`
- **Strona statyczna**: `https://piwowar.ovh`

## Instalacja na serwerze

### 1. Konfiguracja serwera

Połącz się z serwerem jako root:
```bash
ssh root@46.224.7.113
```

Uruchom skrypt konfiguracyjny:
```bash
wget -O setup-server.sh https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/setup-server.sh
# LUB skopiuj plik setup-server.sh na serwer
chmod +x setup-server.sh
./setup-server.sh
```

Skrypt wykona:
- Utworzenie użytkownika non-root
- Konfigurację SSH
- Instalację Docker i Docker Compose
- Wygenerowanie klucza SSH dla GitHub

### 2. Dodanie klucza SSH do GitHub

Po uruchomieniu skryptu, skopiuj wyświetlony klucz publiczny i dodaj go do GitHub:
- Settings > SSH and GPG keys > New SSH key

### 3. Klonowanie repozytorium

Zaloguj się jako użytkownik:
```bash
su - lukasz
```

Sklonuj repozytorium:
```bash
git clone git@github.com:YOUR_USERNAME/YOUR_REPO.git golem-n8n
cd golem-n8n
```

### 4. Uruchomienie

```bash
docker compose up -d
```

Sprawdź status:
```bash
docker compose ps
docker compose logs -f
```

### 5. Konfiguracja automatycznego wdrażania (CI/CD)

Aby włączyć automatyczne wdrażanie po każdym commicie do maina:

1. **Pobierz klucz prywatny SSH z serwera:**
   ```bash
   ssh lukasz@46.224.7.113 "cat ~/.ssh/id_ed25519"
   ```

2. **Dodaj secrets do GitHub:**
   - Przejdź do Settings → Secrets and variables → Actions
   - Dodaj następujące secrets:
     - `SSH_HOST`: `46.224.7.113`
     - `SSH_USER`: `lukasz`
     - `SSH_PRIVATE_KEY`: (wklej całą zawartość klucza prywatnego, włącznie z `-----BEGIN OPENSSH PRIVATE KEY-----` i `-----END OPENSSH PRIVATE KEY-----`)

3. **Po każdym pushu do maina**, GitHub Actions automatycznie:
   - Połączy się z serwerem przez SSH
   - Wykona `git pull`
   - Zaktualizuje obrazy Docker (`docker compose pull`)
   - Zrestartuje kontenery (`docker compose up -d`)

## Zarządzanie

### Zatrzymanie
```bash
docker compose down
```

### Restart
```bash
docker compose restart
```

### Logi
```bash
docker compose logs -f n8n
docker compose logs -f caddy
```

### Backup bazy danych
```bash
docker compose exec postgres pg_dump -U n8n n8n > backup.sql
```

## Uwagi

- Upewnij się, że domeny `n8n.piwowar.ovh` i `piwowar.ovh` wskazują na IP serwera (46.224.7.113)
- Caddy automatycznie wystawi certyfikaty SSL przez Let's Encrypt
- Porty 80 i 443 muszą być otwarte w firewall

