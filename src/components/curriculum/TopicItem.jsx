import React, { useState } from 'react';
import { ChevronDown, ChevronRight, FileText, Plus, Trash2, Edit2 } from 'lucide-react';
import { InlineEditableText } from './InlineEditableText';
import { LessonItem } from './LessonItem';
import './TopicItem.css';

export function TopicItem({
  topic,
  moduleId,
  topicIndex,
  moduleIndex,
  isExpanded,
  onToggle,
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

  const topicNumberStr = `Topic ${topicIndex + 1}`;
  const lessonsCount = topic.lessons?.length || 0;

  const handleAddLesson = (e) => {
    e.stopPropagation();
    onAddLesson(moduleId, topic.id);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDeleteTopic(moduleId, topic.id);
  };

  return (
    <div className={`topic-item-container ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="topic-header-row">
        <button
          className="btn-toggle"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          aria-label={isExpanded ? "Collapse Topic" : "Expand Topic"}
        >
          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>

        <div className="topic-icon-badge">
          <FileText size={16} />
        </div>

        <div className="topic-main-info">
          <div className="topic-title-wrapper">
            <InlineEditableText
              value={topic.title}
              onSave={(newTitle) => onUpdateTopic(moduleId, topic.id, { title: newTitle })}
              placeholder="Enter topic title..."
              as="h3"
              className="topic-title-text"
              isEditingInitially={newlyAddedId === topic.id}
            />
          </div>
          <div className="topic-description-wrapper">
            <InlineEditableText
              value={topic.description}
              onSave={(newDesc) => onUpdateTopic(moduleId, topic.id, { description: newDesc })}
              placeholder="Add topic description..."
              multiline={true}
              className="topic-description-text"
            />
          </div>
        </div>

        <div className="topic-actions">
          <span className="badge-count">{lessonsCount} {lessonsCount === 1 ? 'lesson' : 'lessons'}</span>
          {topic.source && <span className={`provenance-badge ${topic.source}`}>{topic.source === 'ai-inferred' ? 'AI Inferred' : topic.source === 'user-edited' ? 'Edited' : 'From PDF'}</span>}
          {reviewFlags.length > 0 && <span className="review-flag-badge">Needs review</span>}

          {showConfirmDelete ? (
            <div className="delete-confirm-inline" onClick={(e) => e.stopPropagation()}>
              <span className="confirm-text">Delete?</span>
              <button className="btn-confirm-yes" onClick={handleDelete}>Yes</button>
              <button className="btn-confirm-no" onClick={() => setShowConfirmDelete(false)}>No</button>
            </div>
          ) : (
            <button
              className="btn-icon-danger"
              onClick={(e) => {
                e.stopPropagation();
                if (lessonsCount > 0) {
                  setShowConfirmDelete(true);
                } else {
                  handleDelete(e);
                }
              }}
              title="Delete Topic"
              aria-label="Delete Topic"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="topic-content-body">
          <div className="lessons-list">
            {topic.lessons?.map((lesson, idx) => {
              const lessonNumStr = `${moduleIndex + 1}.${topicIndex + 1}.${idx + 1}`;
              return (
                <LessonItem
                  key={lesson.id}
                  lesson={lesson}
                  moduleId={moduleId}
                  topicId={topic.id}
                  lessonNumberStr={lessonNumStr}
                  onUpdate={onUpdateLesson}
                  onDelete={onDeleteLesson}
                  isNewlyAdded={newlyAddedId === lesson.id}
                  reviewFlags={getReviewFlags(lesson.id)}
                />
              );
            })}

            <button className="btn-add-lesson" onClick={handleAddLesson}>
              <Plus size={15} />
              Add Lesson
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
