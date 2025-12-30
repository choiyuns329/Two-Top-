
import React from 'react';
import { Student, Exam } from '../types';
import { calculateExamResults, getExamSummary } from '../utils/gradingUtils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie
} from 'recharts';

interface DashboardProps {
  students: Student[];
  exams: Exam[];
}

const Dashboard: React.FC<DashboardProps> = ({ students, exams }) => {
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
  const results = calculateExamResults(latestExam.scores, students);
  const summary = getExamSummary(results);

  const distributionData = [
    { name: '1등급', value: summary.gradeDistribution[1], color: '#22c55e' },
    { name: '2등급', value: summary.gradeDistribution[2], color: '#3b82f6' },
    { name: '3등급', value: summary.gradeDistribution[3], color: '#eab308' },
    { name: '4등급', value: summary.gradeDistribution[4], color: '#ef4444' },
  ];

  const recentExamsData = exams.slice(-5).map(e => {
    const res = calculateExamResults(e.scores, students);
    const sum = getExamSummary(res);
    return {
      name: e.title.length > 8 ? e.title.substring(0, 8) + '...' : e.title,
      평균: Number(sum.average.toFixed(1))
    };
  });

  return (
    <div className="space-y-8">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">총 재원생</p>
          <p className="text-3xl font-black text-slate-800">{students.length}<span className="text-lg font-normal ml-1">명</span></p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">진행한 시험</p>
          <p className="text-3xl font-black text-slate-800">{exams.length}<span className="text-lg font-normal ml-1">건</span></p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">최근 시험 평균</p>
          <p className="text-3xl font-black text-blue-600">{summary.average.toFixed(1)}<span className="text-lg font-normal ml-1">점</span></p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">최근 최고점</p>
          <p className="text-3xl font-black text-green-600">{summary.highestScore}<span className="text-lg font-normal ml-1">점</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Grade Distribution Chart */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold mb-6 flex items-center">
            <span className="mr-2">📊</span> 최근 시험 등급 분포 ({latestExam.title})
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distributionData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#f8fafc'}} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Exam Average Trend */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold mb-6 flex items-center">
            <span className="mr-2">📈</span> 시험 평균 추이 (최근 5개)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={recentExamsData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="평균" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Top Students */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold mb-6 flex items-center">
          <span className="mr-2">🏆</span> 최근 시험 우수자 (Top 3)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {results.slice(0, 3).map((student, idx) => (
            <div key={student.studentId} className={`p-6 rounded-xl border ${
              idx === 0 ? 'bg-yellow-50 border-yellow-200' : 
              idx === 1 ? 'bg-slate-50 border-slate-200' : 
              'bg-orange-50 border-orange-200'
            }`}>
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${
                  idx === 0 ? 'bg-yellow-400 text-white' : 
                  idx === 1 ? 'bg-slate-400 text-white' : 
                  'bg-orange-400 text-white'
                }`}>
                  {idx + 1}
                </div>
                <div>
                  <p className="text-xl font-black text-slate-800">{student.name}</p>
                  <p className="text-sm font-medium text-slate-500">{student.score}점 ({student.grade}등급)</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
