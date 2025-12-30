
export interface Student {
  id: string;
  name: string;
  school?: string;
  phone?: string;
  note?: string;
  createdAt: number;
}

export interface ScoreEntry {
  studentId: string;
  score: number;
}

export interface Exam {
  id: string;
  title: string;
  date: string;
  maxScore: number;
  passThreshold?: number; // Added: Score required to pass
  scores: ScoreEntry[];
}

export interface CalculatedResult {
  studentId: string;
  name: string;
  score: number;
  rank: number;
  percentile: number;
  grade: 1 | 2 | 3 | 4;
  isPassed?: boolean; // Added: Based on passThreshold
}

export interface ExamSummary {
  average: number;
  totalStudents: number;
  highestScore: number;
  lowestScore: number;
  gradeDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
  };
}

export enum ViewMode {
  DASHBOARD = 'DASHBOARD',
  STUDENTS = 'STUDENTS',
  EXAMS = 'EXAMS',
  ANALYTICS = 'ANALYTICS'
}
