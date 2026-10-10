(function (root) {
  'use strict';
  const clampZoom = value => Math.max(.25, Math.min(3, Number(value) || 1));

  function create({ dialog, entries, art, escape, labels, onLocate }) {
    let scale = 1, board, viewport, slider, output, previousFocus, previousOverflow;
    let points = new Map(), drag = null, pinch = null, moved = false;

    function zoom(value, x, y) {
      const next = clampZoom(value), ratio = next / scale;
      const cx = x ?? viewport.clientWidth / 2, cy = y ?? viewport.clientHeight / 2;
      const left = (viewport.scrollLeft + cx) * ratio - cx;
      const top = (viewport.scrollTop + cy) * ratio - cy;
      scale = next;
      board.style.setProperty('--atlas-scale', String(scale));
      slider.value = String(Math.round(scale * 100));
      output.textContent = Math.round(scale * 100) + '%';
      viewport.scrollLeft = left;
      viewport.scrollTop = top;
    }

    function fit() {
      zoom((viewport.clientWidth - 24) / (24 * 48));
      viewport.scrollLeft = 0;
      viewport.scrollTop = 0;
    }

    function resetGesture() {
      if (points.size === 1) {
        const point = [...points.values()][0];
        drag = { x: point.x, y: point.y, left: viewport.scrollLeft, top: viewport.scrollTop };
        pinch = null;
      } else if (points.size === 2) {
        const [a, b] = [...points.values()];
        const rect = viewport.getBoundingClientRect();
        pinch = {
          distance: Math.hypot(a.x - b.x, a.y - b.y), scale,
          x: (a.x + b.x) / 2 - rect.left, y: (a.y + b.y) / 2 - rect.top,
          left: viewport.scrollLeft, top: viewport.scrollTop
        };
        moved = true;
      }
    }

    function bindGestures() {
      points = new Map(); drag = null; pinch = null; moved = false;
      viewport.addEventListener('pointerdown', event => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        if (points.size === 0) moved = false;
        points.set(event.pointerId, { x: event.clientX, y: event.clientY });
        resetGesture();
      });
      viewport.addEventListener('pointermove', event => {
        if (!points.has(event.pointerId)) return;
        points.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (points.size === 2 && pinch) {
          const [a, b] = [...points.values()], rect = viewport.getBoundingClientRect();
          const next = clampZoom(pinch.scale * Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, pinch.distance));
          zoom(next);
          viewport.scrollLeft = (pinch.left + pinch.x) * next / pinch.scale - ((a.x + b.x) / 2 - rect.left);
          viewport.scrollTop = (pinch.top + pinch.y) * next / pinch.scale - ((a.y + b.y) / 2 - rect.top);
        } else if (points.size === 1 && drag) {
          if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 6 && !moved) return;
          moved = true;
          viewport.scrollLeft = drag.left + drag.x - event.clientX;
          viewport.scrollTop = drag.top + drag.y - event.clientY;
        }
        if (moved) {
          viewport.setPointerCapture(event.pointerId);
          event.preventDefault();
        }
      });
      for (const type of ['pointerup', 'pointercancel']) viewport.addEventListener(type, event => {
        points.delete(event.pointerId);
        if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
        resetGesture();
        if (!points.size) { drag = null; pinch = null; }
      });
      viewport.addEventListener('wheel', event => {
        if (!event.ctrlKey) return;
        event.preventDefault();
        const rect = viewport.getBoundingClientRect();
        zoom(scale * Math.exp(-event.deltaY / 250), event.clientX - rect.left, event.clientY - rect.top);
      }, { passive: false });
    }

    function open(category, selectedKey) {
      previousFocus = document.activeElement;
      previousOverflow = document.body.style.overflow;
      const pool = entries.filter(e => category === 'all' || e.category === category);
      const groups = category === 'all' ? [
        { label: '主被动道具', items: pool.filter(e => ['active', 'passive'].includes(e.category)).sort((a,b) => a.id-b.id) },
        ...['card', 'trinket', 'set'].map(c => ({ label: labels[c], items: pool.filter(e => e.category === c).sort((a,b) => (a.id || Number(a.key.slice(1)))-(b.id || Number(b.key.slice(1)))) }))
      ] : [{ label: labels[category], items: pool.sort((a,b) => (a.id || Number(a.key.slice(1)))-(b.id || Number(b.key.slice(1)))) }];
      dialog.innerHTML = `<div class="overview-header"><div><h2>图标总览 · ${escape(labels[category])}</h2><p>双指缩放，拖动查看；点图标定位到列表。</p></div><button type="button" id="overview-close" aria-label="关闭总览">×</button></div><div class="overview-zoom"><button type="button" id="zoom-out" aria-label="缩小总览">−</button><input type="range" id="overview-scale" min="25" max="300" value="100" aria-label="总览缩放比例"><button type="button" id="zoom-in" aria-label="放大总览">＋</button><output id="overview-percent">100%</output><button type="button" id="overview-fit">适应屏幕</button></div><div class="overview-viewport" tabindex="0" aria-label="可缩放的图标总览"><div class="overview-board">${groups.map(group => `<section class="overview-group"><h3>${escape(group.label)} · ${group.items.length}</h3><div class="overview-grid">${group.items.map(item => `<button type="button" class="overview-item ${item.key===selectedKey?'selected':''}" data-locate-key="${item.key}" title="${escape(item.name)} ${item.key}" aria-label="定位 ${escape(item.name)} ${item.key}">${art(item)}<span>${item.key}</span></button>`).join('')}</div></section>`).join('')}</div></div>`;
      board = dialog.querySelector('.overview-board');
      viewport = dialog.querySelector('.overview-viewport');
      slider = dialog.querySelector('#overview-scale');
      output = dialog.querySelector('#overview-percent');
      scale = 1;
      dialog.querySelector('#overview-close').onclick = close;
      dialog.querySelector('#zoom-out').onclick = () => zoom(scale / 1.25);
      dialog.querySelector('#zoom-in').onclick = () => zoom(scale * 1.25);
      dialog.querySelector('#overview-fit').onclick = fit;
      slider.oninput = () => zoom(Number(slider.value) / 100);
      bindGestures();
      dialog.showModal();
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(fit);
    }

    function close() { if (dialog.open) dialog.close(); }
    dialog.addEventListener('click', event => {
      const item = event.target.closest('[data-locate-key]');
      if (!item) return;
      if (moved && event.detail !== 0) { event.preventDefault(); return; }
      const key = item.dataset.locateKey;
      close();
      onLocate(key);
    });
    dialog.addEventListener('close', () => {
      points.clear();
      document.body.style.overflow = previousOverflow || '';
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    });
    return { open, close, isOpen: () => dialog.open };
  }

  root.IsaacOverview = { create, clampZoom };
})(window);
