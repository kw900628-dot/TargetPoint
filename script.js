// script.js
document.addEventListener('DOMContentLoaded', () => {
    // [1] DOM 요소 가져오기
    const els = {
        imageInput: document.getElementById('imageInput'),
        targetImage: document.getElementById('target-image'),
        imageWrapper: document.getElementById('imageWrapper'),
        rulerTop: document.getElementById('ruler-top'),
        rulerLeft: document.getElementById('ruler-left'),
        dropZone: document.getElementById('dropZone'),
        coordList: document.getElementById('coordList'),
        placeholderMsg: document.getElementById('placeholderMsg'),
        clearBtn: document.getElementById('clearBtn'),
        // [추가] 배율 입력 필드
        scaleInputX: document.getElementById('scaleInputX'),
        scaleInputY: document.getElementById('scaleInputY')
    };

    // (기본 변수들은 그대로 유지)
    let state = {
        originalWidth: 0,
        originalHeight: 0,
        displayedWidth: 0,
        displayedHeight: 0,
        isDragging: false,
        startX: 0,
        startY: 0,
        currentBoxEl: null,
        boxes: [],
        boxIdCounter: 1
    };

    els.targetImage.style.display = 'none';

    // [이미지 로드 및 이벤트 리스너들은 기존과 동일...]
    function loadImageFile(file) {
        if (!file || !file.type.startsWith('image/')) {
            alert("이미지 파일만 업로드 가능합니다.");
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            els.targetImage.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    els.imageInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) loadImageFile(e.target.files[0]);
    });

    els.dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        els.dropZone.classList.add('drag-active');
    });
    els.dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        els.dropZone.classList.remove('drag-active');
    });
    els.dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        els.dropZone.classList.remove('drag-active');
        if (e.dataTransfer.files.length > 0) loadImageFile(e.dataTransfer.files[0]);
    });

    els.targetImage.onload = function() {
        els.targetImage.style.display = 'block';
        els.placeholderMsg.style.display = 'none';
        clearAllBoxes();
        
        state.originalWidth = els.targetImage.naturalWidth;
        state.originalHeight = els.targetImage.naturalHeight;
        
        calculateFitSize();
        updateLayout();
        drawRulers();
    };

    window.addEventListener('resize', () => {
        if (els.targetImage.style.display !== 'none') {
            calculateFitSize();
            updateLayout();
            drawRulers();
        }
    });

    els.clearBtn.addEventListener('click', clearAllBoxes);

    // ★ [추가] 배율 입력값이 바뀌면 리스트 즉시 업데이트
    els.scaleInputX.addEventListener('input', renderList);
    els.scaleInputY.addEventListener('input', renderList);


    // [기능 함수들]
    function calculateFitSize() {
        if (!state.originalWidth) return;
        const zoneW = els.dropZone.clientWidth - 50; 
        const zoneH = els.dropZone.clientHeight - 50;
        const ratioW = zoneW / state.originalWidth;
        const ratioH = zoneH / state.originalHeight;
        const scale = Math.min(ratioW, ratioH, 1);

        state.displayedWidth = Math.floor(state.originalWidth * scale);
        state.displayedHeight = Math.floor(state.originalHeight * scale);

        els.targetImage.style.width = `${state.displayedWidth}px`;
        els.targetImage.style.height = `${state.displayedHeight}px`;
    }

    function clearAllBoxes() {
        state.boxes.forEach(box => { if (box.el) box.el.remove(); });
        state.boxes = [];
        state.boxIdCounter = 1;
        renderList();
    }

    function updateLayout() {
        els.rulerTop.style.width = state.displayedWidth + 'px';
        els.rulerTop.style.height = '30px'; 
        els.rulerLeft.style.width = '30px'; 
        els.rulerLeft.style.height = state.displayedHeight + 'px';
    }

    function drawRulers() {
        if (!state.originalWidth) return;
        els.rulerTop.width = state.originalWidth; els.rulerTop.height = 30;
        els.rulerLeft.width = 30; els.rulerLeft.height = state.originalHeight;
        const ctxTop = els.rulerTop.getContext('2d'); 
        const ctxLeft = els.rulerLeft.getContext('2d');
        const bgColor = '#261414'; 
        const mainColor = 'rgba(242, 214, 133, 1)'; 

        // Top Ruler
        ctxTop.fillStyle = bgColor; ctxTop.fillRect(0, 0, state.originalWidth, 30);
        ctxTop.strokeStyle = mainColor; ctxTop.fillStyle = mainColor;
        ctxTop.font = '24px "Noto Sans KR"'; ctxTop.lineWidth = 2;
        const step = 100;
        for (let x = 0; x <= state.originalWidth; x += 10) {
            ctxTop.beginPath();
            let isMajor = (x % 100 === 0);
            let h = isMajor ? 15 : (x % 50 === 0 ? 10 : 5);
            if (isMajor) ctxTop.fillText(x, x + 4, 25);
            ctxTop.moveTo(x + 0.5, 0); ctxTop.lineTo(x + 0.5, h); ctxTop.stroke();
        }

        // Left Ruler
        ctxLeft.fillStyle = bgColor; ctxLeft.fillRect(0, 0, 30, state.originalHeight);
        ctxLeft.strokeStyle = mainColor; ctxLeft.fillStyle = mainColor;
        ctxLeft.font = '24px "Noto Sans KR"'; ctxLeft.lineWidth = 2;
        for (let y = 0; y <= state.originalHeight; y += 10) {
            ctxLeft.beginPath();
            let isMajor = (y % 100 === 0);
            let w = isMajor ? 15 : (y % 50 === 0 ? 10 : 5);
            if (isMajor) { 
                ctxLeft.save(); ctxLeft.translate(25, y + 4); ctxLeft.rotate(-Math.PI/2); 
                ctxLeft.fillText(y, 0, 0); ctxLeft.restore(); 
            }
            ctxLeft.moveTo(0, y + 0.5); ctxLeft.lineTo(w, y + 0.5); ctxLeft.stroke();
        }
    }

    // [드래그 로직 - 기존과 동일]
    els.imageWrapper.addEventListener('mousedown', function(e) {
        if (e.target.closest('.box-close-btn')) return;
        if (els.targetImage.style.display === 'none') return;
        if (e.button !== 0) return;

        state.isDragging = true;
        const rect = els.targetImage.getBoundingClientRect();
        state.startX = e.clientX - rect.left;
        state.startY = e.clientY - rect.top;

        state.currentBoxEl = document.createElement('div');
        state.currentBoxEl.className = 'selection-box';
        
        const badge = document.createElement('div');
        badge.className = 'box-badge';
        badge.textContent = state.boxIdCounter;
        state.currentBoxEl.appendChild(badge);

        const closeBtn = document.createElement('div');
        closeBtn.className = 'box-close-btn';
        closeBtn.textContent = '×';
        state.currentBoxEl.appendChild(closeBtn);

        state.currentBoxEl.style.left = state.startX + 'px';
        state.currentBoxEl.style.top = state.startY + 'px';
        state.currentBoxEl.style.width = '0px';
        state.currentBoxEl.style.height = '0px';
        els.imageWrapper.appendChild(state.currentBoxEl);
    });

    window.addEventListener('mousemove', function(e) {
        if (!state.isDragging || !state.currentBoxEl) return;
        
        const rect = els.targetImage.getBoundingClientRect();
        let currentX = e.clientX - rect.left;
        let currentY = e.clientY - rect.top;
        
        currentX = Math.max(0, Math.min(currentX, rect.width));
        currentY = Math.max(0, Math.min(currentY, rect.height));

        const width = Math.abs(currentX - state.startX);
        const height = Math.abs(currentY - state.startY);
        const left = Math.min(state.startX, currentX);
        const top = Math.min(state.startY, currentY);

        state.currentBoxEl.style.width = width + 'px';
        state.currentBoxEl.style.height = height + 'px';
        state.currentBoxEl.style.left = left + 'px';
        state.currentBoxEl.style.top = top + 'px';
    });

    window.addEventListener('mouseup', function(e) {
        if (state.isDragging && state.currentBoxEl) {
            state.isDragging = false;
            if (parseInt(state.currentBoxEl.style.width) < 5 || parseInt(state.currentBoxEl.style.height) < 5) {
                state.currentBoxEl.remove();
                state.currentBoxEl = null;
                return;
            }
            finalizeBox(state.currentBoxEl);
            state.currentBoxEl = null;
        }
    });

    // ★ [핵심 수정 1] 박스 확정 시: Math.round 제거하고 소수점(Float) 그대로 저장
    function finalizeBox(element) {
        const rect = els.targetImage.getBoundingClientRect();
        
        const screenLeft = parseFloat(element.style.left);
        const screenTop = parseFloat(element.style.top);
        const screenW = parseFloat(element.style.width);
        const screenH = parseFloat(element.style.height);

        // 화면상 픽셀 -> 원본 이미지 픽셀 변환 비율
        const scaleX = state.originalWidth / rect.width;
        const scaleY = state.originalHeight / rect.height;
        
        // 반올림하지 않고 정밀한 값 그대로 계산 (Float)
        const realW = screenW * scaleX;
        const realH = screenH * scaleY;
        const realCenterX = (screenLeft + screenW / 2) * scaleX;
        const realCenterY = (screenTop + screenH / 2) * scaleY;

        const currentId = state.boxIdCounter++;

        element.style.pointerEvents = 'none'; 
        const closeBtn = element.querySelector('.box-close-btn');
        closeBtn.style.display = 'block'; 
        closeBtn.style.pointerEvents = 'auto';
        closeBtn.onclick = function(e) {
            e.stopPropagation(); 
            removeBoxById(currentId);
        };

        const boxData = {
            id: currentId,
            el: element,
            // 정밀 데이터 저장
            data: { x: realCenterX, y: realCenterY, w: realW, h: realH }
        };

        state.boxes.push(boxData);

        if (state.boxes.length > 10) {
            const removed = state.boxes.shift();
            if (removed && removed.el) removed.el.remove();
        }
        renderList(); // 리스트 갱신 호출
    }

    function removeBoxById(id) {
        const index = state.boxes.findIndex(b => b.id === id);
        if (index !== -1) {
            state.boxes[index].el.remove();
            state.boxes.splice(index, 1);
            renderList();
        }
    }

    // ★ [핵심 수정 2] 리스트 렌더링 시: 입력된 비율(Scale)을 곱한 후 반올림하여 표시
    function renderList() {
        els.coordList.innerHTML = ''; 
        
        // 사용자가 입력한 배율 가져오기 (없으면 1.0)
        const userScaleX = parseFloat(els.scaleInputX.value) || 1.0;
        const userScaleY = parseFloat(els.scaleInputY.value) || 1.0;

        state.boxes.forEach(box => {
            const item = document.createElement('div');
            item.className = 'list-item';

            // 저장된 Float 좌표 * 사용자 배율 -> 반올림
            const finalX = Math.round(box.data.x * userScaleX);
            const finalY = Math.round(box.data.y * userScaleY);
            const finalW = Math.round(box.data.w * userScaleX);
            const finalH = Math.round(box.data.h * userScaleY);

            const valString = `${finalX}, ${finalY}, ${finalW}, ${finalH}`;
            
            item.innerHTML = `
                <div class="item-id">${box.id}</div>
                <div class="item-data">${valString}</div>
                <div class="col-action"><button class="copy-btn-small">Copy</button></div>
            `;
            const copyBtn = item.querySelector('.copy-btn-small');
            copyBtn.onclick = () => copyText(valString, copyBtn);
            els.coordList.appendChild(item);
        });
        els.coordList.scrollTop = els.coordList.scrollHeight;
    }

    function copyText(text, btnElement) {
        navigator.clipboard.writeText(text).then(() => {
            const originalText = btnElement.innerText;
            btnElement.innerText = "Done";
            btnElement.style.backgroundColor = "var(--color-brown-light)";
            setTimeout(() => {
                btnElement.innerText = originalText;
                btnElement.style.backgroundColor = "";
            }, 1000);
        }).catch(err => console.error('Copy failed', err));
    }
});