/**
 * Generates the HTML page that loads PDF.js and renders the PDF
 * inside a WebView. Each word in the text layer is made tappable
 * and sends a postMessage back to React Native.
 */
export function getPdfViewerHtml(base64Data: string, startPage: number = 1): string {
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
      top: 0;
      left: 0;
      right: 0;
      height: 52px;
      background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      z-index: 100;
      padding: 0 12px;
      border-bottom: 1px solid rgba(99, 102, 241, 0.15);
      transition: transform 0.3s ease;
    }

    #toolbar.hidden {
      transform: translateY(-100%);
    }

    .tb-btn {
      background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%);
      color: white;
      border: none;
      border-radius: 10px;
      padding: 8px 14px;
      font-size: 14px;
      cursor: pointer;
      min-width: 38px;
      box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
      -webkit-tap-highlight-color: transparent;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .tb-btn:active { transform: scale(0.94); }
    .tb-btn:disabled { opacity: 0.3; box-shadow: none; }

    .tb-btn-ghost {
      background: rgba(255,255,255,0.08);
      box-shadow: none;
      padding: 8px 10px;
      min-width: 34px;
    }

    #pageInfo {
      color: #CBD5E1;
      font-size: 14px;
      font-weight: 600;
      min-width: 80px;
      text-align: center;
      letter-spacing: 0.5px;
      cursor: pointer;
      padding: 6px 10px;
      border-radius: 8px;
      transition: background 0.2s;
    }
    #pageInfo:active {
      background: rgba(99, 102, 241, 0.15);
    }

    .tb-spacer { flex: 1; }

    /* ─── Floating restore button (shown when toolbar hidden) ─── */
    #restoreBtn {
      position: fixed;
      top: 10px;
      right: 10px;
      width: 40px;
      height: 40px;
      background: rgba(30, 41, 59, 0.92);
      border: 1px solid rgba(99, 102, 241, 0.25);
      border-radius: 12px;
      color: #818CF8;
      font-size: 20px;
      display: none;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 120;
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
      -webkit-tap-highlight-color: transparent;
    }
    #restoreBtn.show { display: flex; }

    /* ─── Container ─── */
    #container {
      margin-top: 60px;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding-bottom: 40px;
      transition: margin-top 0.3s ease;
    }
    #container.fullscreen { margin-top: 8px; }

    .page-wrapper {
      position: relative;
      margin: 6px auto;
      background: white;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      border-radius: 4px;
      overflow: hidden;
    }

    .page-wrapper canvas {
      display: block;
      width: 100%;
      height: auto;
    }

    .text-layer {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      overflow: hidden;
    }

    .text-layer span {
      position: absolute;
      color: transparent;
      cursor: pointer;
      white-space: pre;
      transform-origin: 0 0;
      -webkit-tap-highlight-color: transparent;
      border-radius: 2px;
    }

    .text-layer span:active {
      background: rgba(99, 102, 241, 0.15);
    }

    .text-layer span.word-highlight {
      background: rgba(99, 102, 241, 0.3);
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
      border-radius: 3px;
    }

    /* ─── Loading ─── */
    #loading {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #0F172A;
      z-index: 200;
      color: #818CF8;
      font-size: 16px;
      font-weight: 500;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    .spinner {
      width: 44px; height: 44px;
      border: 3px solid #1E293B;
      border-top-color: #818CF8;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      margin-bottom: 16px;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .loading-sub { color: #64748B; font-size: 13px; margin-top: 6px; }

    /* ─── Go-to-page overlay ─── */
    #gotoOverlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.6);
      z-index: 300;
      display: none;
      align-items: center;
      justify-content: center;
    }
    #gotoOverlay.show { display: flex; }

    .goto-card {
      background: #1E293B;
      border-radius: 20px;
      padding: 28px 24px 24px;
      width: 280px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      border: 1px solid rgba(99, 102, 241, 0.15);
    }

    .goto-title {
      color: #F1F5F9;
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 6px;
      text-align: center;
    }

    .goto-sub {
      color: #64748B;
      font-size: 13px;
      text-align: center;
      margin-bottom: 20px;
    }

    .goto-input {
      width: 100%;
      background: #0F172A;
      border: 1.5px solid rgba(99, 102, 241, 0.3);
      border-radius: 12px;
      padding: 14px 16px;
      color: #F1F5F9;
      font-size: 20px;
      font-weight: 600;
      text-align: center;
      outline: none;
      -webkit-appearance: none;
      margin-bottom: 18px;
    }

    .goto-input:focus {
      border-color: #6366F1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
    }

    .goto-actions {
      display: flex;
      gap: 10px;
    }

    .goto-cancel {
      flex: 1;
      padding: 12px;
      border-radius: 12px;
      background: rgba(255,255,255,0.06);
      color: #94A3B8;
      border: none;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
    }

    .goto-go {
      flex: 1;
      padding: 12px;
      border-radius: 12px;
      background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%);
      color: white;
      border: none;
      font-size: 15px;
      font-weight: 700;
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
    <button class="tb-btn" id="prevBtn" onclick="prevPage()">&#9664;</button>
    <span id="pageInfo" onclick="openGoToPage()">-</span>
    <button class="tb-btn" id="nextBtn" onclick="nextPage()">&#9654;</button>
    <span class="tb-spacer"></span>
    <button class="tb-btn tb-btn-ghost" id="fullscreenBtn" onclick="toggleFullscreen()" title="Toggle toolbar">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path id="fsIcon" d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/>
      </svg>
    </button>
  </div>

  <button id="restoreBtn" onclick="toggleFullscreen()">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/>
    </svg>
  </button>

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
    const SCALE = 2.0;
    const renderedPages = new Set();
    const START_PAGE = ${startPage};

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
        
        // Render pages around the start page
        const renderStart = Math.max(1, START_PAGE - 1);
        const renderEnd = Math.min(renderStart + 4, totalPages);
        
        for (let i = renderStart; i <= renderEnd; i++) {
          await renderPage(i);
        }
        
        // Scroll to start page after rendering
        if (START_PAGE > 1) {
          setTimeout(() => scrollToPage(START_PAGE), 300);
        }
        
        sendPageChange();
      } catch (err) {
        document.getElementById('loading').innerHTML = 
          '<span style="color:#F87171">Error loading PDF: ' + err.message + '</span>';
      }
    }

    async function renderPage(pageNum) {
      if (renderedPages.has(pageNum)) return;
      renderedPages.add(pageNum);

      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: SCALE });
      const screenWidth = window.innerWidth - 12;
      const displayScale = screenWidth / viewport.width;

      // Create page wrapper
      const wrapper = document.createElement('div');
      wrapper.className = 'page-wrapper';
      wrapper.id = 'page-' + pageNum;
      wrapper.style.width = screenWidth + 'px';
      wrapper.style.height = (viewport.height * displayScale) + 'px';

      // Canvas
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      wrapper.appendChild(canvas);

      // Text layer
      const textDiv = document.createElement('div');
      textDiv.className = 'text-layer';
      wrapper.appendChild(textDiv);

      // Insert in correct order
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
      if (!inserted) {
        container.appendChild(wrapper);
      }

      // Render canvas
      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;

      // Render text layer for word tapping
      const textContent = await page.getTextContent();
      
      textContent.items.forEach((item) => {
        if (!item.str || !item.str.trim()) return;

        const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
        
        // Split text into individual words
        const words = item.str.split(/\\s+/);
        let charOffset = 0;

        words.forEach((word) => {
          if (!word.trim()) {
            charOffset += word.length + 1;
            return;
          }

          const span = document.createElement('span');
          span.textContent = word;
          
          // Approximate word position
          const charWidth = (item.width / item.str.length) * SCALE;
          const wordX = tx[4] + (charOffset * (item.width / item.str.length) * SCALE);
          const wordY = tx[5] - (item.height * SCALE * 0.85);

          span.style.left = (wordX * displayScale) + 'px';
          span.style.top = (wordY * displayScale) + 'px';
          span.style.fontSize = (item.height * SCALE * displayScale * 0.9) + 'px';

          span.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Remove previous highlights
            document.querySelectorAll('.word-highlight').forEach(el => 
              el.classList.remove('word-highlight')
            );
            span.classList.add('word-highlight');

            // Send word to React Native
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'wordTapped',
              word: word
            }));
          });

          textDiv.appendChild(span);
          charOffset += word.length + 1;
        });
      });
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
      for (let i = Math.max(1, currentPage - 1); i <= currentPage; i++) {
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

    function scrollToPage(num) {
      const el = document.getElementById('page-' + num);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
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

      // Render target and neighbours
      for (let i = Math.max(1, page - 1); i <= Math.min(page + 3, totalPages); i++) {
        await renderPage(i);
      }

      currentPage = page;
      updatePageInfo();
      scrollToPage(page);
      sendPageChange();
      document.getElementById('gotoOverlay').classList.remove('show');
    }

    /* ─── Fullscreen toggle ─── */
    function toggleFullscreen() {
      isFullscreen = !isFullscreen;
      document.getElementById('toolbar').classList.toggle('hidden', isFullscreen);
      document.getElementById('container').classList.toggle('fullscreen', isFullscreen);
      document.getElementById('restoreBtn').classList.toggle('show', isFullscreen);

      // Notify RN to hide/show header
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'fullscreenChanged',
        isFullscreen: isFullscreen
      }));
    }

    // Detect scroll to update current page
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const pages = document.querySelectorAll('.page-wrapper');
        let closest = 1;
        let closestDist = Infinity;
        
        pages.forEach((page) => {
          const rect = page.getBoundingClientRect();
          const dist = Math.abs(rect.top - 60);
          if (dist < closestDist) {
            closestDist = dist;
            closest = parseInt(page.id.split('-')[1]);
          }
        });

        if (closest !== currentPage) {
          currentPage = closest;
          updatePageInfo();
          sendPageChange();
          
          for (let i = currentPage; i <= Math.min(currentPage + 3, totalPages); i++) {
            renderPage(i);
          }
        }
      }, 150);
    });

    init();
  </script>
</body>
</html>
  `.trim();
}
