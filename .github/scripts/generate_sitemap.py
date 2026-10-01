from __future__ import annotations

import argparse
from pathlib import Path
from urllib.parse import quote


def public_index_pages(root: Path) -> list[Path]:
    pages: list[Path] = []
    for path in root.rglob("index.html"):
        relative = path.relative_to(root)
        if any(part.startswith(".") for part in relative.parts):
            continue
        pages.append(relative)
    return sorted(pages, key=lambda item: item.as_posix().casefold())


def page_url(base_url: str, page: Path) -> str:
    parent = page.parent.as_posix()
    suffix = "/" if parent == "." else f"/{quote(parent, safe='/')}/"
    return f"{base_url.rstrip('/')}{suffix}"


def render_sitemap(base_url: str, pages: list[Path]) -> str:
    entries = "\n".join(
        f"  <url><loc>{page_url(base_url, page)}</loc></url>" for page in pages
    )
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"{entries}\n"
        "</urlset>\n"
    )


def render_text_sitemap(base_url: str, pages: list[Path]) -> str:
    return "\n".join(page_url(base_url, page) for page in pages) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate sitemap.xml from public index pages.")
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--base-url", default="https://pumpgunstudios.com")
    parser.add_argument("--output", type=Path, default=Path("sitemap.xml"))
    parser.add_argument("--text-output", type=Path, default=Path("sitemap.txt"))
    args = parser.parse_args()

    root = args.root.resolve()
    pages = public_index_pages(root)
    output = args.output if args.output.is_absolute() else root / args.output
    text_output = args.text_output if args.text_output.is_absolute() else root / args.text_output
    output.write_text(render_sitemap(args.base_url, pages), encoding="utf-8", newline="\n")
    text_output.write_text(
        render_text_sitemap(args.base_url, pages), encoding="utf-8", newline="\n"
    )
    print(f"Generated {output} and {text_output} with {len(pages)} URLs each.")


if __name__ == "__main__":
    main()
