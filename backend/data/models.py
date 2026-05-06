"""
SQLAlchemy models for the ExamHelper database.
Updated with data_confidence and nullable frequency fields.
"""
from pathlib import Path

from sqlalchemy import create_engine, Column, String, Integer, Boolean, Float, JSON, Text
from sqlalchemy.orm import declarative_base, sessionmaker

Base = declarative_base()
DB_PATH = Path(__file__).resolve().parent.parent / "examhelper.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)


class Subject(Base):
    __tablename__ = "subjects"

    subject_code = Column(String, primary_key=True)
    subject_name = Column(String, nullable=False)
    branch = Column(String, nullable=False)
    regulation = Column(String, default="R22")
    total_units = Column(Integer, default=5)


class Question(Base):
    """A real question from a real previous paper. Only added via admin endpoints."""
    __tablename__ = "questions"

    question_id = Column(String, primary_key=True)
    subject_code = Column(String, nullable=False)
    subject_name = Column(String, nullable=False)
    unit = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    exam = Column(String, nullable=False)           # May/June, Nov/Dec
    marks = Column(Integer, nullable=False)
    question_text = Column(Text, nullable=False)
    extracted_topics = Column(JSON, nullable=False)  # list of strings
    difficulty = Column(String, default="medium")
    question_type = Column(String, default="essay")
    has_internal_choice = Column(Boolean, default=False)
    choice_group_id = Column(String, nullable=True)


class TopicIndexEntry(Base):
    """
    Pre-computed frequency index entry for a single topic.
    Starts with all null/NO_DATA when only syllabus structure exists.
    Gets populated when real question data is entered.
    """
    __tablename__ = "topic_index"

    id = Column(Integer, primary_key=True, autoincrement=True)
    subject_code = Column(String, nullable=False)
    topic = Column(String, nullable=False)
    unit = Column(Integer, nullable=False)
    total_appearances = Column(Integer, default=0)
    frequency_score = Column(Float, nullable=True)       # NULL = no data
    avg_marks = Column(Float, nullable=True)             # NULL = no data
    consistency = Column(String, default="NO_DATA")      # NO_DATA/LOCKED/LIKELY/POSSIBLE/DORMANT
    last_seen_year = Column(Integer, nullable=True)
    trend = Column(String, default="NO_DATA")            # NO_DATA/RISING/STABLE/DECLINING
    guaranteed_2mark = Column(Boolean, default=False)
    high_value_10mark = Column(Boolean, default=False)
    marks_history = Column(JSON, default=list)
    units_asked_in = Column(JSON, default=list)
    data_confidence = Column(String, default="none")     # none/partial/full


def init_db():
    Base.metadata.create_all(bind=engine)
