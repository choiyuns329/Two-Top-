
export interface Student {
  id: string;
  name: string;
  school?: string;
  phone?: string;
  note?: string;
  createdAt: number;
}

export type ExamType = 'RANKING' | 'VOCAB' | 'WORD_TEST';
export type QuestionType = 'MULTIPLE' | 'SUBJECTIVE';

export interface QuestionConfig {
  number: number;
  type: QuestionType;
  correctAnswer: string;
  point: number;
}

export interface ScoreEntry {
  studentId: string;
  score: number;
  wrongQuestions?: number[];
  studentAnswers?: Record<number, string>; // 문항번호: 학생답안
}

export interface Exam {
  id: string;
  title: string;
  date: string;
  type: ExamType;
  maxScore: number;
  totalQuestions: number;
  questions?: QuestionConfig[]; // 문항별 상세 설정
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
  questionStats?: Record<number, number>; 
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
