# LED-Leinwand Visualisierung

Browserbasiertes 3D-Tool zum Vergleichen von LED-Wänden (Größe, Pixelpitch, Betrachtungsabstand) im Gottesdienstraum. Der Saal ist nach dem Lageplan modelliert; die LED-Wand hängt an einer Alu-Traverse an der Bühnenrückseite (vor dem Vorhang).

## Funktionen

- 3D-Modell des **Gottesdienstraums** nach Lageplan (Maßstab: Bühne 8 m = 4 × 2-m-Elemente, 20 cm hoch): Saalumriss mit Nische und Schräge, Bühne an der linken Wand mit U-Traverse und Vorhang, 64 Stapelstühle in drei Blöcken (Mitte 7 × 4 gerade, oben 7 × 3 und unten 5 × 3 schräg, alle zur Bühne), Tech-/Übersetzungspult rechts, schwarze Decke mit Unterzügen und Deckentraversen, LED-Kreuz auf der Bühne, Holzkreuz an der rechten Wand; Nebenräume sind weggelassen
- LED-Wand (Standard: **Angebot Jinyuan P3.91**, 4 × 2,5 m) an einem F34-Torbogen (4 Gurtrohre, Zickzack-Diagonalen, Verbinder, Fußplatten); Montagehöhe einstellbar
- Eine oder zwei LED-Wände (Vergleichsmodus), Cabinet-Raster, Presets und freie Maße
- Pixelpitch wählbar; Anzeige von Auflösung, Modulanzahl und **Faustregeln** für Mindest- und Komfortabstand
- Inhalt (Liedtext-Folie / Foto) wird auf die echte Pixelauflösung gerastert und per **Shader** als einzelne LED-Punkte dargestellt
- Kamera-Leiste im 3D-Bild: Erste Reihe / Mitte / Letzte Reihe / Tech-Pult (Sitzpositionen aus dem Plan, Blick auf Bühne und Wand), **Draufsicht** (Decke ausgeblendet, zum Vergleich mit dem Lageplan), Erste-Person (WASD), Abstandsslider

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
node --import ./tests/register-three.mjs --test tests/*.test.mjs   # Traverse, Saal, Stühle, Kamerapositionen
python3 -m unittest discover -s tests -v                            # Rechentests
```

Screenshots (Server muss laufen, Playwright mit Chromium lokal installiert):

```bash
node scripts/capture-screenshots.mjs /pfad/zum/ordner
```

## Technik

- Plain **ES-Module** JavaScript, **three.js** im Ordner `prototype/vendor/three/` (kein Bundler, kein CDN zur Laufzeit)
- Kleiner **Python**-Static-Server für lokale Entwicklung und Docker
- Shader-Material für performante LED-Rasterdarstellung auch bei hohen Auflösungen
- Traversen, Stühle und LED-Punkte als `InstancedMesh`

## Hinweise / Grenzen

- Die Abstandsangaben sind **Faustregeln** (ca. 1 m pro mm Pixelpitch als Minimum, 2–3× für komfortables Sehen) — keine Ersatz-Beratung durch einen Hersteller.
- Sehr große Wände mit feinem Pitch werden intern auf max. 4096 px Kantenlänge für die Textur begrenzt (Performance); die physikalische Größe in Metern bleibt korrekt.
- Alle Planmaße (Umriss, Bühne, Stuhlblöcke, Tech-Pult) stehen als Plan-Pixel in `prototype/js/floor-plan.js`; `prototype/js/room-layout.js` rechnet daraus Meter, Traversen- und Kamerapositionen. Die Werte sind aus dem Lageplan abgelesen (Genauigkeit etwa ±0,1–0,2 m).
- In der ersten Reihe passen Bühnenkante und die ganze 2,5 m hohe Wand nur mit Weitwinkel (bis 85° Bildwinkel) ins Bild; die anderen Positionen nutzen 58°.
- Im Vergleichsmodus brauchen zwei 4-m-Wände samt Türmen gut 9 m — mehr als der Saal an der Bühne breit ist (8,5 m); die äußeren Türme stehen dann in den Seitenwänden.

## Lizenz

Projekt der Gemeinde / privat — Nutzung nach Absprache mit den Projektverantwortlichen.
