function resizeIframe(iframe) {
  const doc = iframe.contentWindow.document;

  const setH = () => {
    let maxH = 0;
    doc.body.querySelectorAll('*:not(canvas)').forEach(el => {
      const rect = el.getBoundingClientRect();
      maxH = Math.max(maxH, rect.top + rect.height);
    });
    if (maxH > 0) {
      iframe.style.height = maxH + 'px';
    }
  };

  setH();

  let lastH = 0;
  let stableCount = 0;
  const observer = new ResizeObserver(() => {
    let maxH = 0;
    doc.body.querySelectorAll('*:not(canvas)').forEach(el => {
      const rect = el.getBoundingClientRect();
      maxH = Math.max(maxH, rect.top + rect.height);
    });
    if (maxH === lastH) {
      stableCount++;
      if (stableCount >= 3) observer.disconnect();
    } else {
      stableCount = 0;
      lastH = maxH;
      if (maxH > 0) iframe.style.height = maxH + 'px';
    }
  });

  observer.observe(doc.body);
}

const track   = document.getElementById('kiosk-track');
const content = document.getElementById('kiosk-content');
const clone   = document.getElementById('kiosk-clone');

window.addEventListener('load', () => {
  clone.innerHTML = content.innerHTML;
});

const PX_PER_SEC = 20;
let pos = 0;
let paused = false;
let resumeTimer = null;
let lastTime = null;

function tick(ts) {
  if (!lastTime) lastTime = ts;
  const dt = (ts - lastTime) / 1000;
  lastTime = ts;

  if (!paused) {
    pos += PX_PER_SEC * dt;
    const contentH = content.offsetHeight;
    if (pos >= contentH) pos -= contentH;
    track.style.transform = `translateY(${-pos}px)`;
  }

  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);

function pauseAndResume() {
  paused = true;
  clearTimeout(resumeTimer);
  resumeTimer = setTimeout(() => { paused = false; }, 3000);
}

let dragStart = null;
let posAtDrag = 0;

document.addEventListener('mousedown', e => {
  dragStart = e.clientY;
  posAtDrag = pos;
  pauseAndResume();
});

document.addEventListener('mousemove', e => {
  if (dragStart === null) return;
  pos = posAtDrag + (dragStart - e.clientY);
  const contentH = content.offsetHeight;
  if (pos < 0) pos += contentH;
  if (pos >= contentH) pos -= contentH;
  track.style.transform = `translateY(${-pos}px)`;
});

document.addEventListener('mouseup', () => { dragStart = null; });

document.addEventListener('touchstart', e => {
  dragStart = e.touches[0].clientY;
  posAtDrag = pos;
  pauseAndResume();
}, { passive: true });

document.addEventListener('touchmove', e => {
  if (dragStart === null) return;
  pos = posAtDrag + (dragStart - e.touches[0].clientY);
  const contentH = content.offsetHeight;
  if (pos < 0) pos += contentH;
  if (pos >= contentH) pos -= contentH;
  track.style.transform = `translateY(${-pos}px)`;
}, { passive: true });

document.addEventListener('touchend', () => { dragStart = null; });