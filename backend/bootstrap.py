"""
Phase 0: Application Bootstrap
Runs BEFORE FastAPI starts. Ensures the system is in a valid state on any machine.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from core.logger import logger


class ApplicationBootstrap:
    def run(self):
        self._step1_validate_env()
        self._step2_init_database()
        self._step3_check_seed_data()
        self._step4_check_frequency_index()
        self._step5_init_cache()
        self._step6_log_startup_summary()

    def _step1_validate_env(self):
        """Warn on missing vars, but don't crash — local dev should always work."""
        optional_with_fallback = {
            "GEMINI_API_KEY": "(exam answers will show a friendly retry message until configured)",
        }
        for key, note in optional_with_fallback.items():
            if not os.getenv(key):
                logger.warning(f"ENV: {key} not set {note}")
        logger.info("✅ Step 1: Environment validated")

    def _step2_init_database(self):
        from data.models import init_db
        init_db()
        logger.info("✅ Step 2: Database tables verified")

    def _step3_check_seed_data(self):
        from data.models import SessionLocal, Subject
        from data.seed_data import seed_syllabus_structure

        seed_syllabus_structure()

        db = SessionLocal()
        try:
            count = db.query(Subject).count()
            logger.info(f"✅ Step 3: Found {count} subjects in database")
        finally:
            db.close()

    def _step4_check_frequency_index(self):
        from data.models import SessionLocal, TopicIndexEntry, Subject
        db = SessionLocal()
        try:
            index_count = db.query(TopicIndexEntry).count()
            if index_count == 0:
                logger.warning("No frequency index found. Building from available data...")
                from data.frequency_engine import frequency_index
                subjects = db.query(Subject).all()
                for s in subjects:
                    frequency_index.build_index(s.subject_code)
                index_count = db.query(TopicIndexEntry).count()
            logger.info(f"✅ Step 4: {index_count} index entries ready")
        finally:
            db.close()

    def _step5_init_cache(self):
        from core.cache import cache
        self._redis_available = cache.is_connected()
        status = "✅ Redis connected" if self._redis_available else "⚠️  In-memory fallback (no Redis)"
        logger.info(f"✅ Step 5: Cache — {status}")

    def _step6_log_startup_summary(self):
        from data.models import SessionLocal, Subject, Question, TopicIndexEntry
        db = SessionLocal()
        try:
            subjects = db.query(Subject).count()
            questions = db.query(Question).count()
            index_entries = db.query(TopicIndexEntry).count()

            if questions == 0:
                confidence = "NONE (syllabus only)"
            elif questions < 50:
                confidence = "PARTIAL"
            else:
                confidence = "HIGH"

            summary = f"""
╔══════════════════════════════════════════════╗
║  ExamHelper Startup Complete                 ║
╠══════════════════════════════════════════════╣
║  Subjects:        {subjects:<26}║
║  Questions:       {questions:<26}║
║  Index Entries:   {index_entries:<26}║
║  Data Confidence: {confidence:<26}║
║  Redis:           {"✅" if self._redis_available else "❌ (in-memory)":<26}║
╚══════════════════════════════════════════════╝"""
            print(summary)
        finally:
            db.close()
