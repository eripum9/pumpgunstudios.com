"""Validate the static site's routes, shared assets, and EN/DE page pairs."""
from __future__ import annotations

import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
HOST = "https://pumpgunstudios.com"


class Page(HTMLParser):
    def __init__(self, source: str):
        super().__init__(convert_charrefs=True)
        self.tags: list[tuple[str, dict[str, str]]] = []
        self.ids: list[str] = []
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        self.tags.append((tag, values))
        if values.get("id"):
            self.ids.append(values["id"])


def route(path: Path) -> str:
    relative = path.relative_to(ROOT).as_posix()
    if relative == "index.html":
        return "/"
    if path.name == "index.html":
        return "/" + relative.removesuffix("index.html")
    return "/" + relative


def main() -> None:
    files = sorted(p for p in ROOT.rglob("*.html") if not any(x.startswith(".") for x in p.relative_to(ROOT).parts))
    pages = {p: Page(p.read_text(encoding="utf-8-sig")) for p in files}
    errors = []
    references = 0
    for path, page in pages.items():
        name = path.relative_to(ROOT).as_posix()
        expected_language = "de" if name.startswith("de/") else "en"
        if not any(t == "html" and a.get("lang") == expected_language for t, a in page.tags):
            errors.append(f"{name}: missing language")
        for tag in ("main", "h1", "title"):
            if sum(t == tag for t, _ in page.tags) != 1:
                errors.append(f"{name}: expected exactly one {tag}")
        if len(page.ids) != len(set(page.ids)):
            errors.append(f"{name}: duplicate IDs")
        if not any(t == "meta" and a.get("name") == "description" and a.get("content") for t, a in page.tags):
            errors.append(f"{name}: missing description")
        if path.name != "404.html":
            canonicals = [a.get("href") for t, a in page.tags if t == "link" and a.get("rel") == "canonical"]
            canonical_route = route(path)
            if "/notification-setup/" in canonical_route and "/wiki/" not in canonical_route:
                canonical_route = canonical_route.replace("/notification-setup/", "/wiki/notification-setup/")
            if canonicals != [HOST + canonical_route]:
                errors.append(f"{name}: incorrect canonical {canonicals}")
            alternate = {a.get("hreflang"): a.get("href") for t, a in page.tags if t == "link" and a.get("rel") == "alternate"}
            english = canonical_route.removeprefix("/de") if expected_language == "de" else canonical_route
            expected = {"en": HOST + english, "de": HOST + "/de" + english, "x-default": HOST + english}
            if alternate != expected:
                errors.append(f"{name}: incorrect language alternates")
        for tag, attrs in page.tags:
            if tag == "img" and "alt" not in attrs:
                errors.append(f"{name}: image missing alt")
            for attribute in ("href", "src"):
                value = attrs.get(attribute)
                if not value or urlsplit(value).scheme or value.startswith("//"):
                    continue
                absolute = urlsplit(urljoin(HOST + route(path), value))
                target = ROOT / unquote(absolute.path).lstrip("/")
                if target.is_dir():
                    target /= "index.html"
                references += 1
                if not target.is_file():
                    errors.append(f"{name}: missing {value}")
                elif absolute.fragment and target in pages and unquote(absolute.fragment) not in pages[target].ids:
                    errors.append(f"{name}: missing anchor {value}")
                if expected_language == "de" and tag == "a" and target in pages and not absolute.path.startswith("/de/") and "language-switch" not in attrs.get("class", ""):
                    errors.append(f"{name}: navigation escapes German site: {value}")
        sibling = ROOT / "de" / path.relative_to(ROOT) if expected_language == "en" else ROOT / path.relative_to(ROOT).as_posix().removeprefix("de/")
        if sibling not in pages:
            errors.append(f"{name}: missing translated page")
    expected_routes = {HOST + route(p) for p in files if p.name == "index.html"}
    xml_routes = {item.text for item in ET.parse(ROOT / "sitemap.xml").findall(".//{http://www.sitemaps.org/schemas/sitemap/0.9}loc")}
    txt_routes = set((ROOT / "sitemap.txt").read_text().splitlines())
    if xml_routes != expected_routes or txt_routes != expected_routes:
        errors.append("Sitemaps do not match public routes")
    if "Sitemap: " + HOST + "/sitemap.xml" not in (ROOT / "robots.txt").read_text():
        errors.append("robots.txt does not advertise the sitemap")
    playlist = json.loads((ROOT / "aboutme/assets/music/playlist.json").read_text(encoding="utf-8"))
    for album in playlist.get("albums", []):
        for media in [album.get("cover")] + [track.get("file") for track in album.get("tracks", [])]:
            if media and not urlsplit(media).scheme and not (ROOT / "aboutme/assets/music" / media).is_file():
                errors.append(f"Missing playlist asset: {media}")
    if errors:
        print("\n".join(errors))
        raise SystemExit(1)
    print(f"PASS: {len(files)} pages, {references} local references, {len(expected_routes)} sitemap URLs, EN/DE pairs and playlist assets.")


if __name__ == "__main__":
    main()
