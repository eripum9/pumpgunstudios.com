# PumpgunStudios

A lightweight static site for PumpgunYT's software, games, and experiments. English pages keep their original routes; the complete German edition lives under `/de/`.

Run locally from the repository root:

```powershell
python -m http.server 4173
```

Open `http://localhost:4173/` or `http://localhost:4173/de/`. GitHub Pages serves the root `404.html` for missing URLs; the stock Python server instead shows its own error response. Inspect `/404.html` and `/de/404.html` directly when previewing locally.

The shared design system is in `css/styles.css`. Page layouts use `css/home.css`, `css/projects.css`, `css/docs.css`, and `aboutme/css/styles.css`. MythOS retains its own small typographic treatment. Existing project stylesheet URLs remain available as compatibility imports. There are no framework or webfont dependencies.

German pages reuse the original CSS, screenshots, player script, playlist, and audio files. When changing content, update the matching English and German HTML pages together. Keep original application setting names, command examples, file paths, and software names literal in documentation. Each page pairs its translations with `hreflang` links and a direct language switch.

The local `aboutme/add_album.bat` launcher and `aboutme/scripts/` importer are ignored by Git. Run the launcher to add an album; it requires Python with Tkinter and ffmpeg. The importer validates Spotify links and saves absolute HTTPS album and track URLs. Imported music assets and `playlist.json` remain tracked and are shared by both languages.

`js/docs.js` adapts native documentation disclosures to the viewport. `aboutme/js/music-player.js` handles the album player and reads the page language for its controls. `js/not-found.js` translates the root error response for missing `/de/` routes in place.

`js/amazify-release.js` requests Amazify's latest GitHub release on each landing-page or wiki-index load and displays its exact tag in both languages. It uses the same latest-release selection as the download links. Without JavaScript, or if the API fails or times out, the label remains a localized link to the latest release rather than a stale version number. Version-specific statements inside documentation are kept separate from these current-release labels.

Validate routes, translated page pairs, metadata, local links, anchors, playlist files, and sitemaps:

```powershell
python .github/scripts/validate_site.py
```

After adding or removing a public page, regenerate both sitemaps:

```powershell
python .github/scripts/generate_sitemap.py
```

The existing GitHub workflow also regenerates these files after relevant changes land on `main`. Deployment infrastructure and assets remain static.
