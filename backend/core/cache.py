"""
CacheManager — Exact cache key structure and TTL rules.
Supports Redis with automatic in-memory fallback.
"""
import json
import time
import hashlib
from typing import Optional
from core.logger import logger, _sanitize_log_message


class CacheManager:
    KEY_TEMPLATES = {
        "study_plan": "sp:{subject_code}:{goal}",
        "explain": "exp:{subject_code}:{topic_hash}",
        "subjects": "subj:{branch}",
        "ocr_result": "ocr:{image_hash}",
    }

    TTL_SECONDS = {
        "study_plan": 86400,     # 24 hours
        "explain": 604800,       # 7 days — explanations don't change
        "subjects": 3600,        # 1 hour — rarely changes
        "ocr_result": 3600,      # 1 hour
    }

    def __init__(self):
        self._redis = None
        self._memory: dict = {}
        self._memory_expiry: dict = {}
        self._connected = False
        self._try_redis()

    def _try_redis(self):
        try:
            import redis as redis_lib
            import os
            host = os.getenv("REDIS_HOST", "localhost")
            port = int(os.getenv("REDIS_PORT", "6379"))
            self._redis = redis_lib.Redis(host=host, port=port, decode_responses=True)
            self._redis.ping()
            self._connected = True
            logger.info("Redis connected successfully")
        except Exception:
            self._connected = False
            logger.warning("Redis is not available! Falling back to in-memory dictionary. NOTE: Real prod needs Redis.")

    def is_connected(self) -> bool:
        return self._connected

    # ── Generic get/set ─────────────────────────────────────────────────────

    def get(self, key: str) -> Optional[dict]:
        if self._connected:
            try:
                raw = self._redis.get(key)
                if raw:
                    return json.loads(raw)
            except Exception:
                pass
        else:
            if key in self._memory:
                if self._memory_expiry.get(key, float('inf')) > time.time():
                    return self._memory[key]
                else:
                    del self._memory[key]
                    del self._memory_expiry[key]
        return None

    def set(self, key: str, data: dict, ttl_seconds: int = 3600):
        if self._connected:
            try:
                self._redis.setex(key, ttl_seconds, json.dumps(data, default=str))
            except Exception:
                pass
        else:
            self._memory[key] = data
            self._memory_expiry[key] = time.time() + ttl_seconds

    def delete(self, key: str):
        if self._connected:
            try:
                self._redis.delete(key)
            except Exception:
                pass
        elif key in self._memory:
            del self._memory[key]
            self._memory_expiry.pop(key, None)

    # ── Typed methods with proper key templates ─────────────────────────────

    def _make_key(self, template_name: str, **kwargs) -> str:
        return self.KEY_TEMPLATES[template_name].format(**kwargs)

    def get_study_plan(self, subject_code: str, goal: str) -> Optional[dict]:
        key = self._make_key("study_plan", subject_code=subject_code, goal=goal)
        result = self.get(key)
        safe_key = _sanitize_log_message(key)
        if result:
            logger.info("CACHE HIT: %s", safe_key)
        else:
            logger.info("CACHE MISS: %s", safe_key)
        return result

    def set_study_plan(self, subject_code: str, goal: str, data: dict):
        key = self._make_key("study_plan", subject_code=subject_code, goal=goal)
        self.set(key, data, self.TTL_SECONDS["study_plan"])

    def invalidate_study_plan(self, subject_code: str):
        """Called when new questions are added. Invalidates both pass and high caches."""
        safe_subject = _sanitize_log_message(subject_code)
        for goal in ["pass", "high_marks"]:
            key = self._make_key("study_plan", subject_code=subject_code, goal=goal)
            self.delete(key)
        logger.info("Invalidated study plan cache for %s", safe_subject)

    def get_explanation(self, subject_code: str, topic: str) -> Optional[dict]:
        # Use SHA-256 instead of MD5 for secure hashing
        topic_hash = hashlib.sha256(topic.encode()).hexdigest()[:12]
        key = self._make_key("explain", subject_code=subject_code, topic_hash=topic_hash)
        return self.get(key)

    def set_explanation(self, subject_code: str, topic: str, data: dict):
        # Use SHA-256 instead of MD5 for secure hashing
        topic_hash = hashlib.sha256(topic.encode()).hexdigest()[:12]
        key = self._make_key("explain", subject_code=subject_code, topic_hash=topic_hash)
        self.set(key, data, self.TTL_SECONDS["explain"])


# Singleton
cache = CacheManager()
