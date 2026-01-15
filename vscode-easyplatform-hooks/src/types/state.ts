/**
 * State type definitions for EasyPlatform Hooks extension
 * Research: phase-01-extension-scaffold.md
 */

export interface SessionState {
    id: string;
    startedAt: string;
    endedAt?: string;
    lastActiveDate: string;
    resumeCount: number;
    workspaceFolder: string;
    metrics: SessionMetrics;
    version?: number; // Schema version for migrations
}

export interface SessionMetrics {
    durationSeconds: number;
    editCount: number;
    toolUseCount: number;
    filesModified: string[];
    commandsExecuted: string[];
}

export interface EditTrackingState {
    [filePath: string]: {
        count: number;
        lastModified: number;
        hash: string; // Content hash for dedup
        version: number; // TextDocument.version for concurrent edit detection
    };
}

export interface TodoState {
    todos: TodoItem[];
    lastUpdated: number;
}

export interface TodoItem {
    id: string;
    title: string;
    description: string;
    status: 'not-started' | 'in-progress' | 'completed';
    timestamp: number;
}

export interface WorkflowState {
    active: string | null;
    history: WorkflowExecution[];
}

export interface WorkflowExecution {
    workflow: string;
    startedAt: number;
    completedAt?: number;
    steps: WorkflowStep[];
}

export interface WorkflowStep {
    name: string;
    status: 'pending' | 'in-progress' | 'completed' | 'failed';
    timestamp: number;
}

export interface PatternStorage {
    patterns: LearnedPattern[];
    version: number;
}

export interface LearnedPattern {
    id: string;
    description: string;
    confidence: number;
    timestamp: number;
    category: string;
}

export interface NotificationEvent {
    type: string;
    data: any;
    timestamp: number;
}
