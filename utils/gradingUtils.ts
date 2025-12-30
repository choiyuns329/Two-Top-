
import { ScoreEntry, CalculatedResult, ExamSummary, Student } from "../types";

export const calculateExamResults = (
  scores: ScoreEntry[],
  students: Student[],
  passThreshold?: number
): CalculatedResult[] => {
  if (scores.length === 0) return [];
  
  // Sort scores descending
  const sortedScores = [...scores].sort((a, b) => b.score - a.score);
  const total = sortedScores.length;

  return sortedScores.map((entry) => {
    const student = students.find(s => s.id === entry.studentId);
    
    // Rank logic (handling ties correctly for percentile)
    const rank = sortedScores.findIndex(s => s.score === entry.score) + 1;
    
    // Percentile: (Rank / Total) * 100
    const percentile = (rank / total) * 100;

    // Updated Grade logic (CSAT Style requested)
    // 1등급: 상위 4%
    // 2등급: 상위 11%
    // 3등급: 상위 23%
    // 4등급: 하위 77%
    let grade: 1 | 2 | 3 | 4 = 4;
    if (percentile <= 4) grade = 1;
    else if (percentile <= 11) grade = 2;
    else if (percentile <= 23) grade = 3;

    // Pass Threshold logic
    const isPassed = passThreshold !== undefined && passThreshold !== null 
      ? entry.score >= passThreshold 
      : undefined;

    return {
      studentId: entry.studentId,
      name: student?.name || "Unknown",
      score: entry.score,
      rank,
      percentile,
      grade,
      isPassed
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
