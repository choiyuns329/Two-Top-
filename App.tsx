
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import StudentManagement from './components/StudentManagement';
import ExamManagement from './components/ExamManagement';
import Analytics from './components/Analytics';
import { ViewMode, Student, Exam } from './types';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
// Vercel 환경 변수에서 URL과 KEY를 가져옵니다.
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

  // 초기 데이터 로드 및 실시간 구독 설정
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      const { data: studentsData } = await supabase.from('students').select('*');
      const { data: examsData } = await supabase.from('exams').select('*');
      
      if (studentsData) setStudents(studentsData);
      if (examsData) setExams(examsData);
      setLoading(false);
    };

    fetchData();

    // 실시간 구독: 학생들이나 시험 데이터가 변경되면 즉시 반영
    const studentsSubscription = supabase
      .channel('students-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setStudents(prev => [...prev, payload.new as Student]);
        } else if (payload.eventType === 'UPDATE') {
          setStudents(prev => prev.map(s => s.id === (payload.new as Student).id ? (payload.new as Student) : s));
        } else if (payload.eventType === 'DELETE') {
          setStudents(prev => prev.filter(s => s.id !== payload.old.id));
        }
      })
      .subscribe();

    const examsSubscription = supabase
      .channel('exams-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exams' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setExams(prev => [...prev, payload.new as Exam]);
        } else if (payload.eventType === 'DELETE') {
          setExams(prev => prev.filter(e => e.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(studentsSubscription);
      supabase.removeChannel(examsSubscription);
    };
  }, []);

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
      // 실시간 구독자가 아니더라도 즉각적인 UI 반응을 위해 상태 업데이트는 구독 로직에서 처리되거나
      // 혹은 명시적으로 추가할 수 있으나 구독 로직이 중복 방지를 처리함
    } else {
      setStudents([...students, newStudent]);
    }
  };

  const updateStudent = async (updatedStudent: Student) => {
    if (supabase) {
      await supabase.from('students').update(updatedStudent).eq('id', updatedStudent.id);
    } else {
      setStudents(students.map(s => s.id === updatedStudent.id ? updatedStudent : s));
    }
  };

  const deleteStudent = async (id: string) => {
    if (window.confirm('정말 이 학생을 삭제하시겠습니까?')) {
      if (supabase) {
        await supabase.from('students').delete().eq('id', id);
      } else {
        setStudents(students.filter(s => s.id !== id));
      }
    }
  };

  const addExam = async (exam: Exam) => {
    if (supabase) {
      await supabase.from('exams').insert([exam]);
    } else {
      setExams([...exams, exam]);
    }
  };

  const deleteExam = async (id: string) => {
    if (window.confirm('이 시험 기록을 삭제하시겠습니까?')) {
      if (supabase) {
        await supabase.from('exams').delete().eq('id', id);
      } else {
        setExams(exams.filter(e => e.id !== id));
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
      case ViewMode.DASHBOARD:
        return <Dashboard students={students} exams={exams} />;
      case ViewMode.STUDENTS:
        return (
          <StudentManagement 
            students={students} 
            exams={exams}
            onAddStudent={addStudent} 
            onUpdateStudent={updateStudent}
            onDeleteStudent={deleteStudent} 
          />
        );
      case ViewMode.EXAMS:
        return (
          <ExamManagement 
            students={students} 
            exams={exams} 
            onAddExam={addExam} 
            onDeleteExam={deleteExam} 
          />
        );
      case ViewMode.ANALYTICS:
        return <Analytics students={students} exams={exams} />;
      default:
        return <Dashboard students={students} exams={exams} />;
    }
  };

  return (
    <Layout activeView={view} setView={setView}>
      {!supabase && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center text-amber-800 text-sm font-medium">
          <span className="mr-3 text-lg">⚠️</span>
          데이터베이스 환경 변수가 설정되지 않았습니다. 현재 데이터는 브라우저에 임시 저장됩니다.
        </div>
      )}
      {renderContent()}
    </Layout>
  );
};

export default App;
