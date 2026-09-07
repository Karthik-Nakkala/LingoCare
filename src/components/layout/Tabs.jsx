import React from 'react';
import { Sparkles } from 'lucide-react';
import './Tabs.css';

export function Tabs({ activeTab, setActiveTab }) {
  return (
    <div className="tabs-container">
      <button 
        className={`tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
        onClick={() => setActiveTab('manual')}
      >
        Manual Creation
      </button>
      <button 
        className={`tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
        onClick={() => setActiveTab('ai')}
      >
        <Sparkles size={16} className="tab-icon" />
        AI PDF Upload
      </button>
    </div>
  );
}
