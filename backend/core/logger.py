import logging
import time
import re
from functools import wraps

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

logger = logging.getLogger("backend")


def _sanitize_log_message(message: str) -> str:
    """Sanitize message to prevent log injection attacks.
    
    Removes carriage returns, newlines, and null bytes that could be used
    to forge log entries or inject malicious content into log files.
    """
    if not isinstance(message, str):
        message = str(message)
    # Replace newlines, carriage returns, and null bytes with safe characters
    sanitized = re.sub(r'[\r\n\x00\x1b]', ' ', message)
    # Strip leading/trailing whitespace
    return sanitized.strip()


def track_execution_time(func):
    @wraps(func)
    async def wrapper(*args, **kwargs):
        start_time = time.time()
        result = await func(*args, **kwargs)
        duration = time.time() - start_time
        func_name = _sanitize_log_message(func.__name__)
        if duration > 5.0:
            logger.warning("SLOW RESPONSE: %s took %.2fs", func_name, duration)
        else:
            logger.info("%s took %.2fs", func_name, duration)
        return result
    return wrapper
