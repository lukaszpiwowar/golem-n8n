#!/bin/bash

echo "🔑 Pobieranie klucza deployment z serwera..."
echo ""

KEY=$(ssh lukasz@46.224.7.113 "cat ~/.ssh/id_ed25519_deploy" 2>/dev/null)

if [ $? -eq 0 ] && [ ! -z "$KEY" ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📋 KLUCZ PRYWATNY (wklej CAŁĄ zawartość do GitHub Secrets jako SSH_PRIVATE_KEY):"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "$KEY"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "✅ Klucz został już dodany do ~/.ssh/authorized_keys na serwerze"
    echo ""
    echo "📝 Następne kroki:"
    echo "1. Skopiuj CAŁĄ zawartość klucza powyżej"
    echo "2. Przejdź do GitHub: Settings → Secrets and variables → Actions"
    echo "3. Dodaj/edytuj secret: SSH_PRIVATE_KEY"
    echo "4. Wklej CAŁĄ zawartość klucza (włącznie z liniami BEGIN i END)"
    echo "5. Zapisz"
else
    echo "❌ Błąd: Nie można pobrać klucza z serwera"
    exit 1
fi
