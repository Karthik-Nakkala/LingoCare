export function calculateCurriculumStats(curriculum) {
  if (!curriculum) {
    return { modules: 0, topics: 0, lessons: 0, durationHours: 0 };
  }

  let modules = 0;
  let topics = 0;
  let lessons = 0;

  if (curriculum.modules) {
    modules = curriculum.modules.length;
    curriculum.modules.forEach(module => {
      if (module.topics) {
        topics += module.topics.length;
        module.topics.forEach(topic => {
          if (topic.lessons) {
            lessons += topic.lessons.length;
          }
        });
      }
    });
  }

  // A rough estimate: say each lesson takes about 50 minutes, roughly ~0.83 hours. 
  // We'll just mock it as something that looks realistic, say lessons * 0.8 hours rounded up
  const durationHours = Math.ceil(lessons * 0.83);

  return { modules, topics, lessons, durationHours };
}
