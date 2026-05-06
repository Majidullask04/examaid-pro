import base64
import re

from core.logger import logger

def perform_ocr(image_content: str) -> str:
    """
    Local OCR fallback heuristic.
    If text is already present, return it.
    If image content is base64, try to recover readable UTF-8 text fragments.
    """
    logger.info("Initiating OCR processing layer...")

    if not image_content:
        return ""

    normalized = image_content.strip()
    if normalized.startswith("data:image"):
        _, _, normalized = normalized.partition(",")

    if len(normalized) < 400 and any(char.isalpha() for char in normalized):
        return normalized

    try:
        decoded = base64.b64decode(normalized, validate=False)
        ascii_guess = decoded.decode("utf-8", errors="ignore")
        cleaned = re.sub(r"\s+", " ", ascii_guess).strip()
        if len(cleaned) >= 24:
            return cleaned
    except Exception as exc:
        logger.warning(f"Local OCR fallback could not decode image payload: {exc}")

    logger.warning("No readable text extracted locally. Returning a setup hint instead.")
    return "Unable to extract readable text locally. Configure OPENROUTER_API_KEY to enable image OCR."
