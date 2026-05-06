"""
JNTUH R22 Seed Data — SYLLABUS STRUCTURE ONLY.
NO fabricated question history. NO fake frequency scores.
Data comes from real jntuh.ac.in R22 syllabus PDFs.

The frequency index starts at NO_DATA until real previous papers are entered
through the /admin/questions endpoint.
"""
import json
from pathlib import Path

from data.models import SessionLocal, Subject, Question, TopicIndexEntry

# ─── Real R22 Subject Registry ──────────────────────────────────────────────
SUBJECTS = [
    # CSE
    {"subject_code": "R22CS2201", "subject_name": "Data Structures", "branch": "CSE"},
    {"subject_code": "R22CS2202", "subject_name": "Computer Organization & Architecture", "branch": "CSE"},
    {"subject_code": "R22CS2203", "subject_name": "Mathematical Foundations of Computer Science", "branch": "CSE"},
    {"subject_code": "R22CS3301", "subject_name": "Database Management Systems", "branch": "CSE"},
    {"subject_code": "R22CS3302", "subject_name": "Operating Systems", "branch": "CSE"},
    {"subject_code": "R22CS3303", "subject_name": "Computer Networks", "branch": "CSE"},
    {"subject_code": "R22CS4401", "subject_name": "Design and Analysis of Algorithms", "branch": "CSE"},
    {"subject_code": "R22CS4402", "subject_name": "Compiler Design", "branch": "CSE"},
    {"subject_code": "R22CS4403", "subject_name": "Machine Learning", "branch": "CSE"},
    {"subject_code": "R22CS5501", "subject_name": "Software Engineering", "branch": "CSE"},
    # IT
    {"subject_code": "R22IT2201", "subject_name": "Web Technologies", "branch": "IT"},
    {"subject_code": "R22IT3301", "subject_name": "Software Engineering", "branch": "IT"},
    {"subject_code": "R22IT3302", "subject_name": "Computer Networks", "branch": "IT"},
    # ECE
    {"subject_code": "R22ECE2201", "subject_name": "Electronic Devices and Circuits", "branch": "ECE"},
    {"subject_code": "R22ECE3301", "subject_name": "Digital Signal Processing", "branch": "ECE"},
    {"subject_code": "R22ECE3302", "subject_name": "Signals and Systems", "branch": "ECE"},
]

