import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Tabs } from '../components/layout/Tabs';
import { StatsRow } from '../components/curriculum/StatsRow';
import { CurriculumEditor } from '../components/curriculum/CurriculumEditor';
import { EmptyCurriculumState } from '../components/curriculum/EmptyCurriculumState';
import { useCurriculum } from '../state/CurriculumContext';
import './CurriculumPage.css';
import { AiPdfUpload } from '../components/curriculum/AiPdfUpload';
import { InlineEditableText } from '../components/curriculum/InlineEditableText';

export function CurriculumPage() {
  const [activeTab, setActiveTab] = useState('manual');
  const [showStartScreen, setShowStartScreen] = useState(true);
  const { curriculum, updateCurriculum, replaceCurriculum, addModule } = useCurriculum();
  const hasModules = curriculum.modules?.length > 0;
  const handleBack = () => {
    // This is an in-app workflow, not a separate browser route. Returning to
    // the start screen keeps any in-progress curriculum safely in local state.
    setActiveTab('manual');
    setShowStartScreen(true);
  };
  const startManual = () => {
    if (!hasModules) addModule();
    setActiveTab('manual');
    setShowStartScreen(false);
  };
  const selectTab = (tab) => {
    setActiveTab(tab);
    setShowStartScreen(tab === 'manual' && !hasModules);
  };

  return (
    <div className="app-container">
      <Header onUpload={() => { setActiveTab('ai'); setShowStartScreen(false); }} />
      
      <main className="main-content">
        <div className="page-header">
          <div className="title-section">
            <button className="btn-back" onClick={handleBack} aria-label="Go back">
              <ArrowLeft size={20} />
            </button>
            <div className="title-content">
              {hasModules && !showStartScreen ? <InlineEditableText value={curriculum.title} onSave={(title) => updateCurriculum(title, undefined)} as="h1" className="page-title" /> : <h1 className="page-title">Curriculum</h1>}
              {hasModules && !showStartScreen ? <InlineEditableText value={curriculum.description} onSave={(description) => updateCurriculum(undefined, description)} multiline as="p" className="page-subtitle" /> : <p className="page-subtitle">Create and manage your course curriculum. Build modules, topics and lessons or generate the structure using an AI-powered PDF upload.</p>}
            </div>
          </div>
          
          <StatsRow />
          <Tabs activeTab={activeTab} setActiveTab={selectTab} />
        </div>

        <div className="workspace">
          {activeTab === 'manual' && showStartScreen && (
            <EmptyCurriculumState onAddModule={startManual} onSwitchTab={selectTab} />
          )}
          {activeTab === 'manual' && !showStartScreen && (
            <CurriculumEditor onSwitchTab={selectTab} />
          )}
          
          {activeTab === 'ai' && (
            <AiPdfUpload onAcceptGeneratedCurriculum={(generatedCurriculum) => { replaceCurriculum(generatedCurriculum); setActiveTab('manual'); setShowStartScreen(false); }} />
          )}
        </div>
      </main>
    </div>
  );
}
