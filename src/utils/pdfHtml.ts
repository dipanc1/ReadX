/**
 * Generates the HTML page that loads PDF.js and renders the PDF
 * inside a WebView. Each word in the text layer is made tappable
 * and sends a postMessage back to React Native.
 */
export function getPdfViewerHtml(base64Data: string, startPage: number = 1, pdfName: string = '', statusBarHeight: number = 0): string {
  const safeTitle = pdfName.replace(/'/g, "\\'").replace('.pdf', '');
  const sbH = Math.round(statusBarHeight);
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0, user-scalable=yes" />
  <title>ReadX PDF Viewer</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      background: #0F172A;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      overflow-x: hidden;
      -webkit-tap-highlight-color: transparent;
    }

    /* ─── Toolbar ─── */
    #toolbar {
      position: fixed;
      top: 0; left: 0; right: 0;
      height: ${72 + sbH}px;
      background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%);
      display: flex;
      align-items: center;
      gap: 8px;
      z-index: 100;
      padding: ${sbH}px 12px 0 12px;
      border-bottom: 1px solid rgba(99, 102, 241, 0.15);
      transition: transform 0.3s ease;
    }
    #toolbar.hidden { transform: translateY(-100%); }

    #backBtn {
      background: none; border: none; color: #E2E8F0;
      padding: 10px; display: flex; align-items: center;
      cursor: pointer; -webkit-tap-highlight-color: transparent;
      flex-shrink: 0;
    }
    #backBtn:active { opacity: 0.6; }

    #pdfTitle {
      color: #E2E8F0; font-size: 17px; font-weight: 700;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      flex: 1; min-width: 0;
      letter-spacing: 0.3px;
    }

    .tb-divider {
      width: 1px; height: 32px;
      background: rgba(255,255,255,0.1);
      margin: 0 4px; flex-shrink: 0;
    }

    .tb-btn {
      background: rgba(255,255,255,0.06);
      color: #CBD5E1; border: none; border-radius: 12px;
      width: 36px; height: 36px; cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.15s;
      flex-shrink: 0;
    }
    .tb-btn:active { background: rgba(99, 102, 241, 0.18); }
    .tb-btn:disabled { opacity: 0.2; }

    #pageInfo {
      color: #CBD5E1; font-size: 14px; font-weight: 600;
      min-width: 72px; text-align: center; letter-spacing: 0.3px;
      cursor: pointer; padding: 8px 10px; border-radius: 10px;
      transition: background 0.15s;
    }
    #pageInfo:active { background: rgba(99, 102, 241, 0.12); }

    /* ─── Search bar ─── */
    #searchBar {
      position: fixed;
      top: -${78 + sbH}px; left: 0; right: 0;
      height: ${72 + sbH}px;
      background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%);
      display: flex;
      align-items: center;
      gap: 8px;
      z-index: 101;
      padding: ${sbH}px 12px 0 12px;
      border-bottom: 1px solid rgba(99, 102, 241, 0.15);
      transition: top 0.3s ease;
    }
    #searchBar.show { top: 0; }

    #searchInput {
      flex: 1;
      background: #0F172A;
      border: 1.5px solid rgba(99, 102, 241, 0.15);
      border-radius: 12px;
      padding: 10px 14px;
      color: #F1F5F9;
      font-size: 15px;
      outline: none;
      -webkit-appearance: none;
      transition: border-color 0.15s;
    }
    #searchInput:focus { border-color: #6366F1; }
    #searchInput::placeholder { color: #475569; }

    #searchInfo {
      color: #64748B; font-size: 12px; font-weight: 600;
      min-width: 40px; text-align: center;
    }

    .search-nav-btn {
      background: rgba(255,255,255,0.06);
      color: #CBD5E1; border: none; border-radius: 10px;
      width: 34px; height: 34px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      transition: background 0.15s;
    }
    .search-nav-btn:active { background: rgba(99, 102, 241, 0.18); }

    .search-close-btn {
      background: rgba(255,255,255,0.06); border: none; color: #94A3B8;
      width: 34px; height: 34px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      transition: background 0.15s;
    }
    .search-close-btn:active { background: rgba(239, 68, 68, 0.15); color: #F87171; }

    /* ─── Container ─── */
    #container {
      margin-top: ${78 + sbH}px;
      display: flex; flex-direction: column; align-items: center;
      padding-bottom: 40px;
    }

    .page-wrapper {
      position: relative; margin: 6px auto;
      background: white;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      border-radius: 4px; overflow: hidden;
    }
    .page-wrapper canvas { display: block; }

    .text-layer {
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      overflow: hidden;
    }

    .text-layer span {
      position: absolute; color: transparent;
      cursor: pointer; white-space: pre; overflow: hidden;
      transform-origin: 0 0;
      -webkit-tap-highlight-color: transparent;
      border-radius: 2px;
    }
    .text-layer span:active { background: rgba(99, 102, 241, 0.15); }

    .text-layer span.word-highlight {
      background: rgba(99, 102, 241, 0.35);
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
      border-radius: 3px;
    }

    .text-layer span.search-match {
      background: rgba(251, 191, 36, 0.35) !important;
    }
    .text-layer span.search-match-active {
      background: rgba(251, 146, 36, 0.55) !important;
      box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.3);
    }

    /* ─── Loading ─── */
    #loading {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      background: #0F172A; z-index: 200;
      color: #818CF8; font-size: 16px; font-weight: 500;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .spinner {
      width: 44px; height: 44px;
      border: 3px solid #1E293B; border-top-color: #818CF8;
      border-radius: 50%; animation: spin 0.7s linear infinite;
      margin-bottom: 16px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loading-sub { color: #64748B; font-size: 13px; margin-top: 6px; }

    /* ─── Go-to-page overlay ─── */
    #gotoOverlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.6); z-index: 300;
      display: none; align-items: center; justify-content: center;
    }
    #gotoOverlay.show { display: flex; }

    .goto-card {
      background: #1E293B; border-radius: 20px;
      padding: 28px 24px 24px; width: 280px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      border: 1px solid rgba(99, 102, 241, 0.15);
    }
    .goto-title {
      color: #F1F5F9; font-size: 18px; font-weight: 700;
      margin-bottom: 6px; text-align: center;
    }
    .goto-sub {
      color: #64748B; font-size: 13px;
      text-align: center; margin-bottom: 20px;
    }
    .goto-input {
      width: 100%; background: #0F172A;
      border: 1.5px solid rgba(99, 102, 241, 0.3);
      border-radius: 12px; padding: 14px 16px;
      color: #F1F5F9; font-size: 20px; font-weight: 600;
      text-align: center; outline: none;
      -webkit-appearance: none; margin-bottom: 18px;
    }
    .goto-input:focus {
      border-color: #6366F1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
    }
    .goto-actions { display: flex; gap: 10px; }
    .goto-cancel {
      flex: 1; padding: 12px; border-radius: 12px;
      background: rgba(255,255,255,0.06);
      color: #94A3B8; border: none; font-size: 15px; font-weight: 600;
      cursor: pointer;
    }
    .goto-go {
      flex: 1; padding: 12px; border-radius: 12px;
      background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%);
      color: white; border: none; font-size: 15px; font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);
    }
  </style>
