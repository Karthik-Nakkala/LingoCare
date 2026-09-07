import React from 'react';
import { CurriculumProvider } from './state/CurriculumContext';
import { CurriculumPage } from './pages/CurriculumPage';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <CurriculumProvider>
        <CurriculumPage />
      </CurriculumProvider>
    </ErrorBoundary>
  );
}

export default App;

