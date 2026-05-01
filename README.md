# Asystent Gry Zielone Imperium - Project Documentation

Select Language: [Polski](#polski) | [English](#english) | [Deutsch](#deutsch)

---

<!-- VIDEO DEMO PLACEHOLDER -->
[![Extension Demo](zieloneimperium.mp4)](https://github.com/user-attachments/assets/8c6fbd12-2ce6-4825-8326-ae611ca75b8d)

---

<a name="polski"></a>
## 🇵🇱 Polski: Przegląd Projektu

Rozszerzenie do przeglądarki Chrome (Manifest V3) automatyzujące zadania w grze **"Zielone Imperium"**. Udostępnia panel boczny z narzędziami do automatyzacji powtarzalnych czynności. Możesz zmienić język interfejsu (PL/EN/DE) za pomocą przycisku w prawym górnym rogu panelu.

> [!NOTE]
> Podstawowe funkcje (podlewanie, sianie, sprzedaż) działają poprawnie. Niektóre zaawansowane funkcje mogą wymagać dodatkowych testów, ponieważ nie wszystkie poziomy i lokacje zostały jeszcze odblokowane przez autora.

### Główne Funkcje
| Funkcja | Opis |
|---------|------|
| **Podlewanie** | Automatyczne podlewanie suchych roślin. |
| **Sianie** | Sianie wybranych roślin na pustych polach. |
| **Zbiór** | Automatyczne zbieranie gotowych plonów. |
| **Sprzedaż** | Szybka sprzedaż produktów klientom (Wimpom). |
| **Lista Zakupów** | Skanowanie zapasów i zamówień w celu wyliczenia braków. |
| **Lokacje** | Automatyzacja Parku, Bonsai, Ptasiej Poczty i Kopalni. |

### Status
- **Status: Aktywne/Active**: Rozszerzenie jest połączone z grą.
- **Lokalizacja**: Aktualnie wykryty ogród lub miejsce w grze.

### Instalacja
1. Otwórz `chrome://extensions/`.
2. Włącz **Tryb Dewelopera**.
3. Kliknij **Załaduj rozpakowane** i wybierz folder projektu.

### Wkład w Projekt
Zachęcam do wprowadzania poprawek, aktualizacji oraz dodawania nowych funkcji poprzez Pull Requests!

---

<a name="english"></a>
## 🇺🇸 English: Project Overview

This is a **Chrome Browser Extension** (Manifest V3) that automates farming tasks in the browser game **"Zielone Imperium"** / **"Wurzelimperium"** (Green Empire). The extension provides a side panel interface for players to automate repetitive in-game actions like watering, planting, and harvesting. You can switch the interface language (PL/EN/DE) using the button in the top right corner.

> [!NOTE]
> Core features (watering, planting, selling) are fully functional. Some advanced location-based tasks may need further refinement as they haven't been fully tested in all unlocked game states.

### Project Structure
```
[Project Root]/
├── manifest.json      # Extension manifest (Manifest V3)
├── background.js      # Extension lifecycle & script injection
├── content.js         # Automation logic & DOM manipulation
├── popup.html         # Side panel UI
└── popup.js           # UI logic & communication
```

### Automation Features
| Feature | Description |
|---------|-------------|
| **Watering** | Automatically waters dry crops in all gardens. |
| **Planting** | Plants selected crops in empty tiles. |
| **Harvesting** | Uses the harvester tool to collect ready crops. |
| **Find Seller** | Automatically sells products to NPC buyers (Wimps). |
| **Shopping List** | Scans orders and inventory to generate a missing items list. |
| **Location Tasks** | Auto-renew Park, Trim Bonsai, Birds automation, and Auto-Mine. |

### Status Indicators
- **Status: Active**: The extension is connected to the game.
- **Location**: Currently detected garden or in-game location.

### Technical Stack
- **Vanilla JavaScript**: No build tools or external dependencies.
- **Manifest V3**: Using modern extension standards.
- **Side Panel API**: The interface lives in the Chrome Side Panel for seamless gameplay.

### Contributions
Feel free to submit updates, bug fixes, or new features via Pull Requests! Your help in improving the assistant is always welcome.

---

<a name="deutsch"></a>
## 🇩🇪 Deutsch: Projektübersicht

Eine Chrome-Erweiterung (Manifest V3) zur Automatisierung von Aufgaben im Spiel **"Wurzelimperium"**. Die Erweiterung bietet ein Seitenpanel zur Automatisierung von Routineaufgaben. Sie können die Sprache des Interfaces (PL/EN/DE) mit dem Button oben rechts ändern.

> [!NOTE]
> Grundfunktionen (Gießen, Anbauen, Verkaufen) funktionieren ordnungsgemäß. Einige fortgeschrittene Funktionen erfordern möglicherweise zusätzliche Tests, da noch nicht alle Level und Standorte vom Autor freigeschaltet wurden.

### Funktionen
| Funktion | Beschreibung |
|----------|--------------|
| **Gießen** | Automatisches Gießen trockener Pflanzen. |
| **Anbauen** | Pflanzen ausgewählter Sorten auf leeren Feldern. |
| **Ernten** | Automatisches Einholen fertiger Ernten. |
| **Verkaufen** | Schneller Verkauf an NPC-Kunden (Wimps). |
| **Einkaufsliste** | Abgleich von Lager und Aufträgen zur Bedarfsermittlung. |
| **Standorte** | Automatisierung für Park, Bonsai, Vogelpost und Mine. |

### Status-Anzeigen
- **Status: Aktiv/Active**: Die Erweiterung ist mit dem Spiel verbunden.
- **Standort**: Aktuell erkannter Garten oder Ort im Spiel.

### Beiträge
Sie können gerne Aktualisierungen, Fehlerbehebungen oder neue Funktionen per Pull Request hinzufügen! Jede Hilfe zur Verbesserung des Assistenten ist willkommen.

---

### Keywords / Tags
`zielone imperium bot` `wurzelimperium bot` `green empire bot` `zielone imperium assistant` `asystent zielone imperium` `wurzelimperium assistant` `zielone imperium hack` `zielone imperium script` `zielone imperium skrypt` `auto harvest` `auto plant` `automation` `chrome extension` `browser game bot`


