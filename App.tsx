
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import StudentManagement from './components/StudentManagement';
import ExamManagement from './components/ExamManagement';
import Analytics from './components/Analytics';
import { ViewMode, Student, Exam } from './types';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabaseUrl = (window as any).process?.env?.SUPABASE_URL || '';
const supabaseAnonKey = (window as any).process?.env?.SUPABASE_ANON_KEY || '';

const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>(ViewMode.DASHBOARD);
  const [students, setStudents] = useState<Student[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. 초기 데이터 로드 (Supabase 혹은 localStorage)
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      
      if (supabase) {
        try {
          const { data: studentsData } = await supabase.from('students').select('*');
          const { data: examsData } = await supabase.from('exams').select('*');
          
          if (studentsData) setStudents(studentsData);
          if (examsData) setExams(examsData);
        } catch (error) {
          console.error("Supabase load error, falling back to local:", error);
          loadFromLocal();
        }
      } else {
        loadFromLocal();
      }
      
      setLoading(false);
    };

    const loadFromLocal = () => {
      const savedStudents = localStorage.getItem('students');
      const savedExams = localStorage.getItem('exams');
      if (savedStudents) setStudents(JSON.parse(savedStudents));
      if (savedExams) setExams(JSON.parse(savedExams));
    };

    initData();

    // 실시간 구독 (Supabase가 있을 때만)
    if (supabase) {
      const studentsSub = supabase
        .channel('students-all')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, (payload) => {
          if (payload.eventType === 'INSERT') setStudents(prev => [...prev, payload.new as Student]);
          if (payload.eventType === 'UPDATE') setStudents(prev => prev.map(s => s.id === (payload.new as Student).id ? (payload.new as Student) : s));
          if (payload.eventType === 'DELETE') setStudents(prev => prev.filter(s => s.id !== payload.old.id));
        })
        .subscribe();

      const examsSub = supabase
        .channel('exams-all')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'exams' }, (payload) => {
          if (payload.eventType === 'INSERT') setExams(prev => [...prev, payload.new as Exam]);
          if (payload.eventType === 'DELETE') setExams(prev => prev.filter(e => e.id !== payload.old.id));
        })
        .subscribe();

      return () => {
        supabase.removeChannel(studentsSub);
        supabase.removeChannel(examsSub);
      };
    }
  }, []);

  // 2. 로컬 저장소 동기화 (Supabase가 없을 때만 작동)
  useEffect(() => {
    if (!supabase && !loading) {
      localStorage.setItem('students', JSON.stringify(students));
      localStorage.setItem('exams', JSON.stringify(exams));
    }
  }, [students, exams, loading]);

  const addStudent = async (name: string, school: string, phone: string) => {
    const newStudent: Student = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      school,
      phone,
      createdAt: Date.now(),
    };

    if (supabase) {
      await supabase.from('students').insert([newStudent]);
    } else {
      setStudents(prev => [...prev, newStudent]);
    }
  };

  const updateStudent = async (updatedStudent: Student) => {
    if (supabase) {
      await supabase.from('students').update(updatedStudent).eq('id', updatedStudent.id);
    } else {
      setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
    }
  };

  const deleteStudent = async (id: string) => {
    if (window.confirm('정말 이 학생을 삭제하시겠습니까?')) {
      if (supabase) {
        await supabase.from('students').delete().eq('id', id);
      } else {
        setStudents(prev => prev.filter(s => s.id !== id));
      }
    }
  };

  const addExam = async (exam: Exam) => {
    if (supabase) {
      await supabase.from('exams').insert([exam]);
    } else {
      setExams(prev => [...prev, exam]);
    }
  };

  const deleteExam = async (id: string) => {
    if (window.confirm('이 시험 기록을 삭제하시겠습니까?')) {
      if (supabase) {
        await supabase.from('exams').delete().eq('id', id);
      } else {
        setExams(prev => prev.filter(e => e.id !== id));
      }
    }
  };

  if (loading && supabase) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-bold">클라우드 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (view) {
      case ViewMode.DASHBOARD: return <Dashboard students={students} exams={exams} />;
      case ViewMode.STUDENTS: return <StudentManagement students={students} exams={exams} onAddStudent={addStudent} onUpdateStudent={updateStudent} onDeleteStudent={deleteStudent} />;
      case ViewMode.EXAMS: return <ExamManagement students={students} exams={exams} onAddExam={addExam} onDeleteExam={deleteExam} />;
      case ViewMode.ANALYTICS: return <Analytics students={students} exams={exams} />;
      default: return <Dashboard students={students} exams={exams} />;
    }
  };

  return (
    <Layout activeView={view} setView={setView}>
      {!supabase && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-blue-800 text-sm">
          <div className="flex items-center font-medium">
            <span className="mr-3 text-lg">💾</span>
            현재 '로컬 브라우저'에 자동 저장 중입니다. (기기 간 공유 불가)
          </div>
          <div className="text-xs bg-blue-100 px-2 py-1 rounded">Vercel 환경변수 설정 시 클라우드로 전환됩니다</div>
        </div>
      )}
      {supabase && (
        <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center text-green-700 text-sm font-medium animate-in fade-in duration-500">
          <span className="mr-3">☁️</span>
          클라우드 데이터베이스와 실시간 동기화 중입니다.
        </div>
      )}
      {renderContent()}
    </Layout>
  );
};

export default App;
