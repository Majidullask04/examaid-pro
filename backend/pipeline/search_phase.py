"""
Phase 2: SEARCH — Free Retrieval Layer
Uses DuckDuckGo HTML search plus lightweight page extraction.
No paid search API keys required.
"""
import html
import re
from urllib.parse import parse_qs, urlparse

from core.logger import logger


def _normalize_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def _html_to_text(html: str) -> str:
    cleaned = re.sub(r"<script.*?</script>", " ", html, flags=re.IGNORECASE | re.DOTALL)
    cleaned = re.sub(r"<style.*?</style>", " ", cleaned, flags=re.IGNORECASE | re.DOTALL)
    cleaned = re.sub(r"<[^>]+>", " ", cleaned)
    return _normalize_whitespace(cleaned)


def _decode_duckduckgo_url(href: str) -> str:
    normalized = html.unescape(href or "").strip()
    if normalized.startswith("//"):
        return f"https:{normalized}"
    if normalized.startswith("/l/?"):
        parsed = urlparse(normalized)
        target = parse_qs(parsed.query).get("uddg", [None])[0]
        return html.unescape(target or "")
    return normalized


async def _search_duckduckgo_html(query: str, limit: int = 4) -> list[dict]:
    try:
        import asyncio
        from ddgs import DDGS
        
        def do_search():
            return list(DDGS().text(query, max_results=limit))
            
        results = await asyncio.to_thread(do_search)
        
        formatted_results = []
        for r in results:
            formatted_results.append({
                "href": r.get('href'),
                "title": r.get('title'),
                "body": r.get('body')
            })
        return formatted_results
    except Exception as exc:
        logger.warning(f"Phase 2: DuckDuckGo search failed for '{query}': {exc}")
        return []


async def _fetch_page_text(url: str) -> str:
    try:
        import httpx
    except ModuleNotFoundError:
        logger.warning("Phase 2: httpx missing, using search snippets only")
        return ""

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36"
        )
    }

    try:
        async with httpx.AsyncClient(timeout=12.0, follow_redirects=True) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            html = response.text
    except Exception as exc:
        logger.warning(f"Phase 2: failed to fetch {url}: {exc}")
        return ""

    try:
        import trafilatura
    except ModuleNotFoundError:
        return _html_to_text(html)[:4000]

    extracted = trafilatura.extract(html, include_comments=False, include_tables=False, favor_precision=True)
    return _normalize_whitespace(extracted or _html_to_text(html))[:4000]


async def run_search_phase(subject_name: str, subject_code: str) -> dict:
    """
    Uses DuckDuckGo to retrieve likely JNTUH resources and extracts raw page text.
    Returns documents + combined raw text for later RAG mapping.
    """
    queries = [
        f'JNTUH R22 "{subject_name}" repeated questions',
        f'"{subject_code}" JNTUH important questions',
        f'"{subject_name}" JNTUH 2 marks 10 marks site:jntuworld.com',
        f'"{subject_name}" important questions site:rejinpaul.com',
    ]

    unique_results: list[dict] = []
    seen_urls: set[str] = set()

    for query in queries:
        for result in await _search_duckduckgo_html(query, limit=4):
            href = result.get("href") or result.get("url")
            if not href or href in seen_urls:
                continue
            seen_urls.add(href)
            unique_results.append(result)
            if len(unique_results) >= 6:
                break
        if len(unique_results) >= 6:
            break

    if not unique_results:
        logger.error("Phase 2: DuckDuckGo search returned no usable results")
        return {"error": "search_failed", "documents": [], "raw_text": ""}

    documents = []
    combined_chunks: list[str] = []

    for result in unique_results:
        href = result.get("href") or result.get("url") or ""
        snippet = _normalize_whitespace(result.get("body") or result.get("snippet") or "")
        page_text = await _fetch_page_text(href)

        text = page_text or snippet
        if not text:
            continue

        host = urlparse(href).netloc or "unknown-source"
        document = {
            "title": result.get("title") or host,
            "url": href,
            "source": host,
            "snippet": snippet,
            "content": text[:4000],
        }
        documents.append(document)
        combined_chunks.append(
            f"TITLE: {document['title']}\nSOURCE: {document['source']}\nSNIPPET: {snippet}\nCONTENT: {document['content']}"
        )

    raw_text = "\n\n".join(combined_chunks)[:18000]
    logger.info(f"✅ Phase 2 SEARCH complete: {len(documents)} documents collected from DuckDuckGo")

    return {
        "query_subject": subject_name,
        "query_code": subject_code,
        "source_confidence": "duckduckgo",
        "documents": documents,
        "raw_text": raw_text,
    }
