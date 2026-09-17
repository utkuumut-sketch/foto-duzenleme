(function(){
let items = []; // {id, file, url, ext, width, height}
  let seq = 0;

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const itemsList = document.getElementById('itemsList');
  const emptyState = document.getElementById('emptyState');
  const itemCount = document.getElementById('itemCount');
  const baseNameInput = document.getElementById('baseName');
  const startNumInput = document.getElementById('startNum');
  const paddingSelect = document.getElementById('padding');
  const scaleMode = document.getElementById('scaleMode');
  const manualDims = document.getElementById('manualDims');
  const manualW = document.getElementById('manualW');
  const manualH = document.getElementById('manualH');
  const keepRatio = document.getElementById('keepRatio');
  const sharpenChk = document.getElementById('sharpen');
  const formatSelect = document.getElementById('format');
  const qualityField = document.getElementById('qualityField');
  const qualityInput = document.getElementById('quality');
  const qualityVal = document.getElementById('qualityVal');
  const processBtn = document.getElementById('processBtn');
  const progressWrap = document.getElementById('progressWrap');
  const progressFill = document.getElementById('progressFill');
  const progressLabel = document.getElementById('progressLabel');

  scaleMode.addEventListener('change', () => {
    manualDims.style.display = scaleMode.value === 'manual' ? 'grid' : 'none';
    updatePreviewNames();
  });
  formatSelect.addEventListener('change', () => {
    qualityField.style.display = formatSelect.value === 'jpeg' ? 'block' : 'none';
  });
  qualityInput.addEventListener('input', () => { qualityVal.textContent = qualityInput.value; });
  [baseNameInput, startNumInput, paddingSelect].forEach(el=>{
    el.addEventListener('input', updatePreviewNames);
  });

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('drag'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag'));
  dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('drag');
    handleFiles(e.dataTransfer.files);
  });
  fileInput.addEventListener('change', e => {
    handleFiles(e.target.files);
    fileInput.value = '';
  });

  function handleFiles(fileList){
    const files = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    files.forEach(file => {
      const id = 'f' + (seq++);
      const url = URL.createObjectURL(file);
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const item = { id, file, url, ext, width:null, height:null };
      items.push(item);
      const img = new Image();
      img.onload = () => {
        item.width = img.naturalWidth;
        item.height = img.naturalHeight;
        renderItem(item);
      };
      img.src = url;
    });
    renderAll();
  }

  function renderAll(){
    itemsList.innerHTML = '';
    emptyState.style.display = items.length ? 'none' : 'block';
    itemCount.textContent = items.length + (items.length===1 ? ' dosya' : ' dosya');
    processBtn.disabled = items.length === 0;
    items.forEach(renderItem);
    updatePreviewNames();
  }

  function renderItem(item){
    let row = document.getElementById('row-' + item.id);
    if (!row){
      row = document.createElement('div');
      row.className = 'item';
      row.id = 'row-' + item.id;
      row.draggable = true;
      row.dataset.id = item.id;
      row.innerHTML = `
        <img src="${item.url}" alt="">
        <div class="meta">
          <div class="newname"></div>
          <div class="oldname"></div>
          <div class="dims"></div>
        </div>
        <div class="actions">
          <button class="btn-icon" data-act="up" title="Yukarı">↑</button>
          <button class="btn-icon" data-act="down" title="Aşağı">↓</button>
          <button class="btn-icon" data-act="del" title="Kaldır">✕</button>
        </div>`;
      itemsList.appendChild(row);

      row.addEventListener('dragstart', () => row.classList.add('dragging'));
      row.addEventListener('dragend', () => { row.classList.remove('dragging'); syncOrderFromDOM(); });
      row.addEventListener('dragover', e => {
        e.preventDefault();
        const dragging = itemsList.querySelector('.dragging');
        if (!dragging || dragging === row) return;
        const rect = row.getBoundingClientRect();
        const before = (e.clientY - rect.top) < rect.height/2;
        itemsList.insertBefore(dragging, before ? row : row.nextSibling);
      });

      row.querySelector('[data-act="up"]').addEventListener('click', () => move(item.id, -1));
      row.querySelector('[data-act="down"]').addEventListener('click', () => move(item.id, 1));
      row.querySelector('[data-act="del"]').addEventListener('click', () => remove(item.id));
    }
    row.querySelector('.oldname').textContent = item.file.name;
    row.querySelector('.dims').textContent = item.width ? `${item.width}×${item.height}px` : '…';
  }

  function syncOrderFromDOM(){
    const ids = Array.from(itemsList.children).map(r => r.dataset.id);
    items.sort((a,b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    updatePreviewNames();
  }

  function move(id, dir){
    const idx = items.findIndex(i => i.id === id);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= items.length) return;
    const tmp = items[idx];
    items[idx] = items[newIdx];
    items[newIdx] = tmp;
    renderAll();
  }

  function remove(id){
    items = items.filter(i => i.id !== id);
    const row = document.getElementById('row-' + id);
    if (row) row.remove();
    renderAll();
  }

  function buildNames(){
    const base = (baseNameInput.value.trim() || 'foto');
    const start = parseInt(startNumInput.value, 10) || 0;
    const pad = parseInt(paddingSelect.value, 10) || 0;
    const resizing = scaleMode.value !== 'none';
    const outExt = resizing ? (formatSelect.value === 'jpeg' ? 'jpg' : 'png') : null;
    return items.map((item, i) => {
      let num = String(start + i);
      if (pad) num = num.padStart(pad, '0');
      const ext = outExt || item.ext;
      return `${base}${num}.${ext}`;
    });
  }

  function updatePreviewNames(){
    const names = buildNames();
    items.forEach((item, i) => {
      const row = document.getElementById('row-' + item.id);
      if (row) row.querySelector('.newname').textContent = names[i];
    });
  }

  // --- Image processing ---

  function loadImageBitmap(file){
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  function computeTargetSize(srcW, srcH){
    const mode = scaleMode.value;
    if (mode === 'none') return { w: srcW, h: srcH };
    if (mode === 'manual'){
      let w = parseInt(manualW.value, 10);
      let h = parseInt(manualH.value, 10);
      if (keepRatio.checked){
        if (w && !h) h = Math.round(w * srcH / srcW);
        else if (h && !w) w = Math.round(h * srcW / srcH);
        else if (w && h){
          // fit within box keeping ratio
          const scale = Math.min(w / srcW, h / srcH);
          w = Math.round(srcW * scale);
          h = Math.round(srcH * scale);
        }
      }
      if (!w) w = srcW;
      if (!h) h = srcH;
      return { w, h };
    }
    const factor = parseFloat(mode);
    return { w: Math.round(srcW * factor), h: Math.round(srcH * factor) };
  }

  // Progressive step-scaling: never jump more than 2x per canvas pass.
  // This keeps the resampling kernel local at each step, which the browser's
  // bilinear/bicubic implementation handles with far less blur/ringing than
  // one huge single-pass stretch.
  function stepScale(img, targetW, targetH){
    let curCanvas = document.createElement('canvas');
    curCanvas.width = img.naturalWidth;
    curCanvas.height = img.naturalHeight;
    let ctx = curCanvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    let curW = img.naturalWidth;
    let curH = img.naturalHeight;

    const growing = targetW >= curW;

    while (true){
      const ratioW = targetW / curW;
      const ratioH = targetH / curH;
      const doneW = growing ? curW >= targetW : curW <= targetW;
      const doneH = growing ? curH >= targetH : curH <= targetH;
      if (doneW && doneH) break;

      let stepRatioW = growing ? Math.min(ratioW, 2) : Math.max(ratioW, 0.5);
      let stepRatioH = growing ? Math.min(ratioH, 2) : Math.max(ratioH, 0.5);

      let nextW = Math.round(curW * stepRatioW);
      let nextH = Math.round(curH * stepRatioH);
      // snap to target if close (avoid infinite tiny steps)
      if (growing ? nextW >= targetW : nextW <= targetW) nextW = targetW;
      if (growing ? nextH >= targetH : nextH <= targetH) nextH = targetH;

      const nextCanvas = document.createElement('canvas');
      nextCanvas.width = nextW;
      nextCanvas.height = nextH;
      const nctx = nextCanvas.getContext('2d');
      nctx.imageSmoothingEnabled = true;
      nctx.imageSmoothingQuality = 'high';
      nctx.drawImage(curCanvas, 0, 0, curW, curH, 0, 0, nextW, nextH);

      curCanvas = nextCanvas;
      curW = nextW;
      curH = nextH;
      ctx = nctx;
    }
    return curCanvas;
  }

  // Light unsharp-mask style sharpening to counter softness introduced by resampling.
  function sharpenCanvas(canvas, amount){
    const w = canvas.width, h = canvas.height;
    const ctx = canvas.getContext('2d');
    const src = ctx.getImageData(0, 0, w, h);
    const srcData = src.data;
    const out = ctx.createImageData(w, h);
    const outData = out.data;

    // 3x3 sharpen kernel, strength-scaled
    const k = amount;
    const kernel = [
      0, -k, 0,
      -k, 1 + 4*k, -k,
      0, -k, 0
    ];

    for (let y = 0; y < h; y++){
      for (let x = 0; x < w; x++){
        const idx = (y * w + x) * 4;
        if (x === 0 || y === 0 || x === w-1 || y === h-1){
          outData[idx] = srcData[idx];
          outData[idx+1] = srcData[idx+1];
          outData[idx+2] = srcData[idx+2];
          outData[idx+3] = srcData[idx+3];
          continue;
        }
        for (let c = 0; c < 3; c++){
          let sum = 0;
          let k_i = 0;
          for (let ky = -1; ky <= 1; ky++){
            for (let kx = -1; kx <= 1; kx++){
              const nIdx = ((y+ky) * w + (x+kx)) * 4 + c;
              sum += srcData[nIdx] * kernel[k_i++];
            }
          }
          outData[idx+c] = Math.max(0, Math.min(255, sum));
        }
        outData[idx+3] = srcData[idx+3];
      }
    }
    ctx.putImageData(out, 0, 0);
    return canvas;
  }

  function canvasToBlob(canvas, format, quality){
    return new Promise(resolve => {
      const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      canvas.toBlob(blob => resolve(blob), mime, format === 'jpeg' ? quality : undefined);
    });
  }

  processBtn.addEventListener('click', async () => {
    if (!items.length) return;
    processBtn.disabled = true;
    progressWrap.classList.add('show');
    progressFill.style.width = '0%';

    const zip = new JSZip();
    const names = buildNames();
    const resizing = scaleMode.value !== 'none';
    const doSharpen = sharpenChk.checked && resizing;
    const format = formatSelect.value;
    const quality = parseInt(qualityInput.value, 10) / 100;

    for (let i = 0; i < items.length; i++){
      const item = items[i];
      const name = names[i];
      progressLabel.textContent = `İşleniyor: ${name} (${i+1}/${items.length})`;
      progressFill.style.width = Math.round(((i) / items.length) * 100) + '%';
      await new Promise(r => setTimeout(r, 0)); // let UI paint

      if (!resizing){
        // No re-encode at all: byte-for-byte original quality preserved.
        zip.file(name, item.file);
      } else {
        const img = await loadImageBitmap(item.file);
        const { w, h } = computeTargetSize(img.naturalWidth, img.naturalHeight);
        let canvas = stepScale(img, w, h);
        if (doSharpen){
          // gentle amount; scales down slightly for big upscales to avoid haloing
          const factor = (w * h) / (img.naturalWidth * img.naturalHeight);
          const amt = factor > 4 ? 0.18 : 0.28;
          canvas = sharpenCanvas(canvas, amt);
        }
        const blob = await canvasToBlob(canvas, format, quality);
        zip.file(name, blob);
      }
    }

    progressFill.style.width = '100%';
    progressLabel.textContent = 'Zip oluşturuluyor…';

    const content = await zip.generateAsync({ type: 'blob' });
    const base = (baseNameInput.value.trim() || 'foto');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(content);
    a.download = `${base}-fotograflar.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    progressLabel.textContent = 'Tamamlandı — indirme başladı.';
    setTimeout(() => {
      progressWrap.classList.remove('show');
      processBtn.disabled = items.length === 0;
    }, 1800);
  });
})();
