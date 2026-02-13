import { UnitData } from '@/types/examaid';

export interface CheckpointState {
    id: string;
    subject: string;
    total_units: number;
    completed_units: number[];
    results: Record<number, any>;
    timestamp: string;
}

export class CheckpointManager {
    private async saveToStorage(key: string, data: any): Promise<void> {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error('Failed to save checkpoint to localStorage', e);
        }
    }

    private async loadFromStorage(key: string): Promise<any | null> {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            console.error('Failed to load checkpoint from localStorage', e);
            return null;
        }
    }

    async initialize(config: { subject: string; total_units: number }): Promise<string> {
        const id = `checkpoint_${config.subject}_${Date.now()}`;
        const state: CheckpointState = {
            id,
            subject: config.subject,
            total_units: config.total_units,
            completed_units: [],
            results: {},
            timestamp: new Date().toISOString()
        };
        await this.saveToStorage(id, state);
        return id;
    }

    async saveUnit(checkpointId: string, unitNumber: number, result: any): Promise<void> {
        const state = await this.loadFromStorage(checkpointId) as CheckpointState;
        if (state) {
            state.completed_units.push(unitNumber);
            state.results[unitNumber] = result;
            state.timestamp = new Date().toISOString();
            await this.saveToStorage(checkpointId, state);
        }
    }

    async loadCheckpoint(checkpointId: string): Promise<CheckpointState | null> {
        return await this.loadFromStorage(checkpointId);
    }

    async clearCheckpoint(checkpointId: string): Promise<void> {
        localStorage.removeItem(checkpointId);
    }
}
