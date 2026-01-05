
import React, { useState, useMemo } from 'react';
import { Student, Exam } from '../types.ts';
import { calculateExamResults, getExamSummary } from '../utils/gradingUtils.ts';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area
} from 'recharts';

interface StudentDetailViewProps {
  students: Student[];
  exams: Exam[];
}

const StudentDetailView: React.FC<StudentDetailViewProps> = ({ students, exams }) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // 각 학생의 가장 최근 성적 정보 맵 생성
  const studentLatestScoreMap = useMemo(() => {
    if (exams.length === 0) return {};
    const map: Record<string, { score: number; unit: string; rank: number; total: number }> = {};
    
    // 최근 시험부터 역순으로 돌며 학생 성적 찾기
    [...exams].reverse().forEach(exam => {
      const results = calculateExamResults(exam, students);
      results.forEach(res => {
        if (!map[res.studentId]) {
          map[res.studentId] = {
            score: res.score,
            unit: exam.type === 'RANKING' ? '점' : '개',
            rank: res.rank,
            total: results.length
          };
        }
      });
    });
    return map;
  }, [exams, students]);

  const filteredStudents = useMemo(() => {
    let list = [...students];
    if (searchTerm.trim()) {
      list = list.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    
    // 최근 성적이 낮은 학생을 찾기 쉽도록 성적 정보가 있는 리스트와 이름순 정렬
    return list.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }, [students, searchTerm]);

  const selectedStudent = useMemo(() => {
    return students.find(s => s.id === selectedStudentId);
  }, [students, selectedStudentId]);

  const studentExamHistory = useMemo(() => {
    if (!selectedStudentId) return [];

    return exams
      .map(exam => {
        const results = calculateExamResults(exam, students);
        const studentResult = results.find(r => r.studentId === selectedStudentId);
        const summary = getExamSummary(results, exam.totalQuestions);

        if (!studentResult) return null;

        return {
          date: new Date(exam.date).toLocaleDateString(),
          timestamp: new Date(exam.date).getTime(),
          title: exam.title,
          type: exam.type,
          score: studentResult.score,
          average: Number(summary.average.toFixed(1)),
          rank: studentResult.rank,
          total: summary.totalStudents,
          percentile: studentResult.percentile,
          isPassed: studentResult.isPassed,
          hasThreshold: exam.passThreshold !== undefined,
          unit: exam.type === 'RANKING' ? '점' : '개'
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [exams, selectedStudentId, students]);

  const stats = useMemo(() => {
    if (studentExamHistory.length === 0) return null;
    const scores = studentExamHistory.map(h => h.score);
    return {
      avgScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      maxScore: Math.max(...scores),
      minScore: Math.min(...scores),
      count: studentExamHistory.length,
      latestPercentile: studentExamHistory[studentExamHistory.length - 1].percentile
    };
  }, [studentExamHistory]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Search and Selection Area */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col gap-8">
        <div className="flex flex-col md:flex-row gap-6 items-end">
          <div className="w-full md:w-80">
            <label htmlFor="student-search" className="block text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">학생 검색</label>
            <div className="relative">
              <input 
                id="student-search" 
                type="text" 
                placeholder="이름을 입력하여 필터링..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-900 focus:ring-4 focus:ring-slate-100 transition-all" 
              />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 opacity-20">🔍</span>
            </div>
          </div>
          <div className="flex-1 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pb-1">
            Student Quick Insight Selection
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 max-h-64 overflow-y-auto p-1 custom-scrollbar">
          {filteredStudents.map(student => {
            const latest = studentLatestScoreMap[student.id];
            const isSelected = selectedStudentId === student.id;
            const isLowScore = latest && (latest.rank / latest.total) >= 0.8; // 하위 20%

            return (
              <button 
                key={student.id} 
                onClick={() => setSelectedStudentId(student.id)} 
                className={`flex flex-col p-4 rounded-2xl transition-all border-2 text-left group ${
                  isSelected 
                    ? 'border-slate-900 bg-slate-900 text-white shadow-xl scale-[1.02]' 
                    : isLowScore
                      ? 'border-red-50 bg-red-50 text-slate-700 hover:border-red-200'
                      : 'border-slate-50 bg-slate-50 text-slate-600 hover:border-slate-200 hover:bg-white'
                }`}
              >
                <span className="font-black text-sm mb-1 truncate">{student.name}</span>
                {latest ? (
                  <div className={`text-[10px] font-bold flex flex-col ${isSelected ? 'text-white/50' : isLowScore ? 'text-red-400' : 'text-slate-400'}`}>
                    <span>최근: {latest.score}{latest.unit}</span>
                    <span>상위 {((latest.rank / latest.total) * 100).toFixed(0)}%</span>
                  </div>
                ) : (
                  <span className="text-[10px] font-bold opacity-30">기록 없음</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {!selectedStudent ? (
        <div className="py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200 animate-in zoom-in duration-300">
          <div className="text-6xl mb-6 opacity-20">👤</div>
          <p className="text-slate-400 font-black text-xl mb-2">분석할 학생을 선택하세요.</p>
          <p className="text-slate-300 font-bold text-sm uppercase tracking-widest">Select a student to view their personal growth report</p>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
          {/* Quick Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">누적 응시 횟수</p>
              <p className="text-4xl font-black text-slate-900">{stats?.count}<span className="text-sm font-bold ml-1 text-slate-300">건</span></p>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">평균 성취도</p>
              <p className="text-4xl font-black text-blue-600">{stats?.avgScore.toFixed(1)}<span className="text-sm font-bold ml-1 text-slate-300">AVG</span></p>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">현재 등급 (상위 %)</p>
              <p className={`text-4xl font-black ${stats?.latestPercentile && stats.latestPercentile >= 80 ? 'text-red-500' : 'text-slate-900'}`}>
                {stats?.latestPercentile.toFixed(0)}%
              </p>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">최저/최고 점수</p>
              <p className="text-2xl font-black text-slate-400">
                <span className="text-red-400">{stats?.minScore}</span> / <span className="text-green-500">{stats?.maxScore}</span>
              </p>
            </div>
          </div>

          {/* Chart Section */}
          <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
            <h3 className="text-sm font-black text-slate-800 mb-8 flex items-center gap-2">
              <span className="w-2 h-6 bg-blue-600 rounded-full"></span>
              성장 곡선 및 평균 대비 분석
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={studentExamHistory}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="title" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                  <Tooltip 
                    contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'black'}} 
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Area name="본인 점수" type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={4} fillOpacity={1} fill="url(#colorScore)" />
                  <Line name="전체 평균" type="monotone" dataKey="average" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Full History Table */}
          <div className="bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-8 border-b border-slate-50 bg-slate-50/50">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Detailed Performance History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 text-[11px] font-black uppercase text-slate-400 tracking-widest">
                    <th className="px-10 py-5">날짜</th>
                    <th className="px-10 py-5">시험명</th>
                    <th className="px-10 py-5">성적</th>
                    <th className="px-10 py-5">석차 / 인원</th>
                    <th className="px-10 py-5">상태</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {studentExamHistory.slice().reverse().map((history, idx) => {
                    const isBelowAvg = history.score < history.average;
                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-10 py-5 text-xs font-bold text-slate-400">{history.date}</td>
                        <td className="px-10 py-5 font-black text-slate-800">{history.title}</td>
                        <td className="px-10 py-5">
                          <span className={`text-lg font-black ${isBelowAvg ? 'text-red-500' : 'text-slate-900'}`}>
                            {history.score}{history.unit}
                          </span>
                          <span className="text-[10px] ml-2 font-bold text-slate-300">평균: {history.average}</span>
                        </td>
                        <td className="px-10 py-5 font-bold text-slate-700">
                          {history.rank} / {history.total}위
                          <span className="ml-2 text-[10px] text-slate-400">({history.percentile.toFixed(0)}%)</span>
                        </td>
                        <td className="px-10 py-5 font-black">
                          {history.hasThreshold && history.isPassed !== undefined ? (
                            <span className={`px-3 py-1 rounded-full text-[10px] ${history.isPassed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                              {history.isPassed ? 'PASS' : 'FAIL'}
                            </span>
                          ) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDetailView;
