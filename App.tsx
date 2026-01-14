
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
      try {
        return createClient(sbConfig.url, sbConfig.anonKey);
      } catch (e) {
        console.error("Supabase client init error:", e);
        return null;
      }
    }
    return null;
  }, [sbConfig]);

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      
      const savedStudents = localStorage.getItem('students');
      const savedExams = localStorage.getItem('exams');
      if (savedStudents) setStudents(JSON.parse(savedStudents));
      if (savedExams) setExams(JSON.parse(savedExams));

      if (supabase) {
        try {
          const { data: studentsData, error: sErr } = await supabase.from('students').select('*');
          const { data: examsData, error: eErr } = await supabase.from('exams').select('*');
          
          if (!sErr && studentsData) setStudents(studentsData);
          if (!eErr && examsData) setExams(examsData);
        } catch (error) {
          console.warn("Cloud sync failed on init, using local data.");
        }
      }
      setLoading(false);
    };

    initData();

    if (supabase) {
      const channel = supabase
        .channel('db-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            setStudents(prev => prev.find(s => s.id === payload.new.id) ? prev : [...prev, payload.new as Student]);
          } else if (payload.eventType === 'UPDATE') {
            setStudents(prev => prev.map(s => s.id === payload.new.id ? (payload.new as Student) : s));
          } else if (payload.eventType === 'DELETE') {
            setStudents(prev => prev.filter(s => s.id !== payload.old.id));
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'exams' }, (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setExams(prev => {
              const idx = prev.findIndex(e => e.id === payload.new.id);
              if (idx > -1) {
                const next = [...prev];
                next[idx] = payload.new as Exam;
                return next;
              }
              return [...prev, payload.new as Exam];
            });
          } else if (payload.eventType === 'DELETE') {
            setExams(prev => prev.filter(e => e.id !== payload.old.id));
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [supabase]);

  useEffect(() => {
    if (!loading) {
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
    setStudents(prev => [...prev, newStudent]);

    if (supabase) {
      try {
        const { error } = await supabase.from('students').insert([newStudent]);
        if (error) {
          console.error("Cloud insert error:", error);
        }
      } catch (e) {
        console.error("Network error during cloud sync:", e);
      }
    }
  };

  const updateStudent = async (updatedStudent: Student) => {
    setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
    if (supabase) {
      try {
        await supabase.from('students').update(updatedStudent).eq('id', updatedStudent.id);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const deleteStudent = async (id: string) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    setStudents(prev => prev.filter(s => s.id !== id));
    if (supabase) {
      try {
        await supabase.from('students').delete().eq('id', id);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const addExam = async (exam: Exam) => {
    // 1. 즉시 로컬 상태 업데이트
    setExams(prev => [...prev, exam]);

    // 2. 클라우드 저장 시도
    if (supabase) {
      try {
        const { error } = await supabase.from('exams').insert([exam]);
        if (error) {
          console.error("Cloud exam insert error:", error);
          // 사용자에게 구체적인 도움말 제공
          if (error.code === '42P01') {
            alert("서버 테이블이 없습니다. 설정(Settings) 페이지에서 STEP 01의 SQL을 다시 실행해주세요.");
          } else {
            alert(`클라우드 저장 실패: ${error.message}\n(로컬에는 안전하게 저장되었습니다.)`);
          }
        }
      } catch (e) {
        console.error("Exam cloud sync error:", e);
      }
    }
  };

  const updateExam = async (updatedExam: Exam) => {
    setExams(prev => prev.map(e => e.id === updatedExam.id ? updatedExam : e));
    if (supabase) {
      try {
        const { error } = await supabase.from('exams').update(updatedExam).eq('id', updatedExam.id);
        if (error) console.error("Cloud update error:", error);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const deleteExam = async (id: string) => {
    if (!window.confirm('시험 기록을 삭제하시겠습니까?')) return;
    setExams(prev => prev.filter(e => e.id !== id));
    if (supabase) {
      try {
        await supabase.from('exams').delete().eq('id', id);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const pushToCloud = async () => {
    if (!supabase) return;
    const localStudents = JSON.parse(localStorage.getItem('students') || '[]');
    const localExams = JSON.parse(localStorage.getItem('exams') || '[]');
    
    // Upsert를 사용하여 중복 방지 및 데이터 전송
    if (localStudents.length > 0) {
      const { error: sErr } = await supabase.from('students').upsert(localStudents);
      if (sErr) throw sErr;
    }
    if (localExams.length > 0) {
      const { error: eErr } = await supabase.from('exams').upsert(localExams);
      if (eErr) throw eErr;
    }

    // 최신 상태 다시 불러오기
    const { data: s } = await supabase.from('students').select('*');
    const { data: e } = await supabase.from('exams').select('*');
    if (s) setStudents(s);
    if (e) setExams(e);
  };

  const renderContent = () => {
    if (loading) return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-black animate-pulse uppercase tracking-widest text-xs">Preparing Workspace...</p>
      </div>
    );

    switch (view) {
      case ViewMode.DASHBOARD: return <Dashboard students={students} exams={exams} />;
      case ViewMode.STUDENTS: return <StudentManagement students={students} exams={exams} onAddStudent={addStudent} onUpdateStudent={updateStudent} onDeleteStudent={deleteStudent} />;
      case ViewMode.STUDENT_DETAIL: return <StudentDetailView students={students} exams={exams} />;
      case ViewMode.EXAMS: return <ExamManagement students={students} exams={exams} onAddExam={addExam} onUpdateExam={updateExam} onDeleteExam={deleteExam} />;
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
