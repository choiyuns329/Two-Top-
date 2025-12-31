
import { ScoreEntry, CalculatedResult, ExamSummary, Student, Exam } from "../types.ts";

export const calculateExamResults = (
  exam: Exam,
  students: Student[]
): CalculatedResult[] => {
  const { scores, passThreshold } = exam;
  if (scores.length === 0) return [];
  
  // 점수(또는 맞춘 개수) 내림차순 정렬
  const sortedScores = [...scores].sort((a, b) => b.score - a.score);
  const total = sortedScores.length;

  return sortedScores.map((entry) => {
    const student = students.find(s => s.id === entry.studentId);
    const rank = sortedScores.findIndex(s => s.score === entry.score) + 1;
    const percentile = (rank / total) * 100;

    const isPassed = passThreshold !== undefined && passThreshold !== null 
      ? entry.score >= passThreshold 
      : undefined;

    return {
      studentId: entry.studentId,
      name: student?.name || "Unknown",
      score: entry.score,
      rank,
      percentile,
      isPassed,
      wrongQuestions: entry.wrongQuestions
    };
  });
};

export const getExamSummary = (results: CalculatedResult[], totalQuestions: number): ExamSummary => {
  if (results.length === 0) {
    return { average: 0, totalStudents: 0, highestScore: 0, lowestScore: 0 };
  }

  const scores = results.map(r => r.score);
  const average = scores.reduce((a, b) => a + b, 0) / results.length;
  
  // 문항별 오답 통계 계산
  const questionStats: Record<number, number> = {};
  results.forEach(res => {
    res.wrongQuestions?.forEach(qNum => {
      questionStats[qNum] = (questionStats[qNum] || 0) + 1;
    });
  });
  
  return {
    average,
    totalStudents: results.length,
    highestScore: Math.max(...scores),
    lowestScore: Math.min(...scores),
    questionStats
  };
};
