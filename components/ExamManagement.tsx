
import React, { useState, useMemo, useEffect } from 'react';
import { Student, Exam, ScoreEntry, ExamType, QuestionConfig, QuestionType, CalculatedResult } from '../types.ts';
import { calculateExamResults, getExamSummary, getSchoolBreakdown, SchoolStat } from '../utils/gradingUtils.ts';

interface ExamManagementProps {
  students: Student[];
  exams: Exam[];
  onAddExam: (exam: Exam) => void;
  onUpdateExam: (exam: Exam) => void;
  onDeleteExam: (id: string) => void;
}

const ExamManagement: React.FC<ExamManagementProps> = ({ students, exams, onAddExam, onUpdateExam, onDeleteExam }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  
  const [examType, setExamType] = useState<ExamType>('RANKING');
  const [title, setTitle] = useState('');
  const [totalQuestions, setTotalQuestions] = useState(20);
  const [questions, setQuestions] = useState<QuestionConfig[]>([]);
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [passThreshold, setPassThreshold] = useState<number | ''>('');
  const [noPassThreshold, setNoPassThreshold] = useState(false);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  
  // 결과 보기 모드: 'OVERALL' (전체 순위) vs 'SCHOOL' (학교별 분석)
  const [resultViewMode, setResultViewMode] = useState<'OVERALL' | 'SCHOOL'>('OVERALL');
  
  const [studentAnswers, setStudentAnswers] = useState<Record<string, Record<number, string>>>({});
  const [simpleScores, setSimpleScores] = useState<Record<string, number>>({});
  
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);

  // 학생 데이터로부터 고유한 학교 리스트 추출
  const availableSchools = useMemo(() => {
    const schools = students
      .map(s => s.school?.trim())
      .filter((s): s is string => !!s);
    return Array.from(new Set(schools)).sort();
  }, [students]);

  useEffect(() => {
    if (!editingExamId && examType !== 'WORD_TEST') {
      const defaultPoint = examType === 'VOCAB' ? 1 : Math.floor(100 / totalQuestions);
      const newQuestions: QuestionConfig[] = Array.from({ length: totalQuestions }, (_, i) => ({
        number: i + 1,
        type: 'MULTIPLE',
        correctAnswer: '',
        point: defaultPoint
      }));
      setQuestions(newQuestions);
    }
  }, [totalQuestions, editingExamId, examType]);

  const filteredStudentsForInput = useMemo(() => {
    let base = students;
    if (selectedSchools.length > 0) {
      base = base.filter(s => s.school && selectedSchools.includes(s.school));
    }
    if (studentSearchTerm.trim()) {
      base = base.filter(s => s.name.toLowerCase().includes(studentSearchTerm.toLowerCase()));
    }
    return base.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }, [students, selectedSchools, studentSearchTerm]);

  const handleEditClick = (e: React.MouseEvent, exam: Exam) => {
    e.stopPropagation();
    setEditingExamId(exam.id);
    setTitle(exam.title);
    setExamType(exam.type);
    setTotalQuestions(exam.totalQuestions);
    setQuestions(exam.questions || []);
    setSelectedSchools(exam.targetSchools || []);
    setPassThreshold(exam.passThreshold ?? '');
    setNoPassThreshold(exam.passThreshold === undefined);
    
    if (exam.type === 'WORD_TEST') {
      const scores: Record<string, number> = {};
      exam.scores.forEach(s => scores[s.studentId] = s.score);
      setSimpleScores(scores);
    } else {
      const answers: Record<string, Record<number, string>> = {};
      exam.scores.forEach(s => answers[s.studentId] = s.studentAnswers || {});
      setStudentAnswers(answers);
    }
    setIsAdding(true);
  };

  const handleCreateOrUpdateExam = () => {
    if (!title.trim()) {
      alert("시험 제목을 입력해주세요.");
      return;
    }

    let scores: ScoreEntry[] = [];

    if (examType === 'WORD_TEST') {
      scores = students
        .filter(s => simpleScores[s.id] !== undefined)
        .map(s => ({
          studentId: s.id,
          score: simpleScores[s.id],
          wrongQuestions: []
        }));
    } else {
      scores = students
        .filter(s => studentAnswers[s.id] !== undefined)
        .map(s => {
          const answers = studentAnswers[s.id] || {};
          let totalScore = 0;
          const wrongQuestions: number[] = [];

          questions.forEach(q => {
            const studentAns = (answers[q.number] || '').trim();
            if (q.type === 'MULTIPLE') {
              if (studentAns === q.correctAnswer && q.correctAnswer !== '') {
                totalScore += q.point;
              } else if (q.correctAnswer !== '') {
                wrongQuestions.push(q.number);
              }
            } else {
              if (studentAns === 'O') totalScore += q.point;
              else wrongQuestions.push(q.number);
            }
          });

          return {
            studentId: s.id,
            score: totalScore,
            wrongQuestions,
            studentAnswers: answers
          };
        });
    }

    const examData: Exam = {
      id: editingExamId || Math.random().toString(36).substr(2, 9),
      title,
      date: editingExamId ? exams.find(e => e.id === editingExamId)!.date : new Date().toISOString(),
      type: examType,
      totalQuestions,
      questions: examType === 'WORD_TEST' ? undefined : questions,
      maxScore: examType === 'WORD_TEST' ? totalQuestions : questions.reduce((acc, q) => acc + q.point, 0),
      targetSchools: selectedSchools.length > 0 ? selectedSchools : undefined,
      passThreshold: noPassThreshold ? undefined : (passThreshold === '' ? undefined : Number(passThreshold)),
      scores
    };

    if (editingExamId) onUpdateExam(examData);
    else onAddExam(examData);
    
    setIsAdding(false);
    resetForm();
  };

  const resetForm = () => {
    setEditingExamId(null);
    setTitle('');
    setPassThreshold('');
    setNoPassThreshold(false);
    setStudentAnswers({});
    setSimpleScores({});
    setSelectedSchools([]);
    setStudentSearchTerm('');
  };

  const updateQuestionConfig = (num: number, field: keyof QuestionConfig, value: any) => {
    setQuestions(prev => prev.map(q => q.number === num ? { ...q, [field]: value } : q));
  };

  const updateStudentAnswer = (studentId: string, qNum: number, value: string) => {
    setStudentAnswers(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [qNum]: value
      }
    }));
  };

  const updateSimpleScore = (studentId: string, value: number) => {
    setSimpleScores(prev => ({
      ...prev,
      [studentId]: value
    }));
  };

  const toggleSchoolSelection = (school: string) => {
    setSelectedSchools(prev => 
      prev.includes(school) ? prev.filter(s => s !== school) : [...prev, school]
    );
  };

  const selectedExam = exams.find(e => e.id === selectedExamId);
  const results = selectedExam ? calculateExamResults(selectedExam, students) : [];
  const summary = selectedExam ? getExamSummary(results, selectedExam.totalQuestions) : null;
  const schoolStats = selectedExam ? getSchoolBreakdown(results) : [];

  return (
    <div className="space-y-8">
      {/* List of Exams */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <button
          onClick={() => { resetForm(); setIsAdding(true); }}
          className="h-48 border-2 border-dashed border-slate-300 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-500 hover:border-slate-900 hover:text-slate-900 hover:bg-slate-50 transition-all group"
        >
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-slate-900 group-hover:text-white transition-colors">
            <span className="text-2xl font-bold">+</span>
          </div>
          <span className="font-black uppercase tracking-tight">새 시험 등록 및 채점</span>
        </button>

        {exams.slice().reverse().map((exam) => (
          <div
            key={exam.id}
            onClick={() => setSelectedExamId(exam.id)}
            className={`cursor-pointer p-8 rounded-[2.5rem] border transition-all ${
              selectedExamId === exam.id ? 'border-slate-900 ring-4 ring-slate-100 bg-white shadow-2xl scale-[1.02]' : 'border-slate-200 bg-white hover:border-slate-400 shadow-sm'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
               <span className="px-2 py-0.5 bg-slate-900 text-white text-[9px] font-black rounded uppercase tracking-widest">
                 {exam.type === 'RANKING' ? '점수 평가' : exam.type === 'VOCAB' ? '개수 평가' : '단어 시험'}
               </span>
              <div className="flex gap-2">
                <button onClick={(e) => handleEditClick(e, exam)} className="text-slate-300 hover:text-blue-500 transition-colors">⚙️</button>
                <button onClick={(e) => { e.stopPropagation(); onDeleteExam(exam.id); }} className="text-slate-300 hover:text-red-500 transition-colors">✕</button>
              </div>
            </div>
            <h4 className="text-xl font-black text-slate-800 truncate mb-1">{exam.title}</h4>
            <div className="flex justify-between items-center">
              <p className="text-xs text-slate-400 font-bold">{new Date(exam.date).toLocaleDateString()}</p>
              {exam.passThreshold !== undefined && (
                <span className="text-[10px] font-black text-blue-500 uppercase">CUT: {exam.passThreshold}{exam.type === 'RANKING' ? '점' : '개'}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Results View */}
      {selectedExam && summary && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden">
            {/* Header Summary */}
            <div className="bg-slate-900 p-10 text-white flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-3xl font-black">{selectedExam.title}</h3>
                  <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest">{selectedExam.type}</span>
                </div>
                <p className="opacity-50 text-xs font-bold uppercase tracking-widest">Performance Analysis Summary</p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right border-r border-white/10 pr-6">
                  <p className="text-[10px] font-black opacity-50 uppercase tracking-widest mb-1">Average</p>
                  <p className="text-4xl font-black text-blue-400">{summary.average.toFixed(1)}</p>
                </div>
                
                {/* Result Mode Toggler */}
                <div className="bg-white/5 p-1 rounded-2xl flex">
                  <button 
                    onClick={() => setResultViewMode('OVERALL')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${resultViewMode === 'OVERALL' ? 'bg-white text-slate-900 shadow-lg' : 'text-white/40 hover:text-white'}`}
                  >
                    전체 순위
                  </button>
                  <button 
                    onClick={() => setResultViewMode('SCHOOL')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${resultViewMode === 'SCHOOL' ? 'bg-white text-slate-900 shadow-lg' : 'text-white/40 hover:text-white'}`}
                  >
                    학교별 분석
                  </button>
                </div>
              </div>
            </div>

            {/* School Summary Cards (Visible only in SCHOOL mode) */}
            {resultViewMode === 'SCHOOL' && (
              <div className="p-8 bg-slate-50 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 border-b border-slate-100">
                {schoolStats.map(stat => (
                  <div key={stat.schoolName} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 truncate">{stat.schoolName}</p>
                    <div>
                      <p className="text-2xl font-black text-slate-800">{stat.average.toFixed(1)}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">AVG / {stat.studentCount}명 응시</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    <th className="px-10 py-6">전체 순위</th>
                    {resultViewMode === 'SCHOOL' && <th className="px-10 py-6">학교 순위</th>}
                    <th className="px-10 py-6">이름 (학교)</th>
                    <th className="px-10 py-6">성적</th>
                    <th className="px-10 py-6">상태</th>
                    {selectedExam.type !== 'WORD_TEST' && <th className="px-10 py-6">오답 문항</th>}
                    <th className="px-10 py-6">백분위</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {results.map((res) => {
                    const isTopOverall = res.rank <= 3;
                    const isTopSchool = res.schoolRank && res.schoolRank <= 3;
                    return (
                      <tr key={res.studentId} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-10 py-6">
                          <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${isTopOverall ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-100 text-slate-400'}`}>
                            {res.rank}
                          </span>
                        </td>
                        {resultViewMode === 'SCHOOL' && (
                          <td className="px-10 py-6">
                            <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs border ${isTopSchool ? 'border-orange-500 text-orange-600 bg-orange-50' : 'border-slate-200 text-slate-400'}`}>
                              {res.schoolRank}
                            </span>
                            <span className="text-[9px] font-bold text-slate-300 ml-1">/ {res.schoolTotal}</span>
                          </td>
                        )}
                        <td className="px-10 py-6">
                          <p className="font-black text-slate-800">{res.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{res.school}</p>
                        </td>
                        <td className="px-10 py-6">
                          <span className={`text-xl font-black ${isTopOverall ? 'text-blue-600' : 'text-slate-900'}`}>
                            {res.score}
                            <span className="text-xs ml-0.5 opacity-40 font-bold">{selectedExam.type === 'RANKING' ? '점' : '개'}</span>
                          </span>
                        </td>
                        <td className="px-10 py-6">
                          {res.isPassed !== undefined ? (
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${res.isPassed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                              {res.isPassed ? 'PASS' : 'FAIL'}
                            </span>
                          ) : <span className="text-slate-200">-</span>}
                        </td>
                        {selectedExam.type !== 'WORD_TEST' && (
                          <td className="px-10 py-6">
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {res.wrongQuestions && res.wrongQuestions.length > 0 ? (
                                res.wrongQuestions.map(qNum => (
                                  <span key={qNum} className="px-2 py-1 bg-red-50 text-red-500 text-[10px] font-black rounded-lg border border-red-100">
                                    {qNum}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">만점 ✨</span>
                              )}
                            </div>
                          </td>
                        )}
                        <td className="px-10 py-6">
                           <div className="flex flex-col gap-1">
                             <span className={`px-2 py-1 rounded text-[10px] font-black inline-block w-fit ${res.percentile <= 20 ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                               전체 상위 {res.percentile.toFixed(0)}%
                             </span>
                             {resultViewMode === 'SCHOOL' && (
                               <span className={`px-2 py-1 rounded text-[10px] font-black inline-block w-fit ${res.schoolPercentile && res.schoolPercentile <= 20 ? 'bg-orange-50 text-orange-600' : 'bg-slate-50 text-slate-300'}`}>
                                 교내 상위 {res.schoolPercentile?.toFixed(0)}%
                               </span>
                             )}
                           </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                * {resultViewMode === 'OVERALL' ? '전체 학생을 등수순으로 나열 중입니다.' : '각 학교 내 등수와 백분위를 포함하여 분석 중입니다.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Exam Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden max-h-[95vh] flex flex-col animate-in zoom-in duration-200">
            <div className="p-10 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-slate-800">시험 정보 및 채점</h3>
                <p className="text-sm text-slate-400 font-bold uppercase tracking-tight mt-1">
                  {examType === 'WORD_TEST' ? 'Simple Word Test Entry' : 'Detailed Question Grading'}
                </p>
              </div>
              <button onClick={() => { setIsAdding(false); resetForm(); }} className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <div className="p-10 overflow-y-auto flex-1 space-y-10 custom-scrollbar">
              {/* Step 1: Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">시험 종류</label>
                  <select 
                    value={examType} 
                    onChange={(e) => setExamType(e.target.value as ExamType)}
                    className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-none outline-none font-black text-slate-800"
                  >
                    <option value="RANKING">점수 평가</option>
                    <option value="VOCAB">개수 평가</option>
                    <option value="WORD_TEST">단어 시험</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">시험 제목</label>
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 3월 모의고사" className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-none outline-none font-black text-slate-800" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">총 문항/만점</label>
                  <input type="number" value={totalQuestions} onChange={(e) => setTotalQuestions(Number(e.target.value))} className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-none outline-none font-black text-slate-800" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">
                    통과 기준({examType === 'RANKING' ? '점' : '개'})
                  </label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="number" 
                      value={passThreshold} 
                      onChange={(e) => setPassThreshold(e.target.value === '' ? '' : Number(e.target.value))}
                      disabled={noPassThreshold}
                      placeholder="기준값"
                      className={`w-full px-5 py-4 rounded-2xl border-none outline-none font-black ${noPassThreshold ? 'bg-slate-100 text-slate-300' : 'bg-blue-50 text-blue-600'}`}
                    />
                    <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                      <input type="checkbox" checked={noPassThreshold} onChange={(e) => setNoPassThreshold(e.target.checked)} className="w-4 h-4 rounded" />
                      <span className="text-[10px] font-black text-slate-400 uppercase">기준 없음</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Step 1.5: Target Schools Selection */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">대상 학교 선택 (Target Schools)</h4>
                  <button 
                    onClick={() => setSelectedSchools([])} 
                    className="text-[10px] font-black text-slate-400 hover:text-slate-900 uppercase underline"
                  >
                    전체 학생 (선택 해제)
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableSchools.length > 0 ? (
                    availableSchools.map(school => (
                      <button
                        key={school}
                        onClick={() => toggleSchoolSelection(school)}
                        className={`px-5 py-3 rounded-2xl text-xs font-black transition-all border-2 ${
                          selectedSchools.includes(school)
                            ? 'bg-slate-900 border-slate-900 text-white shadow-lg'
                            : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        {school}
                      </button>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 font-bold py-2">등록된 학교가 없습니다. 학생 명단에서 학교를 입력해주세요.</p>
                  )}
                </div>
              </div>

              {/* Step 2: Answer Key (Only for RANKING/VOCAB) */}
              {examType !== 'WORD_TEST' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">1. 정답지 설정 (Answer Key)</h4>
                    <p className="text-[10px] font-black text-blue-600 uppercase">총 {questions.reduce((acc, q) => acc + q.point, 0)}점</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
                    {questions.map((q) => (
                      <div key={q.number} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-slate-400">{q.number}번</span>
                          <select 
                            value={q.type} 
                            onChange={(e) => updateQuestionConfig(q.number, 'type', e.target.value as QuestionType)}
                            className="text-[9px] font-black bg-white border-none rounded px-1"
                          >
                            <option value="MULTIPLE">객관식</option>
                            <option value="SUBJECTIVE">서술형</option>
                          </select>
                        </div>
                        <div className="flex gap-2">
                          {q.type === 'MULTIPLE' ? (
                            <input 
                              type="text" 
                              placeholder="답" 
                              value={q.correctAnswer}
                              onChange={(e) => updateQuestionConfig(q.number, 'correctAnswer', e.target.value)}
                              className="w-full bg-white border-none rounded-lg text-center text-xs font-black p-2 shadow-sm"
                            />
                          ) : (
                            <div className="w-full bg-slate-200 text-[9px] font-black text-slate-400 flex items-center justify-center rounded-lg h-8">서술형</div>
                          )}
                          <input 
                            type="number" 
                            placeholder="점" 
                            value={q.point}
                            onChange={(e) => updateQuestionConfig(q.number, 'point', Number(e.target.value))}
                            className="w-12 bg-white border-none rounded-lg text-center text-xs font-black p-2 shadow-sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Grading Grid */}
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                      {examType === 'WORD_TEST' ? '학생별 점수 직접 입력' : '2. 학생별 답안 입력'}
                    </h4>
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-[9px] font-black text-slate-500">
                      {filteredStudentsForInput.length}명
                    </span>
                  </div>
                  <input 
                    type="text" 
                    placeholder="학생 이름 검색..." 
                    value={studentSearchTerm}
                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                    className="px-5 py-3 bg-slate-50 rounded-2xl text-xs font-bold border-none outline-none"
                  />
                </div>

                <div className="space-y-4">
                  {filteredStudentsForInput.length > 0 ? (
                    filteredStudentsForInput.map((student) => (
                      <div key={student.id} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 transition-all hover:shadow-md">
                        <div className="flex justify-between items-center mb-4">
                          <div>
                            <span className="text-lg font-black text-slate-800">{student.name}</span>
                            <span className="ml-2 text-[10px] font-bold text-slate-400 uppercase">{student.school}</span>
                          </div>
                          
                          {examType === 'WORD_TEST' ? (
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-black text-slate-400 uppercase">최종 {examType === 'RANKING' ? '점수' : '개수'}</span>
                              <input 
                                type="number" 
                                value={simpleScores[student.id] ?? ''} 
                                onChange={(e) => updateSimpleScore(student.id, e.target.value === '' ? 0 : Number(e.target.value))}
                                placeholder="0"
                                className="w-24 px-5 py-3 bg-white border-none rounded-2xl text-center font-black text-blue-600 outline-none shadow-sm text-lg"
                              />
                            </div>
                          ) : (
                            <div className="text-right">
                              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">실시간 계산 점수</p>
                              <p className="text-2xl font-black text-blue-600">
                                {questions.reduce((acc, q) => {
                                  const ans = (studentAnswers[student.id]?.[q.number] || '').trim();
                                  if (q.type === 'MULTIPLE') return acc + (ans === q.correctAnswer && q.correctAnswer !== '' ? q.point : 0);
                                  return acc + (ans === 'O' ? q.point : 0);
                                }, 0)}
                                <span className="text-xs font-bold ml-1 opacity-50">{examType === 'RANKING' ? '점' : '개'}</span>
                              </p>
                            </div>
                          )}
                        </div>

                        {examType !== 'WORD_TEST' && (
                          <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-20 gap-2">
                            {questions.map((q) => {
                              const val = studentAnswers[student.id]?.[q.number] || '';
                              const isCorrect = q.type === 'MULTIPLE' ? (val.trim() === q.correctAnswer && q.correctAnswer !== '') : (val === 'O');
                              const hasValue = val.trim() !== '';
                              
                              return (
                                <div key={q.number} className="flex flex-col items-center gap-1">
                                  <span className="text-[9px] font-black text-slate-400">{q.number}</span>
                                  {q.type === 'MULTIPLE' ? (
                                    <input 
                                      type="text"
                                      value={val}
                                      onChange={(e) => updateStudentAnswer(student.id, q.number, e.target.value)}
                                      className={`w-full text-center py-2 rounded-xl text-xs font-black border-2 transition-all outline-none ${
                                        !hasValue ? 'bg-white border-slate-100' : isCorrect ? 'bg-green-50 border-green-500 text-green-700' : 'bg-red-50 border-red-500 text-red-700'
                                      }`}
                                    />
                                  ) : (
                                    <button 
                                      onClick={() => updateStudentAnswer(student.id, q.number, val === 'O' ? 'X' : 'O')}
                                      className={`w-full py-2 rounded-xl text-[10px] font-black border-2 transition-all ${
                                        val === 'O' ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-slate-200 text-slate-300'
                                      }`}
                                    >
                                      {val === 'O' ? 'O' : 'X'}
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="py-20 text-center bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                      <p className="text-slate-400 font-black text-sm uppercase tracking-widest">해당하는 학생이 없습니다.</p>
                      <p className="text-[10px] text-slate-300 font-bold mt-1">학교 선택 혹은 검색어를 확인해주세요.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-10 border-t border-slate-100 bg-slate-50/50">
              <button 
                onClick={handleCreateOrUpdateExam} 
                className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black text-xl shadow-2xl hover:bg-slate-800 transition-all active:scale-[0.98]"
              >
                {editingExamId ? '성적 데이터 업데이트' : '최종 성적 저장 및 동기화'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamManagement;
