
import React, { useState, useMemo } from 'react';
import { Student, Exam } from '../types.ts';
import { calculateExamResults, getExamSummary } from '../utils/gradingUtils.ts';
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
          isPassed: studentResult.isPassed,
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
      count: studentExamHistory.length
    };
  }, [studentExamHistory]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 items-center">
        <div className="w-full md:w-64">
          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">학생 검색</label>
          <input type="text" placeholder="이름 입력..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-none font-bold" />
        </div>
        <div className="flex-1 w-full">
          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">학생 선택</label>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
            {filteredStudents.map(student => (
              <button key={student.id} onClick={() => setSelectedStudentId(student.id)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${selectedStudentId === student.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{student.name}</button>
            ))}
          </div>
        </div>
      </div>

      {!selectedStudent ? (
        <div className="py-24 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200"><p className="text-slate-500 font-bold">학생을 선택하여 성장 리포트를 확인하세요.</p></div>
      ) : studentExamHistory.length === 0 ? (
        <div className="py-24 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200"><p className="text-slate-500 font-bold">{selectedStudent.name} 학생의 기록이 없습니다.</p></div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center"><p className="text-[10px] font-black text-slate-400 uppercase mb-1">응시 횟수</p><p className="text-2xl font-black">{stats?.count}회</p></div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center"><p className="text-[10px] font-black text-slate-400 uppercase mb-1">누적 평균</p><p className="text-2xl font-black text-blue-600">{stats?.avgScore.toFixed(1)}</p></div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center"><p className="text-[10px] font-black text-slate-400 uppercase mb-1">최고 성적</p><p className="text-2xl font-black text-green-600">{stats?.maxScore}</p></div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-black text-slate-800 mb-8 flex items-center">📈 {selectedStudent.name} 학생 성장 추이</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={studentExamHistory}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 'bold'}} />
                  <YAxis domain={[0, 'auto']} axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 'bold'}} />
                  <Tooltip 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} 
                    formatter={(value, name, props) => [`${value}${props.payload.unit}`, name]}
                  />
                  <Legend iconType="circle" />
                  <Line name="학생 성적" type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={4} dot={{r: 6, fill: '#2563eb'}} />
                  <Line name="시험 평균" type="monotone" dataKey="average" stroke="#cbd5e1" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-black uppercase text-slate-400 tracking-widest"><th className="px-8 py-4">Date</th><th className="px-8 py-4">Exam Title</th><th className="px-8 py-4">Result Value</th><th className="px-8 py-4">Rank</th><th className="px-8 py-4">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentExamHistory.slice().reverse().map((history, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-8 py-4 text-xs font-bold text-slate-500">{history.date}</td>
                    <td className="px-8 py-4 font-black text-slate-800">
                      <div className="flex flex-col">
                        <span>{history.title}</span>
                        <span className="text-[9px] text-slate-400 uppercase">{history.type === 'RANKING' ? 'Monthly' : 'Vocab'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-4 font-black text-blue-600">{history.score}{history.unit}</td>
                    <td className="px-8 py-4 font-bold text-slate-700">{history.rank} / {history.total}위</td>
                    <td className="px-8 py-4 font-black">
                      {history.isPassed !== undefined ? (
                        <span className={history.isPassed ? 'text-green-500' : 'text-red-500'}>
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
      )}
    </div>
  );
};

export default StudentDetailView;
