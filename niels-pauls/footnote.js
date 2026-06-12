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
      if (back) back.remove(); // the ↩︎ link isn't useful in the bar
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
      left: '0',
      right: '0',
      maxHeight: '40vh',
      overflowY: 'auto',
      background: '#fff',
      borderTop: '1px solid #ccc',
      padding: '0.75rem 1rem',
      fontSize: '0.9rem',
      lineHeight: '1.4',
      boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.08)',
      zIndex: '1000',
      display: 'none',
      justifyContent: 'center',
    });

    const list = document.createElement('ol');
    Object.assign(list.style, { margin: '0', paddingLeft: '2rem' });
    bar.appendChild(list);
    document.body.appendChild(bar);

    // 4. Track which footnote refs are visible, rebuild bar when it changes
    const allRefs = Array.from(document.querySelectorAll('.footnote-ref'));
    const visibleRefs = new Set();

    function render() {
      // Keep DOM order so footnotes appear top-to-bottom as in the text
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
        if (!Number.isNaN(n)) li.value = n; // preserve original numbering
        li.innerHTML = content;
        list.appendChild(li);
      });

      bar.style.display = 'flex';
      // Reserve space so body content isn't covered by the bar
      requestAnimationFrame(() => {
        document.body.style.paddingBottom = `${bar.offsetHeight}px`;
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
      // Shrink the observation area to the top half of the viewport:
      // a -50% bottom margin pulls the bottom edge up by half the viewport
      // height, so only refs in the top 50% are reported as intersecting.
      { threshold: 0, rootMargin: '0px 0px -75% 0px' }
    );
    allRefs.forEach((ref) => observer.observe(ref));

    // 5. Intercept clicks on refs: highlight the entry in the bar
    //    instead of jumping to the now-hidden section
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