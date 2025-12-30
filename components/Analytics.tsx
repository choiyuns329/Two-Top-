
import React, { useState, useEffect } from 'react';
import { Student, Exam } from '../types';
import { calculateExamResults, getExamSummary } from '../utils/gradingUtils';
import { getAIInsights } from '../services/geminiService';

interface AnalyticsProps {
  students: Student[];
  exams: Exam[];
}

const Analytics: React.FC<AnalyticsProps> = ({ students, exams }) => {
  const [insight, setInsight] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState<string>(exams.length > 0 ? exams[exams.length - 1].id : '');

  const generateReport = async () => {
    const exam = exams.find(e => e.id === selectedExamId);
    if (!exam) return;

    setLoading(true);
    const results = calculateExamResults(exam.scores, students);
    const summary = getExamSummary(results);
    const report = await getAIInsights(exam.title, summary, results);
    setInsight(report);
    setLoading(false);
  };

  useEffect(() => {
    if (exams.length > 0 && !selectedExamId) {
      setSelectedExamId(exams[exams.length - 1].id);
    }
  }, [exams]);

  if (exams.length === 0) {
    return (
      <div className="bg-white p-12 rounded-2xl border-2 border-dashed border-slate-200 text-center">
        <p className="text-slate-400 font-medium">분석할 시험 데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-xl font-bold mb-6 text-slate-800 flex items-center">
          <span className="mr-3">✨</span> AI 교육 어시스턴트 리포트
        </h3>
        <p className="text-slate-500 mb-8 leading-relaxed">
          Gemini AI가 시험 성적 데이터를 분석하여 학생 지도 방향과 학습 인사이트를 제공합니다.
        </p>

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {exams.map(e => (
              <option key={e.id} value={e.id}>{e.title}</option>
            ))}
          </select>
          <button
            onClick={generateReport}
            disabled={loading}
            className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
          >
            {loading ? 'AI가 분석하는 중...' : '분석 리포트 생성'}
          </button>
        </div>

        {insight && (
          <div className="prose max-w-none bg-blue-50/50 p-8 rounded-2xl border border-blue-100 text-slate-800 leading-8 whitespace-pre-wrap">
            {insight}
          </div>
        )}
        
        {!insight && !loading && (
          <div className="py-20 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50">
            <p className="text-slate-400">리포트 생성 버튼을 눌러보세요.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;
