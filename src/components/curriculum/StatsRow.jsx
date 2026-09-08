import React from 'react';
import { Book, Layers, LayoutList, Clock } from 'lucide-react';
import { useCurriculum } from '../../state/CurriculumContext';
import { calculateCurriculumStats } from '../../utils/stats';
import './StatsRow.css';

export function StatsRow({ empty = false, curriculum: customCurriculum }) {
  const { curriculum: contextCurriculum, generatedCurriculumDraft } = useCurriculum();

  const targetCurriculum =
    customCurriculum ||
    (generatedCurriculumDraft?.curriculum || generatedCurriculumDraft) ||
    contextCurriculum;

  const actualStats = calculateCurriculumStats(targetCurriculum);

  const stats =
    empty && actualStats.modules === 0
      ? { modules: 0, topics: 0, lessons: 0, durationHours: 0 }
      : actualStats;

  return (
    <div className="stats-row">
      <div className="stat-item">
        <Book size={18} className="stat-icon" />
        <span>{stats.modules} {stats.modules === 1 ? 'Module' : 'Modules'}</span>
      </div>
      <div className="stat-item">
        <LayoutList size={18} className="stat-icon" />
        <span>{stats.topics} {stats.topics === 1 ? 'Topic' : 'Topics'}</span>
      </div>
      <div className="stat-item">
        <Layers size={18} className="stat-icon" />
        <span>{stats.lessons} {stats.lessons === 1 ? 'Lesson' : 'Lessons'}</span>
      </div>
      <div className="stat-item">
        <Clock size={18} className="stat-icon" />
        <span>Estimated duration: {stats.durationHours} {stats.durationHours === 1 ? 'hour' : 'hours'} (UE)</span>
      </div>
    </div>
  );
}
