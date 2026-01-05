
import React, { useState, useMemo, useEffect } from 'react';
import { Student, Exam, ScoreEntry, ExamType } from '../types.ts';
import { calculateExamResults, getExamSummary, getSchoolBreakdown } from '../utils/gradingUtils.ts';

interface ExamManagementProps {
  students: Student[];
  exams: Exam[];
  onAddExam: (exam: Exam) => void;
  onUpdateExam: (exam: Exam) => void;
  onDeleteExam: (id: string) => void;
}

type InputMode = 'WRONG' | 'CORRECT';

const ExamManagement: React.FC<ExamManagementProps> = ({ students, exams, onAddExam, onUpdateExam, onDeleteExam }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  
  const [examType, setExamType] = useState<ExamType>('RANKING');
  const [inputMode, setInputMode] = useState<InputMode>('WRONG');
  const [title, setTitle] = useState('');
  const [totalQuestions, setTotalQuestions] = useState(20);
  const [maxScore, setMaxScore] = useState(100);
  const [questionPoints, setQuestionPoints] = useState<number[]>([]);
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [passThreshold, setPassThreshold] = useState<number | ''>('');
  const [noPassThreshold, setNoPassThreshold] = useState(false);
  
  const [tempScores, setTempScores] = useState<Record<string, { score: number, rawInput: string }>>({});
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);

  useEffect(() => {
    // 신규 등록 모드일 때만 문항 수 변경 시 배점 초기화
    if (!editingExamId) {
      const defaultPoint = examType === 'RANKING' ? Math.floor(100 / totalQuestions) : 1;
      const newPoints = Array(totalQuestions).fill(defaultPoint);
      setQuestionPoints(newPoints);
      if (examType === 'RANKING') {
        setMaxScore(newPoints.reduce((a, b) => a + b, 0));
      } else {
        setMaxScore(totalQuestions);
      }
    }
  }, [totalQuestions, examType, editingExamId]);

  const allAvailableSchools = useMemo(() => {
    const schools = students.map(s => s.school?.trim()).filter((s): s is string => !!s);
    return Array.from(new Set(schools)).sort();
  }, [students]);

  const filteredStudentsForInput = useMemo(() => {
    if (selectedSchools.length === 0) return students;
    return students.filter(s => s.school && selectedSchools.includes(s.school));
  }, [students, selectedSchools]);

  // 수정 모드 진입 시 데이터 채우기
  const handleEditClick = (e: React.MouseEvent, exam: Exam) => {
    e.stopPropagation();
    setEditingExamId(exam.id);
    setTitle(exam.title);
    setExamType(exam.type);
    setTotalQuestions(exam.totalQuestions);
    setMaxScore(exam.maxScore);
    setQuestionPoints(exam.questionPoints || []);
    setSelectedSchools(exam.targetSchools || []);
    setPassThreshold(exam.passThreshold ?? '');
    setNoPassThreshold(exam.passThreshold === undefined);
    
    const initialTempScores: Record<string, { score: number, rawInput: string }> = {};
    exam.scores.forEach(score => {
      let rawInput = '';
      if (exam.type === 'WORD_TEST') {
        rawInput = score.score.toString();
      } else {
        rawInput = (score.wrongQuestions || []).join(', ');
      }
      initialTempScores[score.studentId] = {
        score: score.score,
        rawInput: rawInput
      };
    });
    setTempScores(initialTempScores);
    setInputMode('WRONG'); // 수정 시 기본적으로 오답 입력 모드로 시작
    setIsAdding(true);
  };

  const handleCreateOrUpdateExam = () => {
    if (!title.trim() || filteredStudentsForInput.length === 0) return;

    const scores: ScoreEntry[] = filteredStudentsForInput
      .filter(s => tempScores[s.id] !== undefined)
      .map((s) => {
        const rawInput = tempScores[s.id].rawInput;
        
        if (examType === 'WORD_TEST') {
          return {
            studentId: s.id,
            score: tempScores[s.id].score,
            wrongQuestions: []
          };
        }

        const inputNums = rawInput.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
        let finalWrongQuestions: number[] = [];
        if (inputMode === 'WRONG') {
          finalWrongQuestions = inputNums;
        } else {
          const allNums = Array.from({ length: totalQuestions }, (_, i) => i + 1);
          finalWrongQuestions = allNums.filter(n => !inputNums.includes(n));
        }

        return {
          studentId: s.id,
          score: tempScores[s.id].score,
          wrongQuestions: finalWrongQuestions
        };
      });

    const examData: Exam = {
      id: editingExamId || Math.random().toString(36).substr(2, 9),
      title,
      date: editingExamId ? exams.find(e => e.id === editingExamId)!.date : new Date().toISOString(),
      type: examType,
      totalQuestions,
      questionPoints: examType === 'RANKING' ? questionPoints : undefined,
      maxScore: examType === 'RANKING' ? maxScore : totalQuestions,
      targetSchools: selectedSchools.length > 0 ? selectedSchools : undefined,
      passThreshold: (examType === 'RANKING' || noPassThreshold || passThreshold === '') ? undefined : Number(passThreshold),
      scores
    };

    if (editingExamId) {
      onUpdateExam(examData);
    } else {
      onAddExam(examData);
    }
    
    setIsAdding(false);
    resetForm();
  };

  const resetForm = () => {
    setEditingExamId(null);
    setTitle('');
    setPassThreshold('');
    setNoPassThreshold(false);
    setTempScores({});
    setSelectedSchools([]);
    setInputMode('WRONG');
  };

  const calculateScoreFromInput = (input: string, points: number[], currentMax: number) => {
    if (examType === 'WORD_TEST') {
      const val = parseInt(input) || 0;
      return { score: Math.min(totalQuestions, val), nums: [] };
    }

    const nums = input.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
    let score = 0;

    if (examType === 'RANKING') {
      if (inputMode === 'WRONG') {
        let deduction = 0;
        nums.forEach(num => {
          if (num >= 1 && num <= totalQuestions) deduction += points[num - 1] || 0;
        });
        score = currentMax - deduction;
      } else {
        let sum = 0;
        nums.forEach(num => {
          if (num >= 1 && num <= totalQuestions) sum += points[num - 1] || 0;
        });
        score = sum;
      }
    } else {
      if (inputMode === 'WRONG') {
        score = Math.max(0, totalQuestions - nums.length);
      } else {
        score = Math.min(totalQuestions, nums.length);
      }
    }
    return { score, nums };
  };

  const updateStudentScore = (id: string, value: string) => {
    setTempScores(prev => {
      const { score } = calculateScoreFromInput(value, questionPoints, maxScore);
      return { ...prev, [id]: { score, rawInput: value } };
    });
  };

  const updateQuestionPoint = (idx: number, val: number) => {
    const nextPoints = [...questionPoints];
    nextPoints[idx] = val;
    setQuestionPoints(nextPoints);
    if (examType === 'RANKING') {
      setMaxScore(nextPoints.reduce((a, b) => a + b, 0));
    }
  };

  useEffect(() => {
    setTempScores(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(id => {
        const { score } = calculateScoreFromInput(next[id].rawInput, questionPoints, maxScore);
        next[id].score = score;
      });
      return next;
    });
  }, [inputMode, questionPoints, maxScore, examType]);

  const toggleSchool = (school: string) => {
    setSelectedSchools(prev => 
      prev.includes(school) ? prev.filter(s => s !== school) : [...prev, school]
    );
  };

  const selectedExam = exams.find(e => e.id === selectedExamId);
  const results = selectedExam ? calculateExamResults(selectedExam, students) : [];
  const summary = selectedExam ? getExamSummary(results, selectedExam.totalQuestions) : null;
  const schoolStats = selectedExam ? getSchoolBreakdown(results) : [];
  const unit = selectedExam?.type === 'RANKING' ? '점' : '개';

  const getExamTypeLabel = (type: ExamType) => {
    switch (type) {
      case 'RANKING': return '점수 평가';
      case 'VOCAB': return '개수 평가';
      case 'WORD_TEST': return '단어 시험';
      default: return '평가';
    }
  };

  const getExamTypeColor = (type: ExamType) => {
    switch (type) {
      case 'RANKING': return 'bg-slate-900 text-white';
      case 'VOCAB': return 'bg-slate-200 text-slate-700';
      case 'WORD_TEST': return 'bg-blue-600 text-white';
      default: return 'bg-slate-100 text-slate-500';
    }
  };

  return (
    <div className="space-y-8">
      {/* List of Exams */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <button
          onClick={() => { resetForm(); setIsAdding(true); }}
          className="h-48 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center text-slate-500 hover:border-slate-900 hover:text-slate-900 hover:bg-slate-50 transition-all group"
        >
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-slate-900 group-hover:text-white transition-colors">
            <span className="text-2xl font-bold">+</span>
          </div>
          <span className="font-black uppercase tracking-tight">새 시험 등록 및 분석</span>
        </button>

        {exams.slice().reverse().map((exam) => (
          <div
            key={exam.id}
            onClick={() => setSelectedExamId(exam.id)}
            className={`cursor-pointer p-6 rounded-2xl border transition-all ${
              selectedExamId === exam.id ? 'border-slate-900 ring-4 ring-slate-100 bg-white shadow-xl' : 'border-slate-200 bg-white hover:border-slate-400 shadow-sm'
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${getExamTypeColor(exam.type)}`}>
                {getExamTypeLabel(exam.type)}
              </span>
              <div className="flex gap-2">
                <button onClick={(e) => handleEditClick(e, exam)} className="text-slate-300 hover:text-blue-500 transition-colors">⚙️</button>
                <button onClick={(e) => { e.stopPropagation(); onDeleteExam(exam.id); }} className="text-slate-300 hover:text-red-500 transition-colors">✕</button>
              </div>
            </div>
            <h4 className="text-lg font-black text-slate-800 truncate mb-1">{exam.title}</h4>
            <p className="text-xs text-slate-400 font-bold mb-2">{new Date(exam.date).toLocaleDateString()}</p>
            <div className="flex flex-wrap gap-1 mb-4">
              {exam.targetSchools?.map(s => (
                <span key={s} className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-bold">{s}</span>
              )) || <span className="text-[9px] text-slate-400 font-bold">전체 대상</span>}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">{exam.scores.length}명 응시</span>
              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">→</div>
            </div>
          </div>
        ))}
      </div>

      {/* Results View */}
      {selectedExam && summary && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
            <div className={`${getExamTypeColor(selectedExam.type)} p-8`}>
              <div className="flex justify-between items-end">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                     <span className="px-2 py-0.5 bg-white/20 rounded text-[10px] font-black tracking-widest uppercase">
                       {getExamTypeLabel(selectedExam.type)}
                     </span>
                  </div>
                  <h3 className="text-2xl font-black">{selectedExam.title}</h3>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold opacity-70">Total Average</p>
                  <p className="text-3xl font-black">{summary.average.toFixed(1)}<span className="text-lg ml-1 opacity-70">{unit}</span></p>
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-b border-slate-200">
              {schoolStats.map(stat => (
                <div key={stat.schoolName} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-black bg-slate-900 text-white px-2 py-0.5 rounded uppercase tracking-tighter">School Stats</span>
                    <span className="text-[10px] font-bold text-slate-400">{stat.studentCount}명 응시</span>
                  </div>
                  <h5 className="font-black text-slate-800 mb-1">{stat.schoolName}</h5>
                  <div className="flex items-baseline gap-4 mt-2">
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Avg</p>
                      <p className="text-lg font-black text-slate-900">{stat.average.toFixed(1)}<span className="text-xs ml-0.5 opacity-50">{unit}</span></p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Best</p>
                      <p className="text-lg font-black text-slate-500">{stat.highestScore}<span className="text-xs ml-0.5 opacity-50">{unit}</span></p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-400 tracking-widest">
                    <th className="px-8 py-5">Rank (Sch/Tot)</th>
                    <th className="px-8 py-5">Name & School</th>
                    <th className="px-8 py-5">Result</th>
                    <th className="px-8 py-5">Wrong Questions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.map((res) => (
                    <tr key={res.studentId} className="hover:bg-slate-50 transition-colors">
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${
                            res.rank <= 3 ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-500'
                          }`}>{res.rank}</span>
                          <span className="text-[10px] font-black text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">
                            내 {res.schoolRank}위
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-4">
                        <p className="font-bold text-slate-800">{res.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{res.school}</p>
                      </td>
                      <td className="px-8 py-4">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-900 text-lg">{res.score}{unit}</span>
                          {selectedExam.passThreshold !== undefined && (selectedExam.type === 'VOCAB' || selectedExam.type === 'WORD_TEST') && (
                            <span className={`text-[10px] font-black uppercase ${res.isPassed ? 'text-green-500' : 'text-red-500'}`}>
                              {res.isPassed ? 'PASS' : 'FAIL'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-4">
                        <div className="flex flex-wrap gap-1">
                          {res.wrongQuestions && res.wrongQuestions.length > 0 ? (
                            res.wrongQuestions.map((q: number) => (
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
        </div>
      )}

      {/* Add/Edit Exam Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-slate-800">{editingExamId ? '시험 기록 수정' : '새 시험 등록'}</h3>
                <p className="text-sm text-slate-500 font-medium">{editingExamId ? '기존 데이터를 수정하고 저장하세요.' : '시험 유형에 맞는 필수 정보를 입력해주세요.'}</p>
              </div>
              <button onClick={() => { setIsAdding(false); resetForm(); }} className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1 space-y-8 custom-scrollbar">
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <button onClick={() => setExamType('RANKING')} className={`p-4 rounded-[1.5rem] border-2 transition-all flex flex-col items-center gap-2 ${examType === 'RANKING' ? 'border-slate-900 bg-slate-900 text-white shadow-lg scale-105' : 'border-slate-100 bg-white text-slate-400 hover:border-slate-300'}`}>
                    <span className="text-xl">🏆</span>
                    <span className="font-black text-[10px] uppercase tracking-widest">점수 평가</span>
                  </button>
                  <button onClick={() => setExamType('VOCAB')} className={`p-4 rounded-[1.5rem] border-2 transition-all flex flex-col items-center gap-2 ${examType === 'VOCAB' ? 'border-slate-900 bg-slate-900 text-white shadow-lg scale-105' : 'border-slate-100 bg-white text-slate-400 hover:border-slate-300'}`}>
                    <span className="text-xl">📊</span>
                    <span className="font-black text-[10px] uppercase tracking-widest">개수 평가</span>
                  </button>
                  <button onClick={() => setExamType('WORD_TEST')} className={`p-4 rounded-[1.5rem] border-2 transition-all flex flex-col items-center gap-2 ${examType === 'WORD_TEST' ? 'border-blue-600 bg-blue-600 text-white shadow-lg scale-105' : 'border-slate-100 bg-white text-slate-400 hover:border-slate-300'}`}>
                    <span className="text-xl">🔡</span>
                    <span className="font-black text-[10px] uppercase tracking-widest">단어 시험</span>
                  </button>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">응시 대상 학교 선택</label>
                  <div className="flex flex-wrap gap-2">
                    {allAvailableSchools.map(school => (
                      <button key={school} onClick={() => toggleSchool(school)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${selectedSchools.includes(school) ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}>
                        {school}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">시험 제목</label>
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={examType === 'WORD_TEST' ? "예: 능률보카 DAY 1-5 테스트" : "시험 제목 입력"} className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-slate-100 outline-none font-bold text-slate-900" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">전체 문항 수</label>
                    <input type="number" value={totalQuestions} onChange={(e) => setTotalQuestions(Number(e.target.value))} className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-slate-100 outline-none font-bold text-slate-900" />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {examType === 'RANKING' ? '총점 (자동계산)' : '통과 기준 (개)' }
                      </label>
                      {(examType === 'VOCAB' || examType === 'WORD_TEST') && (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={noPassThreshold} onChange={(e) => setNoPassThreshold(e.target.checked)} className="w-3 h-3 rounded" />
                          <span className="text-[10px] font-black text-slate-400 uppercase">기준 없음</span>
                        </label>
                      )}
                    </div>
                    <input 
                      type="number" 
                      value={examType === 'RANKING' ? maxScore : passThreshold} 
                      onChange={(e) => setPassThreshold(Number(e.target.value))} 
                      readOnly={examType === 'RANKING' || ((examType === 'VOCAB' || examType === 'WORD_TEST') && noPassThreshold)}
                      placeholder={noPassThreshold ? "기준 제외" : ""}
                      className={`w-full px-5 py-4 bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-slate-100 outline-none font-bold text-slate-900 ${ (examType === 'RANKING' || noPassThreshold) ? 'opacity-50' : ''}`} 
                    />
                  </div>
                </div>

                {examType === 'RANKING' && (
                  <div className="p-6 bg-slate-900 rounded-[2rem] text-white shadow-xl">
                    <label className="block text-[10px] font-black text-white/50 uppercase mb-4 tracking-widest">문항별 배점 설정 (총점: {maxScore}점)</label>
                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                      {questionPoints.map((point, idx) => (
                        <div key={idx} className="flex flex-col items-center gap-1">
                          <span className="text-[9px] font-black text-white/30">{idx + 1}</span>
                          <input type="number" value={point} onChange={(e) => updateQuestionPoint(idx, Number(e.target.value))} className="w-full bg-white/10 border-none rounded-lg p-1 text-center text-xs font-black outline-none focus:bg-white/20 transition-all" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Student Entry */}
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                  <h4 className="font-black text-slate-800 text-sm uppercase tracking-widest">학생별 결과 입력 ({filteredStudentsForInput.length}명)</h4>
                  
                  {examType !== 'WORD_TEST' && (
                    <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                      <button onClick={() => setInputMode('WRONG')} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[11px] font-black transition-all ${inputMode === 'WRONG' ? 'bg-white text-red-500 shadow-sm' : 'text-slate-400'}`}>오답 번호 입력</button>
                      <button onClick={() => setInputMode('CORRECT')} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[11px] font-black transition-all ${inputMode === 'CORRECT' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-400'}`}>정답 번호 입력</button>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {filteredStudentsForInput.map((student) => (
                    <div key={student.id} className="p-5 bg-slate-50 rounded-3xl grid grid-cols-1 sm:grid-cols-2 gap-4 items-center border border-transparent hover:border-slate-200 transition-all">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-800">{student.name}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{student.school || '기타'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className={`block text-[8px] font-black uppercase mb-1 ${examType === 'WORD_TEST' ? 'text-blue-500' : (inputMode === 'WRONG' ? 'text-red-400' : 'text-green-500')}`}>
                            {examType === 'WORD_TEST' ? '맞은 단어 개수' : (inputMode === 'WRONG' ? '틀린 번호 (콤마 구분)' : '맞은 번호 (콤마 구분)')}
                          </label>
                          <input 
                            type={examType === 'WORD_TEST' ? "number" : "text"}
                            placeholder={examType === 'WORD_TEST' ? "0" : (inputMode === 'WRONG' ? "예: 1, 4, 12" : "예: 2, 3, 5, 6...")} 
                            value={tempScores[student.id]?.rawInput || ''} 
                            onChange={(e) => updateStudentScore(student.id, e.target.value)} 
                            className={`w-full px-4 py-2 bg-white rounded-xl border border-slate-100 text-xs font-bold outline-none focus:ring-2 transition-all ${examType === 'WORD_TEST' ? 'text-blue-600 focus:ring-blue-100' : (inputMode === 'WRONG' ? 'text-red-500 focus:ring-red-100' : 'text-green-600 focus:ring-green-100')}`} 
                          />
                        </div>
                        <div className="w-24 text-right">
                          <label className="block text-[8px] font-black text-slate-400 uppercase mb-1">현재 성적</label>
                          <div className={`w-full px-3 py-2 bg-white rounded-xl border border-slate-100 text-right font-black ${examType === 'WORD_TEST' ? 'text-blue-600' : 'text-slate-900'}`}>
                             {tempScores[student.id]?.score ?? (examType === 'WORD_TEST' ? 0 : (inputMode === 'WRONG' ? (examType === 'RANKING' ? maxScore : totalQuestions) : 0))}
                             <span className="text-[10px] ml-1 opacity-50">{unit}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-slate-100 bg-slate-50">
              <button 
                onClick={handleCreateOrUpdateExam} 
                disabled={!title || filteredStudentsForInput.length === 0} 
                className={`w-full text-white py-5 rounded-[1.5rem] font-black text-lg shadow-2xl disabled:opacity-50 transition-all ${editingExamId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-900 hover:bg-slate-800'}`}
              >
                {editingExamId ? '시험 수정 사항 저장' : '시험 결과 저장 및 통계 생성'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamManagement;
