// Animation primitives — easing functions, fade trackers, trail renderer,
// and rotation accumulators. Zero dependencies.

export const _TWO_PI = Math.PI * 2;
export const _HALF_PI = Math.PI / 2;

export const Anim = {
  smoothstep(t) { return t * t * (3 - 2 * t); },
  easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); },
  easeInOutSine(t) { return -(Math.cos(Math.PI * t) - 1) / 2; },

  /** Exponential lerp toward a target value (rate=4 gives ~63% per 0.25s). */
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

  /** Fixed-length point trail for electron glow effects. */
  trail(maxLen = 8) {
    const xs = new Float32Array(maxLen);
    const ys = new Float32Array(maxLen);
    let head = 0, count = 0;
    return {
      push(x, y) {
        xs[head] = x;
        ys[head] = y;
        head = (head + 1) % maxLen;
        if (count < maxLen) count++;
      },
      clear() { head = 0; count = 0; },
      draw(ctx, radius, color) {
        if (count === 0) return;
        ctx.fillStyle = color;
        for (let i = 0; i < count; i++) {
          const idx = (head - count + i + maxLen) % maxLen;
          const alpha = (i + 1) / count;
          ctx.globalAlpha = alpha * 0.35;
          ctx.beginPath();
          ctx.arc(xs[idx], ys[idx], radius * (0.4 + 0.6 * alpha), 0, _TWO_PI);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    };
  },

  /** Smooth rotation accumulator — target angle steps on reaction,
   *  actual angle lerps toward it for fluid cycle-arrow animation. */
  rotAccum() {
    return {
      angle: 0,
      targetAngle: 0,
      update(dt, active, speed = 1.5, rotK) {
        if (active) this.targetAngle += dt * speed;
        const diff = this.targetAngle - this.angle;
        if (Math.abs(diff) > 0.001) {
          this.angle += diff * (rotK !== undefined ? rotK : Math.min(1, 6 * dt));
        } else {
          this.angle = this.targetAngle;
        }
      }
    };
  },
};
