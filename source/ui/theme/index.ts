// Theme barrel — import everything from here:
//   import {tokens, glyphs, space, Divider, Hint} from '../theme/index.js';

export {palette} from './colors.js';
export type {PaletteColor} from './colors.js';
export {glyphs} from './glyphs.js';
export type {Glyph} from './glyphs.js';
export {space, width} from './spacing.js';
export {instagramGradient} from './gradient.js';
export {text, accent, state, border} from './tokens.js';

// Primitives
export {default as Divider} from './primitives/divider.js';
export {default as Label} from './primitives/label.js';
export {default as Hint} from './primitives/hint.js';
export {default as Caret} from './primitives/caret.js';
export {default as StatusDot} from './primitives/status-dot.js';
