
import React, { useState, useRef, useMemo } from 'react';
import { Student, Exam, ScoreEntry, ExamType } from '../types.ts';
import { calculateExamResults, getExamSummary } from '../utils/gradingUtils.ts';
import { extractScoresFromImage } from '../services/geminiService.ts';

interface ExamManagementProps {
  students: Student[];
  exams: Exam[];
  onAddExam: (exam: Exam) => void;
  onDeleteExam: (id: string) => void;
}

const ExamManagement: React.FC<ExamManagementProps> = ({ students, exams, onAddExam, onDeleteExam }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [examType, setExamType] = useState<ExamType>('RANKING');
  const [title, setTitle] = useState('');
  const [totalQuestions, setTotalQuestions] = useState(20);
  const [maxScore, setMaxScore] = useState(100);
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [passThreshold, setPassThreshold] = useState<number | ''>('');
  
  const [tempScores, setTempScores] = useState<Record<string, { score: number, wrong: string }>>({});
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);

  const uniqueSchools = useMemo(() => {
    const schools = students.map(s => s.school?.trim()).filter((s): s is string => !!s);
    return Array.from(new Set(schools)).sort();
  }, [students]);

  const filteredStudentsForInput = useMemo(() => {
    if (selectedSchools.length === 0) return students;
    return students.filter(s => s.school && selectedSchools.includes(s.school));
  }, [students, selectedSchools]);

  const handleCreateExam = () => {
    if (!title.trim() || filteredStudentsForInput.length === 0) return;

    const scores: ScoreEntry[] = filteredStudentsForInput
      .filter(s => tempScores[s.id] !== undefined)
      .map((s) => ({
        studentId: s.id,
        score: tempScores[s.id].score,
        wrongQuestions: tempScores[s.id].wrong 
          ? tempScores[s.id].wrong.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n))
          : []
      }));

    const newExam: Exam = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      date: new Date().toISOString(),
      type: examType,
      totalQuestions,
      maxScore: examType === 'RANKING' ? maxScore : totalQuestions,
      targetSchools: selectedSchools.length > 0 ? selectedSchools : undefined,
      passThreshold: passThreshold === '' ? undefined : Number(passThreshold),
      scores
    };

    onAddExam(newExam);
    setIsAdding(false);
    setTitle('');
    setPassThreshold('');
    setTempScores({});
  };

  const updateStudentScore = (id: string, field: 'score' | 'wrong', value: string) => {
    setTempScores(prev => {
      const current = prev[id] || { score: 0, wrong: '' };
      let newScore = current.score;
      let newWrong = current.wrong;

      if (field === 'score') {
        newScore = Number(value);
      } else {
        newWrong = value;
        if (examType === 'VOCAB') {
          const wrongCount = value.split(',').map(n => n.trim()).filter(n => n !== '').length;
          newScore = Math.max(0, totalQuestions - wrongCount);
        }
      }

      return { ...prev, [id]: { score: newScore, wrong: newWrong } };
    });
  };

  const selectedExam = exams.find(e => e.id === selectedExamId);
  const results = selectedExam ? calculateExamResults(selectedExam, students) : [];
  const summary = selectedExam ? getExamSummary(results, selectedExam.totalQuestions) : null;
  const unit = selectedExam?.type === 'RANKING' ? '점' : '개';

  return (
    <div className="space-y-8">
      {/* List of Exams */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <button
          onClick={() => setIsAdding(true)}
          className="h-48 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center text-slate-500 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all group"
        >
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-blue-100">
            <span className="text-2xl text-slate-400 group-hover:text-blue-500">+</span>
          </div>
          <span className="font-bold">새 시험 등록 및 분석</span>
        </button>

        {exams.slice().reverse().map((exam) => (
          <div
            key={exam.id}
            onClick={() => setSelectedExamId(exam.id)}
            className={`cursor-pointer p-6 rounded-2xl border transition-all ${
              selectedExamId === exam.id ? 'border-blue-500 ring-4 ring-blue-50 bg-white' : 'border-slate-200 bg-white hover:border-blue-300 shadow-sm'
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
                exam.type === 'RANKING' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'
              }`}>
                {exam.type === 'RANKING' ? '정기 평가' : '단어 테스트'}
              </span>
              <button onClick={(e) => { e.stopPropagation(); onDeleteExam(exam.id); }} className="text-slate-300 hover:text-red-500">✕</button>
            </div>
            <h4 className="text-lg font-black text-slate-800 truncate mb-1">{exam.title}</h4>
            <p className="text-xs text-slate-400 font-bold mb-4">{new Date(exam.date).toLocaleDateString()}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">{exam.scores.length}명 응시</span>
              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">→</div>
            </div>
          </div>
        ))}
      </div>

      {/* Results View */}
      {selectedExam && summary && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          <div className={`${selectedExam.type === 'RANKING' ? 'bg-slate-900' : 'bg-indigo-900'} p-8 text-white`}>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-xs font-black text-white/50 uppercase tracking-widest mb-1">Exam Report</p>
                <h3 className="text-2xl font-black">{selectedExam.title}</h3>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-white/70">Average</p>
                <p className="text-3xl font-black">{summary.average.toFixed(1)}<span className="text-lg ml-1 opacity-70">{unit}</span></p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-400 tracking-widest">
                  <th className="px-8 py-5">{selectedExam.type === 'RANKING' ? 'Rank' : 'Status'}</th>
                  <th className="px-8 py-5">Name</th>
                  <th className="px-8 py-5">{selectedExam.type === 'RANKING' ? 'Score' : 'Correct'}</th>
                  <th className="px-8 py-5">Wrong Questions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.map((res) => (
                  <tr key={res.studentId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-4">
                      {selectedExam.type === 'RANKING' ? (
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${
                          res.rank <= 3 ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-500'
                        }`}>{res.rank}</span>
                      ) : (
                        <span className={`px-2 py-1 rounded font-black text-[10px] ${
                          res.isPassed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>{res.isPassed ? 'PASS' : 'FAIL'}</span>
                      )}
                    </td>
                    <td className="px-8 py-4 font-bold text-slate-800">{res.name}</td>
                    <td className="px-8 py-4">
                      <span className="font-black text-blue-600">{res.score}</span>
                      <span className="text-slate-400 text-xs ml-1">{unit} / {selectedExam.maxScore}{unit}</span>
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex flex-wrap gap-1">
                        {res.wrongQuestions && res.wrongQuestions.length > 0 ? (
                          res.wrongQuestions.map(q => (
                            <span key={q} className="w-5 h-5 rounded-md bg-red-50 text-red-500 flex items-center justify-center text-[10px] font-bold border border-red-100">
                              {q}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-300 font-bold">None</span>
                        )}
                      </div>
                    </td>
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
          <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-slate-800">새 시험 등록</h3>
                <p className="text-sm text-slate-500 font-medium">유형을 선택하고 오답 문항을 체크하세요.</p>
              </div>
              <button onClick={() => setIsAdding(false)} className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1 space-y-8">
              {/* Type Selector */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setExamType('RANKING')}
                  className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-2 ${
                    examType === 'RANKING' ? 'border-blue-600 bg-blue-50/50 shadow-inner' : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <span className="text-2xl">🏆</span>
                  <span className={`font-black ${examType === 'RANKING' ? 'text-blue-600' : 'text-slate-400'}`}>정기 평가 (석차형)</span>
                </button>
                <button
                  onClick={() => setExamType('VOCAB')}
                  className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-2 ${
                    examType === 'VOCAB' ? 'border-indigo-600 bg-indigo-50/50 shadow-inner' : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <span className="text-2xl">📖</span>
                  <span className={`font-black ${examType === 'VOCAB' ? 'text-indigo-600' : 'text-slate-400'}`}>단어 테스트 (통과형)</span>
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">시험 제목</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="예: 4월 월말평가 / Day 15 Vocabulary"
                    className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-blue-100 outline-none font-bold text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">전체 문항 수</label>
                    <input
                      type="number"
                      value={totalQuestions}
                      onChange={(e) => setTotalQuestions(Number(e.target.value))}
                      className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-blue-100 outline-none font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">
                      {examType === 'RANKING' ? '만점' : '통과 기준 (개)'}
                    </label>
                    <input
                      type="number"
                      value={examType === 'RANKING' ? maxScore : passThreshold}
                      onChange={(e) => examType === 'RANKING' ? setMaxScore(Number(e.target.value)) : setPassThreshold(Number(e.target.value))}
                      className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-blue-100 outline-none font-bold text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Student Entry */}
              <div className="space-y-4">
                <h4 className="font-black text-slate-800 text-sm uppercase tracking-widest">학생별 성적 및 오답 입력</h4>
                <div className="space-y-3">
                  {filteredStudentsForInput.map((student) => (
                    <div key={student.id} className="p-5 bg-slate-50 rounded-3xl grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-800">{student.name}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">{student.school || 'Private'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <input
                            type="text"
                            placeholder="틀린 문항 (예: 1, 4, 12)"
                            value={tempScores[student.id]?.wrong || ''}
                            onChange={(e) => updateStudentScore(student.id, 'wrong', e.target.value)}
                            className="w-full px-4 py-2 bg-white rounded-xl border border-slate-100 text-xs font-bold text-red-500 outline-none"
                          />
                        </div>
                        <div className="w-20 text-right">
                          <input
                            type="number"
                            value={tempScores[student.id]?.score ?? ''}
                            onChange={(e) => updateStudentScore(student.id, 'score', e.target.value)}
                            className="w-full px-3 py-2 bg-white rounded-xl border border-slate-100 text-right font-black text-blue-600 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-slate-100 bg-slate-50">
              <button
                onClick={handleCreateExam}
                disabled={!title}
                className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black text-lg hover:bg-slate-800 shadow-2xl"
              >
                시험 결과 저장 및 통계 생성
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamManagement;
