#!/bin/bash
set -e

# Kolory dla outputu
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Konfiguracja serwera ===${NC}"

# Nazwa użytkownika (można zmienić)
USERNAME="lukasz"

# 1. Tworzenie użytkownika
echo -e "${YELLOW}[1/5] Tworzenie użytkownika ${USERNAME}...${NC}"
if id "$USERNAME" &>/dev/null; then
    echo -e "${YELLOW}Użytkownik ${USERNAME} już istnieje${NC}"
else
    useradd -m -s /bin/bash "$USERNAME"
    echo -e "${GREEN}✓ Użytkownik ${USERNAME} utworzony${NC}"
fi

# 2. Konfiguracja SSH dla użytkownika
echo -e "${YELLOW}[2/5] Konfiguracja SSH...${NC}"
mkdir -p /home/$USERNAME/.ssh
chmod 700 /home/$USERNAME/.ssh

# Sprawdź czy klucz publiczny jest dostępny w /root/.ssh/authorized_keys
if [ -f /root/.ssh/authorized_keys ]; then
    echo -e "${YELLOW}Kopiowanie klucza SSH z root...${NC}"
    cp /root/.ssh/authorized_keys /home/$USERNAME/.ssh/authorized_keys
    chmod 600 /home/$USERNAME/.ssh/authorized_keys
    chown -R $USERNAME:$USERNAME /home/$USERNAME/.ssh
    echo -e "${GREEN}✓ Klucz SSH skonfigurowany${NC}"
else
    echo -e "${RED}⚠ Nie znaleziono klucza SSH w /root/.ssh/authorized_keys${NC}"
    echo -e "${YELLOW}Musisz ręcznie dodać klucz publiczny do /home/$USERNAME/.ssh/authorized_keys${NC}"
fi

# 3. Instalacja Docker
echo -e "${YELLOW}[3/5] Instalacja Docker...${NC}"
if command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker już zainstalowany${NC}"
else
    # Aktualizacja pakietów
    apt-get update
    
    # Instalacja zależności
    apt-get install -y \
        ca-certificates \
        curl \
        gnupg \
        lsb-release
    
    # Wykrycie dystrybucji (Ubuntu lub Debian)
    DISTRO=$(lsb_release -is | tr '[:upper:]' '[:lower:]')
    if [ "$DISTRO" != "ubuntu" ] && [ "$DISTRO" != "debian" ]; then
        DISTRO="ubuntu"  # domyślnie Ubuntu
    fi
    
    # Dodanie oficjalnego GPG key Dockera
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/$DISTRO/gpg | gpg --batch --yes --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    
    # Dodanie repozytorium Dockera
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$DISTRO \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Instalacja Docker Engine
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    echo -e "${GREEN}✓ Docker zainstalowany${NC}"
fi

# 4. Dodanie użytkownika do grupy docker
echo -e "${YELLOW}[4/5] Dodawanie użytkownika do grupy docker...${NC}"
usermod -aG docker $USERNAME
echo -e "${GREEN}✓ Użytkownik dodany do grupy docker${NC}"

# 5. Generowanie klucza SSH dla GitHub
echo -e "${YELLOW}[5/5] Generowanie klucza SSH dla GitHub...${NC}"
if [ -f /home/$USERNAME/.ssh/id_ed25519 ]; then
    echo -e "${YELLOW}Klucz SSH już istnieje${NC}"
else
    sudo -u $USERNAME ssh-keygen -t ed25519 -C "github@piwowar.ovh" -f /home/$USERNAME/.ssh/id_ed25519 -N ""
    echo -e "${GREEN}✓ Klucz SSH wygenerowany${NC}"
fi

# Wyświetlenie klucza publicznego
echo -e "\n${GREEN}=== Klucz publiczny SSH dla GitHub ===${NC}"
echo -e "${YELLOW}Skopiuj poniższy klucz i dodaj go do GitHub (Settings > SSH and GPG keys):${NC}\n"
cat /home/$USERNAME/.ssh/id_ed25519.pub
echo -e "\n"

# Konfiguracja Git (opcjonalnie)
echo -e "${YELLOW}Konfiguracja Git...${NC}"
sudo -u $USERNAME git config --global init.defaultBranch main
sudo -u $USERNAME git config --global user.name "Lukasz Piwowar" || true
sudo -u $USERNAME git config --global user.email "github@piwowar.ovh" || true

# Ustawienie uprawnień dla docker-compose.yml i Caddyfile
if [ -d /home/$USERNAME/golem-n8n ]; then
    chown -R $USERNAME:$USERNAME /home/$USERNAME/golem-n8n
fi

echo -e "\n${GREEN}=== Konfiguracja zakończona! ===${NC}"
echo -e "${YELLOW}Następne kroki:${NC}"
echo -e "1. Dodaj klucz publiczny (powyżej) do GitHub"
echo -e "2. Zaloguj się jako użytkownik: ${GREEN}su - $USERNAME${NC}"
echo -e "3. Sklonuj repozytorium: ${GREEN}git clone git@github.com:YOUR_USERNAME/YOUR_REPO.git${NC}"
echo -e "4. Przejdź do katalogu i uruchom: ${GREEN}docker compose up -d${NC}"

