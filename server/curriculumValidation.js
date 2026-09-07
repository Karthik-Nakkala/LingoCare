const GENERATED_SOURCES = new Set(['pdf', 'ai-inferred', 'user-edited']);
const normalizeKey = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
const cleanText = (value) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '');

function issue(path, message) {
  return { path, message };
}

/**
 * Validates canonical curriculum structure after normalization.
 * Requires non-empty curriculum title and non-empty module titles.
 */
export function validateCurriculumOutput(curriculum) {
  const issues = [];
  if (!curriculum || typeof curriculum !== 'object') {
    return { valid: false, issues: [issue('curriculum', 'A curriculum object is required.')] };
  }
  if (!cleanText(curriculum.title)) {
    issues.push(issue('title', 'Curriculum title is required.'));
  }
  if (!Array.isArray(curriculum.modules) || curriculum.modules.length === 0) {
    issues.push(issue('modules', 'At least one module is required.'));
  }

  (Array.isArray(curriculum.modules) ? curriculum.modules : []).forEach((module, moduleIndex) => {
    const modulePath = `modules.${moduleIndex}`;
    if (!module || typeof module !== 'object') {
      issues.push(issue(modulePath, 'Module must be an object.'));
      return;
    }
    if (!cleanText(module.title)) {
      issues.push(issue(`${modulePath}.title`, 'Module title is required.'));
    }
    if (!GENERATED_SOURCES.has(module.source)) {
      issues.push(issue(`${modulePath}.source`, 'Module provenance is invalid.'));
    }
    if (!Array.isArray(module.topics)) {
      issues.push(issue(`${modulePath}.topics`, 'Topics must be an array.'));
      return;
    }

    module.topics.forEach((topic, topicIndex) => {
      const topicPath = `${modulePath}.topics.${topicIndex}`;
      if (!topic || typeof topic !== 'object') {
        issues.push(issue(topicPath, 'Topic must be an object.'));
        return;
      }
      if (!cleanText(topic.title)) {
        issues.push(issue(`${topicPath}.title`, 'Topic title is required.'));
      }
      if (!GENERATED_SOURCES.has(topic.source)) {
        issues.push(issue(`${topicPath}.source`, 'Topic provenance is invalid.'));
      }
      if (!Array.isArray(topic.lessons)) {
        issues.push(issue(`${topicPath}.lessons`, 'Lessons must be an array.'));
        return;
      }

      topic.lessons.forEach((lesson, lessonIndex) => {
        const lessonPath = `${topicPath}.lessons.${lessonIndex}`;
        if (!lesson || typeof lesson !== 'object') {
          issues.push(issue(lessonPath, 'Lesson must be an object.'));
          return;
        }
        if (!cleanText(lesson.title)) {
          issues.push(issue(`${lessonPath}.title`, 'Lesson title is required.'));
        }
        if (!GENERATED_SOURCES.has(lesson.source)) {
          issues.push(issue(`${lessonPath}.source`, 'Lesson provenance is invalid.'));
        }
      });
    });
  });

  return { valid: issues.length === 0, issues };
}

/**
 * Analyzes curriculum quality and creates review flags for inferred or duplicate sections.
 */
export function analyzeCurriculumQuality(curriculum) {
  const reviewFlags = [];
  const inferred = { modules: 0, topics: 0, lessons: 0 };
  let topicsFound = 0;
  let lessonsFound = 0;

  const seenModules = new Map();

  curriculum.modules.forEach((module) => {
    if (module.source === 'ai-inferred') inferred.modules += 1;
    
    const modKey = normalizeKey(module.title);
    if (seenModules.has(modKey)) {
      reviewFlags.push({
        id: `flag-${module.id}-duplicate`,
        itemId: module.id,
        type: 'duplicate-module',
        message: `This module title is similar to "${seenModules.get(modKey)}".`,
      });
    } else if (modKey) {
      seenModules.set(modKey, module.title);
    }

    if (!module.topics.length) {
      reviewFlags.push({
        id: `flag-${module.id}-topics`,
        itemId: module.id,
        type: 'missing-topics',
        message: 'No topics were clearly identified for this module.',
      });
    }

    const seenTopics = new Map();

    module.topics.forEach((topic) => {
      topicsFound += 1;
      if (topic.source === 'ai-inferred') inferred.topics += 1;

      const topKey = normalizeKey(topic.title);
      if (seenTopics.has(topKey)) {
        reviewFlags.push({
          id: `flag-${topic.id}-duplicate`,
          itemId: topic.id,
          type: 'duplicate-topic',
          message: `This topic is similar to "${seenTopics.get(topKey)}". Review before keeping both.`,
        });
      } else if (topKey) {
        seenTopics.set(topKey, topic.title);
      }

      if (!topic.lessons.length) {
        reviewFlags.push({
          id: `flag-${topic.id}-lessons`,
          itemId: topic.id,
          type: 'missing-lessons',
          message: 'No lessons were clearly identified for this topic.',
        });
      }

      if (topic.source === 'ai-inferred') {
        reviewFlags.push({
          id: `flag-${topic.id}-inferred`,
          itemId: topic.id,
          type: 'inferred-section',
          message: 'This topic was inferred from surrounding PDF content.',
        });
      }

      const seenLessons = new Map();

      topic.lessons.forEach((lesson) => {
        lessonsFound += 1;
        if (lesson.source === 'ai-inferred') inferred.lessons += 1;

        const lesKey = normalizeKey(lesson.title);
        if (seenLessons.has(lesKey)) {
          reviewFlags.push({
            id: `flag-${lesson.id}-duplicate`,
            itemId: lesson.id,
            type: 'duplicate-lesson',
            message: `This lesson is similar to "${seenLessons.get(lesKey)}".`,
          });
        } else if (lesKey) {
          seenLessons.set(lesKey, lesson.title);
        }

        if (lesson.source === 'ai-inferred') {
          reviewFlags.push({
            id: `flag-${lesson.id}-inferred`,
            itemId: lesson.id,
            type: 'inferred-section',
            message: 'This lesson was inferred from nearby source text.',
          });
        }
      });
    });
  });

  const inferredCount = inferred.modules + inferred.topics + inferred.lessons;

  return {
    topicsFound,
    lessonsFound,
    inferred,
    inferredCount,
    reviewFlags,
    flaggedCount: reviewFlags.length,
    reviewRequired: reviewFlags.length > 0 || inferredCount > 0,
  };
}

export { cleanText };
