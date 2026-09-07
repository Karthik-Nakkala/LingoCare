import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Check, FileText, Lightbulb, RefreshCw, Search, Upload, X } from 'lucide-react';
import { extractCurriculumPdf } from '../../services/curriculumPdfService';
import { generateCurriculumFromDocument } from '../../services/curriculumGenerationService';
import { ModuleItem } from './ModuleItem';
import { useCurriculum } from '../../state/CurriculumContext';
import './AiPdfUpload.css';

const steps = [
  ['Upload', 'Add your PDF file'],
  ['Processing', 'Reading and structuring'],
  ['Review', 'Check and make changes'],
  ['Complete', 'Ready to apply'],
];

const createId = (prefix) => `${prefix}-${crypto.randomUUID()}`;

const countItems = (curriculum) => {
  let modules = 0;
  let topics = 0;
  let lessons = 0;

  (curriculum.modules || []).forEach((module) => {
    modules += 1;
    (module.topics || []).forEach((topic) => {
      topics += 1;
      lessons += (topic.lessons || []).length;
    });
  });

  return { modules, topics, lessons };
};

export function AiPdfUpload({ onAcceptGeneratedCurriculum }) {
  const [file, setFile] = useState(null);
  const [document, setDocument] = useState(null);
  const [generated, setGenerated] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | fileSelected | extracting | ready | generating | review | error
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');

  const fileInputRef = useRef(null);
  const isMountedRef = useRef(true);
  const { setGeneratedDraft, clearGeneratedDraft } = useCurriculum();

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const reset = () => {
    setFile(null);
    setDocument(null);
    setGenerated(null);
    clearGeneratedDraft();
    setStatus('idle');
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleChooseFile = (selectedFile) => {
    if (!selectedFile) return;
    if (selectedFile.type !== 'application/pdf') {
      setError('Please upload a valid PDF document.');
      return;
    }
    setFile(selectedFile);
    setDocument(null);
    setGenerated(null);
    setStatus('fileSelected');
    setError('');
  };

  const handleExtract = async () => {
    if (!file || status === 'extracting' || status === 'generating') return;
    setStatus('extracting');
    setError('');

    const result = await extractCurriculumPdf(file, {
      onProgress: (p) => {
        if (isMountedRef.current) setProgress(p);
      },
    });

    if (!isMountedRef.current) return;

    if (!result.success) {
      setStatus('error');
      setError(result.userMessage || 'Failed to read PDF document.');
      return;
    }

    setDocument(result.document);
    setStatus('ready');
  };

  const handleGenerate = async () => {
    if (!document || status === 'generating') return;
    setStatus('generating');
    setError('');

    try {
      const result = await generateCurriculumFromDocument(document);
      if (!isMountedRef.current) return;

      setGenerated(result);
      setGeneratedDraft(result);
      setStatus('review');
    } catch (err) {
      if (!isMountedRef.current) return;
      setStatus('error');
      setError(err.message || "AI couldn't generate a curriculum from this document.");
    }
  };

  if (status === 'extracting' || status === 'generating') {
    return <ProcessingScreen generating={status === 'generating'} progress={progress} file={file} />;
  }

  if (status === 'review' && generated) {
    return (
      <GeneratedReview
        generated={generated}
        onAccept={(draft) => {
          clearGeneratedDraft();
          onAcceptGeneratedCurriculum(draft);
        }}
        onRetry={handleGenerate}
        onUpload={reset}
      />
    );
  }

  return (
    <div className="ai-upload-layout">
      <section className="ai-pdf-upload">
        <h2 className="ai-page-title">Upload Curriculum</h2>
        <p className="ai-page-subtitle">
          Upload a PDF to create a structured, editable curriculum. Your existing curriculum remains safe until you choose to apply the draft.
        </p>

        <Steps active={status === 'ready' ? 1 : 0} />

        <div className="upload-panel">
          <div
            className={`upload-box ${file ? 'has-file' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDrop={(e) => {
              e.preventDefault();
              handleChooseFile(e.dataTransfer.files?.[0]);
            }}
            onDragOver={(e) => e.preventDefault()}
          >
            {file ? (
              <div className="file-preview">
                <FileText className="file-type-icon" />
                <div>
                  <b>{file.name}</b>
                  <span>{Math.max(0.1, Math.round((file.size / 1024 / 1024) * 10) / 10)} MB · Ready to extract</span>
                </div>
                <X
                  className="remove-icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    reset();
                  }}
                />
              </div>
            ) : (
              <>
                <div className="pdf-art">
                  <FileText size={48} />
                  <span>PDF</span>
                </div>
                <h3>Drop your PDF here</h3>
                <p>or click to browse</p>
                <small>Supports text-based PDF files up to 20MB</small>
              </>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              hidden
              onChange={(e) => handleChooseFile(e.target.files?.[0])}
            />
          </div>

          {error && (
            <div className="upload-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {!file ? (
            <button className="choose-file-btn" onClick={() => fileInputRef.current?.click()}>
              <Upload size={16} /> Choose File
            </button>
          ) : (
            <button
              className="proceed-btn"
              disabled={status === 'extracting' || status === 'generating'}
              onClick={status === 'error' ? (document ? handleGenerate : handleExtract) : handleExtract}
            >
              {status === 'error' ? 'Try Again' : 'Extract PDF Content'}
            </button>
          )}
        </div>

        {document && (
          <div className="document-ready">
            <Check size={17} />
            <span>
              <b>PDF content is ready.</b> {document.pageCount} pages were read successfully.
            </span>
            <button onClick={handleGenerate} disabled={status === 'generating'}>
              Generate curriculum with AI
            </button>
          </div>
        )}

        <div className="upload-note">
          <Lightbulb size={19} />
          <div>
            <b>You remain in control</b>
            <span>AI-generated and inferred content is clearly labeled for your review.</span>
          </div>
        </div>
      </section>

      <UploadHelp />
    </div>
  );
}

function Steps({ active }) {
  return (
    <div className="upload-steps">
      {steps.map(([title, sub], i) => (
        <React.Fragment key={title}>
          <span className={i === active ? 'active' : i < active ? 'complete' : ''}>
            <em>{i < active ? <Check size={15} /> : i + 1}</em>
            <b>{title}</b>
            <small>{sub}</small>
          </span>
          {i < 3 && <i />}
        </React.Fragment>
      ))}
    </div>
  );
}

function ProcessingScreen({ generating, progress, file }) {
  const copy = generating
    ? 'Understanding the document structure…'
    : progress
    ? `Reading page ${progress.currentPage} of ${progress.pageCount}`
    : 'Preparing document…';

  return (
    <div className="processing-screen">
      <h2 className="ai-page-title">{generating ? 'Analyzing your curriculum…' : 'Reading your curriculum'}</h2>
      <p className="ai-page-subtitle">
        {generating
          ? 'Identifying modules, topics, lessons, and any missing structure.'
          : 'Extracting readable text from your PDF. Your current curriculum is unchanged.'}
      </p>

      <Steps active={generating ? 2 : 1} />

      <div className="processing-grid">
        <section className="processing-card">
          <div className="processing-file">
            <FileText />
            <div>
              <b>{file?.name}</b>
              <span>{copy}</span>
            </div>
            <Check />
          </div>

          <div className="processing-orb">
            <FileText size={55} />
            <span>{generating ? 'AI' : 'PDF'}</span>
          </div>

          <h3>{copy}</h3>
          <div className="indeterminate-bar">
            <i />
          </div>
        </section>

        <aside className="processing-help">
          <h3>What’s happening</h3>
          <p>
            <b>Safe source handling</b>
            <span>Your source and existing curriculum remain separate.</span>
          </p>
          <p>
            <b>Trustworthy structure</b>
            <span>Inferred content will be clearly labeled for review.</span>
          </p>
        </aside>
      </div>
    </div>
  );
}

function GeneratedReview({ generated, onAccept, onRetry, onUpload }) {
  const [draft, setDraft] = useState(generated.curriculum);
  const [filter, setFilter] = useState('all'); // all | inferred | pdf | review
  const [query, setQuery] = useState('');
  const [collapsedModules, setCollapsedModules] = useState(new Set());
  const [collapsedTopics, setCollapsedTopics] = useState(new Set());
  const [ignoredFlags, setIgnoredFlags] = useState(new Set());

  const { metadata } = generated;

  const getItemFlags = (itemId) => metadata.reviewFlags?.filter((flag) => flag.itemId === itemId) || [];

  const matchesFilter = (item) => {
    if (filter === 'inferred' && item.source !== 'ai-inferred') return false;
    if (filter === 'pdf' && item.source !== 'pdf') return false;
    if (filter === 'review' && !getItemFlags(item.id).length) return false;

    if (!query) return true;
    const q = query.toLowerCase();
    return (item.title || '').toLowerCase().includes(q) || (item.description || '').toLowerCase().includes(q);
  };

  const visibleModules = useMemo(() => {
    return draft.modules
      .map((module) => {
        const topics = module.topics
          .map((topic) => ({
            ...topic,
            lessons: topic.lessons.filter(matchesFilter),
          }))
          .filter((topic) => matchesFilter(topic) || topic.lessons.length);

        return { ...module, topics };
      })
      .filter((module) => matchesFilter(module) || module.topics.length);
  }, [draft, filter, query]);

  const updateModule = (id, changes) =>
    setDraft((p) => ({
      ...p,
      modules: p.modules.map((x) => (x.id === id ? { ...x, ...changes, source: 'user-edited' } : x)),
    }));

  const updateTopic = (mid, id, changes) =>
    setDraft((p) => ({
      ...p,
      modules: p.modules.map((m) =>
        m.id !== mid
          ? m
          : {
              ...m,
              topics: m.topics.map((x) => (x.id === id ? { ...x, ...changes, source: 'user-edited' } : x)),
            }
      ),
    }));

  const updateLesson = (mid, tid, id, changes) =>
    setDraft((p) => ({
      ...p,
      modules: p.modules.map((m) =>
        m.id !== mid
          ? m
          : {
              ...m,
              topics: m.topics.map((t) =>
                t.id !== tid
                  ? t
                  : {
                      ...t,
                      lessons: t.lessons.map((x) => (x.id === id ? { ...x, ...changes, source: 'user-edited' } : x)),
                    }
              ),
            }
      ),
    }));

  const addModule = () => {
    const item = { id: createId('module'), title: 'New Module', description: '', source: 'user-edited', topics: [] };
    setDraft((p) => ({ ...p, modules: [...p.modules, item] }));
    return item.id;
  };

  const addTopic = (mid) => {
    const item = { id: createId('topic'), title: 'New Topic', description: '', source: 'user-edited', lessons: [] };
    setDraft((p) => ({
      ...p,
      modules: p.modules.map((m) => (m.id === mid ? { ...m, topics: [...m.topics, item] } : m)),
    }));
    return item.id;
  };

  const addLesson = (mid, tid) => {
    const item = { id: createId('lesson'), title: 'New Lesson', description: '', source: 'user-edited' };
    setDraft((p) => ({
      ...p,
      modules: p.modules.map((m) =>
        m.id !== mid
          ? m
          : {
              ...m,
              topics: m.topics.map((t) => (t.id === tid ? { ...t, lessons: [...t.lessons, item] } : t)),
            }
      ),
    }));
    return item.id;
  };

  const stats = countItems(draft);
  const inferredCount = draft.modules.flatMap((m) => [
    m,
    ...m.topics,
    ...m.topics.flatMap((t) => t.lessons),
  ]).filter((x) => x.source === 'ai-inferred').length;

  const activeFlags = metadata.reviewFlags?.filter((x) => !ignoredFlags.has(x.id)) || [];

  return (
    <div className="generated-review">
      <div className="review-title-row">
        <div>
          <h2 className="ai-page-title">Review Your AI-Generated Curriculum</h2>
          <p className="ai-page-subtitle">
            We've created a structured curriculum from your PDF, but some sections need your attention. Review the flagged content, make any edits, and continue when you're ready.
          </p>
        </div>
        <span className="generation-complete">
          <Check size={14} /> AI Generation Complete
        </span>
      </div>

      <div className="source-summary">
        <div>
          <FileText />
          <section>
            <b>Source File</b>
            <span>
              {metadata.sourceFileName} · {generated.document?.pageCount || 'PDF'} pages
            </span>
          </section>
        </div>
        <div>
          <Lightbulb />
          <section>
            <b>AI Processing Summary</b>
            <span>
              Found {stats.modules} modules, {stats.topics} topics, {stats.lessons} lessons · {inferredCount} inferred
            </span>
          </section>
        </div>
      </div>

      {metadata.reviewRequired && (
        <div className="review-warning">
          <AlertCircle size={20} />
          <div>
            <b>Some sections were unclear or missing in your PDF</b>
            <span>AI has inferred the missing content. Please review the flagged sections below to make sure everything is accurate.</span>
          </div>
        </div>
      )}

      <div className="review-toolbar">
        <label>
          <Search size={14} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search modules, topics or lessons…"
          />
        </label>
        {[
          ['all', `All (${stats.modules})`],
          ['pdf', 'Extracted from PDF'],
          ['inferred', `Inferred (${inferredCount})`],
          ['review', `Needs Review (${activeFlags.length})`],
        ].map(([key, label]) => (
          <button key={key} className={filter === key ? 'selected' : ''} onClick={() => setFilter(key)}>
            {label}
          </button>
        ))}
      </div>

      <div className="review-workspace">
        <section className="review-editor">
          {visibleModules.map((module, index) => (
            <ModuleItem
              key={module.id}
              module={module}
              moduleIndex={index}
              isExpanded={!collapsedModules.has(module.id)}
              onToggle={() =>
                setCollapsedModules((p) => {
                  const n = new Set(p);
                  n.has(module.id) ? n.delete(module.id) : n.add(module.id);
                  return n;
                })
              }
              collapsedTopics={collapsedTopics}
              onToggleTopic={(topicId) =>
                setCollapsedTopics((p) => {
                  const n = new Set(p);
                  n.has(topicId) ? n.delete(topicId) : n.add(topicId);
                  return n;
                })
              }
              onUpdateModule={updateModule}
              onDeleteModule={(moduleId) => setDraft((p) => ({ ...p, modules: p.modules.filter((m) => m.id !== moduleId) }))}
              onAddTopic={addTopic}
              onUpdateTopic={updateTopic}
              onDeleteTopic={(mid, topicId) =>
                setDraft((p) => ({
                  ...p,
                  modules: p.modules.map((m) => (m.id !== mid ? m : { ...m, topics: m.topics.filter((t) => t.id !== topicId) })),
                }))
              }
              onAddLesson={addLesson}
              onUpdateLesson={updateLesson}
              onDeleteLesson={(mid, tid, lessonId) =>
                setDraft((p) => ({
                  ...p,
                  modules: p.modules.map((m) =>
                    m.id !== mid
                      ? m
                      : {
                          ...m,
                          topics: m.topics.map((t) =>
                            t.id !== tid ? t : { ...t, lessons: t.lessons.filter((l) => l.id !== lessonId) }
                          ),
                        }
                  ),
                }))
              }
              reviewFlags={getItemFlags(module.id)}
              getReviewFlags={getItemFlags}
            />
          ))}

          {!visibleModules.length && <p className="no-review-results">No draft content matches this filter.</p>}
          <button className="review-add-module" onClick={addModule}>
            + Add Module
          </button>
        </section>

        <aside className="review-sidebar">
          <h3>What Needs Your Attention?</h3>
          {activeFlags.length ? (
            activeFlags.map((flag) => (
              <div className="suggestion" key={flag.id}>
                <b>{flag.type.replace(/-/g, ' ')}</b>
                <span>{flag.message}</span>
                <div className="suggestion-actions">
                  <button onClick={() => setFilter('review')}>Review</button>
                  <button onClick={() => setIgnoredFlags((p) => new Set([...p, flag.id]))}>Ignore</button>
                </div>
              </div>
            ))
          ) : (
            <p className="no-flags-msg">Everything identified by AI is ready for your review.</p>
          )}

          <section className="apply-panel">
            <b>Ready to apply?</b>
            <span>
              {activeFlags.length
                ? `${activeFlags.length} items still need review. You decide when it is ready.`
                : 'The draft is ready to apply.'}
            </span>
            <button className="btn-primary-action" onClick={() => onAccept(draft)}>
              <Check size={15} /> Replace current curriculum
            </button>
          </section>

          <section className="quick-stats">
            <b>Quick Stats</b>
            <span>
              Total Modules <strong>{stats.modules}</strong>
            </span>
            <span>
              Total Topics <strong>{stats.topics}</strong>
            </span>
            <span>
              Total Lessons <strong>{stats.lessons}</strong>
            </span>
            <span>
              AI Inferred <strong>{inferredCount}</strong>
            </span>
          </section>
        </aside>
      </div>

      <div className="review-actions">
        <button className="btn-secondary-action" onClick={onUpload}>
          <Upload size={15} /> Try another PDF
        </button>
        <button className="btn-secondary-action" onClick={onRetry}>
          <RefreshCw size={15} /> Try generation again
        </button>
      </div>

      <p className="review-safety">
        AI assists. You decide. The current curriculum remains unchanged until you explicitly replace it.
      </p>
    </div>
  );
}

function UploadHelp() {
  return (
    <aside className="upload-help">
      <div className="upload-help-title">
        <div>
          <FileText size={28} />
        </div>
        <section>
          <h3>From PDF to a structured curriculum</h3>
          <p>AI creates a clear hierarchy of modules, topics, and lessons that you can edit.</p>
        </section>
      </div>

      <div className="extract-card">
        <h3>What we’ll extract</h3>
        <p>
          <FileText /> <b>Modules</b> <span>Main sections</span>
        </p>
        <p>
          <FileText /> <b>Topics</b> <span>Key learning areas</span>
        </p>
        <p>
          <FileText /> <b>Lessons</b> <span>Detailed learning units</span>
        </p>
      </div>
    </aside>
  );
}
