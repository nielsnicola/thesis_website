/**
 * footnote.js
 *
 * Replaces Pandoc's end-of-document footnotes section with a fixed bar at
 * the bottom of the viewport that shows only the footnotes referenced by
 * elements currently visible on screen.
 *
 * Expects Pandoc's default footnote HTML structure:
 *   <a href="#fn1" class="footnote-ref" id="fnref1"><sup>1</sup></a>
 *   <section id="footnotes" ...><ol><li id="fn1">...</li></ol></section>
 */
(function () {
  'use strict';

  function init() {
    const footnotesSection = document.getElementById('footnotes');
    if (!footnotesSection) return;

    // 1. Build a map: footnote id → cleaned-up HTML content
    const footnoteMap = new Map();
    footnotesSection.querySelectorAll('ol > li').forEach((li) => {
      const clone = li.cloneNode(true);
      const back = clone.querySelector('.footnote-back');
      if (back) back.remove();
      footnoteMap.set(li.id, clone.innerHTML.trim());
    });

    // 2. Hide the original section (kept in DOM so #fn1 anchors stay valid)
    footnotesSection.style.display = 'none';

    // 3. Build the fixed bar
    const bar = document.createElement('aside');
    bar.id = 'footnote-bar';
    bar.setAttribute('role', 'doc-endnotes');
    bar.setAttribute('aria-label', 'Footnotes for the visible passage');
    Object.assign(bar.style, {
      position: 'fixed',
      bottom: '0',
      maxHeight: '40vh',
      overflowY: 'auto',
      background: '#fff',
      borderTop: '1px solid #ccc',
      borderLeft: '1px solid #ccc',
      borderRight: '1px solid #ccc',
      borderRadius: '4px 4px 0 0',
      padding: '0.75rem 1rem',
      fontSize: '0.9rem',
      lineHeight: '1.4',
      boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.08)',
      zIndex: '1000',
      display: 'none',
      boxSizing: 'border-box',
    });

    const list = document.createElement('ol');
    Object.assign(list.style, { margin: '0', paddingLeft: '2rem' });
    bar.appendChild(list);
    document.body.appendChild(bar);

    // 3a. Keep bar aligned with #container on load and resize
    const container = document.getElementById('container');

    function alignBar() {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
      bar.style.left = (rect.left + scrollLeft) + 'px';
      bar.style.width = rect.width + 'px';
    }

    alignBar();
    window.addEventListener('resize', alignBar);
    // Also realign on scroll in case horizontal scroll shifts the container
    window.addEventListener('scroll', alignBar, { passive: true });

    // 4. Track which footnote refs are visible, rebuild bar when it changes
    const allRefs = Array.from(document.querySelectorAll('.footnote-ref'));
    const visibleRefs = new Set();

    function render() {
      const ordered = allRefs.filter((ref) => visibleRefs.has(ref));
      list.innerHTML = '';

      if (ordered.length === 0) {
        bar.style.display = 'none';
        document.body.style.paddingBottom = '';
        return;
      }

      ordered.forEach((ref) => {
        const href = ref.getAttribute('href') || '';
        if (!href.startsWith('#')) return;
        const id = href.slice(1);
        const content = footnoteMap.get(id);
        if (!content) return;

        const li = document.createElement('li');
        li.id = `bar-${id}`;
        const n = parseInt(ref.textContent.trim(), 10);
        if (!Number.isNaN(n)) li.value = n;
        li.innerHTML = content;
        list.appendChild(li);
      });

      bar.style.display = 'block';
      requestAnimationFrame(() => {
        document.body.style.paddingBottom = `${bar.offsetHeight}px`;
        alignBar();
      });
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) visibleRefs.add(entry.target);
          else visibleRefs.delete(entry.target);
        });
        render();
      },
      { threshold: 0, rootMargin: '0px 0px -75% 0px' }
    );
    allRefs.forEach((ref) => observer.observe(ref));

    // 5. Intercept clicks on refs: highlight the entry in the bar
    allRefs.forEach((ref) => {
      ref.addEventListener('click', (e) => {
        const href = ref.getAttribute('href') || '';
        if (!href.startsWith('#')) return;
        const target = document.getElementById(`bar-${href.slice(1)}`);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        target.style.transition = 'background-color 0.4s';
        target.style.backgroundColor = '#fff3a0';
        setTimeout(() => {
          target.style.backgroundColor = '';
        }, 1200);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();