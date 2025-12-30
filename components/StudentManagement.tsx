
import React, { useState, useMemo } from 'react';
import { Student, Exam } from '../types';
import { calculateExamResults } from '../utils/gradingUtils';

interface StudentManagementProps {
  students: Student[];
  exams: Exam[];
  onAddStudent: (name: string, school: string, phone: string) => void;
  onUpdateStudent: (student: Student) => void;
  onDeleteStudent: (id: string) => void;
}

const StudentManagement: React.FC<StudentManagementProps> = ({ 
  students, 
  exams, 
  onAddStudent, 
  onUpdateStudent,
  onDeleteStudent 
}) => {
  const [name, setName] = useState('');
  const [school, setSchool] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterSchool, setFilterSchool] = useState<string>('all');

  // Editing state
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editName, setEditName] = useState('');
  const [editSchool, setEditSchool] = useState('');
  const [editPhone, setEditPhone] = useState('');

  // Get unique schools for filtering
  const uniqueSchools = useMemo(() => {
    const schools = students
      .map(s => s.school?.trim())
      .filter((s): s is string => !!s);
    return Array.from(new Set(schools)).sort();
  }, [students]);

  // Sort and Filter students
  const filteredAndSortedStudents = useMemo(() => {
    let list = [...students];
    
    // 1. Filter by school
    if (filterSchool !== 'all') {
      list = list.filter(s => s.school === filterSchool);
    }
    
    // 2. Sort by name (가나다 순)
    return list.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }, [students, filterSchool]);

  // Determine pass/fail based on the latest exam
  const studentStatusMap = useMemo(() => {
    if (exams.length === 0) return {};
    const latestExam = exams[exams.length - 1];
    const results = calculateExamResults(latestExam.scores, students, latestExam.passThreshold);
    const map: Record<string, { grade: number; isPass: boolean }> = {};
    
    results.forEach(res => {
      const isPass = res.isPassed !== undefined 
        ? res.isPassed 
        : res.grade <= 3;

      map[res.studentId] = {
        grade: res.grade,
        isPass
      };
    });
    return map;
  }, [exams, students]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddStudent(name, school, phone);
    setName('');
    setSchool('');
    setPhone('');
  };

  const handleEditClick = (student: Student) => {
    setEditingStudent(student);
    setEditName(student.name);
    setEditSchool(student.school || '');
    setEditPhone(student.phone || '');
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent || !editName.trim()) return;
    
    onUpdateStudent({
      ...editingStudent,
      name: editName,
      school: editSchool,
      phone: editPhone
    });
    
    setEditingStudent(null);
  };

  const toggleSelectAll = () => {
    const visibleIds = filteredAndSortedStudents.map(s => s.id);
    const allVisibleSelected = visibleIds.every(id => selectedIds.has(id));

    if (allVisibleSelected && visibleIds.length > 0) {
      const next = new Set(selectedIds);
      visibleIds.forEach(id => next.delete(id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      visibleIds.forEach(id => next.add(id));
      setSelectedIds(next);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectByStatus = (pass: boolean) => {
    const next = new Set<string>();
    filteredAndSortedStudents.forEach(s => {
      const status = studentStatusMap[s.id];
      if (pass && status?.isPass) next.add(s.id);
      if (!pass && (!status || !status.isPass)) next.add(s.id);
    });
    setSelectedIds(next);
  };

  const getSelectedNumbers = () => {
    return students
      .filter(s => selectedIds.has(s.id) && s.phone)
      .map(s => s.phone?.replace(/[^0-9]/g, ''))
      .filter(p => p && p.length > 0) as string[];
  };

  const handleCopyNumbers = () => {
    const numbers = getSelectedNumbers();
    if (numbers.length === 0) {
      alert('연락처가 등록된 학생이 없습니다.');
      return;
    }
    const text = numbers.join(', ');
    navigator.clipboard.writeText(text).then(() => {
      alert(`${numbers.length}명의 번호가 복사되었습니다. 문자 앱에 붙여넣기 하세요.`);
    });
  };

  const handleBulkSMS = () => {
    const numbers = getSelectedNumbers();
    if (numbers.length === 0) {
      alert('연락처가 등록된 학생을 선택해주세요.');
      return;
    }

    const separator = ',';
    const smsUrl = `sms:${numbers.join(separator)}`;
    
    const link = document.createElement('a');
    link.href = smsUrl;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
    }, 100);
  };

  return (
    <div className="space-y-6">
      {/* Registration Form */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold mb-4 text-slate-800">신규 학생 등록</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="이름 (필수)"
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
          <input
            type="tel"
            placeholder="연락처"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm"
          >
            등록 완료
          </button>
        </form>
      </div>

      {/* Filter and Bulk Action Controls */}
      <div className="flex flex-col gap-4 bg-slate-100 p-4 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-bold text-slate-600 mr-2">학교 필터:</span>
            <select
              value={filterSchool}
              onChange={(e) => setFilterSchool(e.target.value)}
              className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none"
            >
              <option value="all">전체 학교 ({students.length})</option>
              {uniqueSchools.map(sch => (
                <option key={sch} value={sch}>{sch}</option>
              ))}
            </select>
            
            <div className="h-6 w-px bg-slate-300 mx-2" />
            
            <span className="text-sm font-bold text-slate-600 mr-2">빠른 선택:</span>
            <button
              onClick={() => selectByStatus(true)}
              className="bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-green-200 transition-colors border border-green-200"
            >
              ✅ 통과자
            </button>
            <button
              onClick={() => selectByStatus(false)}
              className="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-red-200 transition-colors border border-red-200"
            >
              ❌ 탈락자
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {selectedIds.size > 0 && (
              <div className="flex items-center space-x-2 animate-in fade-in zoom-in duration-200">
                <span className="text-sm font-bold text-blue-600 mr-2">{selectedIds.size}명 선택됨</span>
                <button
                  onClick={handleCopyNumbers}
                  className="bg-white text-slate-700 border border-slate-300 px-4 py-2 rounded-lg font-bold hover:bg-slate-50 flex items-center shadow-sm"
                >
                  <span className="mr-2">📋</span> 번호 복사
                </button>
                <button
                  onClick={handleBulkSMS}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 flex items-center"
                >
                  <span className="mr-2">✉</span> 단체 문자
                </button>
              </div>
            )}
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-slate-500 text-sm hover:underline px-2"
            >
              선택 해제
            </button>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs uppercase text-slate-500 bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-3 font-semibold w-12 text-center">
                  <input
                    type="checkbox"
                    checked={filteredAndSortedStudents.length > 0 && filteredAndSortedStudents.every(s => selectedIds.has(s.id))}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="px-6 py-3 font-semibold">이름 (가나다순)</th>
                <th className="px-6 py-3 font-semibold">학교</th>
                <th className="px-6 py-3 font-semibold">상태</th>
                <th className="px-6 py-3 font-semibold">연락처</th>
                <th className="px-6 py-3 font-semibold text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAndSortedStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    {filterSchool === 'all' ? '등록된 학생이 없습니다.' : '이 학교에 소속된 학생이 없습니다.'}
                  </td>
                </tr>
              ) : (
                filteredAndSortedStudents.map((student) => {
                  const status = studentStatusMap[student.id];
                  return (
                    <tr 
                      key={student.id} 
                      className={`hover:bg-blue-50 transition-colors ${selectedIds.has(student.id) ? 'bg-blue-50/50' : ''}`}
                    >
                      <td className="px-6 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(student.id)}
                          onChange={() => toggleSelect(student.id)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">{student.name}</td>
                      <td className="px-6 py-4">
                        {student.school ? (
                          <span className="text-sm text-slate-600">{student.school}</span>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4">
                        {status ? (
                          <div className="flex flex-col gap-1">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase inline-block w-fit ${
                              status.isPass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {status.isPass ? 'PASS' : 'FAIL'}
                            </span>
                            <span className="text-[10px] text-slate-500 font-bold ml-1">{status.grade}등급</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-bold uppercase">No Record</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-slate-600 text-sm font-medium">{student.phone || '-'}</span>
                          {student.phone && (
                            <a
                              href={`sms:${student.phone}`}
                              className="text-blue-500 hover:text-blue-700"
                              title="개별 문자"
                            >
                              ✉
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end items-center space-x-4">
                          <button
                            onClick={() => handleEditClick(student)}
                            className="text-blue-500 hover:text-blue-700 font-medium text-sm transition-colors"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => onDeleteStudent(student.id)}
                            className="text-slate-300 hover:text-red-500 transition-colors p-1"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">학생 정보 수정</h3>
              <button onClick={() => setEditingStudent(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
            
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">이름</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">학교명</label>
                <input
                  type="text"
                  value={editSchool}
                  onChange={(e) => setEditSchool(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">연락처</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
                >
                  수정 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentManagement;
