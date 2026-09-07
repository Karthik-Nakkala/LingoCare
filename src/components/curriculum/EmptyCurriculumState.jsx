import React from 'react';
import { Plus, Sparkles } from 'lucide-react';
import './EmptyCurriculumState.css';

export function EmptyCurriculumState({ onAddModule, onSwitchTab }) {
  return (
    <div className="empty-state-container">
      <div className="empty-state-illustration">
        <div className="illustration-graphic">
          <div className="doc-skeleton">
            <div className="skeleton-line line-1"></div>
            <div className="skeleton-line line-2"></div>
            <div className="skeleton-line line-3"></div>
            <div className="skeleton-line line-4"></div>
          </div>
          <div className="node-skeleton node-module">Module</div>
          <div className="node-skeleton node-topic">Topic</div>
          <div className="node-skeleton node-lesson">Lesson</div>
          <div className="plus-badge">
            <Plus size={20} />
          </div>
        </div>
      </div>

      <h2 className="empty-state-title">Start building your curriculum</h2>
      <p className="empty-state-subtitle">
        Create modules, add topics and define lessons. You can also upload a PDF and let AI generate the structure for you.
      </p>

      <div className="empty-state-actions">
        <button className="btn-empty-primary" onClick={onAddModule}>
          <div className="btn-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </div>
          <div className="btn-content">
            <span className="btn-title">Create Manually <span className="arrow">&gt;</span></span>
            <span className="btn-desc">Build your curriculum step by step with full control.</span>
          </div>
        </button>

        <button className="btn-empty-secondary" onClick={() => onSwitchTab('ai')}>
          <div className="btn-icon">
            <Sparkles size={20} />
          </div>
          <div className="btn-content">
            <span className="btn-title">Upload PDF with AI <span className="arrow">&gt;</span></span>
            <span className="btn-desc">Let AI read your document and create the structure automatically.</span>
          </div>
        </button>
      </div>

      <div className="bottom-tip">
        <LightbulbIcon />
        <span><strong>Tip:</strong> You can always switch between manual creation and AI upload later. Both methods create the same editable structure.</span>
      </div>
    </div>
  );
}

function LightbulbIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: '#94A3B8'}}>
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
    </svg>
  );
}
