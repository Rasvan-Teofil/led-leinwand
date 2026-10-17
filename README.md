# LED-Leinwand Visualisierung

Browserbasiertes 3D-Tool zum Vergleichen von LED-Wänden (Größe, Pixelpitch, Betrachtungsabstand) in einem konfigurierbaren Saal. Entwickelt für die Auswahl einer LED-Leinwand im Gottesdienstraum — zunächst mit einem generischen Raum, später anpassbar über die Raummaße in der Oberfläche.

## Funktionen

- 3D-Modell des **Gottesdienstraums** (Lageplan-Maßstab: Bühne 8 m = 4×2 m-Elemente): Bühne mit Traversen, Sitzblöcke (Mitte gerade, oben/unten angewinkelt), Teppich mit Sesseln, Tech-Pult; Nebenräume nur angedeutet
- Eine oder zwei LED-Wände (Vergleichsmodus), Cabinet-Raster, Presets und freie Maße
- Pixelpitch wählbar; Anzeige von Auflösung, Modulanzahl und **Faustregeln** für Mindest- und Komfortabstand
- Inhalt (Liedtext-Folie / Foto) wird auf die echte Pixelauflösung gerastert und per **Shader** als einzelne LED-Punkte dargestellt
- Kamera: Orbit, Schnellpositionen (erste Reihe / Mitte / letzte Reihe), Abstandsslider, optional Erste-Person (WASD)

## Lokal starten

### Python (ohne Docker)

```bash
python3 server.py
```

Dann im Browser: [http://localhost:8080](http://localhost:8080)

Port über Umgebungsvariable `PORT` änderbar (Standard: `8080`).

### Docker

```bash
docker compose up --build
```

Anschließend: [http://localhost:8080](http://localhost:8080)

## Deployment (Vercel)

Das Projekt enthält eine `vercel.json`, die den Ordner `prototype/` als statische Site ausliefert. Repository mit Vercel verbinden und deployen — kein Build-Schritt nötig.

## Tests

```bash
python3 -m unittest discover -s tests -v
```

## Technik

- Plain **ES-Module** JavaScript, **three.js** im Ordner `prototype/vendor/three/` (kein Bundler, kein CDN zur Laufzeit)
- Kleiner **Python**-Static-Server für lokale Entwicklung und Docker
- Shader-Material für performante LED-Rasterdarstellung auch bei hohen Auflösungen

## Hinweise / Grenzen

- Die Abstandsangaben sind **Faustregeln** (ca. 1 m pro mm Pixelpitch als Minimum, 2–3× für komfortables Sehen) — keine Ersatz-Beratung durch einen Hersteller.
- Sehr große Wände mit feinem Pitch werden intern auf max. 4096 px Kantenlänge für die Textur begrenzt (Performance); die physikalische Größe in Metern bleibt korrekt.
- Alle Grundmaße und Kamerapositionen liegen zentral in `prototype/js/room-layout.js` (UI kann Breite/Tiefe/Höhe des Saals anpassen).

## Lizenz

Projekt der Gemeinde / privat — Nutzung nach Absprache mit den Projektverantwortlichen.
