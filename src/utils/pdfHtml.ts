/**
 * Generates the HTML page that loads PDF.js and renders the PDF
 * inside a WebView. Each word in the text layer is made tappable
 * and sends a postMessage back to React Native.
 */
export function getPdfViewerHtml(base64Data: string): string {
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
      background: #1a1a2e;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      overflow-x: hidden;
    }

    #toolbar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 48px;
      background: #16213e;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      z-index: 100;
      padding: 0 16px;
      border-bottom: 1px solid #334155;
    }

    #toolbar button {
      background: #4F46E5;
      color: white;
      border: none;
      border-radius: 6px;
      padding: 6px 14px;
      font-size: 14px;
      cursor: pointer;
      min-width: 36px;
    }

    #toolbar button:disabled {
      opacity: 0.4;
    }

    #pageInfo {
      color: #94A3B8;
      font-size: 14px;
      min-width: 80px;
      text-align: center;
    }

    #container {
      margin-top: 56px;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding-bottom: 40px;
    }

    .page-wrapper {
      position: relative;
      margin: 8px auto;
      background: white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }

    .page-wrapper canvas {
      display: block;
      width: 100%;
      height: auto;
    }

    .text-layer {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      overflow: hidden;
    }

    .text-layer span {
      position: absolute;
      color: transparent;
      cursor: pointer;
      white-space: pre;
      transform-origin: 0 0;
    }

    .text-layer span.word-highlight {
      background: rgba(79, 70, 229, 0.25);
      border-radius: 2px;
    }

    #loading {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #1a1a2e;
      z-index: 200;
      color: #818CF8;
      font-size: 18px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #334155;
      border-top-color: #818CF8;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-right: 12px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div id="loading">
    <div class="spinner"></div>
    Loading PDF...
  </div>

  <div id="toolbar">
    <button id="prevBtn" onclick="prevPage()">&#9664;</button>
    <span id="pageInfo">-</span>
    <button id="nextBtn" onclick="nextPage()">&#9654;</button>
  </div>

  <div id="container"></div>

  <script>
    pdfjsLib.GlobalWorkerOptions.workerSrc = 
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    let pdfDoc = null;
    let currentPage = 1;
    let totalPages = 0;
    let rendering = false;
    const SCALE = 2.0;
    const renderedPages = new Set();

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
        
        // Render first 3 pages
        for (let i = 1; i <= Math.min(3, totalPages); i++) {
          await renderPage(i);
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
      const screenWidth = window.innerWidth - 16;
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

      document.getElementById('container').appendChild(wrapper);

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
      updatePageInfo();
      scrollToPage(currentPage);
      sendPageChange();
    }

    async function nextPage() {
      if (currentPage >= totalPages) return;
      currentPage++;
      
      // Render next pages if needed
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

    // Detect scroll to update current page
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const pages = document.querySelectorAll('.page-wrapper');
        let closest = 1;
        let closestDist = Infinity;
        
        pages.forEach((page, i) => {
          const rect = page.getBoundingClientRect();
          const dist = Math.abs(rect.top - 56);
          if (dist < closestDist) {
            closestDist = dist;
            closest = i + 1;
          }
        });

        if (closest !== currentPage) {
          currentPage = closest;
          updatePageInfo();
          sendPageChange();
          
          // Pre-render upcoming pages
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
