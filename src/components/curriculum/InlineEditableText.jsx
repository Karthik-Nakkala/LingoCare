import React, { useState, useEffect, useRef } from 'react';
import './InlineEditableText.css';

export function InlineEditableText({
  value = '',
  onSave,
  placeholder = 'Click to edit...',
  multiline = false,
  className = '',
  editingClassName = '',
  as: Component = 'div',
  isEditingInitially = false,
  onEditingChange
}) {
  const [isEditing, setIsEditing] = useState(isEditingInitially);
  const [text, setText] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => {
    setText(value);
  }, [value]);

  useEffect(() => {
    if (isEditingInitially) {
      setIsEditing(true);
    }
  }, [isEditingInitially]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current.select) {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  const handleStartEditing = (e) => {
    e.stopPropagation();
    setIsEditing(true);
    if (onEditingChange) onEditingChange(true);
  };

  const handleCommit = () => {
    setIsEditing(false);
    if (onEditingChange) onEditingChange(false);
    if (text.trim() !== value) {
      onSave(text.trim());
    }
  };

  const handleCancel = () => {
    setText(value);
    setIsEditing(false);
    if (onEditingChange) onEditingChange(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (!multiline || e.ctrlKey || e.metaKey) {
        e.preventDefault();
        handleCommit();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (isEditing) {
    return multiline ? (
      <textarea
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleCommit}
        onKeyDown={handleKeyDown}
        className={`inline-edit-textarea ${editingClassName}`}
        rows={2}
        onClick={(e) => e.stopPropagation()}
      />
    ) : (
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleCommit}
        onKeyDown={handleKeyDown}
        className={`inline-edit-input ${editingClassName}`}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  const isEmpty = !value || value.trim() === '';

  return (
    <Component
      className={`inline-editable-text ${isEmpty ? 'placeholder' : ''} ${className}`}
      onClick={handleStartEditing}
      title="Click to edit inline"
      tabIndex={0}
      onFocus={handleStartEditing}
    >
      {isEmpty ? placeholder : value}
    </Component>
  );
}
