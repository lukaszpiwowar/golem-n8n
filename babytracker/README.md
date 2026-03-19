# 🍼 Baby Tracker PWA

Prosta, mobilna aplikacja PWA do śledzenia karmień, kupy i siku – dla dwojga rodziców, w czasie rzeczywistym.

## Funkcje

- **Karmienie** – źródło (lewa/prawa pierś, butelka), ilość (ml), czas (min), notatka
- **Kupa / Siku** – szybki zapis z notatką
- **Statystyki** – liczba karmień i pieluszek dziś, czas od ostatniego karmienia
- **Historia** – oś czasu grupowana per dzień, z informacją kto co dodał
- **Dwoje rodziców** – jeden zakłada konto i dostaje 6-znakowy kod; drugi wpisuje go przy rejestracji
- **Tryb offline** – Service Worker cache'uje UI
- **Instalowalna PWA** – działa jak natywna aplikacja na telefonie

---

## Konfiguracja Firebase

### 1. Utwórz projekt Firebase

1. Wejdź na [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Kliknij **Add project** → nadaj nazwę → utwórz
3. W sekcji **Build** włącz:
   - **Authentication** → Sign-in method → **Email/Password** → Enable
   - **Firestore Database** → Create database → wybierz region → **Production mode**

### 2. Pobierz konfigurację

1. Wejdź w **Project Settings** (⚙️ obok "Project Overview")
2. Sekcja **Your apps** → kliknij `</>` (Web)
3. Zarejestruj aplikację (dowolna nazwa)
4. Skopiuj obiekt `firebaseConfig`

### 3. Wklej config do pliku

Otwórz `firebase-config.js` i zastąp pola:

```js
export const firebaseConfig = {
  apiKey: "...",
  authDomain: "twoj-projekt.firebaseapp.com",
  projectId: "twoj-projekt",
  storageBucket: "twoj-projekt.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};
```

### 4. Zastosuj reguły Firestore

W konsoli Firebase: **Firestore Database → Rules** → wklej zawartość pliku `firestore.rules` → **Publish**.

---

## Wdrożenie

### Opcja A – Firebase Hosting (rekomendowane)

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
# Wybierz istniejący projekt
# Public directory: . (babytracker)
# Single-page app: Yes
# Overwrite index.html: No
firebase deploy
```

### Opcja B – Dowolny hosting statyczny

Cały folder `babytracker/` to statyczne pliki. Możesz umieścić go na:
- **Netlify** – przeciągnij folder na netlify.com/drop
- **Vercel** – `npx vercel`
- **GitHub Pages**
- Dowolny serwer nginx/Apache

> **Ważne:** Aplikacja używa ES modules (`type="module"`), więc musi być serwowana przez serwer HTTP (nie `file://`). Lokalnie użyj np. `npx serve .` z folderu `babytracker/`.

---

## Lokalne testowanie

```bash
cd babytracker
npx serve .
# Otwórz http://localhost:3000
```

---

## Przepływ dla dwojga rodziców

1. **Rodzic 1** rejestruje się (bez kodu rodziny) → dostaje automatycznie wygenerowany **6-znakowy kod**
2. Rodzic 1 klika ikonę 👥 w nagłówku → widzi swój kod → kopiuje go
3. **Rodzic 2** rejestruje się i wpisuje kod w pole "Kod rodziny" → dołącza do tej samej rodziny
4. Od teraz oboje widzą te same dane w czasie rzeczywistym

---

## Struktura plików

```
babytracker/
├── index.html          # Główny plik HTML
├── styles.css          # Style
├── app.js              # Logika aplikacji (Firebase)
├── firebase-config.js  # ← WYPEŁNIJ SWOJĄ KONFIGURACJĄ
├── manifest.json       # PWA manifest
├── sw.js               # Service Worker
├── firestore.rules     # Reguły bezpieczeństwa Firestore
├── icons/
│   ├── icon.svg
│   └── icon-maskable.svg
└── README.md
```
