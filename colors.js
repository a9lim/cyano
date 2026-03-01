/* ===================================================================
   colors.js — biosim project-specific tokens
   Extends shared-tokens.js with pathway/cofactor colors, color math
   helpers, _BASE families, and project-specific CSS vars.
   =================================================================== */

// ---------- Font extension ----------
_FONT.emoji = "sans-serif";

// ---------- Project-specific palette keys ----------
// Pathway / particle base hues (from shared extended palette)
_PALETTE.orange = _PALETTE.extended.orange;
_PALETTE.blue   = _PALETTE.extended.blue;
_PALETTE.green  = _PALETTE.extended.green;
_PALETTE.purple = _PALETTE.extended.purple;
_PALETTE.rose   = _PALETTE.extended.rose;
_PALETTE.brown  = _PALETTE.extended.brown;
_PALETTE.red    = _PALETTE.extended.red;
_PALETTE.cyan   = _PALETTE.extended.cyan;
_PALETTE.yellow = _PALETTE.extended.yellow;
_PALETTE.slate  = _PALETTE.extended.slate;

// Cofactor bar colors
_PALETTE.atp   = '#cc9e30';
_PALETTE.nadh  = '#40a2b0';
_PALETTE.nadph = '#3a9e82';
_PALETTE.fadh2 = '#bc6e78';

// Mode-independent
_PALETTE.textOnAccent = '#FDFBF5';

// Mode-dependent extension
_PALETTE.light.togBg = '#c8ccd4';

Object.freeze(_PALETTE.extended);
Object.freeze(_PALETTE.light);
Object.freeze(_PALETTE.dark);
Object.freeze(_FONT);
Object.freeze(_PALETTE);

// ---------- Color Math Helpers (use shared _parseHex, _rgb2hsl, _hsl2hex, _darken) ----------

// _darkFill: same hue, fixed sat (0.55), custom lightness — for dark-mode fills
function _darkFill(base, lightness) {
  const [h] = _rgb2hsl(..._parseHex(base.stroke));
  return _hsl2hex(h, 0.55, lightness / 100);
}

function _makeBase(stroke, fillL) {
  const o = { stroke, strokeLight: _darken(stroke) };
  if (fillL != null) o.fill = _darkFill(o, fillL);
  return o;
}

// ---------- Base Color Families ----------
const _BASE = {
  orange: _makeBase(_PALETTE.orange, 7),
  blue:   _makeBase(_PALETTE.blue, 13),
  green:  _makeBase(_PALETTE.green, 7),
  purple: _makeBase(_PALETTE.purple, 10),
  rose:   _makeBase(_PALETTE.rose, 8),
  brown:  _makeBase(_PALETTE.brown, 7),
  red:    _makeBase(_PALETTE.red),
  cyan:   _makeBase(_PALETTE.cyan),
  yellow: _makeBase(_PALETTE.yellow),
  slate:  _makeBase(_PALETTE.slate),
};

// ---------- Project-specific CSS vars ----------
(function injectProjectVars() {
  const P = _PALETTE, L = P.light, D = P.dark;

  const shared = [
    ['text-on-accent', 'textOnAccent'],
    ['pw-glyc',        'orange'],
    ['pw-krebs',       'blue'],
    ['pw-calvin',      'green'],
    ['pw-ppp',         'rose'],
    ['pw-cyclic',      'purple'],
    ['pw-ferment',     'brown'],
    ['co-atp',         'atp'],
    ['co-nadh',        'nadh'],
    ['co-nadph',       'nadph'],
    ['co-fadh2',       'fadh2'],
    ['pw-electron',    'cyan'],
    ['pw-proton',      'red'],
    ['pw-photon',      'yellow'],
  ];

  const genShared = () => shared.map(([name, key, a]) =>
    `  --${name}: ${a != null ? _r(P[key], a) : P[key]};`
  ).join('\n');

  const style = document.createElement('style');
  style.id = 'project-vars';
  style.textContent = `:root {
${genShared()}

  --bg-scrim:         #ffffff33;
  --bg-track:         #00000014;
  --metab-card-bg:    #00000005;

  --tog-bg:           ${L.togBg};
  --tog-thumb-on:     #ffffff;
  --tog-border:       #0000000f;
  --tog-inset:        #00000014;
  --track-shadow:     inset 0 1px 1px #0000000f;
}
[data-theme="dark"] {
  --bg-scrim:         #00000026;
  --bg-track:         #ffffff0a;
  --metab-card-bg:    transparent;

  --tog-bg:           ${D.panelSolid};
  --tog-thumb-on:     var(--text);
  --tog-border:       #ffffff0f;
  --tog-inset:        #00000059;
  --tog-thumb-shadow: #00000073;
  --tog-checked-inset: #00000033;
  --tog-checked-extra: #0000004d;
  --track-shadow:     none;
}`;
  document.head.appendChild(style);
})();

// Expose on window so ES6 modules can access via `window._BASE` etc.
window._BASE = _BASE;
window._darkFill = _darkFill;
