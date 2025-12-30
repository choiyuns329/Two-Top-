
import { ScoreEntry, CalculatedResult, ExamSummary, Student } from "../types";

export const calculateExamResults = (
  scores: ScoreEntry[],
  students: Student[]
): CalculatedResult[] => {
  // Sort scores descending
  const sortedScores = [...scores].sort((a, b) => b.score - a.score);
  const total = sortedScores.length;

  return sortedScores.map((entry, index) => {
    const student = students.find(s => s.id === entry.studentId);
    
    // Rank logic (handling ties)
    const rank = sortedScores.findIndex(s => s.score === entry.score) + 1;
    
    // Percentile: (Rank / Total) * 100
    const percentile = (rank / total) * 100;

    // Grade logic (1-4 grades requested)
    // 1등급: 상위 25%
    // 2등급: 25% ~ 50%
    // 3등급: 50% ~ 75%
    // 4등급: 하위 25%
    let grade: 1 | 2 | 3 | 4 = 4;
    if (percentile <= 25) grade = 1;
    else if (percentile <= 50) grade = 2;
    else if (percentile <= 75) grade = 3;

    return {
      studentId: entry.studentId,
      name: student?.name || "Unknown",
      score: entry.score,
      rank,
      percentile,
      grade
    };
  });
};

export const getExamSummary = (results: CalculatedResult[]): ExamSummary => {
  if (results.length === 0) {
    return {
      average: 0,
      totalStudents: 0,
      highestScore: 0,
      lowestScore: 0,
      gradeDistribution: { 1: 0, 2: 0, 3: 0, 4: 0 }
    };
  }

  const scores = results.map(r => r.score);
  const average = scores.reduce((a, b) => a + b, 0) / results.length;
  
  const distribution = {
    1: results.filter(r => r.grade === 1).length,
    2: results.filter(r => r.grade === 2).length,
    3: results.filter(r => r.grade === 3).length,
    4: results.filter(r => r.grade === 4).length,
  };

  return {
    average,
    totalStudents: results.length,
    highestScore: Math.max(...scores),
    lowestScore: Math.min(...scores),
    gradeDistribution: distribution
  };
};
