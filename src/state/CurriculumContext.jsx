import React, { createContext, useContext, useState } from 'react';
import { sampleCurriculum, emptyCurriculum } from '../data/sampleCurriculum';

const CurriculumContext = createContext();

export function CurriculumProvider({ children }) {
  // Start with the intended first-run experience. Sample data remains available
  // only through the evaluator/testing control, rather than pre-populating a course.
  const [curriculum, setCurriculum] = useState(emptyCurriculum);
  const [generatedCurriculumDraft, setGeneratedCurriculumDraft] = useState(null);

  // Helper to generate unique IDs
  const generateId = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  // Curriculum Level Updates
  const updateCurriculum = (title, description) => {
    setCurriculum(prev => ({
      ...prev,
      title: title !== undefined ? title : prev.title,
      description: description !== undefined ? description : prev.description
    }));
  };

  // Module Operations
  const addModule = () => {
    const newModuleId = generateId('module');
    const moduleNumber = (curriculum.modules?.length || 0) + 1;
    const newModule = {
      id: newModuleId,
      title: `Module ${moduleNumber} — New Module`,
      description: "Click to add a module description...",
      topics: []
    };

    setCurriculum(prev => ({
      ...prev,
      modules: [...(prev.modules || []), newModule]
    }));

    return newModuleId;
  };

  const updateModule = (moduleId, updatedFields) => {
    setCurriculum(prev => ({
      ...prev,
      modules: prev.modules.map(mod => 
        mod.id === moduleId ? { ...mod, ...updatedFields, ...(mod.source && { source: 'user-edited' }) } : mod
      )
    }));
  };

  const deleteModule = (moduleId) => {
    setCurriculum(prev => ({
      ...prev,
      modules: prev.modules.filter(mod => mod.id !== moduleId)
    }));
  };

  // Topic Operations
  const addTopic = (moduleId) => {
    const newTopicId = generateId('topic');
    setCurriculum(prev => {
      const updatedModules = prev.modules.map(mod => {
        if (mod.id === moduleId) {
          const topicNumber = (mod.topics?.length || 0) + 1;
          const newTopic = {
            id: newTopicId,
            title: `Topic ${topicNumber} — New Topic`,
            description: "Click to add a topic description...",
            lessons: []
          };
          return { ...mod, topics: [...(mod.topics || []), newTopic] };
        }
        return mod;
      });
      return { ...prev, modules: updatedModules };
    });

    return newTopicId;
  };

  const updateTopic = (moduleId, topicId, updatedFields) => {
    setCurriculum(prev => ({
      ...prev,
      modules: prev.modules.map(mod => {
        if (mod.id === moduleId) {
          return {
            ...mod,
            topics: mod.topics.map(top =>
              top.id === topicId ? { ...top, ...updatedFields, ...(top.source && { source: 'user-edited' }) } : top
            )
          };
        }
        return mod;
      })
    }));
  };

  const deleteTopic = (moduleId, topicId) => {
    setCurriculum(prev => ({
      ...prev,
      modules: prev.modules.map(mod => {
        if (mod.id === moduleId) {
          return {
            ...mod,
            topics: mod.topics.filter(top => top.id !== topicId)
          };
        }
        return mod;
      })
    }));
  };

  // Lesson Operations
  const addLesson = (moduleId, topicId) => {
    const newLessonId = generateId('lesson');
    setCurriculum(prev => ({
      ...prev,
      modules: prev.modules.map(mod => {
        if (mod.id === moduleId) {
          return {
            ...mod,
            topics: mod.topics.map(top => {
              if (top.id === topicId) {
                const lessonNumber = (top.lessons?.length || 0) + 1;
                const newLesson = {
                  id: newLessonId,
                  title: `Lesson ${lessonNumber} — New Lesson`,
                  description: "Click to add a lesson description..."
                };
                return { ...top, lessons: [...(top.lessons || []), newLesson] };
              }
              return top;
            })
          };
        }
        return mod;
      })
    }));

    return newLessonId;
  };

  const updateLesson = (moduleId, topicId, lessonId, updatedFields) => {
    setCurriculum(prev => ({
      ...prev,
      modules: prev.modules.map(mod => {
        if (mod.id === moduleId) {
          return {
            ...mod,
            topics: mod.topics.map(top => {
              if (top.id === topicId) {
                return {
                  ...top,
                  lessons: top.lessons.map(les =>
                    les.id === lessonId ? { ...les, ...updatedFields, ...(les.source && { source: 'user-edited' }) } : les
                  )
                };
              }
              return top;
            })
          };
        }
        return mod;
      })
    }));
  };

  const deleteLesson = (moduleId, topicId, lessonId) => {
    setCurriculum(prev => ({
      ...prev,
      modules: prev.modules.map(mod => {
        if (mod.id === moduleId) {
          return {
            ...mod,
            topics: mod.topics.map(top => {
              if (top.id === topicId) {
                return {
                  ...top,
                  lessons: top.lessons.filter(les => les.id !== lessonId)
                };
              }
              return top;
            })
          };
        }
        return mod;
      })
    }));
  };

  const resetToEmpty = () => setCurriculum(emptyCurriculum);
  const resetToSample = () => setCurriculum(sampleCurriculum);
  const replaceCurriculum = (nextCurriculum) => setCurriculum(nextCurriculum);
  const setGeneratedDraft = (draft) => setGeneratedCurriculumDraft(draft);
  const clearGeneratedDraft = () => setGeneratedCurriculumDraft(null);

  const value = {
    curriculum,
    updateCurriculum,
    addModule,
    updateModule,
    deleteModule,
    addTopic,
    updateTopic,
    deleteTopic,
    addLesson,
    updateLesson,
    deleteLesson,
    replaceCurriculum,
    generatedCurriculumDraft,
    setGeneratedDraft,
    clearGeneratedDraft,
    resetToEmpty,
    resetToSample
  };

  return (
    <CurriculumContext.Provider value={value}>
      {children}
    </CurriculumContext.Provider>
  );
}

export function useCurriculum() {
  const context = useContext(CurriculumContext);
  if (!context) {
    throw new Error('useCurriculum must be used within a CurriculumProvider');
  }
  return context;
}
