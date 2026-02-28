// ─── Animation utilities (zero dependencies) ───

export const _TWO_PI = Math.PI * 2;
export const _HALF_PI = Math.PI / 2;

export const Anim = {
  lerp(a, b, t) { return a + (b - a) * t; },
  smoothstep(t) { return t * t * (3 - 2 * t); },
  easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); },
  easeInOutSine(t) { return -(Math.cos(Math.PI * t) - 1) / 2; },

  fade(initial = 1) {
    return {
      value: initial,
      target: initial,
      update(dt, target) {
        this.target = target;
        const rate = 4.0;
        this.value += (this.target - this.value) * Math.min(1, rate * dt);
      }
    };
  },

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

  rotAccum() {
    return {
      angle: 0,
      targetAngle: 0,
      update(dt, active, speed = 1.5) {
        if (active) this.targetAngle += dt * speed;
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
