/**
 * Card / listing strip (optional title-in-image banner). Falls back to legacy `image`.
 */
export function courseCardCoverUrl(course) {
  if (!course) return null;
  return course.coverImage || course.image || null;
}

/** Hide title overlay on cards when the graphic already includes the title */
export function courseCoverIsGraphic(course) {
  return !!(courseCardCoverUrl(course) && course.coverTitleInImage);
}

/**
 * Full-width hero on course page uses `image` only.
 * Legacy: if title is baked into `image` and there is no separate `coverImage`, skip hero.
 */
export function shouldShowCourseHero(course) {
  if (!course?.image) return false;
  if (course.coverTitleInImage && !course.coverImage) return false;
  return true;
}

/** Small avatar / thumb: prefer hero photo, else card banner */
export function courseThumbUrl(course) {
  if (!course) return null;
  return course.image || course.coverImage || null;
}
