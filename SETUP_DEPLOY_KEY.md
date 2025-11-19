# Konfiguracja klucza SSH do deploymentu

## Klucz prywatny do dodania w GitHub Secrets

Skopiuj poniższy klucz i dodaj go jako `SSH_PRIVATE_KEY` w GitHub Secrets:

```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACCoNLcuWnKAd/kqKhifs5RYtMYvSSaYatJbxagjEWouSAAAAJh4c4vneHOL
5wAAAAtzc2gtZWQyNTUxOQAAACCoNLcuWnKAd/kqKhifs5RYtMYvSSaYatJbxagjEWouSA
AAAEA6zaqKgf0PRbhtWOLJz3LFbGCN+c4oejkf+SjjqMokfag0ty5acoB3+SoqGJ+zlFi0
xi9JJphq0lvFqCMRai5IAAAAFWRlcGxveUBnaXRodWItYWN0aW9ucw==
-----END OPENSSH PRIVATE KEY-----
```

## Instrukcje

1. Przejdź do repozytorium na GitHub
2. Settings → Secrets and variables → Actions
3. Kliknij "New repository secret"
4. Name: `SSH_PRIVATE_KEY`
5. Value: Wklej CAŁĄ zawartość klucza powyżej (włącznie z liniami BEGIN i END)
6. Zapisz

## Secrets do skonfigurowania

- `SSH_HOST`: `46.224.7.113`
- `SSH_USER`: `lukasz`
- `SSH_PRIVATE_KEY`: (klucz powyżej)

## Weryfikacja

Po dodaniu secrets, workflow powinien działać poprawnie. Klucz został już dodany do `~/.ssh/authorized_keys` na serwerze.

