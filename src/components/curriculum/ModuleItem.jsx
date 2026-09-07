import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Folder, Plus, Trash2 } from 'lucide-react';
import { InlineEditableText } from './InlineEditableText';
import { TopicItem } from './TopicItem';
import './ModuleItem.css';

export function ModuleItem({
  module,
  moduleIndex,
  isExpanded,
  onToggle,
  collapsedTopics,
  onToggleTopic,
  onUpdateModule,
  onDeleteModule,
  onAddTopic,
  onUpdateTopic,
  onDeleteTopic,
  onAddLesson,
  onUpdateLesson,
  onDeleteLesson,
  newlyAddedId,
  reviewFlags = [],
  getReviewFlags = () => []
}) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Calculate nested total lessons
  const totalTopics = module.topics?.length || 0;
  const totalLessons = module.topics?.reduce((acc, t) => acc + (t.lessons?.length || 0), 0) || 0;

  const handleAddTopic = (e) => {
    e.stopPropagation();
    onAddTopic(module.id);
  };

  const handleDeleteModule = (e) => {
    e.stopPropagation();
    onDeleteModule(module.id);
  };

  return (
    <div className={`module-card ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="module-header-row">
        <button
          className="btn-toggle-module"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          aria-label={isExpanded ? "Collapse Module" : "Expand Module"}
        >
          {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        </button>

        <div className="module-icon-container">
          <Folder size={18} />
        </div>

        <div className="module-main-info">
          <div className="module-title-wrapper">
            <InlineEditableText
              value={module.title}
              onSave={(newTitle) => onUpdateModule(module.id, { title: newTitle })}
              placeholder="Enter module title..."
              as="h2"
              className="module-title-text"
              isEditingInitially={newlyAddedId === module.id}
            />
          </div>
          <div className="module-description-wrapper">
            <InlineEditableText
              value={module.description}
              onSave={(newDesc) => onUpdateModule(module.id, { description: newDesc })}
              placeholder="Add module description..."
              multiline={true}
              className="module-description-text"
            />
          </div>
        </div>

        <div className="module-actions">
          <span className="module-stats-badge">
            {totalTopics} {totalTopics === 1 ? 'topic' : 'topics'} • {totalLessons} {totalLessons === 1 ? 'lesson' : 'lessons'}
          </span>
          {module.source && <span className={`provenance-badge ${module.source}`}>{module.source === 'ai-inferred' ? 'AI Inferred' : module.source === 'user-edited' ? 'Edited' : 'From PDF'}</span>}
          {reviewFlags.length > 0 && <span className="review-flag-badge">Needs review</span>}

          {showConfirmDelete ? (
            <div className="delete-confirm-inline" onClick={(e) => e.stopPropagation()}>
              <span className="confirm-text">Delete Module?</span>
              <button className="btn-confirm-yes" onClick={handleDeleteModule}>Yes</button>
              <button className="btn-confirm-no" onClick={() => setShowConfirmDelete(false)}>No</button>
            </div>
          ) : (
            <button
              className="btn-icon-danger"
              onClick={(e) => {
                e.stopPropagation();
                if (totalTopics > 0) {
                  setShowConfirmDelete(true);
                } else {
                  handleDeleteModule(e);
                }
              }}
              title="Delete Module"
              aria-label="Delete Module"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="module-body-content">
          <div className="topics-list">
            {module.topics?.map((topic, tIdx) => (
              <TopicItem
                key={topic.id}
                topic={topic}
                moduleId={module.id}
                topicIndex={tIdx}
                moduleIndex={moduleIndex}
                isExpanded={!collapsedTopics.has(topic.id)}
                onToggle={() => onToggleTopic(topic.id)}
                onUpdateTopic={onUpdateTopic}
                onDeleteTopic={onDeleteTopic}
                onAddLesson={onAddLesson}
                onUpdateLesson={onUpdateLesson}
                onDeleteLesson={onDeleteLesson}
                newlyAddedId={newlyAddedId}
                reviewFlags={getReviewFlags(topic.id)}
                getReviewFlags={getReviewFlags}
              />
            ))}

            <button className="btn-add-topic" onClick={handleAddTopic}>
              <Plus size={16} />
              Add Topic
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
