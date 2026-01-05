
import React, { useState, useMemo } from 'react';
import { Student, Exam } from '../types.ts';
import { calculateExamResults, getExamSummary } from '../utils/gradingUtils.ts';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

interface DashboardProps {
  students: Student[];
  exams: Exam[];
}

const Dashboard: React.FC<DashboardProps> = ({ students, exams }) => {
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  if (exams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 bg-white rounded-2xl border-2 border-dashed border-slate-200">
        <span className="text-6xl mb-6">📈</span>
        <h3 className="text-xl font-bold text-slate-600">아직 데이터가 없습니다.</h3>
        <p>시험 성적을 입력하면 화려한 대시보드가 나타납니다!</p>
      </div>
    );
  }

  const latestExam = exams[exams.length - 1];
  const results = calculateExamResults(latestExam, students);
  const summary = getExamSummary(results, latestExam.totalQuestions);
  const unit = latestExam.type === 'RANKING' ? '점' : '개';

  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => {
      return sortOrder === 'DESC' ? b.score - a.score : a.score - b.score;
    });
  }, [results, sortOrder]);

  const recentExamsData = exams.slice(-5).map(e => {
    const res = calculateExamResults(e, students);
    const sum = getExamSummary(res, e.totalQuestions);
    return {
      name: e.title.length > 8 ? e.title.substring(0, 8) + '...' : e.title,
      평균: Number(sum.average.toFixed(1)),
      type: e.type
    };
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-transform hover:scale-[1.02]">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">총 재원생</p>
          <p className="text-3xl font-black text-slate-900">{students.length}<span className="text-lg font-normal ml-1 text-slate-400">명</span></p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-transform hover:scale-[1.02]">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">누적 시험</p>
          <p className="text-3xl font-black text-slate-900">{exams.length}<span className="text-lg font-normal ml-1 text-slate-400">건</span></p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-transform hover:scale-[1.02]">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">최근 평균</p>
          <p className="text-3xl font-black text-blue-600">{summary.average.toFixed(1)}<span className="text-lg font-normal ml-1 opacity-50">{unit}</span></p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-transform hover:scale-[1.02]">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">최고 성적</p>
          <p className="text-3xl font-black text-green-600">{summary.highestScore}<span className="text-lg font-normal ml-1 opacity-50">{unit}</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Average Chart */}
        <div className="lg:col-span-1 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <h3 className="text-sm font-black text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-2 h-6 bg-blue-600 rounded-full"></span>
            평균 성적 추이
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={recentExamsData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}} 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'black'}} 
                  formatter={(value, name, props) => [`${value}${props.payload.type === 'RANKING' ? '점' : '개'}`, '평균']} 
                />
                <Bar dataKey="평균" fill="#1e293b" radius={[6, 6, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* All Students Results List */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 border-b border-slate-50 flex justify-between items-center">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <span className="w-2 h-6 bg-slate-900 rounded-full"></span>
              최근 시험 전체 결과: <span className="text-blue-600 ml-1">{latestExam.title}</span>
            </h3>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button 
                onClick={() => setSortOrder('DESC')} 
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${sortOrder === 'DESC' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
              >
                고득점순
              </button>
              <button 
                onClick={() => setSortOrder('ASC')} 
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${sortOrder === 'ASC' ? 'bg-white text-red-500 shadow-sm' : 'text-slate-400'}`}
              >
                저득점순
              </button>
            </div>
          </div>
          
          <div className="overflow-y-auto max-h-[400px] custom-scrollbar">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  <th className="px-8 py-4">순위</th>
                  <th className="px-8 py-4">이름 (학교)</th>
                  <th className="px-8 py-4">성적</th>
                  <th className="px-8 py-4 text-center">백분위</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sortedResults.map((student) => {
                  const isTop3 = student.rank <= 3;
                  const isBottom = student.percentile > 80;
                  return (
                    <tr key={student.studentId} className="hover:bg-slate-50 transition-colors">
                      <td className="px-8 py-4">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${
                          student.rank === 1 ? 'bg-yellow-400 text-white shadow-lg' :
                          student.rank === 2 ? 'bg-slate-300 text-white shadow-lg' :
                          student.rank === 3 ? 'bg-orange-400 text-white shadow-lg' :
                          'text-slate-400 bg-slate-100'
                        }`}>
                          {student.rank}
                        </span>
                      </td>
                      <td className="px-8 py-4">
                        <p className="font-black text-slate-800">{student.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{student.school}</p>
                      </td>
                      <td className="px-8 py-4">
                        <span className={`text-lg font-black ${isTop3 ? 'text-blue-600' : isBottom ? 'text-red-500' : 'text-slate-900'}`}>
                          {student.score}
                          <span className="text-xs ml-0.5 opacity-50 font-bold">{unit}</span>
                        </span>
                      </td>
                      <td className="px-8 py-4 text-center">
                        <span className={`px-2 py-1 rounded text-[10px] font-black ${
                          student.percentile <= 20 ? 'bg-blue-50 text-blue-600' :
                          student.percentile >= 80 ? 'bg-red-50 text-red-600' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          상위 {student.percentile.toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-slate-50 text-center border-t border-slate-100">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
               * {latestExam.scores.length}명의 응시생 성적 정보가 모두 표시되고 있습니다.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
