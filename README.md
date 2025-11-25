# Golem n8n Setup

Projekt zawiera konfigurację Docker Compose dla n8n z Caddy jako reverse proxy.

## Struktura projektu

- `docker-compose.yml` - Konfiguracja serwisów (Postgres, n8n, Caddy, Dashboard)
- `Caddyfile` - Konfiguracja reverse proxy Caddy
- `static/` - Katalog ze statyczną stroną HTML
- `dashboard/` - Aplikacja Next.js z TODO i autoryzacją
- `setup-server.sh` - Skrypt konfiguracyjny serwera
- `.github/workflows/deploy.yml` - GitHub Actions workflow do automatycznego wdrażania

## Domeny

- **n8n**: `https://n8n.piwowar.ovh`
- **Dashboard**: `https://dash.piwowar.ovh`
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

### 4. Konfiguracja zmiennych środowiskowych

Utwórz plik `.env` na podstawie `.env.example`:
```bash
cd ~/golem-n8n
cp .env.example .env
# Edytuj .env i zmień hasła na silne wartości
nano .env
```

**WAŻNE:** Zmień `POSTGRES_PASSWORD` na silne hasło w pliku `.env`!

Dodatkowo, dla dashboardu ustaw:
- `NEXTAUTH_SECRET` - losowy sekretny klucz (np. wygenerowany przez `openssl rand -base64 32`)
- `DASHBOARD_URL` - URL dashboardu (domyślnie: `https://dash.piwowar.ovh`)

### 5. Uruchomienie

```bash
docker compose up -d
```

Sprawdź status:
```bash
docker compose ps
docker compose logs -f
```

### 6. Konfiguracja automatycznego wdrażania (CI/CD)

Aby włączyć automatyczne wdrażanie po każdym commicie do maina:

1. **Pobierz klucz deployment SSH:**
   
   **Użyj skryptu pomocniczego (zalecane):**
   ```bash
   ./get-deploy-key.sh
   ```
   
   Skrypt wyświetli klucz prywatny, który został już skonfigurowany na serwerze.
   
   **Alternatywnie - ręcznie:**
   ```bash
   ssh lukasz@46.224.7.113 "cat ~/.ssh/id_ed25519_deploy"
   ```
   
   **WAŻNE:** Skopiuj CAŁĄ zawartość klucza, włącznie z:
   - `-----BEGIN OPENSSH PRIVATE KEY-----`
   - Wszystkie linie klucza
   - `-----END OPENSSH PRIVATE KEY-----`

2. **Dodaj secrets do GitHub:**
   - Przejdź do Settings → Secrets and variables → Actions
   - Kliknij **New repository secret** i dodaj:
     - **Name**: `SSH_HOST` → **Value**: `46.224.7.113`
     - **Name**: `SSH_USER` → **Value**: `lukasz`
     - **Name**: `SSH_PRIVATE_KEY` → **Value**: (wklej CAŁĄ zawartość klucza z kroku 1)
   
   **Uwaga:** 
   - Upewnij się, że wklejasz klucz prywatny (z `BEGIN OPENSSH PRIVATE KEY`), a nie publiczny!
   - Klucz deployment (`id_ed25519_deploy`) został już dodany do `authorized_keys` na serwerze
   - W GitHub Secrets, upewnij się, że nie ma dodatkowych spacji na początku/końcu

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
docker compose logs -f dashboard
```

### Backup bazy danych
```bash
docker compose exec postgres pg_dump -U n8n n8n > backup.sql
```

## Dashboard

Aplikacja Next.js z funkcjonalnością TODO i autoryzacją.

### Funkcjonalności

- ✅ Rejestracja i logowanie użytkowników
- ✅ Zarządzanie zadaniami TODO
- ✅ Persystencja danych w PostgreSQL
- ✅ Responsywne UI (desktop, tablet, telefon)

### Pierwsze uruchomienie

1. Przy pierwszym uruchomieniu, aplikacja automatycznie:
   - Utworzy bazę danych `dashboard` w PostgreSQL
   - Uruchomi migracje tworzące tabele `users` i `todos`

2. Zarejestruj pierwsze konto:
   - Przejdź do `https://dash.piwowar.ovh/auth/register`
   - Utwórz konto z emailem i hasłem

3. Zaloguj się i zacznij używać TODO!

Więcej informacji w `dashboard/README.md`.

## Uwagi

- Upewnij się, że domeny `n8n.piwowar.ovh`, `dash.piwowar.ovh` i `piwowar.ovh` wskazują na IP serwera (46.224.7.113)
- Caddy automatycznie wystawi certyfikaty SSL przez Let's Encrypt
- Porty 80 i 443 muszą być otwarte w firewall
- Dashboard używa tej samej instancji PostgreSQL co n8n, ale ma osobną bazę danych

