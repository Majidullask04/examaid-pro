"""
GracefulErrorHandler — Every failure mode has a user-friendly fallback.
No raw error messages. No stack traces. No dead ends ever reach the student.
"""
from core.logger import logger


class GracefulErrorHandler:
    ERROR_MATRIX = {
        "google_vision_timeout": {
            "user_message": "📷 Image processing is taking too long. Try again or paste your topic names below.",
            "fallback_action": "show_manual_text_input",
            "log_level": "warning",
        },
        "google_vision_handwriting_fail": {
            "user_message": "✍️ Couldn't read the handwriting clearly. Please type the topic names you can see.",
            "fallback_action": "show_manual_text_input_with_hints",
            "log_level": "info",
        },
        "openrouter_rate_limit": {
            "user_message": "Temporary AI issue. Please retry.",
            "fallback_action": "show_countdown_timer",
            "log_level": "warning",
        },
        "openrouter_quota_exceeded": {
            "user_message": "Temporary AI issue. Please retry.",
            "fallback_action": "redirect_to_precomputed_plans",
            "log_level": "error",
        },
        "openrouter_model_down": {
            "user_message": "Temporary AI issue. Please retry.",
            "fallback_action": "auto_retry_with_fallback_model",
            "log_level": "warning",
        },
        "pdf_generation_failed": {
            "user_message": "📄 PDF generation failed. Showing your study plan on screen instead.",
            "fallback_action": "show_json_as_html",
            "log_level": "error",
        },
        "subject_not_found": {
            "user_message": "🔍 Subject not found in our database. Try uploading the syllabus image instead.",
            "fallback_action": "show_ocr_upload",
            "log_level": "info",
        },
        "unsupported_branch": {
            "user_message": "⚠️ Currently optimized for CSE. Results for {branch} may vary. Showing best available data.",
            "fallback_action": "show_confirmation_dialog",
            "log_level": "info",
        },
        "empty_ai_response": {
            "user_message": "Temporary AI issue. Please retry.",
            "fallback_action": "show_retry_button_with_model_switch",
            "log_level": "warning",
        },
        "network_offline": {
            "user_message": "📵 No internet. Your last study plan is saved! Tap to view offline.",
            "fallback_action": "load_from_service_worker_cache",
            "log_level": "info",
        },
        "index_not_built": {
            "user_message": "⚙️ Study data is being prepared for this subject. Try in a few seconds.",
            "fallback_action": "trigger_index_build_async",
            "log_level": "warning",
        },
    }

    def handle(self, error_type: str, context: dict = None) -> dict:
        config = self.ERROR_MATRIX.get(error_type, {
            "user_message": "Temporary AI issue. Please retry.",
            "fallback_action": "show_generic_retry",
            "log_level": "error",
        })

        log_fn = getattr(logger, config["log_level"], logger.error)
        log_fn(f"[{error_type}] {context}")

        message = config["user_message"]
        if context:
            try:
                message = message.format(**context)
            except KeyError:
                pass

        return {
            "status": "error",
            "error_type": error_type,
            "message": message,
            "fallback": config["fallback_action"],
        }


error_handler = GracefulErrorHandler()
