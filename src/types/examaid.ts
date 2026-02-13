export interface SyllabusData {
    subject_code: string;
    subject_name: string;
    regulation: 'R16' | 'R18' | 'R22' | 'R23';
    semester: number;
    units: UnitData[];
    total_units: number;
}

export interface UnitData {
    unit_number: number;
    title: string;
    topics: string[];
    keywords: string[];
}

export interface ProcessingBudget {
    strategy: 'single' | 'chunked';
    maxOutputTokens: number;
    estimatedCost: number;
}

export interface CheckpointData {
    id: string;
    subject: string;
    total_units: number;
    timestamp: string;
    progress: number;
}

export interface AnalysisResult {
    metadata: {
        subject_code: string;
        subject_name: string;
        regulation: string;
        semester: number;
        total_units: number;
        exam_pattern: string;
        processing_status: 'COMPLETE' | 'PARTIAL' | 'FAILED';
        timestamp: string;
    };
    methodology: string;
    hit_ratio_table: Array<{
        unit: number;
        hit_ratio: string;
        description: string;
    }>;
    unit_predictions: any[]; // refined in specific unit types
    study_plan: any; // refined in specific plan types
}
