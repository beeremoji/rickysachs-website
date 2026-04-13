# rickysachs.com — Website

Statische HTML-Website für Ricky Sachs. Läuft auf GitHub Pages, kostenlos, custom domain möglich.

## Setup (einmalig, ~10 Minuten)

### 1. GitHub Repo anlegen
1. github.com → "New repository"
2. Name: `rickysachs-website` (oder `rickysachs.github.io` für automatische Domain)
3. Public, kein README (wir haben schon eins)
4. Create repository

### 2. Dateien hochladen
```bash
cd Desktop/rickysachs-website
git init
git add .
git commit -m "Initial site"
git remote add origin https://github.com/DEIN-USERNAME/rickysachs-website.git
git push -u origin main
```

### 3. GitHub Pages aktivieren
1. Im Repo: Settings → Pages
2. Source: "Deploy from branch" → main → / (root)
3. Save
4. Nach ~60 Sekunden ist die Seite live unter: `https://DEIN-USERNAME.github.io/rickysachs-website`

### 4. Custom Domain (rickysachs.com) verknüpfen
1. Settings → Pages → Custom domain → `rickysachs.com` eintragen
2. Bei deinem Domain-Anbieter (wo rickysachs.com registriert ist):
   - DNS A-Records auf GitHub Pages IPs setzen:
     ```
     185.199.108.153
     185.199.109.153
     185.199.110.153
     185.199.111.153
     ```
   - CNAME für www: `DEIN-USERNAME.github.io`
3. "Enforce HTTPS" in GitHub Pages aktivieren (nach DNS-Propagation, ~24h)

---

## Pressefoto hinzufügen

Datei `img/press.jpg` ablegen — wird automatisch in der Über-Sektion angezeigt.
Empfohlene Größe: min. 800x1000px, Hochformat.

## Shows aktualisieren

In `index.html` den Abschnitt `<!-- SHOWS -->` bearbeiten:

```html
<li class="show-item">
  <span class="show-date">TT. Monat JJJJ</span>
  <div>
    <div class="show-venue">Venue Name</div>
    <div class="show-location">Stadt</div>
  </div>
  <span class="show-status">Bestätigt</span>
</li>
```

## Spotify-Link hinzufügen (nach Single-Release)

Im `<div id="musik">` Block, unter dem Video-Wrapper einfügen:

```html
<div style="margin-top: 2rem;">
  <iframe style="border-radius:2px"
    src="https://open.spotify.com/embed/track/TRACK_ID"
    width="100%" height="152" frameBorder="0"
    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
    loading="lazy">
  </iframe>
</div>
```
