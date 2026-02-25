/* ===================================================================
   anim.js — Animation utilities for biosim (zero dependencies)
   Loaded before enzymes.js. Provides easing, interpolation, trails,
   and rotation accumulators used by the rendering pipeline.
   =================================================================== */

// Cached math constants (shared across all modules — anim.js loads first)
const _TWO_PI = Math.PI * 2;
const _HALF_PI = Math.PI / 2;

const Anim = {
  // ---- Easing functions ----
  lerp(a, b, t) { return a + (b - a) * t; },
  smoothstep(t) { return t * t * (3 - 2 * t); },
  easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); },
  easeInOutSine(t) { return -(Math.cos(Math.PI * t) - 1) / 2; },

  /**
   * Fade tracker — drives smooth alpha interpolation for pathway enable/disable.
   * Usage: const f = Anim.fade(1); each frame call f.update(dt, targetAlpha);
   *        read f.value for the current smoothed alpha.
   */
  fade(initial = 1) {
    return {
      value: initial,
      target: initial,
      update(dt, target) {
        this.target = target;
        const rate = 4.0; // ~0.25s to reach 95% of target
        this.value += (this.target - this.value) * Math.min(1, rate * dt);
      }
    };
  },

  /**
   * Trail buffer — ring buffer of {x, y, alpha} for particle glow trails.
   * push() adds a new head position and ages all existing points.
   * draw() renders the trail as fading circles.
   */
  trail(maxLen = 8) {
    const pts = [];
    return {
      points: pts,
      push(x, y) {
        pts.unshift({ x, y, alpha: 1.0 });
        if (pts.length > maxLen) pts.pop();
        for (let i = 1; i < pts.length; i++) {
          pts[i].alpha = 1 - i / pts.length;
        }
      },
      clear() { pts.length = 0; },
      draw(ctx, radius, color) {
        for (let i = pts.length - 1; i >= 0; i--) {
          const p = pts[i];
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius * (0.4 + 0.6 * p.alpha), 0, _TWO_PI);
          ctx.fillStyle = color;
          ctx.globalAlpha = p.alpha * 0.35;
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    };
  },

  /**
   * Rotation accumulator — angle increments only when active.
   * update(dt, active, speed) advances the angle when active is truthy.
   */
  rotAccum() {
    return {
      angle: 0,
      targetAngle: 0,
      update(dt, active, speed = 1.5) {
        if (active) this.targetAngle += dt * speed;
        // Smoothly interpolate toward target (covers both auto-play drift and click nudges)
        const diff = this.targetAngle - this.angle;
        if (Math.abs(diff) > 0.001) {
          this.angle += diff * Math.min(1, 6 * dt);
        } else {
          this.angle = this.targetAngle;
        }
      }
    };
  },
};