# ─── Real R22 Syllabus Unit/Topic Structure (from jntuh.ac.in syllabus PDFs) ─
# This is the ONLY data we seed. Topics, not questions.
SYLLABUS_STRUCTURE: dict[str, dict[int, list[str]]] = {
    "R22CS2201": {  # Data Structures
        1: [
            "Array Declaration", "Array Operations", "Sparse Matrix",
            "Linked List", "Singly Linked List", "Doubly Linked List",
            "Circular Linked List", "Polynomial Representation",
            "Stack", "Stack Operations", "Stack Applications",
            "Queue", "Queue Operations", "Circular Queue", "Priority Queue",
        ],
        2: [
            "Binary Tree", "Binary Tree Traversals", "Inorder", "Preorder", "Postorder",
            "BST", "BST Operations", "BST Construction", "BST Deletion",
            "AVL Tree", "LL Rotation", "RR Rotation", "LR Rotation", "RL Rotation",
            "Heap Sort", "Max Heap", "Heap Operations",
            "Threaded Binary Trees", "Expression Tree",
        ],
        3: [
            "Graph", "Graph Types", "Graph Representation",
            "Adjacency Matrix", "Adjacency List",
            "BFS", "DFS", "Graph Traversal",
            "Minimum Spanning Tree", "Prim Algorithm", "Kruskal Algorithm",
            "Shortest Path", "Dijkstra Algorithm",
        ],
        4: [
            "Bubble Sort", "Selection Sort", "Insertion Sort",
            "Merge Sort", "Quick Sort", "Heap Sort",
            "Radix Sort", "Counting Sort",
            "Time Complexity", "Divide and Conquer",
            "Sorting Algorithms",
        ],
        5: [
            "Hashing", "Hash Function", "Collision Resolution",
            "Open Addressing", "Linear Probing", "Chaining",
            "Linear Search", "Binary Search", "Interpolation Search",
            "Searching Algorithms",
        ],
    },
    "R22CS3302": {  # Operating Systems
        1: [
            "Process", "Process States", "PCB",
            "Thread", "Multithreading",
            "CPU Scheduling", "FCFS", "SJF", "Round Robin",
            "Priority Scheduling", "Multilevel Queue",
        ],
        2: [
            "Process Synchronization", "Critical Section",
            "Semaphores", "Mutex",
            "Producer Consumer", "Readers Writers", "Dining Philosophers",
            "Deadlock", "Deadlock Conditions", "Deadlock Avoidance",
            "Banker Algorithm", "Deadlock Detection", "Deadlock Prevention",
        ],
        3: [
            "Memory Management", "Paging", "Segmentation",
            "Virtual Memory", "Demand Paging",
            "Page Replacement", "FIFO", "LRU", "Optimal",
            "Thrashing", "Page Fault",
        ],
        4: [
            "File System", "File Organization",
            "Directory Structure", "File Allocation Methods",
            "Disk Scheduling", "FCFS Disk", "SCAN", "C-SCAN", "SSTF",
        ],
        5: [
            "I/O Management", "I/O Scheduling",
            "Protection", "Security",
            "System Calls", "System Programs",
        ],
    },
    "R22CS3301": {  # DBMS
        1: [
            "DBMS Basics", "DBMS Advantages", "Data Models",
            "ER Model", "ER Diagram", "Entity", "Attribute", "Relationship",
            "Relational Model", "Relational Algebra",
        ],
        2: [
            "Normalization", "Functional Dependency",
            "1NF", "2NF", "3NF", "BCNF",
            "Decomposition", "Lossless Join",
        ],
        3: [
            "SQL", "DDL", "DML", "TCL",
            "SQL Queries", "SQL Joins", "Inner Join", "Outer Join",
            "Aggregate Functions", "Subqueries",
            "Primary Key", "Foreign Key", "Constraints",
        ],
        4: [
            "Transaction Management", "ACID Properties",
            "Concurrency Control", "2PL", "Timestamp Ordering",
            "Serializability", "Recovery Techniques",
        ],
        5: [
            "Indexing", "B+ Tree", "File Organization",
            "Query Processing", "Query Optimization",
            "Hashing in DBMS",
        ],
    },
    "R22CS3303": {  # Computer Networks
        1: [
            "OSI Model", "TCP/IP Model", "Network Topologies",
            "Transmission Media", "Switching Techniques",
        ],
        2: [
            "Data Link Layer", "Error Detection", "Error Correction",
            "Flow Control", "Sliding Window Protocol",
            "HDLC", "PPP",
        ],
        3: [
            "Network Layer", "IP Addressing", "Subnetting",
            "Routing Algorithms", "Distance Vector", "Link State",
            "OSPF", "RIP", "BGP",
        ],
        4: [
            "Transport Layer", "TCP", "UDP",
            "Congestion Control", "Flow Control Transport",
            "Socket Programming",
        ],
        5: [
            "Application Layer", "DNS", "HTTP", "FTP", "SMTP",
            "Network Security", "Cryptography", "Firewalls",
        ],
    },
    "R22CS2202": {  # COA
        1: [
            "Number Systems", "Boolean Algebra", "Logic Gates",
            "Combinational Circuits", "Multiplexer", "Decoder",
        ],
        2: [
            "Computer Arithmetic", "Fixed Point", "Floating Point",
            "ALU Design", "Booth Algorithm",
        ],
        3: [
            "Processor Organization", "Instruction Set Architecture",
            "Addressing Modes", "CISC vs RISC",
            "Instruction Pipeline", "Pipeline Hazards",
        ],
        4: [
            "Memory Organization", "Cache Memory", "Cache Mapping",
            "Virtual Memory COA", "Memory Hierarchy",
        ],
        5: [
            "I/O Organization", "DMA", "Interrupts",
            "I/O Processor", "Bus Architecture",
        ],
    },
}


def _load_generated_r22_cse_syllabus() -> tuple[list[dict], dict[str, dict[int, list[str]]]]:
    """Load the extracted official R22 CSE syllabus JSON generated from the PDF."""
    syllabus_path = Path(__file__).resolve().parent / "generated" / "r22_cse_syllabus.json"
    if not syllabus_path.exists():
        return [], {}

    data = json.loads(syllabus_path.read_text())
    subjects: list[dict] = []
    structure: dict[str, dict[int, list[str]]] = {}

    for item in data.get("subjects", []):
        subject_code = item["subject_code"]
        subjects.append({
            "subject_code": subject_code,
            "subject_name": item["subject_name"],
            "branch": item.get("branch", "CSE"),
            "regulation": item.get("regulation", "R22"),
            "total_units": item.get("total_units", 5),
        })

        units = {
            int(unit): topics
            for unit, topics in item.get("units", {}).items()
            if topics
        }
        if units:
            structure[subject_code] = units

    return subjects, structure


