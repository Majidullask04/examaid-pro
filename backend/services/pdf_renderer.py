"""
Abstract PDF Renderer with FPDF2 implementation (local dev)
and WeasyPrint stub (production VPS).

Toggle via PDF_RENDERER env var:
  PDF_RENDERER=fpdf2      → FPDF2Renderer (default, no system deps)
  PDF_RENDERER=weasyprint  → WeasyPrintRenderer (requires GTK/Pango on server)
"""
import os
from abc import ABC, abstractmethod
from core.logger import logger


class BasePDFRenderer(ABC):
    """Contract that any PDF renderer must satisfy."""

    @abstractmethod
    def render_study_plan(self, plan_data: dict) -> bytes:
        """Renders the full study plan to PDF bytes."""
        pass

    @abstractmethod
    def render_unit(self, pdf_obj, unit_data: dict, goal: str) -> None:
        """Renders a single unit section."""
        pass

    @abstractmethod
    def render_topic(self, pdf_obj, topic: dict, marker: str) -> None:
        """Renders a single topic row."""
        pass


class FPDF2Renderer(BasePDFRenderer):
    """
    Simplified PDF for local dev. Black text, simple layout.
    No fancy badges — those go in WeasyPrintRenderer.
    """

    def render_study_plan(self, plan_data: dict) -> bytes:
        from fpdf import FPDF

        goal = plan_data.get("meta", {}).get("goal", "pass")
        subject_name = plan_data.get("meta", {}).get("subject_name", "Study Guide")
        units = plan_data.get("units", [])
        data_confidence = plan_data.get("meta", {}).get("data_confidence", "none")

        pdf = FPDF()
        pdf.set_auto_page_break(auto=True, margin=12)
        pdf.add_page()

        # ── Title ──
        pdf.set_fill_color(30, 58, 95)
        pdf.set_text_color(255, 255, 255)
        pdf.set_font("Helvetica", "B", 18)
        pdf.cell(0, 12, "ExamHelper R22 Study Guide", new_x="LMARGIN", new_y="NEXT", align="C", fill=True)
        pdf.ln(2)

        # ── Subject + Goal ──
        pdf.set_text_color(30, 30, 30)
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(0, 8, self._safe(f"Subject: {subject_name}"), new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 10)
        goal_display = plan_data.get("meta", {}).get("goal_display", "")
        pdf.cell(0, 6, self._safe(f"Goal: {goal_display}"), new_x="LMARGIN", new_y="NEXT")
        papers = plan_data.get("meta", {}).get("papers_analyzed", 0)
        pdf.cell(0, 6, self._safe(f"Papers analyzed: {papers} | Regulation: R22"), new_x="LMARGIN", new_y="NEXT")

        # ── Data confidence warning ──
        if data_confidence == "none":
            pdf.ln(3)
            pdf.set_fill_color(255, 243, 205)
            pdf.set_font("Helvetica", "B", 10)
            pdf.multi_cell(0, 6, self._safe(
                "NOTE: No previous paper data available. "
                "Showing syllabus structure only. All topics listed without priority."
            ), fill=True)
        elif data_confidence == "partial":
            pdf.ln(3)
            pdf.set_fill_color(219, 234, 254)
            pdf.set_font("Helvetica", "", 9)
            pdf.multi_cell(0, 5, self._safe(
                "Partial data: Some exam papers analyzed. Priorities may change as more data is added."
            ), fill=True)

        pdf.ln(3)

        # ── Summary ──
        summary = plan_data.get("summary", {})
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(0, 7, "Summary", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 10)
        exp_range = summary.get("expected_marks_range", [None, None])
        if exp_range[0] is not None:
            pdf.cell(0, 5, self._safe(
                f"  Topics to Study: {summary.get('topics_to_study', '?')} | "
                f"Skip: {summary.get('topics_to_skip', '?')} | "
                f"Expected: {exp_range[0]}-{exp_range[1]}m | "
                f"Time: {summary.get('study_time_estimate_hours', '?')}h"
            ), new_x="LMARGIN", new_y="NEXT")
        else:
            pdf.cell(0, 5, self._safe(
                f"  Total topics: {summary.get('total_topics_in_syllabus', '?')} | "
                f"Study time: {summary.get('study_time_estimate_hours', '?')}h"
            ), new_x="LMARGIN", new_y="NEXT")
        pdf.ln(3)

        # ── Warnings ──
        warnings = plan_data.get("warnings", [])
        if warnings:
            pdf.set_font("Helvetica", "B", 10)
            pdf.cell(0, 6, "Alerts", new_x="LMARGIN", new_y="NEXT")
            pdf.set_font("Helvetica", "", 9)
            for w in warnings:
                pdf.multi_cell(0, 5, self._safe(f"  - {w}"))
            pdf.ln(2)

        # ── Units ──
        for unit in units:
            self.render_unit(pdf, unit, goal)

        # ── Exam Strategy ──
        strategy_key = "pass_strategy" if goal == "pass" else "high_marks_strategy"
        strategy = plan_data.get("exam_strategy", {}).get(strategy_key, {})
        if strategy:
            pdf.ln(3)
            pdf.set_fill_color(30, 58, 95)
            pdf.set_text_color(255, 255, 255)
            pdf.set_font("Helvetica", "B", 11)
            pdf.cell(0, 8, "Exam Day Strategy", new_x="LMARGIN", new_y="NEXT", fill=True)
            pdf.set_text_color(30, 30, 30)
            pdf.set_font("Helvetica", "", 10)
            for k, v in strategy.items():
                if isinstance(v, str):
                    pdf.multi_cell(0, 5, self._safe(f"  {k.replace('_', ' ').title()}: {v}"))

        return pdf.output()

    def render_unit(self, pdf, unit_data: dict, goal: str) -> None:
        unit_num = unit_data.get("unit_number", "?")
        exp = unit_data.get("expected_marks")
        hours = unit_data.get("study_time_hours", 0)
        confidence = unit_data.get("data_confidence", "none")

        pdf.set_fill_color(30, 58, 95)
        pdf.set_text_color(255, 255, 255)
        pdf.set_font("Helvetica", "B", 11)
        exp_str = f"~{exp}m" if exp is not None else "N/A"
        pdf.cell(0, 8, self._safe(f"UNIT {unit_num}  |  Expected: {exp_str}  |  Study: {hours}h"), new_x="LMARGIN", new_y="NEXT", fill=True)
        pdf.set_text_color(30, 30, 30)
        pdf.ln(1)

        if confidence == "none":
            # NO_DATA: list all topics neutrally
            all_topics = unit_data.get("all_topics", [])
            if all_topics:
                pdf.set_font("Helvetica", "I", 9)
                pdf.cell(0, 5, self._safe("  (No paper data — all topics listed without priority)"), new_x="LMARGIN", new_y="NEXT")
                for t in all_topics:
                    self.render_topic(pdf, t, "  -")
            msg = unit_data.get("message")
            if msg:
                pdf.set_font("Helvetica", "I", 9)
                pdf.multi_cell(0, 5, self._safe(f"  Note: {msg}"))
        elif goal == "pass":
            self._render_topic_group(pdf, "MUST STUDY (2-mark)", unit_data.get("must_study_2mark", []), "[+]")
            self._render_topic_group(pdf, "SHOULD STUDY", unit_data.get("should_study_2mark", []), "[o]")
            essay = unit_data.get("one_essay_topic")
            if essay:
                self._render_topic_group(pdf, "ESSAY TOPIC (10-mark)", [essay], "[*]")
            self._render_topic_group(pdf, "SKIP", unit_data.get("skip_topics", []), "[x]")
        else:
            self._render_topic_group(pdf, "TIER 1 — Must Master", unit_data.get("tier_1_must_master", []), "[*]")
            self._render_topic_group(pdf, "TIER 2 — Know Well", unit_data.get("tier_2_should_know_well", []), "[+]")
            self._render_topic_group(pdf, "TIER 3 — Good to Have", unit_data.get("tier_3_good_to_have", []), "[o]")
            self._render_topic_group(pdf, "TIER 4 — Skip if Short", unit_data.get("tier_4_skip_unless_time", []), "[x]")

        pdf.ln(2)

    def _render_topic_group(self, pdf, title: str, topics: list, marker: str):
        if not topics:
            return
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(0, 5, self._safe(f"  {title}"), new_x="LMARGIN", new_y="NEXT")
        for t in topics:
            self.render_topic(pdf, t, marker)

    def render_topic(self, pdf, topic: dict, marker: str) -> None:
        if not topic:
            return
        name = topic.get("name", str(topic)) if isinstance(topic, dict) else str(topic)
        cons = topic.get("consistency", "") if isinstance(topic, dict) else ""
        appeared = topic.get("appeared_in", "") if isinstance(topic, dict) else ""
        tip = topic.get("what_to_focus_on", "") if isinstance(topic, dict) else ""

        pdf.set_font("Helvetica", "", 9)
        line = f"    {marker} {name}"
        if cons and cons != "NO_DATA":
            line += f"  [{cons} | {appeared}]"
        pdf.cell(0, 5, self._safe(line), new_x="LMARGIN", new_y="NEXT")
        if tip:
            pdf.set_font("Helvetica", "I", 8)
            pdf.cell(0, 4, self._safe(f"        {tip}"), new_x="LMARGIN", new_y="NEXT")

    def _safe(self, text: str) -> str:
        return text.encode("latin-1", "replace").decode("latin-1")


class WeasyPrintRenderer(BasePDFRenderer):
    """
    Full blueprint design with HTML/CSS. For production VPS only.
    Requires: pip install weasyprint (+ GTK/Pango system deps)
    """

    def render_study_plan(self, plan_data: dict) -> bytes:
        # TODO: implement full HTML template rendering
        # For now, fall back to FPDF2
        logger.warning("WeasyPrintRenderer not yet implemented, falling back to FPDF2")
        return FPDF2Renderer().render_study_plan(plan_data)

    def render_unit(self, pdf_obj, unit_data: dict, goal: str) -> None:
        pass  # Handled in HTML template

    def render_topic(self, pdf_obj, topic: dict, marker: str) -> None:
        pass  # Handled in HTML template


def get_pdf_renderer() -> BasePDFRenderer:
    """Factory function — toggle via PDF_RENDERER env var."""
    renderer = os.getenv("PDF_RENDERER", "fpdf2")
    if renderer == "weasyprint":
        return WeasyPrintRenderer()
    return FPDF2Renderer()
