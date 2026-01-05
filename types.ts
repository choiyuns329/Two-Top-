
export interface Student {
  id: string;
  name: string;
  school?: string;
  phone?: string;
  note?: string;
  createdAt: number;
}

export type ExamType = 'RANKING' | 'VOCAB' | 'WORD_TEST';

export interface ScoreEntry {
  studentId: string;
  score: number; // RANKING일 경우 점수, VOCAB/WORD_TEST일 경우 맞춘 개수
  wrongQuestions?: number[]; // 틀린 문항 번호 리스트
}

export interface Exam {
  id: string;
  title: string;
  date: string;
  type: ExamType;
  maxScore: number; // RANKING일 경우 만점, VOCAB/WORD_TEST일 경우 전체 문항 수
  totalQuestions: number;
  questionPoints?: number[]; // 문항별 배점 (RANKING 전용)
  targetSchools?: string[];
  passThreshold?: number; 
  scores: ScoreEntry[];
}

export interface CalculatedResult {
  studentId: string;
  name: string;
  school: string;
  score: number;
  rank: number;
  percentile: number;
  isPassed?: boolean;
  wrongQuestions?: number[];
}

export interface ExamSummary {
  average: number;
  totalStudents: number;
  highestScore: number;
  lowestScore: number;
  questionStats?: Record<number, number>; // 문항별 틀린 학생 수
}

export enum ViewMode {
  DASHBOARD = 'DASHBOARD',
  STUDENTS = 'STUDENTS',
  STUDENT_DETAIL = 'STUDENT_DETAIL',
  EXAMS = 'EXAMS',
  ANALYTICS = 'ANALYTICS',
  SETTINGS = 'SETTINGS'
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}
