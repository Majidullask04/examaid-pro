from fpdf import FPDF
from core.logger import logger
from schemas import FormattedAnswer
from services.ocr_service import perform_ocr

class VisionService:
    """Handles local OCR fallback for legacy endpoints."""

    def extract_text(self, image_content: str) -> str:
        logger.info("VisionService extracting text via local fallback.")
        return perform_ocr(image_content)

class AIOrchestrator:
    """Routes prompts through the shared OpenRouter-backed answer pipeline."""
    
    async def get_study_plan(self, syllabus_text: str, goal: str = "Pass") -> FormattedAnswer:
        # Import internally to avoid circular dependencies with existing modules
        from services.ai_pipeline import qwen_analysis, zlm_generate, format_answer, QWEN_MODEL
        import asyncio
        
        logger.info(f"AI Orchestrator initiating plan for goal: {goal}")
        
        # 1. Analyze
        analysis = await qwen_analysis(syllabus_text)
        
        # Apply goal logic to prompt modification implicitly or wait for zlm
        # We append the goal to the syllabus_text to influence generation
        enhanced_text = f"Study Goal: {goal}. Input: {syllabus_text}"
        
        # 2. Generation with smart routing based on complexity/goal
        # "Default to ZLM 4.6 for quick queries and Queen 3.6 Plus for deep syllabus analysis."
        # If it's a pass goal or short query, we might use a different logic. 
        # For now, we follow the PRD ZLM generation
        try:
            answer = await asyncio.wait_for(zlm_generate(enhanced_text, analysis), timeout=15.0)
        except asyncio.TimeoutError:
            # Fallback
            from services.ai_pipeline import call_llm
            logger.warning("Reasoning model timed out, orchestrator falling back to chat model.")
            answer = await call_llm([{"role": "user", "content": enhanced_text}], QWEN_MODEL)
            
        # 3. Formatting
        structured_raw = await format_answer(answer)
        return FormattedAnswer(**structured_raw)

class PDFGenerator:
    """Converts AI JSON output into a styled PDF for mobile."""
    
    def create_exam_guide(self, data: FormattedAnswer, template_name: str = "mobile_default") -> str:
        logger.info(f"PDFGenerator generating {template_name} guide...")
        pdf = FPDF()
        pdf.add_page()
        pdf.set_auto_page_break(auto=True, margin=15)
        
        # Title
        pdf.set_font("Helvetica", "B", 18)
        pdf.set_text_color(40, 40, 40)
        pdf.cell(0, 10, "ExamHelper R22 Study Guide", new_x="LMARGIN", new_y="NEXT", align="C")
        pdf.ln(5)
        
        def add_section(title, content):
            if not content: return
            pdf.set_font("Helvetica", "B", 14)
            pdf.set_text_color(0, 51, 153) # A nice robust blue
            pdf.cell(0, 10, title, new_x="LMARGIN", new_y="NEXT")
            pdf.set_font("Helvetica", "", 11)
            pdf.set_text_color(30, 30, 30)
            # handle utf-8 decoding for basic FPDF 
            safe_content = content.encode('latin-1', 'replace').decode('latin-1')
            pdf.multi_cell(0, 6, safe_content)
            pdf.ln(5)

        add_section("Introduction", data.introduction)
        add_section("Core Explanation", data.body)
        add_section("Diagram / Visualization", data.diagram)
        add_section("Conclusion", data.conclusion)
        
        # Save to file or return string path
        output_path = "/tmp/generated_guide.pdf"
        pdf.output(output_path)
        return output_path

class JNTUHDataManager:
    """Manages the subject lists and R22 branch data."""
    def __init__(self):
        # We store hardcoded top-tier R22 subjects for MVP
        self.r22_data = {
            "CSE": [
                {"id": "cse1", "name": "Data Structures"},
                {"id": "cse2", "name": "Computer Organization and Architecture"},
                {"id": "cse3", "name": "Operating Systems"},
                {"id": "cse4", "name": "Database Management Systems"}
            ],
            "ECE": [
                {"id": "ece1", "name": "Electronic Devices and Circuits"},
                {"id": "ece2", "name": "Digital System Design"},
                {"id": "ece3", "name": "Signals and Systems"}
            ],
            "IT": [
                {"id": "it1", "name": "Web Technologies"},
                {"id": "it2", "name": "Computer Networks"},
                {"id": "it3", "name": "Software Engineering"}
            ]
        }
    
    def get_subjects_by_branch(self, branch: str = "CSE"):
        logger.info(f"JNTUHDataManager fetching subjects for {branch}")
        return self.r22_data.get(branch.upper(), [])
