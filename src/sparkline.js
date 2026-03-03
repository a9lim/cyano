// ─── Sparkline Time Series ───
const HISTORY_LEN = 300; // 300 samples at 5Hz = 60 seconds

export function createHistory() {
    return { data: new Float32Array(HISTORY_LEN), head: 0, count: 0 };
}

export function pushSample(h, value) {
    h.data[h.head] = value;
    h.head = (h.head + 1) % HISTORY_LEN;
    if (h.count < HISTORY_LEN) h.count++;
}

export function drawSparkline(ctx, h, w, hh, color) {
    if (h.count < 2) return;
    ctx.clearRect(0, 0, w, hh);

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;

    for (let i = 0; i < h.count; i++) {
        const idx = (h.head - h.count + i + HISTORY_LEN) % HISTORY_LEN;
        const x = (i / (HISTORY_LEN - 1)) * w;
        const y = hh - h.data[idx] * hh; // 0-1 normalized → canvas y
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // "Now" line at right edge of data
    const nowX = (h.count / HISTORY_LEN) * w;
    ctx.setLineDash([2, 2]);
    ctx.strokeStyle = color + '66';
    ctx.beginPath();
    ctx.moveTo(nowX, 0);
    ctx.lineTo(nowX, hh);
    ctx.stroke();
    ctx.setLineDash([]);
}

export function resetHistory(h) {
    h.head = 0;
    h.count = 0;
    h.data.fill(0);
}
