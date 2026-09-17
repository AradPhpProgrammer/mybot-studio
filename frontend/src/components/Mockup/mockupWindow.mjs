export const MOCKUP_WIDTH = 380;
export const MOCKUP_HEIGHT = 600;
export const MOCKUP_PADDING = 8;
export const MOCKUP_TOP_PADDING = 60;

/** Responsive floating window size: never wider or taller than the viewport can hold. */
export function getMockupSize(windowWidth, windowHeight) {
  const width = Math.min(MOCKUP_WIDTH, Math.max(windowWidth - MOCKUP_PADDING * 2, 200));
  const height = Math.min(
    MOCKUP_HEIGHT,
    Math.max(windowHeight - MOCKUP_TOP_PADDING - MOCKUP_PADDING, 200)
  );
  return { width: Math.round(width), height: Math.round(height) };
}

/** Bounded floating window positioning: never let drag titlebars or actions escape offscreen. */
export function clampMockupPosition(pos, windowWidth, windowHeight) {
  const { width, height } = getMockupSize(windowWidth, windowHeight);
  const maxX = Math.max(MOCKUP_PADDING, windowWidth - width - MOCKUP_PADDING);
  const maxY = Math.max(MOCKUP_TOP_PADDING, windowHeight - height - MOCKUP_PADDING);
  return {
    x: Math.round(Math.max(MOCKUP_PADDING, Math.min(maxX, pos.x))),
    y: Math.round(Math.max(MOCKUP_TOP_PADDING, Math.min(maxY, pos.y))),
  };
}