_PDF_SUBJECTS, _PDF_SYLLABUS_STRUCTURE = _load_generated_r22_cse_syllabus()

# Keep existing app-facing aliases working while official JNTUH subject codes are
# also available in the database. These aliases point to the closest official
# R22 CSE syllabus subject from the PDF.
LEGACY_CSE_ALIASES = {
    "R22CS2201": "CS302PC",  # Data Structures
    "R22CS2202": "CS304PC",  # Computer Organization and Architecture
    "R22CS2203": "CS401PC",  # Discrete Mathematics
    "R22CS3301": "CS404PC",  # Database Management Systems
    "R22CS3302": "CS403PC",  # Operating Systems
    "R22CS3303": "CS502PC",  # Computer Networks
    "R22CS4401": "CS501PC",  # Design and Analysis of Algorithms
    "R22CS4402": "CS702PC",  # Compiler Design
    "R22CS4403": "CS601PC",  # Machine Learning
    "R22CS5501": "CS405PC",  # Software Engineering
}

_PDF_SUBJECT_BY_CODE = {subject["subject_code"]: subject for subject in _PDF_SUBJECTS}
_LEGACY_ALIAS_SUBJECTS = [
    {
        **_PDF_SUBJECT_BY_CODE[official_code],
        "subject_code": alias_code,
    }
    for alias_code, official_code in LEGACY_CSE_ALIASES.items()
    if official_code in _PDF_SUBJECT_BY_CODE
]
_LEGACY_ALIAS_STRUCTURE = {
    alias_code: _PDF_SYLLABUS_STRUCTURE[official_code]
    for alias_code, official_code in LEGACY_CSE_ALIASES.items()
    if official_code in _PDF_SYLLABUS_STRUCTURE
}

# Official PDF subjects first, then any older non-PDF fallback subjects that are
# not duplicated by code. Legacy aliases are seeded separately for backwards
# compatibility, but are not exposed through API lists that import SUBJECTS.
_subject_codes = {subject["subject_code"] for subject in _PDF_SUBJECTS}
SUBJECTS = (
    _PDF_SUBJECTS
    + [
        subject
        for subject in SUBJECTS
        if subject["subject_code"] not in _subject_codes
        and not subject["subject_code"].startswith("R22CS")
    ]
)
SEED_SUBJECTS = SUBJECTS + _LEGACY_ALIAS_SUBJECTS
SYLLABUS_STRUCTURE = {
    **SYLLABUS_STRUCTURE,
    **_PDF_SYLLABUS_STRUCTURE,
    **_LEGACY_ALIAS_STRUCTURE,
}


def seed_syllabus_structure():
    """
    Seeds ONLY the R22 syllabus structure: subjects + topics per unit.
    NO question history. NO fake frequency scores.
    All topics start at data_confidence: "none".
    """
    db = SessionLocal()
    try:
        inserted_subjects = 0
        inserted_topics = 0

        # Seed subjects
        for s in SEED_SUBJECTS:
            exists = db.query(Subject).filter_by(subject_code=s["subject_code"]).first()
            if not exists:
                db.add(Subject(**s))
                inserted_subjects += 1
            else:
                exists.subject_name = s["subject_name"]
                exists.branch = s["branch"]
                exists.regulation = s.get("regulation", "R22")
                exists.total_units = s.get("total_units", 5)

        # Seed topic index entries with NO_DATA frequency
        for subject_code, units in SYLLABUS_STRUCTURE.items():
            for unit_num, topics in units.items():
                for topic in topics:
                    exists = db.query(TopicIndexEntry).filter_by(
                        subject_code=subject_code, topic=topic
                    ).first()
                    if not exists:
                        db.add(TopicIndexEntry(
                            subject_code=subject_code,
                            topic=topic,
                            unit=unit_num,
                            total_appearances=0,
                            frequency_score=None,         # NO DATA — not 0, not 80, NULL
                            avg_marks=None,
                            consistency="NO_DATA",
                            last_seen_year=None,
                            trend="NO_DATA",
                            guaranteed_2mark=False,
                            high_value_10mark=False,
                            marks_history=[],
                            units_asked_in=[unit_num],
                            data_confidence="none",
                        ))
                        inserted_topics += 1

        db.commit()
        print(
            "✅ R22 syllabus seed complete: "
            f"{inserted_subjects} new subjects, {inserted_topics} new topics "
            f"({len(SUBJECTS)} official/listed subjects, ZERO fake questions)"
        )
    finally:
        db.close()


if __name__ == "__main__":
    from data.models import init_db
    init_db()
    seed_syllabus_structure()
