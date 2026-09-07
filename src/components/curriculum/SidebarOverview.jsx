import React from 'react';
import { Lightbulb, Book, LayoutList, Layers, Clock, Plus, Sparkles, RefreshCw } from 'lucide-react';
import { useCurriculum } from '../../state/CurriculumContext';
import { calculateCurriculumStats } from '../../utils/stats';
import './SidebarOverview.css';

export function SidebarOverview({ onAddModule, onSwitchTab }) {
  const { curriculum, resetToEmpty, resetToSample } = useCurriculum();
  const stats = calculateCurriculumStats(curriculum);

  return (
    <aside className="sidebar-overview">
      {/* Quick Tips Card */}
      <div className="sidebar-card tips-card">
        <div className="card-header">
          <Lightbulb size={18} className="icon-orange" />
          <h3>Quick Tips</h3>
        </div>
        <ul className="tips-list">
          <li>You can add modules, topics and lessons at any level.</li>
          <li>Click on any title or description to edit inline.</li>
          <li>Numbering updates automatically on addition/deletion.</li>
        </ul>
      </div>

      {/* Curriculum Overview Card */}
      <div className="sidebar-card overview-card">
        <div className="card-header">
          <h3>Curriculum Overview</h3>
        </div>
        <p className="card-subtitle">A quick snapshot of your curriculum structure.</p>
        
        <div className="overview-stats">
          <div className="stat-box">
            <div className="stat-icon-wrapper orange">
              <Book size={18} />
            </div>
            <div className="stat-info">
              <span className="stat-number">{stats.modules}</span>
              <span className="stat-label">Modules</span>
            </div>
          </div>

          <div className="stat-box">
            <div className="stat-icon-wrapper green">
              <LayoutList size={18} />
            </div>
            <div className="stat-info">
              <span className="stat-number">{stats.topics}</span>
              <span className="stat-label">Topics</span>
            </div>
          </div>

          <div className="stat-box">
            <div className="stat-icon-wrapper purple">
              <Layers size={18} />
            </div>
            <div className="stat-info">
              <span className="stat-number">{stats.lessons}</span>
              <span className="stat-label">Lessons</span>
            </div>
          </div>

          <div className="stat-box">
            <div className="stat-icon-wrapper blue">
              <Clock size={18} />
            </div>
            <div className="stat-info">
              <span className="stat-number">{stats.durationHours} hrs</span>
              <span className="stat-label">Estimated duration</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Card */}
      <div className="sidebar-card actions-card">
        <div className="card-header">
          <ZapIcon />
          <h3>Quick Actions</h3>
        </div>
        
        <div className="action-buttons-group">
          <button className="btn-primary-action" onClick={onAddModule}>
            <Plus size={16} />
            Add Module
          </button>
          
          <button className="btn-secondary-action" onClick={() => onSwitchTab('ai')}>
            <Sparkles size={16} className="icon-orange" />
            Upload PDF with AI
          </button>
        </div>
      </div>

      {/* State Reset Helper for Evaluator */}
      <div className="sidebar-card testing-tools">
        <span className="testing-label">Testing Controls:</span>
        <div className="testing-btns">
          <button className="btn-test-link" onClick={resetToSample} title="Load sample nursing data">
            <RefreshCw size={12} /> Reset to Sample Data
          </button>
          <button className="btn-test-link danger" onClick={resetToEmpty} title="Clear all modules">
            Clear to Empty State
          </button>
        </div>
      </div>
    </aside>
  );
}

function ZapIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EC8601" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
