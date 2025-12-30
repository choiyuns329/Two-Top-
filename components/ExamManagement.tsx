
import React, { useState } from 'react';
import { Student, Exam, ScoreEntry } from '../types';
import { calculateExamResults, getExamSummary } from '../utils/gradingUtils';

interface ExamManagementProps {
  students: Student[];
  exams: Exam[];
  onAddExam: (exam: Exam) => void;
  onDeleteExam: (id: string) => void;
}

const ExamManagement: React.FC<ExamManagementProps> = ({ students, exams, onAddExam, onDeleteExam }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [maxScore, setMaxScore] = useState(100);
  const [passThreshold, setPassThreshold] = useState<number | ''>('');
  const [tempScores, setTempScores] = useState<Record<string, number>>({});
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);

  const handleCreateExam = () => {
    if (!title.trim() || students.length === 0) return;

    const scores: ScoreEntry[] = Object.entries(tempScores).map(([studentId, score]) => ({
      studentId,
      score: Number(score)
    }));

    const newExam: Exam = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      date: new Date().toISOString(),
      maxScore,
      passThreshold: passThreshold === '' ? undefined : Number(passThreshold),
      scores
    };

    onAddExam(newExam);
    setIsAdding(false);
    setTitle('');
    setPassThreshold('');
    setTempScores({});
  };

  const selectedExam = exams.find(e => e.id === selectedExamId);
  const results = selectedExam ? calculateExamResults(selectedExam.scores, students, selectedExam.passThreshold) : [];
  const summary = getExamSummary(results);

  return (
    <div className="space-y-8">
      {/* List of Exams */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <button
          onClick={() => setIsAdding(true)}
          className="h-48 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-500 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all"
        >
          <span className="text-3xl mb-2">+</span>
          <span className="font-bold">새 시험 등록 및 채점</span>
        </button>

        {exams.slice().reverse().map((exam) => (
          <div
            key={exam.id}
            onClick={() => setSelectedExamId(exam.id)}
            className={`cursor-pointer p-6 rounded-xl border transition-all ${
              selectedExamId === exam.id ? 'border-blue-500 ring-2 ring-blue-100 bg-white' : 'border-slate-200 bg-white hover:border-blue-300'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded">
                {new Date(exam.date).toLocaleDateString()}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteExam(exam.id);
                  if (selectedExamId === exam.id) setSelectedExamId(null);
                }}
                className="text-slate-300 hover:text-red-500"
              >
                ✕
              </button>
            </div>
            <h4 className="text-xl font-bold text-slate-800 mb-2">{exam.title}</h4>
            <div className="text-sm text-slate-500 space-y-1">
              <p>응시 인원: {exam.scores.length}명</p>
              <p>만점 기준: {exam.maxScore}점</p>
              <p>통과 기준: {exam.passThreshold ? `${exam.passThreshold}점` : '없음'}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Exam Detail & Results */}
      {selectedExam && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-slate-900 p-8 text-white">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-2xl font-bold mb-1">{selectedExam.title} 분석 결과</h3>
                <p className="text-slate-400">통과 기준: {selectedExam.passThreshold ? `${selectedExam.passThreshold}점 이상` : '없음'}</p>
              </div>
              <div className="flex gap-4">
                <div className="bg-slate-800 px-4 py-2 rounded-lg text-center min-w-[80px]">
                  <p className="text-xs text-slate-400">평균</p>
                  <p className="text-xl font-bold text-blue-400">{summary.average.toFixed(1)}</p>
                </div>
                <div className="bg-slate-800 px-4 py-2 rounded-lg text-center min-w-[80px]">
                  <p className="text-xs text-slate-400">최고</p>
                  <p className="text-xl font-bold text-green-400">{summary.highestScore}</p>
                </div>
                <div className="bg-slate-800 px-4 py-2 rounded-lg text-center min-w-[80px]">
                  <p className="text-xs text-slate-400">최저</p>
                  <p className="text-xl font-bold text-red-400">{summary.lowestScore}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase text-slate-500">
                  <th className="px-8 py-4">등수</th>
                  <th className="px-8 py-4">이름</th>
                  <th className="px-8 py-4">점수</th>
                  <th className="px-8 py-4">결과</th>
                  <th className="px-8 py-4">등급</th>
                  <th className="px-8 py-4">백분위</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.map((res) => (
                  <tr key={res.studentId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-4">
                      <span className={`inline-block w-8 h-8 rounded-full text-center leading-8 font-bold ${
                        res.rank === 1 ? 'bg-yellow-100 text-yellow-700' : 
                        res.rank === 2 ? 'bg-slate-100 text-slate-700' :
                        res.rank === 3 ? 'bg-orange-100 text-orange-700' : 'text-slate-500'
                      }`}>
                        {res.rank}
                      </span>
                    </td>
                    <td className="px-8 py-4 font-bold text-slate-800">{res.name}</td>
                    <td className="px-8 py-4 font-semibold text-blue-600">{res.score}점</td>
                    <td className="px-8 py-4">
                      {res.isPassed !== undefined ? (
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          res.isPassed ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-red-50 text-red-600 border border-red-200'
                        }`}>
                          {res.isPassed ? '통과' : '탈락'}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-8 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        res.grade === 1 ? 'bg-green-100 text-green-700' :
                        res.grade === 2 ? 'bg-blue-100 text-blue-700' :
                        res.grade === 3 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {res.grade}등급
                      </span>
                    </td>
                    <td className="px-8 py-4 text-slate-500">{res.percentile.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Exam Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">새 시험 성적 입력</h3>
              <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">시험 명칭</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="예: 기말고사"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">만점 점수</label>
                  <input
                    type="number"
                    value={maxScore}
                    onChange={(e) => setMaxScore(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">통과 기준 (없으면 공백)</label>
                  <input
                    type="number"
                    value={passThreshold}
                    onChange={(e) => setPassThreshold(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="미설정"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">학생별 점수 입력</h4>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {students.map((student) => (
                    <div key={student.id} className="flex items-center justify-between p-4 hover:bg-slate-50">
                      <span className="font-medium text-slate-700">{student.name}</span>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          placeholder="0"
                          value={tempScores[student.id] ?? ''}
                          onChange={(e) => setTempScores({ ...tempScores, [student.id]: Number(e.target.value) })}
                          className="w-24 px-3 py-1 border border-slate-300 rounded-md text-right focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <span className="text-slate-400">/ {maxScore}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={handleCreateExam}
                disabled={!title || students.length === 0}
                className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-200"
              >
                기록 및 등수 산출 완료
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamManagement;
