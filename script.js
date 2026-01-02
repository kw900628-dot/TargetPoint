document.addEventListener('DOMContentLoaded', () => {
    // [1] DOM 요소 가져오기 & 방어적 체크
    const els = {
        imageInput: document.getElementById('imageInput'),
        targetImage: document.getElementById('target-image'),
        imageWrapper: document.getElementById('imageWrapper'),
        rulerTop: document.getElementById('ruler-top'),
        rulerLeft: document.getElementById('ruler-left'),
        dropZone: document.getElementById('dropZone'),
        coordList: document.getElementById('coordList'),
        placeholderMsg: document.getElementById('placeholderMsg'),
        clearBtn: document.getElementById('clearBtn')
    };

    for (const key in els) {
        if (!els[key]) {
            console.error(`Critical DOM element missing: ${key}`);
            return;
        }
    }

    // 상태 변수
    let state = {
        originalWidth: 0,
        originalHeight: 0,
        displayedWidth: 0,  // 화면에 표시되는 실제 너비
        displayedHeight: 0, // 화면에 표시되는 실제 높이
        isDragging: false,
        startX: 0,
        startY: 0,
        currentBoxEl: null,
        boxes: [],
        boxIdCounter: 1
    };

    els.targetImage.style.display = 'none';

    // [2] 이미지 로드 함수
    function loadImageFile(file) {
        if (!file || !file.type.startsWith('image/')) {
            alert("이미지 파일만 업로드 가능합니다.");
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            els.targetImage.src = event.target.result;
        };
        reader.onerror = () => {
            console.error("File reading failed");
        };
        reader.readAsDataURL(file);
    }

    // [3] 이벤트 리스너 바인딩
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

    // ★ 핵심: 이미지 로드 완료 시 "Fit to Screen" 로직 실행
    els.targetImage.onload = function() {
        els.targetImage.style.display = 'block';
        els.placeholderMsg.style.display = 'none';
        clearAllBoxes();
        
        state.originalWidth = els.targetImage.naturalWidth;
        state.originalHeight = els.targetImage.naturalHeight;
        
        // 화면에 꽉 차게 계산 및 적용
        calculateFitSize();
        
        // 자와 레이아웃 업데이트
        updateLayout();
        drawRulers();
    };

    window.addEventListener('resize', () => {
        if (els.targetImage.style.display !== 'none') {
            calculateFitSize(); // 리사이즈 시에도 다시 맞춤
            updateLayout();
            drawRulers();
        }
    });

    els.clearBtn.addEventListener('click', clearAllBoxes);


    // [4] 핵심 기능 구현

    // ★ 이미지를 작업 영역(dropZone) 안에 꽉 차게 맞추는 함수
    function calculateFitSize() {
        if (!state.originalWidth) return;

        // 드롭존의 현재 크기 (패딩 고려하여 약간 여유 둠: -50)
        const zoneW = els.dropZone.clientWidth - 50; 
        const zoneH = els.dropZone.clientHeight - 50;

        // 비율 계산
        const ratioW = zoneW / state.originalWidth;
        const ratioH = zoneH / state.originalHeight;
        
        // 둘 중 더 작은 비율을 선택해야 이미지가 짤리지 않고 다 들어옴
        const scale = Math.min(ratioW, ratioH, 1); // 1보다 크면(이미지가 작으면) 원본 크기 유지하고 싶으면 1 제거

        // 표시 크기 결정
        state.displayedWidth = Math.floor(state.originalWidth * scale);
        state.displayedHeight = Math.floor(state.originalHeight * scale);

        // 이미지 요소에 명시적 크기 적용
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
        // 자의 CSS 크기를 이미지의 표시 크기와 동일하게 맞춤 (시각적 동기화)
        els.rulerTop.style.width = state.displayedWidth + 'px';
        els.rulerTop.style.height = '30px'; 
        els.rulerLeft.style.width = '30px'; 
        els.rulerLeft.style.height = state.displayedHeight + 'px';
    }

    function drawRulers() {
        if (!state.originalWidth || !state.originalHeight) return;

        // 캔버스의 '내부 해상도'는 원본 이미지 크기 (좌표 정확성 위함)
        els.rulerTop.width = state.originalWidth; 
        els.rulerTop.height = 30;
        els.rulerLeft.width = 30; 
        els.rulerLeft.height = state.originalHeight;

        // 캔버스의 '표시 크기'는 CSS에서 제어하므로 Canvas Context는 자동으로 스케일링 됨
        // 하지만 선명도를 위해 캔버스는 원본 크기로 그리고, CSS가 줄여서 보여줌.
        
        const ctxTop = els.rulerTop.getContext('2d'); 
        const ctxLeft = els.rulerLeft.getContext('2d');

        const bgColor = '#261414'; 
        const mainColor = 'rgba(242, 214, 133, 1)'; 

        // Top Ruler
        ctxTop.fillStyle = bgColor; 
        ctxTop.fillRect(0, 0, state.originalWidth, 30);
        ctxTop.strokeStyle = mainColor;
        ctxTop.fillStyle = mainColor;
        ctxTop.font = '24px "Noto Sans KR"'; // 글자 크기 키움 (축소되어 보일 것이므로)
        ctxTop.lineWidth = 2; // 선 두께 키움

        // 눈금 간격을 원본 픽셀 기준으로 그리기
        const step = 100; // 큰 이미지일 수 있으니 눈금 간격 조정
        for (let x = 0; x <= state.originalWidth; x += 10) {
            ctxTop.beginPath();
            let isMajor = (x % 100 === 0);
            let h = isMajor ? 15 : (x % 50 === 0 ? 10 : 5);
            
            if (isMajor) ctxTop.fillText(x, x + 4, 25);
            
            ctxTop.moveTo(x + 0.5, 0); 
            ctxTop.lineTo(x + 0.5, h); 
            ctxTop.stroke();
        }

        // Left Ruler
        ctxLeft.fillStyle = bgColor; 
        ctxLeft.fillRect(0, 0, 30, state.originalHeight);
        ctxLeft.strokeStyle = mainColor;
        ctxLeft.fillStyle = mainColor;
        ctxLeft.font = '24px "Noto Sans KR"';
        ctxLeft.lineWidth = 2;

        for (let y = 0; y <= state.originalHeight; y += 10) {
            ctxLeft.beginPath();
            let isMajor = (y % 100 === 0);
            let w = isMajor ? 15 : (y % 50 === 0 ? 10 : 5);
            
            if (isMajor) { 
                ctxLeft.save(); 
                ctxLeft.translate(25, y + 4); 
                ctxLeft.rotate(-Math.PI/2); 
                ctxLeft.fillText(y, 0, 0); 
                ctxLeft.restore(); 
            }
            ctxLeft.moveTo(0, y + 0.5); 
            ctxLeft.lineTo(w, y + 0.5); 
            ctxLeft.stroke();
        }
    }

    // [5] 박스 드래그 로직 (좌표 계산 로직 변경 없음 - CSS/JS Fit으로 자동 해결)
    els.imageWrapper.addEventListener('mousedown', function(e) {
        if (e.target.closest('.box-close-btn')) return;
        if (els.targetImage.style.display === 'none') return;
        if (e.button !== 0) return;

        state.isDragging = true;
        const rect = els.targetImage.getBoundingClientRect(); // 현재 보이는 이미지의 크기
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
        state.currentBoxEl.style.pointerEvents = 'none';

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

    function finalizeBox(element) {
        // 중요: 표시된 이미지(rect)와 원본 이미지(state.originalWidth)의 비율을 계산
        const rect = els.targetImage.getBoundingClientRect();
        
        const screenLeft = parseFloat(element.style.left);
        const screenTop = parseFloat(element.style.top);
        const screenW = parseFloat(element.style.width);
        const screenH = parseFloat(element.style.height);

        // 표시 크기 대비 원본 크기의 비율 (Scale Factor)
        const scaleX = state.originalWidth / rect.width;
        const scaleY = state.originalHeight / rect.height;
        
        const realW = Math.round(screenW * scaleX);
        const realH = Math.round(screenH * scaleY);
        const realCenterX = Math.round((screenLeft + screenW / 2) * scaleX);
        const realCenterY = Math.round((screenTop + screenH / 2) * scaleY);

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
            data: { x: realCenterX, y: realCenterY, w: realW, h: realH }
        };

        state.boxes.push(boxData);

        if (state.boxes.length > 10) {
            const removed = state.boxes.shift();
            if (removed && removed.el) removed.el.remove();
        }
        renderList();
    }

    function removeBoxById(id) {
        const index = state.boxes.findIndex(b => b.id === id);
        if (index !== -1) {
            state.boxes[index].el.remove();
            state.boxes.splice(index, 1);
            renderList();
        }
    }

    function renderList() {
        els.coordList.innerHTML = ''; 
        state.boxes.forEach(box => {
            const item = document.createElement('div');
            item.className = 'list-item';
            const valString = `${box.data.x}, ${box.data.y}, ${box.data.w}, ${box.data.h}`;
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