export const BACK_SWIPE_EDGE_WIDTH = 20;

export function backSwipeProgress(distance: number, width: number) {
  'worklet';
  return Math.max(0, Math.min(1, distance / Math.max(1, width)));
}

// Native pan velocity is measured in points per second.
export function shouldCompleteBackSwipe(distance: number, velocityX: number, width: number) {
  'worklet';
  if (velocityX < -200) return false;
  return distance >= width * 0.3 || (distance >= 24 && velocityX >= 500);
}
