export function calculateCurriculumStats(curriculum) {
  if (!curriculum) {
    return { modules: 0, topics: 0, lessons: 0, durationHours: 0 };
  }

  const target = curriculum.curriculum || curriculum;
  const rawModules = Array.isArray(target.modules) ? target.modules : [];

  let modules = rawModules.length;
  let topics = 0;
  let lessons = 0;

  rawModules.forEach((module) => {
    const rawTopics = Array.isArray(module?.topics) ? module.topics : [];
    topics += rawTopics.length;
    rawTopics.forEach((topic) => {
      const rawLessons = Array.isArray(topic?.lessons) ? topic.lessons : [];
      lessons += rawLessons.length;
    });
  });

  const durationHours = Math.ceil(lessons * 0.83);

  return { modules, topics, lessons, durationHours };
}
