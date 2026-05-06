import logging
import time
from functools import wraps

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

logger = logging.getLogger("backend")

def track_execution_time(func):
    @wraps(func)
    async def wrapper(*args, **kwargs):
        start_time = time.time()
        result = await func(*args, **kwargs)
        duration = time.time() - start_time
        if duration > 5.0:
            logger.warning(f"SLOW RESPONSE: {func.__name__} took {duration:.2f}s")
        else:
            logger.info(f"{func.__name__} took {duration:.2f}s")
        return result
    return wrapper
