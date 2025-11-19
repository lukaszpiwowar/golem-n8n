#!/bin/bash

# Skrypt pomocniczy do weryfikacji i przygotowania klucza SSH dla GitHub Actions

echo "🔍 Weryfikacja klucza SSH dla GitHub Actions"
echo ""

# Sprawdź czy podano argument (ścieżkę do klucza lub host)
if [ -z "$1" ]; then
    echo "Użycie: $0 [ścieżka_do_klucza_lub_host]"
    echo ""
    echo "Przykłady:"
    echo "  $0 ~/.ssh/id_ed25519          # Lokalny klucz"
    echo "  $0 lukasz@46.224.7.113        # Pobierz z serwera"
    exit 1
fi

# Sprawdź czy to host czy lokalny plik
if [[ "$1" == *"@"* ]]; then
    echo "📥 Pobieranie klucza z serwera: $1"
    KEY_CONTENT=$(ssh "$1" "cat ~/.ssh/id_ed25519" 2>/dev/null)
    if [ $? -ne 0 ]; then
        echo "❌ Błąd: Nie można połączyć się z serwerem lub odczytać klucza"
        exit 1
    fi
else
    echo "📄 Odczytywanie klucza z pliku: $1"
    if [ ! -f "$1" ]; then
        echo "❌ Błąd: Plik nie istnieje: $1"
        exit 1
    fi
    KEY_CONTENT=$(cat "$1")
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 KLUCZ PRYWATNY (wklej CAŁĄ zawartość do GitHub Secrets jako SSH_PRIVATE_KEY):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "$KEY_CONTENT"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Weryfikacja formatu klucza
if [[ "$KEY_CONTENT" == *"BEGIN OPENSSH PRIVATE KEY"* ]] || [[ "$KEY_CONTENT" == *"BEGIN PRIVATE KEY"* ]] || [[ "$KEY_CONTENT" == *"BEGIN RSA PRIVATE KEY"* ]] || [[ "$KEY_CONTENT" == *"BEGIN ED25519 PRIVATE KEY"* ]]; then
    echo "✅ Format klucza wygląda poprawnie (zawiera BEGIN)"
else
    echo "⚠️  UWAGA: Klucz może być niepoprawnie sformatowany!"
    echo "   Upewnij się, że zawiera linię BEGIN i END"
fi

if [[ "$KEY_CONTENT" == *"END"* ]]; then
    echo "✅ Klucz zawiera linię END"
else
    echo "⚠️  UWAGA: Brak linii END w kluczu!"
fi

# Sprawdź długość (klucze prywatne są długie)
LINES=$(echo "$KEY_CONTENT" | wc -l)
if [ "$LINES" -lt 5 ]; then
    echo "⚠️  UWAGA: Klucz wydaje się zbyt krótki ($LINES linii). Klucze prywatne zwykle mają 20+ linii."
else
    echo "✅ Długość klucza wygląda poprawnie ($LINES linii)"
fi

echo ""
echo "📝 Instrukcje:"
echo "1. Skopiuj CAŁĄ zawartość klucza powyżej (od BEGIN do END)"
echo "2. Przejdź do GitHub: Settings → Secrets and variables → Actions"
echo "3. Dodaj nowy secret: SSH_PRIVATE_KEY"
echo "4. Wklej CAŁĄ zawartość klucza (włącznie z liniami BEGIN i END)"
echo "5. Zapisz"
echo ""

