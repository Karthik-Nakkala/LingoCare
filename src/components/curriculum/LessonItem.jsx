import React, { useState } from 'react';
import { Trash2, Edit2, FileText } from 'lucide-react';
import { InlineEditableText } from './InlineEditableText';
import './LessonItem.css';

export function LessonItem({
  lesson,
  moduleId,
  topicId,
  lessonNumberStr,
  onUpdate,
  onDelete,
  isNewlyAdded,
  reviewFlags = []
}) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(moduleId, topicId, lesson.id);
  };

  return (
    <div className="lesson-item-row">
      <div className="lesson-left-accent"></div>
      
      <div className="lesson-body">
        <div className="lesson-header">
          <div className="lesson-title-area">
            <span className="lesson-number">{lessonNumberStr}</span>
            <div className="lesson-title-wrapper">
              <InlineEditableText
                value={lesson.title}
                onSave={(newTitle) => onUpdate(moduleId, topicId, lesson.id, { title: newTitle })}
                placeholder="Enter lesson title..."
                as="h4"
                className="lesson-title-text"
                isEditingInitially={isNewlyAdded}
              />
            </div>
          </div>

          <div className="lesson-actions">
            <span className="lesson-badge">Lesson</span>
            {lesson.source && <span className={`provenance-badge ${lesson.source}`}>{lesson.source === 'ai-inferred' ? 'AI Inferred' : lesson.source === 'user-edited' ? 'Edited' : 'From PDF'}</span>}
            {reviewFlags.length > 0 && <span className="review-flag-badge">Review</span>}

            {showConfirmDelete ? (
              <div className="delete-confirm-inline">
                <span className="confirm-text">Delete?</span>
                <button className="btn-confirm-yes" onClick={handleDelete}>Yes</button>
                <button className="btn-confirm-no" onClick={() => setShowConfirmDelete(false)}>No</button>
              </div>
            ) : (
              <button
                className="btn-icon-danger"
                onClick={() => setShowConfirmDelete(true)}
                title="Delete Lesson"
                aria-label="Delete Lesson"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>

        <div className="lesson-description">
          <InlineEditableText
            value={lesson.description}
            onSave={(newDesc) => onUpdate(moduleId, topicId, lesson.id, { description: newDesc })}
            placeholder="Add lesson description..."
            multiline={true}
            className="lesson-description-text"
          />
        </div>
      </div>
    </div>
  );
}
