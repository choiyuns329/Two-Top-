
import { ScoreEntry, CalculatedResult, ExamSummary, Student, Exam } from "../types.ts";

export interface SchoolStat {
  schoolName: string;
  average: number;
  highestScore: number;
  studentCount: number;
}

export const calculateExamResults = (
  exam: Exam,
  students: Student[]
): (CalculatedResult & { schoolRank?: number, schoolTotal?: number })[] => {
  const { scores, passThreshold } = exam;
  if (scores.length === 0) return [];
  
  // 점수(또는 맞춘 개수) 내림차순 정렬
  const sortedScores = [...scores].sort((a, b) => b.score - a.score);
  const total = sortedScores.length;

  const results = sortedScores.map((entry) => {
    const student = students.find(s => s.id === entry.studentId);
    const rank = sortedScores.findIndex(s => s.score === entry.score) + 1;
    const percentile = (rank / total) * 100;

    const isPassed = passThreshold !== undefined && passThreshold !== null 
      ? entry.score >= passThreshold 
      : undefined;

    return {
      studentId: entry.studentId,
      name: student?.name || "Unknown",
      school: student?.school || "기타",
      score: entry.score,
      rank,
      percentile,
      isPassed,
      wrongQuestions: entry.wrongQuestions
    };
  });

  // 학교 내 등수 계산
  return results.map(res => {
    const sameSchoolResults = results
      .filter(r => r.school === res.school)
      .sort((a, b) => b.score - a.score);
    
    const schoolRank = sameSchoolResults.findIndex(r => r.score === res.score) + 1;
    
    return {
      ...res,
      schoolRank,
      schoolTotal: sameSchoolResults.length
    };
  });
};

export const getExamSummary = (results: CalculatedResult[], totalQuestions: number): ExamSummary => {
  if (results.length === 0) {
    return { average: 0, totalStudents: 0, highestScore: 0, lowestScore: 0 };
  }

  const scores = results.map(r => r.score);
  const average = scores.reduce((a, b) => a + b, 0) / results.length;
  
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

export const getSchoolBreakdown = (results: (CalculatedResult & { schoolRank?: number })[]): SchoolStat[] => {
  const schoolGroups: Record<string, number[]> = {};
  
  results.forEach(res => {
    const school = (res as any).school || "기타";
    if (!schoolGroups[school]) schoolGroups[school] = [];
    schoolGroups[school].push(res.score);
  });

  return Object.entries(schoolGroups).map(([name, scores]) => ({
    schoolName: name,
    average: scores.reduce((a, b) => a + b, 0) / scores.length,
    highestScore: Math.max(...scores),
    studentCount: scores.length
  })).sort((a, b) => b.average - a.average);
};
