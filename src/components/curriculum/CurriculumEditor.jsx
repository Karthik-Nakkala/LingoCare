import React, { useState, useEffect, useRef } from 'react';
import { ModuleItem } from './ModuleItem';
import { SidebarOverview } from './SidebarOverview';
import { EmptyCurriculumState } from './EmptyCurriculumState';
import { useCurriculum } from '../../state/CurriculumContext';
import './CurriculumEditor.css';

export function CurriculumEditor({ onSwitchTab }) {
  const { 
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
    deleteLesson
  } = useCurriculum();

  const [newlyAddedId, setNewlyAddedId] = useState(null);
  const initializedIds = useRef(new Set());
  
  // Transient UI state for expand/collapse (Set of collapsed IDs)
  const [collapsedModules, setCollapsedModules] = useState(new Set());
  const [collapsedTopics, setCollapsedTopics] = useState(new Set());

  // Initialize collapsed state: collapse all modules and topics by default
  useEffect(() => {
    if (curriculum && curriculum.modules) {
      const unseenModules = curriculum.modules.filter(m => !initializedIds.current.has(m.id)).map(m => m.id);
      setCollapsedModules(prev => new Set([...prev, ...unseenModules]));
      const topicIds = [];
      curriculum.modules.forEach(m => {
        if (m.topics) {
          m.topics.forEach(t => topicIds.push(t.id));
        }
      });
      const unseenTopics = topicIds.filter(id => !initializedIds.current.has(id));
      setCollapsedTopics(prev => new Set([...prev, ...unseenTopics]));
      curriculum.modules.forEach(m => { initializedIds.current.add(m.id); (m.topics || []).forEach(t => initializedIds.current.add(t.id)); });
    }
  }, [curriculum]);

  const toggleModule = (id) => {
    setCollapsedModules(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleTopic = (id) => {
    setCollapsedTopics(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddModule = () => {
    const newId = addModule();
    setNewlyAddedId(newId);
    // Ensure the new module is expanded
    setCollapsedModules(prev => {
      const next = new Set(prev);
      next.delete(newId);
      return next;
    });
  };

  const handleAddTopic = (moduleId) => {
    const newId = addTopic(moduleId);
    setNewlyAddedId(newId);
    // Ensure the parent module is expanded
    setCollapsedModules(prev => {
      const next = new Set(prev);
      next.delete(moduleId);
      return next;
    });
    // Ensure the new topic is expanded
    setCollapsedTopics(prev => {
      const next = new Set(prev);
      next.delete(newId);
      return next;
    });
  };

  const handleAddLesson = (moduleId, topicId) => {
    const newId = addLesson(moduleId, topicId);
    setNewlyAddedId(newId);
    // Ensure the parent topic and module are expanded
    setCollapsedModules(prev => {
      const next = new Set(prev);
      next.delete(moduleId);
      return next;
    });
    setCollapsedTopics(prev => {
      const next = new Set(prev);
      next.delete(topicId);
      return next;
    });
  };

  if (!curriculum.modules || curriculum.modules.length === 0) {
    return (
      <EmptyCurriculumState 
        onAddModule={handleAddModule} 
        onSwitchTab={onSwitchTab} 
      />
    );
  }

  return (
    <div className="curriculum-editor-layout">
      <div className="curriculum-main-content">
        <div className="modules-list">
          {curriculum.modules.map((module, mIdx) => (
            <ModuleItem
              key={module.id}
              module={module}
              moduleIndex={mIdx}
              isExpanded={!collapsedModules.has(module.id)}
              onToggle={() => toggleModule(module.id)}
              collapsedTopics={collapsedTopics}
              onToggleTopic={toggleTopic}
              onUpdateModule={updateModule}
              onDeleteModule={deleteModule}
              onAddTopic={handleAddTopic}
              onUpdateTopic={updateTopic}
              onDeleteTopic={deleteTopic}
              onAddLesson={handleAddLesson}
              onUpdateLesson={updateLesson}
              onDeleteLesson={deleteLesson}
              newlyAddedId={newlyAddedId}
            />
          ))}

          <div className="bottom-actions">
            <button className="btn-add-module-large" onClick={handleAddModule}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Add Module
            </button>
          </div>
        </div>
      </div>

      <SidebarOverview 
        onAddModule={handleAddModule} 
        onSwitchTab={onSwitchTab} 
      />
    </div>
  );
}
