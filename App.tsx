
import React, { useState, useEffect, useMemo } from 'react';
import Layout from './components/Layout.tsx';
import Dashboard from './components/Dashboard.tsx';
import StudentManagement from './components/StudentManagement.tsx';
import StudentDetailView from './components/StudentDetailView.tsx';
import ExamManagement from './components/ExamManagement.tsx';
import Analytics from './components/Analytics.tsx';
import Settings from './components/Settings.tsx';
import { ViewMode, Student, Exam, SupabaseConfig } from './types.ts';
import { createClient } from '@supabase/supabase-js';

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>(ViewMode.DASHBOARD);
  const [students, setStudents] = useState<Student[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  const [sbConfig, setSbConfig] = useState<SupabaseConfig | null>(() => {
    const saved = localStorage.getItem('supabase_config');
    return saved ? JSON.parse(saved) : null;
  });

  const supabase = useMemo(() => {
    if (sbConfig?.url && sbConfig?.anonKey) {
      return createClient(sbConfig.url, sbConfig.anonKey);
    }
    return null;
  }, [sbConfig]);

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      
      if (supabase) {
        try {
          const { data: studentsData, error: sErr } = await supabase.from('students').select('*');
          const { data: examsData, error: eErr } = await supabase.from('exams').select('*');
          
          if (sErr || eErr) throw new Error("Cloud fetch failed");

          if (studentsData) setStudents(studentsData);
          if (examsData) setExams(examsData);
        } catch (error) {
          console.warn("Falling back to local data:", error);
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

    if (supabase) {
      const channel = supabase
        .channel('db-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            setStudents(prev => {
              if (prev.find(s => s.id === payload.new.id)) return prev;
              return [...prev, payload.new as Student];
            });
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'exams' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            setExams(prev => {
              if (prev.find(e => e.id === payload.new.id)) return prev;
              return [...prev, payload.new as Exam];
            });
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [supabase]);

  useEffect(() => {
    if (!supabase && !loading) {
      localStorage.setItem('students', JSON.stringify(students));
      localStorage.setItem('exams', JSON.stringify(exams));
    }
  }, [students, exams, loading, supabase]);

  const addStudent = async (name: string, school: string, phone: string) => {
    const newStudent: Student = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      school,
      phone,
      createdAt: Date.now(),
    };

    if (supabase) {
      const { error } = await supabase.from('students').insert([newStudent]);
      if (error) {
        console.error("Insert error:", error);
        alert(`학생 등록 실패: ${error.message}`);
        return;
      }
    }
    setStudents(prev => [...prev, newStudent]);
  };

  const updateStudent = async (updatedStudent: Student) => {
    if (supabase) {
      const { error } = await supabase.from('students').update(updatedStudent).eq('id', updatedStudent.id);
      if (error) {
        alert("수정 실패: " + error.message);
        return;
      }
    }
    setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
  };

  const deleteStudent = async (id: string) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      if (supabase) {
        const { error } = await supabase.from('students').delete().eq('id', id);
        if (error) {
          alert("삭제 실패: " + error.message);
          return;
        }
      }
      setStudents(prev => prev.filter(s => s.id !== id));
    }
  };

  const addExam = async (exam: Exam) => {
    if (supabase) {
      const { error } = await supabase.from('exams').insert([exam]);
      if (error) {
        alert("시험 등록 실패: " + error.message);
        return;
      }
    }
    setExams(prev => [...prev, exam]);
  };

  const deleteExam = async (id: string) => {
    if (window.confirm('시험 기록을 삭제하시겠습니까?')) {
      if (supabase) {
        const { error } = await supabase.from('exams').delete().eq('id', id);
        if (error) {
          alert("시험 삭제 실패: " + error.message);
          return;
        }
      }
      setExams(prev => prev.filter(e => e.id !== id));
    }
  };

  const pushToCloud = async () => {
    if (!supabase) return;
    const localStudents = JSON.parse(localStorage.getItem('students') || '[]');
    const localExams = JSON.parse(localStorage.getItem('exams') || '[]');
    
    if (localStudents.length > 0) await supabase.from('students').upsert(localStudents);
    if (localExams.length > 0) await supabase.from('exams').upsert(localExams);

    const { data: s } = await supabase.from('students').select('*');
    const { data: e } = await supabase.from('exams').select('*');
    if (s) setStudents(s);
    if (e) setExams(e);
  };

  const renderContent = () => {
    if (loading) return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-black animate-pulse uppercase tracking-widest text-xs">Syncing with Cloud Database...</p>
      </div>
    );

    switch (view) {
      case ViewMode.DASHBOARD: return <Dashboard students={students} exams={exams} />;
      case ViewMode.STUDENTS: return <StudentManagement students={students} exams={exams} onAddStudent={addStudent} onUpdateStudent={updateStudent} onDeleteStudent={deleteStudent} />;
      case ViewMode.STUDENT_DETAIL: return <StudentDetailView students={students} exams={exams} />;
      case ViewMode.EXAMS: return <ExamManagement students={students} exams={exams} onAddExam={addExam} onDeleteExam={deleteExam} />;
      case ViewMode.ANALYTICS: return <Analytics students={students} exams={exams} />;
      case ViewMode.SETTINGS: return (
        <Settings 
          config={sbConfig} 
          onSaveConfig={(c) => { localStorage.setItem('supabase_config', JSON.stringify(c)); setSbConfig(c); }}
          onClearConfig={() => { localStorage.removeItem('supabase_config'); setSbConfig(null); }}
          onPushToCloud={pushToCloud}
          localData={{
            students: JSON.parse(localStorage.getItem('students') || '[]'),
            exams: JSON.parse(localStorage.getItem('exams') || '[]')
          }}
          isCloudConnected={!!supabase}
        />
      );
      default: return <Dashboard students={students} exams={exams} />;
    }
  };

  return (
    <Layout activeView={view} setView={setView} isCloudConnected={!!supabase}>
      {renderContent()}
    </Layout>
  );
};

export default App;