</head>
<body>
  <div id="loading">
    <div class="spinner"></div>
    Loading PDF...
    <div class="loading-sub">Preparing your document</div>
  </div>

  <div id="toolbar">
    <button id="backBtn" onclick="goBack()">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
        <path d="M15 18l-6-6 6-6"/>
      </svg>
    </button>
    <span id="pdfTitle">${safeTitle}</span>
    <div class="tb-divider"></div>
    <button class="tb-btn" id="prevBtn" onclick="prevPage()">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
    </button>
    <span id="pageInfo" onclick="openGoToPage()">-</span>
    <button class="tb-btn" id="nextBtn" onclick="nextPage()">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
    </button>
    <div class="tb-divider"></div>
    <button class="tb-btn" onclick="openSearch()" title="Search">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
    </button>
  </div>

  <!-- Search bar (slides in from top, replaces toolbar) -->
  <div id="searchBar">
    <input id="searchInput" type="text" placeholder="Search in document..." oninput="onSearchInput()" onkeydown="if(event.key==='Enter')searchNext()" />
    <span id="searchInfo"></span>
    <button class="search-nav-btn" onclick="searchPrev()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
    </button>
    <button class="search-nav-btn" onclick="searchNext()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
    </button>
    <button class="search-close-btn" onclick="closeSearch()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
    </button>
  </div>

  <div id="container"></div>

  <!-- Go-to-page overlay -->
  <div id="gotoOverlay" onclick="closeGoToPage(event)">
    <div class="goto-card" onclick="event.stopPropagation()">
      <div class="goto-title">Go to Page</div>
      <div class="goto-sub" id="gotoSub">Enter page number (1 - ?)</div>
      <input
        id="gotoInput"
        class="goto-input"
        type="number"
        min="1"
        inputmode="numeric"
        placeholder="Page #"
        onkeydown="if(event.key==='Enter')goToPage()"
      />
      <div class="goto-actions">
        <button class="goto-cancel" onclick="closeGoToPage()">Cancel</button>
        <button class="goto-go" onclick="goToPage()">Go</button>
      </div>
    </div>
  </div>

  <script>
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    let pdfDoc = null;
    let currentPage = ${startPage};
    let totalPages = 0;
    let rendering = false;
    let isFullscreen = false;
    let autoFullscreen = false; // tracks auto-hide triggered by scroll
    let initDone = false; // suppress auto-fullscreen until initial load finishes
    let lastScrollY = 0;
    let scrollDelta = 0;
    const SCROLL_THRESHOLD = 30; // px of scroll before toggling
    // Render at native DPR with a floor of 3× for crisp text on all devices
    const DPR = Math.max(window.devicePixelRatio || 2, 3);
    const renderedPages = new Set();
    const START_PAGE = ${startPage};

    // Search state
    let searchMatches = [];
    let currentMatchIdx = -1;
    let searchOpen = false;
    const pageTextCache = {};

    // Measurement canvas for accurate proportional word positioning
    const _mc = document.createElement('canvas');
    const _mx = _mc.getContext('2d');

    // Decode base64 PDF data
    const pdfData = atob('${base64Data}');
    const uint8Array = new Uint8Array(pdfData.length);
    for (let i = 0; i < pdfData.length; i++) {
      uint8Array[i] = pdfData.charCodeAt(i);
    }

    async function init() {
      try {
        pdfDoc = await pdfjsLib.getDocument({ data: uint8Array }).promise;
        totalPages = pdfDoc.numPages;
        document.getElementById('loading').style.display = 'none';
        updatePageInfo();

        // 1. Render the START page first so it's visible instantly
        await renderPage(START_PAGE);
        scrollToPage(START_PAGE, false);
        sendPageChange();

        // 2. Lazily render nearby pages in the background
        const nearby = [];
        for (let i = Math.max(1, START_PAGE - 3); i <= Math.min(START_PAGE + 3, totalPages); i++) {
          if (i !== START_PAGE) nearby.push(i);
        }
        for (const p of nearby) {
          await renderPage(p);
          await new Promise(r => setTimeout(r, 0));
        }

        // 3. Re-anchor scroll — nearby pages inserted above may have shifted layout
        scrollToPage(START_PAGE, false);

        // 4. Now allow auto-fullscreen on scroll
        lastScrollY = window.scrollY;
        scrollDelta = 0;
        initDone = true;

      } catch (err) {
        document.getElementById('loading').innerHTML =
          '<span style="color:#F87171">Error loading PDF: ' + err.message + '</span>';
      }
    }

    async function renderPage(pageNum) {
      if (renderedPages.has(pageNum)) return;
      renderedPages.add(pageNum);

      const page = await pdfDoc.getPage(pageNum);
      const screenWidth = window.innerWidth - 12;

      // Get the base viewport at scale 1 to know the PDF page's natural size
      const baseViewport = page.getViewport({ scale: 1 });

      // Calculate the CSS display scale to fit page width to screen
      const cssScale = screenWidth / baseViewport.width;

      // Render scale = CSS display size × devicePixelRatio for pixel-perfect output
      const renderScale = cssScale * DPR;
      const renderViewport = page.getViewport({ scale: renderScale });

      // For text positioning math, use a scale relative to renderViewport
      const SCALE = renderScale;
      const displayScale = screenWidth / renderViewport.width;

      // Check if a placeholder wrapper already exists (from page unloading)
      let wrapper = document.getElementById('page-' + pageNum);
      const isExisting = !!wrapper;

      if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.className = 'page-wrapper';
        wrapper.id = 'page-' + pageNum;
      } else {
        // Clear placeholder contents so we can repopulate
        wrapper.innerHTML = '';
      }

      wrapper.style.width = screenWidth + 'px';
      wrapper.style.height = (renderViewport.height * displayScale) + 'px';

      const canvas = document.createElement('canvas');
      canvas.width = renderViewport.width;
      canvas.height = renderViewport.height;
      // Set CSS size explicitly so canvas pixels map 1:1 to physical screen pixels
      canvas.style.width = screenWidth + 'px';
      canvas.style.height = (renderViewport.height * displayScale) + 'px';
      wrapper.appendChild(canvas);

      const textDiv = document.createElement('div');
      textDiv.className = 'text-layer';
      wrapper.appendChild(textDiv);

      // Insert in correct page order (only if this is a brand new wrapper)
      if (!isExisting) {
        const container = document.getElementById('container');
        const existingPages = container.querySelectorAll('.page-wrapper');
        let inserted = false;
        for (let i = 0; i < existingPages.length; i++) {
          const existingNum = parseInt(existingPages[i].id.split('-')[1]);
          if (pageNum < existingNum) {
            container.insertBefore(wrapper, existingPages[i]);
            inserted = true;
            break;
          }
        }
        if (!inserted) container.appendChild(wrapper);
      }

      const ctx = canvas.getContext('2d', { alpha: false });
      // Fill white immediately so the canvas never flashes black while rendering
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      await page.render({
        canvasContext: ctx,
        viewport: renderViewport,
      }).promise;

      // ── Build text layer with proportional word positioning ──
      const textContent = await page.getTextContent();
      let fullPageText = '';

      textContent.items.forEach((item) => {
        if (!item.str || !item.str.trim()) return;
        fullPageText += item.str + ' ';

        const tx = pdfjsLib.Util.transform(renderViewport.transform, item.transform);
        const fontHeight = item.height * SCALE;

        // Use canvas measurement for proportional character widths
        _mx.font = fontHeight + 'px sans-serif';
        const measuredTotal = _mx.measureText(item.str).width;
        const actualTotal = item.width * SCALE;
        const wScale = measuredTotal > 0 ? actualTotal / measuredTotal : 1;

        // Extract words with regex to get correct string indices
        const wordRe = /\\S+/g;
        let m;
        while ((m = wordRe.exec(item.str)) !== null) {
          const word = m[0];
          const textBefore = item.str.substring(0, m.index);
          const measuredBefore = _mx.measureText(textBefore).width;
          const measuredWord = _mx.measureText(word).width;

          const wordX = tx[4] + (measuredBefore * wScale);
          const wordW = measuredWord * wScale;
          const wordY = tx[5] - (fontHeight * 0.85);

          const span = document.createElement('span');
          span.textContent = word;
          span.style.left = (wordX * displayScale) + 'px';
          span.style.top = (wordY * displayScale) + 'px';
          span.style.width = (wordW * displayScale) + 'px';
          span.style.height = (fontHeight * displayScale) + 'px';
          span.style.fontSize = (fontHeight * displayScale * 0.9) + 'px';
          span.style.lineHeight = (fontHeight * displayScale) + 'px';

          span.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.word-highlight').forEach(el =>
              el.classList.remove('word-highlight')
            );
            span.classList.add('word-highlight');
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'wordTapped',
              word: word
            }));
            // Auto-remove highlight after 5 seconds as fallback
            setTimeout(() => span.classList.remove('word-highlight'), 5000);
          });

          textDiv.appendChild(span);
        }
      });

      pageTextCache[pageNum] = fullPageText;
    }

    function updatePageInfo() {
      document.getElementById('pageInfo').textContent =
        currentPage + ' / ' + totalPages;
      document.getElementById('prevBtn').disabled = currentPage <= 1;
      document.getElementById('nextBtn').disabled = currentPage >= totalPages;
    }

    function sendPageChange() {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'pageChanged',
        page: currentPage,
        totalPages: totalPages
      }));
    }

    async function prevPage() {
      if (currentPage <= 1) return;
      currentPage--;
      for (let i = Math.max(1, currentPage - 2); i <= currentPage; i++) {
        await renderPage(i);
      }
      updatePageInfo();
      scrollToPage(currentPage);
      sendPageChange();
    }

    async function nextPage() {
      if (currentPage >= totalPages) return;
      currentPage++;
      for (let i = currentPage; i <= Math.min(currentPage + 2, totalPages); i++) {
        await renderPage(i);
      }
      updatePageInfo();
      scrollToPage(currentPage);
      sendPageChange();
    }

    function scrollToPage(num, smooth) {
      const el = document.getElementById('page-' + num);
      if (!el) return;
      const toolbarH = ${78 + sbH};
      const top = el.offsetTop - toolbarH;
      window.scrollTo({ top: Math.max(0, top), behavior: smooth !== false ? 'smooth' : 'instant' });
    }

    /* ─── Go-to-page ─── */
    function openGoToPage() {
      document.getElementById('gotoSub').textContent =
        'Enter page number (1 \\u2013 ' + totalPages + ')';
      const input = document.getElementById('gotoInput');
      input.max = totalPages;
      input.value = '';
      input.placeholder = currentPage;
      document.getElementById('gotoOverlay').classList.add('show');
      setTimeout(() => input.focus(), 100);
    }

    function closeGoToPage(e) {
      if (e && e.target !== document.getElementById('gotoOverlay')) return;
      document.getElementById('gotoOverlay').classList.remove('show');
    }

    async function goToPage() {
      const input = document.getElementById('gotoInput');
      let page = parseInt(input.value, 10);
      if (isNaN(page)) page = currentPage;
      page = Math.max(1, Math.min(page, totalPages));

      for (let i = Math.max(1, page - 2); i <= Math.min(page + 3, totalPages); i++) {
        await renderPage(i);
      }

      currentPage = page;
      updatePageInfo();
      scrollToPage(page);
      sendPageChange();
      document.getElementById('gotoOverlay').classList.remove('show');
    }

    /* ─── Go back to home ─── */
    function goBack() {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'goBack' }));
    }

    /* ─── Fullscreen toggle ─── */
    function toggleFullscreen() {
      isFullscreen = !isFullscreen;
      autoFullscreen = false; // manual toggle resets auto state
      applyFullscreenState();
    }

    function setAutoFullscreen(enterFullscreen) {
      if (!initDone) return; // don't auto-toggle during initial load
      if (searchOpen) return; // don't auto-toggle during search
      if (enterFullscreen === isFullscreen) return; // already in desired state
      isFullscreen = enterFullscreen;
      autoFullscreen = enterFullscreen;
      // Only toggle WebView toolbar — don't notify RN (avoids re-renders & lag)
      document.getElementById('toolbar').classList.toggle('hidden', isFullscreen);
    }

    function applyFullscreenState() {
      document.getElementById('toolbar').classList.toggle('hidden', isFullscreen);
      // Only manual toggles notify RN (for StatusBar / BackHandler)
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'fullscreenChanged',
        isFullscreen: isFullscreen
      }));
    }

    /* ─── Search ─── */
    function openSearch() {
      searchOpen = true;
      document.getElementById('searchBar').classList.add('show');
      document.getElementById('toolbar').classList.add('hidden');
      document.getElementById('container').style.marginTop = '78px';
      setTimeout(() => document.getElementById('searchInput').focus(), 150);
    }

    function closeSearch() {
      searchOpen = false;
      document.getElementById('searchBar').classList.remove('show');
      // Only show toolbar if NOT in fullscreen mode
      if (!isFullscreen) {
        document.getElementById('toolbar').classList.remove('hidden');
      }
      document.getElementById('container').style.marginTop = '';
      document.getElementById('searchInput').value = '';
      document.getElementById('searchInfo').textContent = '';
      clearSearchHighlights();
      searchMatches = [];
      currentMatchIdx = -1;
    }

    let searchDebounce;
    function onSearchInput() {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => performSearch(), 300);
    }

    function clearSearchHighlights() {
      document.querySelectorAll('.search-match, .search-match-active').forEach(el => {
        el.classList.remove('search-match', 'search-match-active');
      });
    }

    async function performSearch() {
      const query = document.getElementById('searchInput').value.trim().toLowerCase();
      clearSearchHighlights();
      searchMatches = [];
      currentMatchIdx = -1;

      if (!query) {
        document.getElementById('searchInfo').textContent = '';
        return;
      }

      document.getElementById('searchInfo').textContent = 'Searching...';

      // Phase 1: Instantly search already-cached pages
      for (let p = 1; p <= totalPages; p++) {
        if (pageTextCache[p] && pageTextCache[p].toLowerCase().indexOf(query) !== -1) {
          searchMatches.push(p);
        }
      }

      // Show immediate results if any
      if (searchMatches.length > 0) {
        currentMatchIdx = 0;
        await navigateToMatch();
      }

      // Phase 2: Extract uncached pages in small batches (non-blocking)
      const uncached = [];
      for (let p = 1; p <= totalPages; p++) {
        if (!pageTextCache[p]) uncached.push(p);
      }

      const BATCH = 5;
      for (let b = 0; b < uncached.length; b += BATCH) {
        // Check if query changed while we were working
        const currentQuery = document.getElementById('searchInput').value.trim().toLowerCase();
        if (currentQuery !== query) return;

        const batch = uncached.slice(b, b + BATCH);
        await Promise.all(batch.map(async (p) => {
          const pg = await pdfDoc.getPage(p);
          const tc = await pg.getTextContent();
          pageTextCache[p] = tc.items.map(it => it.str).join(' ');
          if (pageTextCache[p].toLowerCase().indexOf(query) !== -1) {
            if (!searchMatches.includes(p)) searchMatches.push(p);
          }
        }));

        // Sort matches by page order
        searchMatches.sort((a, b) => a - b);

        // Update count live
        if (searchMatches.length > 0 && currentMatchIdx === -1) {
          currentMatchIdx = 0;
          await navigateToMatch();
        } else if (searchMatches.length > 0) {
          document.getElementById('searchInfo').textContent =
            (currentMatchIdx + 1) + ' of ' + searchMatches.length;
        }

        // Yield to keep UI responsive
        await new Promise(r => setTimeout(r, 0));
      }

      if (searchMatches.length === 0) {
        document.getElementById('searchInfo').textContent = 'No results';
      } else {
        document.getElementById('searchInfo').textContent =
          (currentMatchIdx + 1) + ' of ' + searchMatches.length;
      }
    }

    async function navigateToMatch() {
      if (searchMatches.length === 0) return;
      const page = searchMatches[currentMatchIdx];
      document.getElementById('searchInfo').textContent =
        (currentMatchIdx + 1) + ' of ' + searchMatches.length;

      // Render the target page and neighbors
      for (let i = Math.max(1, page - 1); i <= Math.min(page + 2, totalPages); i++) {
        await renderPage(i);
      }

      currentPage = page;
      updatePageInfo();
      scrollToPage(page);
      sendPageChange();

      // Highlight matching words on the active match page
      clearSearchHighlights();
      const query = document.getElementById('searchInput').value.trim().toLowerCase();
      const wrapper = document.getElementById('page-' + page);
      if (wrapper) {
        const spans = wrapper.querySelectorAll('.text-layer span');
        spans.forEach(sp => {
          if (sp.textContent.toLowerCase().indexOf(query) !== -1) {
            sp.classList.add('search-match-active');
          }
        });
      }

      // Light highlight on other visible match pages
      searchMatches.forEach((mp, idx) => {
        if (idx === currentMatchIdx) return;
        const w = document.getElementById('page-' + mp);
        if (w) {
          w.querySelectorAll('.text-layer span').forEach(sp => {
            if (sp.textContent.toLowerCase().indexOf(query) !== -1) {
              sp.classList.add('search-match');
            }
          });
        }
      });
    }

    async function searchNext() {
      if (searchMatches.length === 0) {
        await performSearch();
        return;
      }
      currentMatchIdx = (currentMatchIdx + 1) % searchMatches.length;
      await navigateToMatch();
    }

    async function searchPrev() {
      if (searchMatches.length === 0) return;
      currentMatchIdx = (currentMatchIdx - 1 + searchMatches.length) % searchMatches.length;
      await navigateToMatch();
    }

    // ─── Scroll detection with bidirectional lazy page rendering ───
    const MAX_RENDERED_PAGES = 10; // Keep at most 10 pages in DOM to save memory

    function unloadDistantPages() {
      if (renderedPages.size <= MAX_RENDERED_PAGES) return;
      const pagesToKeep = new Set();
      for (let i = Math.max(1, currentPage - 4); i <= Math.min(currentPage + 4, totalPages); i++) {
        pagesToKeep.add(i);
      }

      const toRemove = [];
      renderedPages.forEach(p => {
        if (!pagesToKeep.has(p)) toRemove.push(p);
      });

      // Sort by distance from current page, remove furthest first
      toRemove.sort((a, b) => Math.abs(b - currentPage) - Math.abs(a - currentPage));
      const removeCount = renderedPages.size - MAX_RENDERED_PAGES;

      for (let i = 0; i < Math.min(removeCount, toRemove.length); i++) {
        const pageNum = toRemove[i];
        const wrapper = document.getElementById('page-' + pageNum);
        if (wrapper) {
          // Keep the wrapper div (preserves scroll position) but clear its heavy children
          const w = wrapper.style.width;
          const h = wrapper.style.height;
          wrapper.innerHTML = '';
          wrapper.style.width = w;
          wrapper.style.height = h;
        }
        renderedPages.delete(pageNum);
      }
    }

    let scrollTimeout;
    let scrollRenderAbort = 0; // incremented to cancel stale scroll renders
    window.addEventListener('scroll', () => {
      /* ─── Auto-fullscreen on scroll direction ─── */
      const sy = window.scrollY;
      const delta = sy - lastScrollY;
      // Accumulate in same direction, reset on direction change
      if ((delta > 0 && scrollDelta > 0) || (delta < 0 && scrollDelta < 0)) {
        scrollDelta += delta;
      } else {
        scrollDelta = delta;
      }
      lastScrollY = sy;

      if (scrollDelta > SCROLL_THRESHOLD && !isFullscreen) {
        setAutoFullscreen(true);
        scrollDelta = 0;
      } else if (scrollDelta < -SCROLL_THRESHOLD && isFullscreen && autoFullscreen) {
        setAutoFullscreen(false);
        scrollDelta = 0;
      }

      /* ─── Page tracking & rendering ─── */
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(async () => {
        const pages = document.querySelectorAll('.page-wrapper');
        let closest = 1;
        let closestDist = Infinity;

        pages.forEach((page) => {
          const rect = page.getBoundingClientRect();
          const dist = Math.abs(rect.top - 78);
          if (dist < closestDist) {
            closestDist = dist;
            closest = parseInt(page.id.split('-')[1]);
          }
        });

        if (closest !== currentPage) {
          currentPage = closest;
          updatePageInfo();
          sendPageChange();

          // Cancel any previous scroll-render batch
          const thisRender = ++scrollRenderAbort;

          // Render pages in BOTH directions, yielding between each
          for (let i = Math.max(1, currentPage - 3); i <= Math.min(currentPage + 3, totalPages); i++) {
            if (scrollRenderAbort !== thisRender) break; // user scrolled again, abandon
            await renderPage(i);
            await new Promise(r => setTimeout(r, 0)); // yield to browser
          }

          // Free memory from distant pages
          unloadDistantPages();
        }
      }, 100);
    });

    init();
  </script>
</body>
</html>
  `.trim();
}
