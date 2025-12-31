
import React, { useState, useEffect, useMemo } from 'react';
import { Student, Exam } from '../types.ts';
import { calculateExamResults, getExamSummary } from '../utils/gradingUtils.ts';
import { getAIInsights } from '../services/geminiService.ts';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

interface AnalyticsProps {
  students: Student[];
  exams: Exam[];
}

const Analytics: React.FC<AnalyticsProps> = ({ students, exams }) => {
  const [insight, setInsight] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState<string>('');

  useEffect(() => {
    if (exams.length > 0 && !selectedExamId) {
      setSelectedExamId(exams[exams.length - 1].id);
    }
  }, [exams, selectedExamId]);

  const selectedExam = useMemo(() => exams.find(e => e.id === selectedExamId), [exams, selectedExamId]);
  
  const questionStatsData = useMemo(() => {
    if (!selectedExam) return [];
    const results = calculateExamResults(selectedExam, students);
    const summary = getExamSummary(results, selectedExam.totalQuestions);
    
    // 1번부터 전체 문항 수까지 배열 생성
    return Array.from({ length: selectedExam.totalQuestions }, (_, i) => ({
      questionNum: i + 1,
      wrongCount: summary.questionStats?.[i + 1] || 0
    }));
  }, [selectedExam, students]);

  const generateReport = async () => {
    if (!selectedExam) return;
    setLoading(true);
    setInsight('');
    try {
      const results = calculateExamResults(selectedExam, students);
      const summary = getExamSummary(results, selectedExam.totalQuestions);
      const report = await getAIInsights(selectedExam.title, summary, results);
      setInsight(report);
    } catch (err) {
      setInsight("리포트 생성 중 문제가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (exams.length === 0) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row gap-6 items-end mb-10">
          <div className="flex-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">분석 대상 시험 선택</label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none font-black text-slate-800"
            >
              {exams.slice().reverse().map(e => (
                <option key={e.id} value={e.id}>{e.title}</option>
              ))}
            </select>
          </div>
          <button
            onClick={generateReport}
            disabled={loading}
            className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-slate-800 transition-all flex items-center gap-3"
          >
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '✨ AI 심층 리포트 생성'}
          </button>
        </div>

        {selectedExam && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Question Error Rate Chart */}
            <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100">
              <h4 className="text-sm font-black text-slate-800 mb-6 flex items-center gap-2">
                📊 문항별 오답 빈도 분석 (Item Analysis)
              </h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={questionStatsData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="questionNum" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                    <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '12px', border: 'none', fontWeight: 'bold'}} />
                    <Bar dataKey="wrongCount" radius={[4, 4, 0, 0]}>
                      {questionStatsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.wrongCount > (selectedExam.scores.length / 2) ? '#ef4444' : '#6366f1'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-4 text-[11px] text-slate-400 font-bold leading-relaxed">
                * 빨간색 바는 응시생의 절반 이상이 틀린 <span className="text-red-500 underline">고난도 문항</span>입니다. 집중 보강이 필요합니다.
              </p>
            </div>

            {/* Insight Result */}
            <div className="p-8 bg-blue-600 rounded-3xl text-white shadow-xl shadow-blue-100 relative overflow-hidden">
              <h4 className="text-sm font-black text-white/70 uppercase tracking-widest mb-4 relative z-10">AI Insight Report</h4>
              <div className="prose prose-invert max-w-none relative z-10">
                {insight ? (
                  <div className="whitespace-pre-wrap font-medium leading-relaxed text-sm h-64 overflow-y-auto pr-2 custom-scrollbar">
                    {insight}
                  </div>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center opacity-50">
                    <span className="text-4xl mb-4">🧠</span>
                    <p className="font-bold">분석 데이터 준비 완료</p>
                    <p className="text-xs">상단 버튼을 눌러 AI 리포트를 생성하세요.</p>
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
