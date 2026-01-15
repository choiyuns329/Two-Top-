
import React, { useState, useMemo } from 'react';
import { Student, Exam } from '../types.ts';
import { calculateExamResults } from '../utils/gradingUtils.ts';

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

  // 수정 관련 상태
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editName, setEditName] = useState('');
  const [editSchool, setEditSchool] = useState('');
  const [editPhone, setEditPhone] = useState('');

  const uniqueSchools = useMemo(() => {
    const schools = students
      .map(s => s.school?.trim())
      .filter((s): s is string => !!s);
    return Array.from(new Set(schools)).sort();
  }, [students]);

  const filteredAndSortedStudents = useMemo(() => {
    let list = [...students];
    if (filterSchool !== 'all') {
      list = list.filter(s => s.school === filterSchool);
    }
    return list.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }, [students, filterSchool]);

  const studentStatusMap = useMemo(() => {
    if (exams.length === 0) return {};
    const latestExam = exams[exams.length - 1];
    const results = calculateExamResults(latestExam, students);
    const map: Record<string, { isPass?: boolean }> = {};
    
    results.forEach(res => {
      map[res.studentId] = { isPass: res.isPassed };
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
      if (status && status.isPass !== undefined) {
        if (pass && status.isPass) next.add(s.id);
        if (!pass && !status.isPass) next.add(s.id);
      }
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
      alert(`${numbers.length}명의 번호가 복사되었습니다.`);
    });
  };

  const handleBulkSMS = () => {
    const numbers = getSelectedNumbers();
    if (numbers.length === 0) {
      alert('연락처가 등록된 학생을 선택해주세요.');
      return;
    }
    window.location.href = `sms:${numbers.join(',')}`;
  };

  return (
    <div className="space-y-6">
      {/* 학생 추가 섹션 */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-black mb-4 text-slate-800 uppercase tracking-widest">New Student</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input type="text" placeholder="이름 (필수)" value={name} onChange={(e) => setName(e.target.value)} className="px-4 py-3 bg-slate-50 border-none rounded-xl outline-none font-bold text-sm" required />
          <input type="text" placeholder="학교명" value={school} onChange={(e) => setSchool(e.target.value)} className="px-4 py-3 bg-slate-50 border-none rounded-xl outline-none font-bold text-sm" />
          <input type="tel" placeholder="연락처" value={phone} onChange={(e) => setPhone(e.target.value)} className="px-4 py-3 bg-slate-50 border-none rounded-xl outline-none font-bold text-sm" />
          <button type="submit" className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-sm hover:bg-slate-800 shadow-lg">학생 추가</button>
        </form>
      </div>

      {/* 필터 및 벌크 액션 */}
      <div className="flex flex-col gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">School Filter</span>
            <select value={filterSchool} onChange={(e) => setFilterSchool(e.target.value)} className="bg-slate-50 border-none text-slate-700 text-xs font-black rounded-xl px-4 py-2 outline-none">
              <option value="all">전체 ({students.length})</option>
              {uniqueSchools.map(sch => <option key={sch} value={sch}>{sch}</option>)}
            </select>
            <div className="h-4 w-px bg-slate-200 mx-2" />
            <button onClick={() => selectByStatus(true)} className="bg-green-50 text-green-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight">Pass Only</button>
            <button onClick={() => selectByStatus(false)} className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight">Fail Only</button>
          </div>
          <div className="flex items-center space-x-2">
            {selectedIds.size > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-xs font-black text-blue-600 mr-2">{selectedIds.size} SELECTED</span>
                <button onClick={handleCopyNumbers} className="bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl text-xs font-black hover:bg-slate-100 transition-colors">복사</button>
                <button onClick={handleBulkSMS} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-blue-700 shadow-md transition-all">단체 문자</button>
              </div>
            )}
            {selectedIds.size > 0 && (
              <button onClick={() => setSelectedIds(new Set())} className="text-slate-300 text-[10px] font-black uppercase hover:text-slate-600 transition-colors ml-2">Clear</button>
            )}
          </div>
        </div>
      </div>

      {/* 학생 목록 테이블 */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black uppercase text-slate-400 bg-slate-50/50 border-b border-slate-100 tracking-[0.2em]">
                <th className="px-8 py-5 w-12 text-center">
                  <input type="checkbox" checked={filteredAndSortedStudents.length > 0 && filteredAndSortedStudents.every(s => selectedIds.has(s.id))} onChange={toggleSelectAll} className="w-4 h-4 rounded-lg cursor-pointer accent-blue-600" />
                </th>
                <th className="px-8 py-5">Name</th>
                <th className="px-8 py-5">School</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5">Phone</th>
                <th className="px-8 py-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredAndSortedStudents.length === 0 ? (
                <tr><td colSpan={6} className="px-8 py-20 text-center text-slate-300 font-bold uppercase tracking-widest text-xs">No students found</td></tr>
              ) : (
                filteredAndSortedStudents.map((student) => {
                  const status = studentStatusMap[student.id];
                  const hasThreshold = status && status.isPass !== undefined;
                  const isSelected = selectedIds.has(student.id);
                  return (
                    <tr key={student.id} className={`group transition-all ${isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                      <td className="px-8 py-5 text-center">
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(student.id)} className="w-4 h-4 rounded-lg cursor-pointer accent-blue-600" />
                      </td>
                      <td className="px-8 py-5 font-black text-slate-800">{student.name}</td>
                      <td className="px-8 py-5 text-xs font-bold text-slate-500">{student.school || '-'}</td>
                      <td className="px-8 py-5">
                        {hasThreshold ? (
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter ${status.isPass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {status.isPass ? 'PASS' : 'FAIL'}
                          </span>
                        ) : <span className="text-[9px] text-slate-300 font-black uppercase italic">N/A</span>}
                      </td>
                      <td className="px-8 py-5 text-xs font-medium text-slate-400">{student.phone || '-'}</td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-3">
                          <button onClick={() => handleEditClick(student)} className="text-[10px] font-black text-blue-500 hover:text-blue-700 uppercase tracking-widest">수정</button>
                          <button onClick={() => onDeleteStudent(student.id)} className="text-slate-200 hover:text-red-500 transition-colors">✕</button>
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

      {/* 수정 모달 (Edit Modal) */}
      {editingStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-slate-800">학생 정보 수정</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Update Student Profile</p>
              </div>
              <button 
                onClick={() => setEditingStudent(null)} 
                className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all"
              >✕</button>
            </div>
            
            <form onSubmit={handleUpdate} className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">이름</label>
                  <input 
                    type="text" 
                    value={editName} 
                    onChange={(e) => setEditName(e.target.value)} 
                    className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-50 transition-all" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">학교</label>
                  <input 
                    type="text" 
                    value={editSchool} 
                    onChange={(e) => setEditSchool(e.target.value)} 
                    className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-50 transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">연락처</label>
                  <input 
                    type="tel" 
                    value={editPhone} 
                    onChange={(e) => setEditPhone(e.target.value)} 
                    className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-50 transition-all" 
                  />
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit" 
                  className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black text-lg shadow-xl hover:bg-slate-800 transition-all"
                >
                  정보 업데이트
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
