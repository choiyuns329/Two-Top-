
import React, { useState } from 'react';
import { Student } from '../types';

interface StudentManagementProps {
  students: Student[];
  onAddStudent: (name: string, school: string) => void;
  onDeleteStudent: (id: string) => void;
}

const StudentManagement: React.FC<StudentManagementProps> = ({ students, onAddStudent, onDeleteStudent }) => {
  const [name, setName] = useState('');
  const [school, setSchool] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddStudent(name, school);
    setName('');
    setSchool('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold mb-4">신규 학생 등록</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="학생 이름 (필수)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
          <input
            type="text"
            placeholder="학교명 (선택)"
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            학생 등록하기
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">재원생 목록 ({students.length}명)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs uppercase text-slate-500 bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-3 font-semibold">이름</th>
                <th className="px-6 py-3 font-semibold">학교</th>
                <th className="px-6 py-3 font-semibold">등록일</th>
                <th className="px-6 py-3 font-semibold text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                    등록된 학생이 없습니다. 신규 학생을 등록해주세요.
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="hover:bg-blue-50 transition-colors group">
                    <td className="px-6 py-4 font-medium text-slate-800">{student.name}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {student.school ? (
                        <span className="bg-slate-100 px-2 py-1 rounded text-xs font-medium text-slate-600">
                          {student.school}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-sm">
                      {new Date(student.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => onDeleteStudent(student.id)}
                        className="text-red-400 hover:text-red-600 font-medium text-sm p-1"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StudentManagement;
