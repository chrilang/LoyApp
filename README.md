# LoyApp – MVP för lojalitetsapp

Detta repository innehåller ett första MVP av en lojalitetsapp (klippkort) som:

- fungerar autonomt/offline i webbläsaren
- sparar klipp lokalt per butik/kafé
- kan tillåta synk mot centralt system när internet finns
- visar olika utseenden beroende på vald butik/kafé

## Kör lokalt

Öppna projektet via en enkel webbserver:

```bash
cd <project-directory>
python3 -m http.server 8000
```

Öppna sedan `http://localhost:8000`.

## MVP-funktioner

- Välj butik/kafé (olika tema och antal klipp)
- Lägg till klipp och lös in belöning
- Lokal lagring i `localStorage`
- Offline-stöd via service worker
- Köad synklogik som försöker skicka händelser när appen är online och synk är tillåten

> Notera: i MVP finns ingen backend i repot. Synk är därför förberedd med endpoint-konfiguration i klienten.