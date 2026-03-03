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

// Cofactor bar colors (from extended palette)
_PALETTE.atp   = _PALETTE.extended.yellow;
_PALETTE.nadh  = _PALETTE.extended.blue;
_PALETTE.nadph = _PALETTE.extended.green;
_PALETTE.fadh2 = _PALETTE.extended.rose;

// Mode-independent
_PALETTE.textOnAccent = _PALETTE.light.elevated;

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
    ['pw-betaox',      'yellow'],
    ['pw-ros',         'red'],
  ];

  const genShared = () => shared.map(([name, key, a]) =>
    `  --${name}: ${a != null ? _r(P[key], a) : P[key]};`
  ).join('\n');

  const style = document.createElement('style');
  style.id = 'project-vars';
  style.textContent = `:root {
${genShared()}

  --bg-scrim:         ${_r(D.text, 0.2)};
  --bg-track:         ${_r(L.text, 0.078)};
  --metab-card-bg:    ${_r(L.text, 0.02)};

  --tog-inset:        ${_r(L.text, 0.078)};
  --track-shadow:     inset 0 1px 1px ${_r(L.text, 0.059)};
}
[data-theme="dark"] {
  --bg-scrim:         ${_r(L.text, 0.149)};
  --bg-track:         ${_r(D.text, 0.039)};
  --metab-card-bg:    transparent;

  --tog-inset:        ${_r(L.text, 0.349)};
  --tog-checked-extra: ${_r(L.text, 0.302)};
  --track-shadow:     none;
}`;
  document.head.appendChild(style);
})();

// Expose on window so ES6 modules can access via `window._BASE` etc.
window._BASE = _BASE;
window._darkFill = _darkFill;
