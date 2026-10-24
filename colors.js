/* ═══════════════════════════════════════════════════════════════
   colors.js — Lumen's inks.
   The canvas reads inks straight from _themePalette() on every theme
   change (src/complexes.js readPalette). This file names Lumen's roles
   for the DOM: one ink per line of the map (--pw-*) and per cofactor
   pool (--co-*). The proton is Lumen's red, so it takes the accent.
   ═══════════════════════════════════════════════════════════════ */

for (const T of [_PALETTE.light, _PALETTE.dark]) {
  T.atp   = T.inks.ochre;
  T.nadh  = T.inks.prussian;
  T.nadph = T.inks.viridian;
  T.fadh2 = T.inks.madder;
}

_freezeTokens();

(function injectProjectVars() {
  const P = _PALETTE, L = P.light, D = P.dark;

  // [CSS var name, ink or theme key]; the lines match src/maplayout.js LINES
  const roles = [
    ['pw-glyc',    'sienna'],
    ['pw-ppp',     'madder'],
    ['pw-calvin',  'viridian'],
    ['pw-pdh',     'indigo'],
    ['pw-krebs',   'prussian'],
    ['pw-ferment', 'umber'],
    ['pw-betaox',  'ochre'],
    ['pw-ros',     'accent'],
    ['co-atp',     'atp'],
    ['co-nadh',    'nadh'],
    ['co-nadph',   'nadph'],
    ['co-fadh2',   'fadh2'],
  ];

  const gen = (T) => roles.map(([name, key]) => `  --${name}: ${T.inks[key] || T[key]};`).join('\n');
  _injectProjectVars(gen(L), gen(D));
})();
