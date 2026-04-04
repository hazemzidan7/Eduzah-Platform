/** Video metadata lives in each curriculum chapter's `videoUrls` array, parallel to `lessons`. */

export function getVideoForLesson(course, globalLessonIndex) {
  let acc = 0;
  for (const ch of course.curriculum || []) {
    const lessons = ch.lessons || [];
    const vids = ch.videoUrls || [];
    const n = lessons.length;
    if (globalLessonIndex < acc + n) {
      const local = globalLessonIndex - acc;
      return vids[local] ?? null;
    }
    acc += n;
  }
  return null;
}

/** Flat list of { lessonTitle, video } for dashboards. */
export function flattenLessonsWithVideos(course) {
  const rows = [];
  for (const ch of course.curriculum || []) {
    const lessons = ch.lessons || [];
    const vids = ch.videoUrls || [];
    lessons.forEach((lessonTitle, i) => {
      rows.push({ lessonTitle, video: vids[i] || null });
    });
  }
  return rows;
}
