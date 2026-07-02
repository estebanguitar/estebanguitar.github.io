customElements.define('site-nav', class extends HTMLElement {
  connectedCallback() {
    if (!document.getElementById('_snav_css')) {
      const s = document.createElement('style');
      s.id = '_snav_css';
      s.textContent = 'site-nav{display:contents}'
        + '.nav{background:#111;border-bottom:1px solid rgba(255,255,255,.08);position:sticky;top:0;z-index:300}'
        + '.nav-inner{max-width:1200px;margin:0 auto;padding:0 1.5rem;display:flex;align-items:center;gap:2rem;height:44px}'
        + '.nav-logo{text-decoration:none;color:rgba(255,255,255,.5);font-size:.75rem;font-weight:700;letter-spacing:.02em;white-space:nowrap}'
        + '.nav-tabs{display:flex;gap:.25rem}'
        + '.nav-tab{text-decoration:none;display:inline-flex;align-items:center;color:rgba(255,255,255,.45);font-size:.75rem;font-weight:600;padding:.4rem .9rem;transition:all .15s;border-bottom:2px solid transparent;height:44px;letter-spacing:-.01em}'
        + '.nav-tab:hover{color:rgba(255,255,255,.8)}'
        + '.nav-tab.on{color:#fff;border-bottom-color:#fff}';
      document.head.appendChild(s);
    }
    const p = location.pathname;
    const on = h => (p === h || p.endsWith(h.slice(1))) ? ' on' : '';
    this.innerHTML = '<nav class="nav"><div class="nav-inner">'
      + '<a href="/" class="nav-logo">INTERIOR COMPARE</a>'
      + '<div class="nav-tabs">'
      + '<a href="/sofa-compare.html" class="nav-tab' + on('/sofa-compare.html') + '">🛋 소파 비교</a>'
      + '<a href="/chair-compare.html" class="nav-tab' + on('/chair-compare.html') + '">💺 의자 비교</a>'
      + '<a href="/bed-compare.html" class="nav-tab' + on('/bed-compare.html') + '">🛏 침대 비교</a>'
      + '<a href="/table-compare.html" class="nav-tab' + on('/table-compare.html') + '">🍽 식탁 비교</a>'
      + '</div></div></nav>';
  }
});
