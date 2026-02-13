import { UnitData } from '@/types/examaid';

export interface SubjectAdapter {
    getFallbackUnit(unit: UnitData): any;
}

export class GenericAdapter implements SubjectAdapter {
    getFallbackUnit(unit: UnitData): any {
        return {
            unit_number: unit.unit_number,
            title: unit.title,
            topics: unit.topics,
            part_a: unit.topics.slice(0, 5).map(topic => ({
                question: `Explain the concept of ${topic} with a suitable example.`,
                answer: `[AI Fallback] ${topic} is a fundamental concept in this unit. Refer to standard textbooks for a detailed definition.`,
                marks: 2,
                bt_level: 'L2',
                co: `CO${unit.unit_number}`
            })),
            part_b: unit.topics.slice(0, 3).map(topic => ({
                question: `Discuss in detail about ${topic} and its applications.`,
                answer: `[AI Fallback] Detailed discussion on ${topic} requires understanding its core principles and applications in the field.`,
                marks: 10,
                bt_level: 'L3',
                co: `CO${unit.unit_number}`
            })),
            study_plan: {
                priority: 'High',
                estimated_time: '2 hours',
                focus_topics: unit.topics.slice(0, 3)
            }
        };
    }
}
