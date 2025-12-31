
import React, { useState, useMemo } from 'react';
import { Student, Exam } from '../types';
import { calculateExamResults, getExamSummary } from '../utils/gradingUtils';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

interface StudentDetailViewProps {
  students: Student[];
  exams: Exam[];
}

const StudentDetailView: React.FC<StudentDetailViewProps> = ({ students, exams }) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStudents = useMemo(() => {
    return students.filter(s => s.name.includes(searchTerm)).sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }, [students, searchTerm]);

  const selectedStudent = useMemo(() => {
    return students.find(s => s.id === selectedStudentId);
  }, [students, selectedStudentId]);

  // 해당 학생의 모든 시험 기록 추출
  const studentExamHistory = useMemo(() => {
    if (!selectedStudentId) return [];

    return exams
      .map(exam => {
        const results = calculateExamResults(exam.scores, students, exam.passThreshold);
        const studentResult = results.find(r => r.studentId === selectedStudentId);
        const summary = getExamSummary(results);

        if (!studentResult) return null;

        return {
          date: new Date(exam.date).toLocaleDateString(),
          timestamp: new Date(exam.date).getTime(),
          title: exam.title,
          score: studentResult.score,
          average: Number(summary.average.toFixed(1)),
          grade: studentResult.grade,
          rank: studentResult.rank,
          total: summary.totalStudents,
          isPassed: studentResult.isPassed
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [exams, selectedStudentId, students]);

  const stats = useMemo(() => {
    if (studentExamHistory.length === 0) return null;
    const scores = studentExamHistory.map(h => h.score);
    const grades = studentExamHistory.map(h => h.grade);
    return {
      avgScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      maxScore: Math.max(...scores),
      avgGrade: (grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(1),
      count: studentExamHistory.length
    };
  }, [studentExamHistory]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Student Selector */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 items-center">
        <div className="w-full md:w-64">
          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">학생 검색</label>
          <input
            type="text"
            placeholder="이름 입력..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
          />
        </div>
        <div className="flex-1 w-full">
          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">학생 선택</label>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
            {filteredStudents.map(student => (
              <button
                key={student.id}
                onClick={() => setSelectedStudentId(student.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedStudentId === student.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {student.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!selectedStudent ? (
        <div className="py-24 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
          <div className="text-4xl mb-4">🔍</div>
          <p className="text-slate-500 font-bold">학생을 선택하여 성장 리포트를 확인하세요.</p>
        </div>
      ) : studentExamHistory.length === 0 ? (
        <div className="py-24 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
          <div className="text-4xl mb-4">📔</div>
          <p className="text-slate-500 font-bold">{selectedStudent.name} 학생의 시험 기록이 아직 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">응시 횟수</p>
              <p className="text-2xl font-black text-slate-800">{stats?.count}회</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">누적 평균</p>
              <p className="text-2xl font-black text-blue-600">{stats?.avgScore.toFixed(1)}점</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">최고 점수</p>
              <p className="text-2xl font-black text-green-600">{stats?.maxScore}점</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">평균 등급</p>
              <p className="text-2xl font-black text-indigo-600">{stats?.avgGrade}등급</p>
            </div>
          </div>

          {/* Chart Section */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-black text-slate-800 mb-8 flex items-center">
              <span className="mr-3">📈</span> {selectedStudent.name} 학생 성장 추이
            </h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={studentExamHistory}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 'bold'}}
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 'bold'}}
                  />
                  <Tooltip 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    itemStyle={{fontWeight: 'bold', fontSize: '12px'}}
                  />
                  <Legend iconType="circle" />
                  <Line 
                    name="학생 점수"
                    type="monotone" 
                    dataKey="score" 
                    stroke="#2563eb" 
                    strokeWidth={4} 
                    dot={{r: 6, fill: '#2563eb', strokeWidth: 0}}
                    activeDot={{r: 8, strokeWidth: 0}}
                    animationDuration={1000}
                  />
                  <Line 
                    name="시험 평균"
                    type="monotone" 
                    dataKey="average" 
                    stroke="#cbd5e1" 
                    strokeWidth={2} 
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* History Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-800">시험별 상세 기록</h3>
              <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-full uppercase tracking-tighter">History List</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-black uppercase text-slate-400 tracking-widest">
                    <th className="px-8 py-4">Date</th>
                    <th className="px-8 py-4">Exam Title</th>
                    <th className="px-8 py-4">Score</th>
                    <th className="px-8 py-4">Rank</th>
                    <th className="px-8 py-4">Grade</th>
                    <th className="px-8 py-4">Pass/Fail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {studentExamHistory.slice().reverse().map((history, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-8 py-4 text-xs font-bold text-slate-500">{history.date}</td>
                      <td className="px-8 py-4 font-black text-slate-800">{history.title}</td>
                      <td className="px-8 py-4 font-black text-blue-600">{history.score}점</td>
                      <td className="px-8 py-4">
                        <span className="text-sm font-bold text-slate-700">{history.rank}</span>
                        <span className="text-[10px] text-slate-400 ml-1">/ {history.total}위</span>
                      </td>
                      <td className="px-8 py-4">
                        <span className={`px-3 py-1 rounded-full text-[11px] font-black ${
                          history.grade === 1 ? 'bg-green-100 text-green-700' :
                          history.grade === 2 ? 'bg-blue-100 text-blue-700' :
                          history.grade === 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {history.grade}등급
                        </span>
                      </td>
                      <td className="px-8 py-4">
                        {history.isPassed !== undefined ? (
                          <span className={`text-[10px] font-black ${history.isPassed ? 'text-blue-500' : 'text-red-500'}`}>
                            {history.isPassed ? 'PASS' : 'FAIL'}
                          </span>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
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
