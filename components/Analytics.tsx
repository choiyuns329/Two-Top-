
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
  const [selectedExamId, setSelectedExamId] = useState<string>('');

  // 시험 목록이 변경될 때 자동으로 가장 최근 시험을 선택하도록 개선
  useEffect(() => {
    if (exams.length > 0 && !selectedExamId) {
      setSelectedExamId(exams[exams.length - 1].id);
    }
  }, [exams, selectedExamId]);

  const generateReport = async () => {
    const exam = exams.find(e => e.id === selectedExamId);
    if (!exam) {
      alert("분석할 시험을 선택해주세요.");
      return;
    }

    setLoading(true);
    setInsight(''); // 이전 결과 초기화
    
    try {
      const results = calculateExamResults(exam.scores, students, exam.passThreshold);
      const summary = getExamSummary(results);
      const report = await getAIInsights(exam.title, summary, results);
      setInsight(report);
    } catch (err) {
      setInsight("리포트 생성 중 문제가 발생했습니다. 데이터 구성을 확인해주세요.");
    } finally {
      setLoading(false);
    }
  };

  if (exams.length === 0) {
    return (
      <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-slate-200 text-center animate-in fade-in">
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">📭</div>
        <p className="text-slate-500 font-bold">분석할 시험 데이터가 없습니다.</p>
        <p className="text-slate-400 text-sm mt-2">먼저 [시험 및 채점] 탭에서 성적을 등록해주세요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-xl font-black mb-6 text-slate-800 flex items-center">
            <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mr-3 text-sm">✨</span>
            AI 교육 어시스턴트 심층 리포트
          </h3>
          <p className="text-slate-500 mb-8 leading-relaxed text-sm">
            Gemini 3 Pro AI가 성적 데이터를 다각도로 분석하여 맞춤형 인사이트를 도출합니다.<br/>
            선생님의 지도 역량을 높여주는 전문적인 리포트를 확인하세요.
          </p>

          <div className="flex flex-col md:flex-row gap-4 mb-10 p-5 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="flex-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">분석 대상 시험</label>
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700"
              >
                {exams.slice().reverse().map(e => (
                  <option key={e.id} value={e.id}>{e.title} ({new Date(e.date).toLocaleDateString()})</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={generateReport}
                disabled={loading || !selectedExamId}
                className="w-full md:w-auto bg-slate-900 text-white px-10 py-3.5 rounded-xl font-black hover:bg-slate-800 transition-all disabled:opacity-30 shadow-xl shadow-slate-200 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>AI 데이터 분석 중...</span>
                  </>
                ) : (
                  <>
                    <span>💡 리포트 생성하기</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {insight ? (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50/30 p-8 rounded-3xl border border-blue-100 shadow-inner">
                <div className="flex items-center space-x-2 mb-6 border-b border-blue-100 pb-4">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-blue-600 font-black text-xs uppercase tracking-widest">Analysis Report</span>
                </div>
                <div className="prose max-w-none text-slate-800 leading-8 whitespace-pre-wrap font-medium">
                  {insight}
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button 
                  onClick={() => window.print()} 
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center"
                >
                  <span className="mr-1">🖨️</span> 리포트 인쇄/PDF 저장
                </button>
              </div>
            </div>
          ) : (
            !loading && (
              <div className="py-24 text-center border border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                <div className="text-4xl mb-4">🤖</div>
                <p className="text-slate-400 font-bold">리포트 생성 버튼을 누르면 AI 분석이 시작됩니다.</p>
                <p className="text-[11px] text-slate-300 mt-1 uppercase font-black">Powered by Gemini 3 Pro</p>
              </div>
            )
          )}
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none"></div>
      </div>
    </div>
  );
};

export default Analytics;
