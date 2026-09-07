import React from 'react';
import { Book, Layers, LayoutList, Clock } from 'lucide-react';
import { useCurriculum } from '../../state/CurriculumContext';
import { calculateCurriculumStats } from '../../utils/stats';
import './StatsRow.css';

export function StatsRow({ empty = false }) {
  const { curriculum } = useCurriculum();
  const stats = empty ? { modules: 0, topics: 0, lessons: 0, durationHours: 0 } : calculateCurriculumStats(curriculum);

  return (
    <div className="stats-row">
      <div className="stat-item">
        <Book size={18} className="stat-icon" />
        <span>{stats.modules} Modules</span>
      </div>
      <div className="stat-item">
        <LayoutList size={18} className="stat-icon" />
        <span>{stats.topics} Topics</span>
      </div>
      <div className="stat-item">
        <Layers size={18} className="stat-icon" />
        <span>{stats.lessons} Lessons</span>
      </div>
      <div className="stat-item">
        <Clock size={18} className="stat-icon" />
        <span>Estimated duration: {stats.durationHours} hours (UE)</span>
      </div>
    </div>
  );
}
