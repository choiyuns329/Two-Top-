
import React, { useState, useEffect, useMemo } from 'react';
import { Student, Exam } from '../types.ts';
import { calculateExamResults, getExamSummary } from '../utils/gradingUtils.ts';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

interface AnalyticsProps {
  students: Student[];
  exams: Exam[];
}

const Analytics: React.FC<AnalyticsProps> = ({ students, exams }) => {
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [selectedQuestionNum, setSelectedQuestionNum] = useState<number>(1);

  useEffect(() => {
    if (exams.length > 0 && !selectedExamId) {
      setSelectedExamId(exams[exams.length - 1].id);
    }
  }, [exams, selectedExamId]);

  const selectedExam = useMemo(() => exams.find(e => e.id === selectedExamId), [exams, selectedExamId]);
  
  const results = useMemo(() => {
    if (!selectedExam) return [];
    return calculateExamResults(selectedExam, students);
  }, [selectedExam, students]);

  const questionStatsData = useMemo(() => {
    if (!selectedExam) return [];
    const summary = getExamSummary(results, selectedExam.totalQuestions);
    
    return Array.from({ length: selectedExam.totalQuestions }, (_, i) => ({
      questionNum: i + 1,
      wrongCount: summary.questionStats?.[i + 1] || 0
    }));
  }, [selectedExam, results]);

  // 선택된 문항의 답안 분포 계산
  const answerDistribution = useMemo(() => {
    if (!selectedExam || !selectedQuestionNum) return null;

    const distribution: Record<string, number> = {};
    let totalCount = 0;
    let correctCount = 0;
    
    const correctAns = selectedExam.questions?.find(q => q.number === selectedQuestionNum)?.correctAnswer || "정답 미설정";

    selectedExam.scores.forEach(scoreEntry => {
      const ans = scoreEntry.studentAnswers?.[selectedQuestionNum];
      if (ans !== undefined) {
        const normalizedAns = ans.trim() === "" ? "(미기입)" : ans.trim();
        distribution[normalizedAns] = (distribution[normalizedAns] || 0) + 1;
        totalCount++;
        
        if (ans.trim() === correctAns) {
          correctCount++;
        }
      }
    });

    const sortedEntries = Object.entries(distribution).sort((a, b) => b[1] - a[1]);

    return {
      entries: sortedEntries,
      totalCount,
      correctCount,
      correctAnswer: correctAns,
      accuracy: totalCount > 0 ? (correctCount / totalCount) * 100 : 0
    };
  }, [selectedExam, selectedQuestionNum]);

  if (exams.length === 0) return (
    <div className="py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
      <p className="text-slate-400 font-black text-xl">데이터가 부족합니다.</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row gap-6 items-end mb-10">
          <div className="flex-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">분석 대상 시험 선택</label>
            <select
              value={selectedExamId}
              onChange={(e) => {
                setSelectedExamId(e.target.value);
                setSelectedQuestionNum(1); // 시험 바뀔 때 첫 문항으로 초기화
              }}
              className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none font-black text-slate-800"
            >
              {exams.slice().reverse().map(e => (
                <option key={e.id} value={e.id}>{e.title}</option>
              ))}
            </select>
          </div>
        </div>

        {selectedExam && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Question Error Rate Chart */}
            <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100">
              <h4 className="text-sm font-black text-slate-800 mb-6 flex items-center gap-2">
                📊 문항별 오답 빈도 (클릭 시 우측 상세 분석)
              </h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={questionStatsData}
                    onClick={(data) => {
                      if (data && data.activeLabel) {
                        setSelectedQuestionNum(Number(data.activeLabel));
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="questionNum" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                    <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '12px', border: 'none', fontWeight: 'bold'}} />
                    <Bar dataKey="wrongCount" radius={[4, 4, 0, 0]} className="cursor-pointer">
                      {questionStatsData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.questionNum === selectedQuestionNum ? '#1e293b' : entry.wrongCount > (selectedExam.scores.length / 2) ? '#ef4444' : '#6366f1'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                 {questionStatsData.map(q => (
                   <button 
                     key={q.questionNum}
                     onClick={() => setSelectedQuestionNum(q.questionNum)}
                     className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${
                       selectedQuestionNum === q.questionNum 
                         ? 'bg-slate-900 text-white shadow-lg' 
                         : 'bg-white text-slate-400 border border-slate-200 hover:border-slate-400'
                     }`}
                   >
                     {q.questionNum}
                   </button>
                 ))}
              </div>
            </div>

            {/* Answer Distribution View */}
            <div className="p-8 bg-blue-600 rounded-3xl text-white shadow-xl shadow-blue-100 relative overflow-hidden flex flex-col">
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                  <h4 className="text-sm font-black text-white/70 uppercase tracking-widest mb-1">Answer Distribution</h4>
                  <p className="text-2xl font-black">{selectedQuestionNum}번 문항 상세 분석</p>
                </div>
                {answerDistribution && (
                  <div className="bg-white/10 px-4 py-2 rounded-2xl text-right">
                    <p className="text-[10px] font-black opacity-60 uppercase">정답률</p>
                    <p className="text-xl font-black">{answerDistribution.accuracy.toFixed(0)}%</p>
                  </div>
                )}
              </div>

              <div className="flex-1 relative z-10 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                {answerDistribution ? (
                  <>
                    <div className="bg-white/10 p-5 rounded-2xl border border-white/10 mb-6">
                       <p className="text-[10px] font-black opacity-60 uppercase mb-1">정답지 (Answer Key)</p>
                       <p className="text-xl font-black">{answerDistribution.correctAnswer}</p>
                    </div>

                    <div className="space-y-3">
                      <p className="text-[10px] font-black opacity-60 uppercase tracking-widest">학생들이 선택한 답안 분포</p>
                      {answerDistribution.entries.map(([ans, count], idx) => {
                        const isCorrect = ans === answerDistribution.correctAnswer;
                        const percentage = (count / answerDistribution.totalCount) * 100;
                        return (
                          <div key={idx} className="space-y-1.5">
                            <div className="flex justify-between text-xs font-black">
                              <span className="flex items-center gap-2">
                                {ans} {isCorrect && <span className="bg-white text-blue-600 px-1.5 py-0.5 rounded text-[8px] uppercase">정답</span>}
                              </span>
                              <span>{count}명 ({percentage.toFixed(0)}%)</span>
                            </div>
                            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-500 rounded-full ${isCorrect ? 'bg-white' : 'bg-red-400'}`} 
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-50 py-10">
                    <span className="text-4xl mb-4">📈</span>
                    <p className="font-bold">분석할 문항을 선택하세요.</p>
                  </div>
                )}
              </div>
              
              <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;
