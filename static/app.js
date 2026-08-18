/**
 * CapCut TTS Studio Web Frontend Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const deviceBadge = document.getElementById('currentDeviceId');
    const btnResetDevice = document.getElementById('btnResetDevice');
    
    const langChips = document.getElementById('langChips');
    const voiceSearchInput = document.getElementById('voiceSearchInput');
    const voiceSelect = document.getElementById('voiceSelect');
    const voiceCountBadge = document.getElementById('voiceCountBadge');
    
    const rateSlider = document.getElementById('rateSlider');
    const rateValueDisplay = document.getElementById('rateValueDisplay');
    const ratePresets = document.querySelectorAll('.btn-preset');
    
    const textInput = document.getElementById('textInput');
    const charCount = document.getElementById('charCount');
    const wordCount = document.getElementById('wordCount');
    const btnSampleText = document.getElementById('btnSampleText');
    const btnClearText = document.getElementById('btnClearText');
    const btnGenerate = document.getElementById('btnGenerate');
    
    const visualizer = document.getElementById('visualizer');
    const playerStatus = document.getElementById('playerStatus');
    const currentPlayingVoice = document.getElementById('currentPlayingVoice');
    const currentPlayingPreview = document.getElementById('currentPlayingPreview');
    const audioElement = document.getElementById('audioElement');
    const btnPlayPause = document.getElementById('btnPlayPause');
    const btnDownload = document.getElementById('btnDownload');
    const progressContainer = document.getElementById('progressContainer');
    const progressFill = document.getElementById('progressFill');
    const currentTimeDisplay = document.getElementById('currentTime');
    const durationTimeDisplay = document.getElementById('durationTime');
    
    const historyList = document.getElementById('historyList');
    const btnClearHistory = document.getElementById('btnClearHistory');
    const toastContainer = document.getElementById('toastContainer');

    // --- State ---
    let allVoices = [];
    let currentLangFilter = 'vi-VN';
    let currentBlobUrl = null;
    const STORAGE_KEY = 'capcut_tts_web_history';

    // --- Sample Texts ---
    const sampleTexts = [
        "Xin chào các bạn! Đây là giọng đọc nhân tạo từ CapCut cực kỳ tự nhiên và sống động.",
        "Chào mừng bạn đến với CapCut Text-to-Speech Web Studio. Chúc bạn có những trải nghiệm tuyệt vời!",
        "Hôm nay trời thật đẹp, hãy cùng lắng nghe đoạn audio mẫu được tạo ra bằng công nghệ AI giọng nói nhé."
    ];

    // --- Utility: Toast Notification ---
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let iconClass = 'fa-circle-info';
        if (type === 'success') iconClass = 'fa-circle-check';
        if (type === 'error') iconClass = 'fa-triangle-exclamation';
        if (type === 'warning') iconClass = 'fa-circle-exclamation';

        toast.innerHTML = `
            <i class="fa-solid ${iconClass}"></i>
            <span>${message}</span>
        `;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // --- Format Time Helper ---
    function formatTime(seconds) {
        if (isNaN(seconds)) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // --- Load Device Info ---
    async function fetchDeviceInfo() {
        try {
            const res = await fetch('/api/device');
            if (res.ok) {
                const data = await res.json();
                deviceBadge.textContent = data.device_id || 'Unknown';
            }
        } catch (err) {
            deviceBadge.textContent = 'Offline';
        }
    }

    // --- Reset Device ID ---
    btnResetDevice.addEventListener('click', async () => {
        btnResetDevice.disabled = true;
        btnResetDevice.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Đang đổi...</span>';
        try {
            const res = await fetch('/api/reset-device', { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                deviceBadge.textContent = data.device_id;
                showToast(`Đã đổi Device ID thành công: ${data.device_id}`, 'success');
            } else {
                showToast('Không thể đổi Device ID', 'error');
            }
        } catch (err) {
            showToast(`Lỗi: ${err.message}`, 'error');
        } finally {
            btnResetDevice.disabled = false;
            btnResetDevice.innerHTML = '<i class="fa-solid fa-rotate"></i> <span>Đổi ID (Gỡ Ban)</span>';
        }
    });

    // --- Load Voices ---
    async function fetchVoices() {
        try {
            const res = await fetch('/api/voices');
            if (!res.ok) throw new Error('Không thể tải danh sách giọng đọc');
            const data = await res.json();
            allVoices = data.voices || [];
            renderVoiceOptions();
        } catch (err) {
            voiceSelect.innerHTML = '<option value="">Lỗi tải danh sách giọng</option>';
            showToast(`Lỗi: ${err.message}`, 'error');
        }
    }

    // --- Render Voice Dropdown Options ---
    function renderVoiceOptions() {
        const searchTerm = (voiceSearchInput.value || '').toLowerCase().trim();
        
        let filtered = allVoices.filter(v => {
            // Language filter
            if (currentLangFilter !== 'all') {
                const matchLang = (v.lang && v.lang.toLowerCase() === currentLangFilter.toLowerCase()) ||
                                  (v.lan && v.lan.toLowerCase() === currentLangFilter.toLowerCase());
                if (!matchLang) return false;
            }
            // Search filter
            if (searchTerm) {
                const matchSearch = v.display_name.toLowerCase().includes(searchTerm) ||
                                    v.voice_type.toLowerCase().includes(searchTerm);
                if (!matchSearch) return false;
            }
            return true;
        });

        voiceCountBadge.textContent = `${filtered.length} giọng`;

        voiceSelect.innerHTML = '';
        if (filtered.length === 0) {
            voiceSelect.innerHTML = '<option value="" disabled selected>Không tìm thấy giọng đọc phù hợp</option>';
            return;
        }

        filtered.forEach((v, index) => {
            const opt = document.createElement('option');
            opt.value = v.voice_type;
            opt.dataset.resourceId = v.resource_id || '';
            opt.dataset.lang = v.lang || '';
            opt.textContent = `${v.display_name} (${v.voice_type})`;
            
            // Prefer Sweet Girl / Default Vietnamese voice as default selection
            if (currentLangFilter === 'vi-VN' && (v.voice_type === 'BV421_vivn_streaming' || v.voice_type === 'BV074_streaming')) {
                opt.selected = true;
            } else if (index === 0 && !voiceSelect.value) {
                opt.selected = true;
            }
            voiceSelect.appendChild(opt);
        });
    }

    // --- Language Filter Chips Event ---
    langChips.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;

        langChips.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentLangFilter = chip.dataset.lang;
        renderVoiceOptions();
    });

    // --- Voice Search Event ---
    voiceSearchInput.addEventListener('input', () => {
        renderVoiceOptions();
    });

    // --- Rate Slider Events ---
    rateSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value).toFixed(1);
        rateValueDisplay.textContent = `${val}x`;
        updatePresetButtons(val);
    });

    ratePresets.forEach(btn => {
        btn.addEventListener('click', () => {
            const rate = parseFloat(btn.dataset.rate).toFixed(1);
            rateSlider.value = rate;
            rateValueDisplay.textContent = `${rate}x`;
            updatePresetButtons(rate);
        });
    });

    function updatePresetButtons(currentRate) {
        ratePresets.forEach(btn => {
            if (parseFloat(btn.dataset.rate).toFixed(1) === currentRate) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    // --- Text Input Events ---
    function updateTextStats() {
        const text = textInput.value;
        charCount.textContent = text.length;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        wordCount.textContent = words;
    }

    textInput.addEventListener('input', updateTextStats);

    btnSampleText.addEventListener('click', () => {
        const randomSample = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
        textInput.value = randomSample;
        updateTextStats();
    });

    btnClearText.addEventListener('click', () => {
        textInput.value = '';
        updateTextStats();
    });

    // Set default initial text
    textInput.value = "Xin chào! Bạn có thể nhập nội dung văn bản vào đây để tôi đọc cho bạn nghe nhé.";
    updateTextStats();

    // --- Generate TTS Action ---
    btnGenerate.addEventListener('click', async () => {
        const text = textInput.value.trim();
        if (!text) {
            showToast('Vui lòng nhập nội dung văn bản trước khi tạo giọng nói!', 'warning');
            textInput.focus();
            return;
        }

        const selectedOption = voiceSelect.options[voiceSelect.selectedIndex];
        if (!selectedOption || !selectedOption.value) {
            showToast('Vui lòng chọn một giọng đọc!', 'warning');
            return;
        }

        const voiceType = selectedOption.value;
        const resourceId = selectedOption.dataset.resourceId || null;
        const rate = parseFloat(rateSlider.value) || 1.0;
        const voiceName = selectedOption.textContent;

        // UI Loading state
        btnGenerate.disabled = true;
        btnGenerate.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Đang tạo âm thanh...</span>';
        playerStatus.textContent = 'Đang xử lý...';
        playerStatus.classList.remove('active');

        try {
            const response = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text,
                    voice: voiceType,
                    resource_id: resourceId,
                    rate: rate
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || `Lỗi máy chủ (${response.status})`);
            }

            const audioBlob = await response.blob();
            
            // Clean up previous blob URL
            if (currentBlobUrl) {
                URL.revokeObjectURL(currentBlobUrl);
            }
            
            currentBlobUrl = URL.createObjectURL(audioBlob);
            audioElement.src = currentBlobUrl;

            // Update Player UI
            currentPlayingVoice.textContent = voiceName;
            currentPlayingPreview.textContent = text;
            playerStatus.textContent = 'Sẵn sàng phát';
            playerStatus.classList.add('active');
            
            btnPlayPause.disabled = false;
            btnDownload.href = currentBlobUrl;
            btnDownload.download = `capcut_tts_${Date.now()}.mp3`;
            btnDownload.style.display = 'inline-flex';

            // Auto play
            audioElement.play().catch(() => {
                // Autoplay may be blocked by browser policy
            });

            // Save to history
            saveToHistory({
                id: Date.now(),
                text: text,
                voiceType: voiceType,
                voiceName: voiceName,
                rate: rate,
                blobUrl: currentBlobUrl,
                timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
            });

            showToast('Tạo giọng nói thành công!', 'success');
        } catch (err) {
            showToast(`Lỗi tạo TTS: ${err.message}`, 'error');
            playerStatus.textContent = 'Thất bại';
        } finally {
            btnGenerate.disabled = false;
            btnGenerate.innerHTML = '<i class="fa-solid fa-play"></i> <span>Tạo Giọng Nói (TTS)</span>';
        }
    });

    // --- Audio Player Controls ---
    btnPlayPause.addEventListener('click', () => {
        if (audioElement.paused) {
            audioElement.play();
        } else {
            audioElement.pause();
        }
    });

    audioElement.addEventListener('play', () => {
        btnPlayPause.innerHTML = '<i class="fa-solid fa-pause"></i>';
        visualizer.classList.add('playing');
    });

    audioElement.addEventListener('pause', () => {
        btnPlayPause.innerHTML = '<i class="fa-solid fa-play"></i>';
        visualizer.classList.remove('playing');
    });

    audioElement.addEventListener('ended', () => {
        btnPlayPause.innerHTML = '<i class="fa-solid fa-play"></i>';
        visualizer.classList.remove('playing');
        progressFill.style.width = '0%';
        currentTimeDisplay.textContent = '00:00';
    });

    audioElement.addEventListener('timeupdate', () => {
        if (!audioElement.duration) return;
        const progress = (audioElement.currentTime / audioElement.duration) * 100;
        progressFill.style.width = `${progress}%`;
        currentTimeDisplay.textContent = formatTime(audioElement.currentTime);
        durationTimeDisplay.textContent = formatTime(audioElement.duration);
    });

    audioElement.addEventListener('loadedmetadata', () => {
        durationTimeDisplay.textContent = formatTime(audioElement.duration);
    });

    progressContainer.addEventListener('click', (e) => {
        if (!audioElement.duration) return;
        const rect = progressContainer.getBoundingClientRect();
        const clickPos = (e.clientX - rect.left) / rect.width;
        audioElement.currentTime = clickPos * audioElement.duration;
    });

    // --- History Management ---
    function loadHistory() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    function saveToHistory(item) {
        const history = loadHistory();
        // Save metadata (exclude blob URL as it expires on reload)
        const historyItem = {
            id: item.id,
            text: item.text,
            voiceType: item.voiceType,
            voiceName: item.voiceName,
            rate: item.rate,
            timestamp: item.timestamp
        };
        history.unshift(historyItem);
        // Keep max 20 items
        if (history.length > 20) history.pop();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
        renderHistory();
    }

    function renderHistory() {
        const history = loadHistory();
        historyList.innerHTML = '';

        if (history.length === 0) {
            historyList.innerHTML = `
                <div class="empty-history">
                    <i class="fa-regular fa-folder-open"></i>
                    <p>Chưa có lịch sử tạo âm thanh nào trong phiên này.</p>
                </div>
            `;
            return;
        }

        history.forEach(item => {
            const el = document.createElement('div');
            el.className = 'history-item';
            el.innerHTML = `
                <div class="history-info">
                    <div class="history-meta">
                        <span>${item.voiceName || item.voiceType}</span>
                        <span class="history-rate">(${item.rate}x &bull; ${item.timestamp})</span>
                    </div>
                    <div class="history-text" title="${item.text}">${item.text}</div>
                </div>
                <div class="history-actions">
                    <button class="btn-icon btn-reuse-history" title="Sử dụng lại nội dung này">
                        <i class="fa-solid fa-arrow-rotate-left"></i>
                    </button>
                </div>
            `;

            // Handle Reuse Button
            el.querySelector('.btn-reuse-history').addEventListener('click', () => {
                textInput.value = item.text;
                updateTextStats();
                rateSlider.value = item.rate;
                rateValueDisplay.textContent = `${item.rate}x`;
                updatePresetButtons(item.rate.toString());
                
                // Select voice if available
                for (let i = 0; i < voiceSelect.options.length; i++) {
                    if (voiceSelect.options[i].value === item.voiceType) {
                        voiceSelect.selectedIndex = i;
                        break;
                    }
                }
                showToast('Đã nạp lại nội dung và cấu hình từ lịch sử!', 'info');
            });

            historyList.appendChild(el);
        });
    }

    btnClearHistory.addEventListener('click', () => {
        localStorage.removeItem(STORAGE_KEY);
        renderHistory();
        showToast('Đã xóa toàn bộ lịch sử tạo.', 'info');
    });

    // --- Initialize ---
    fetchDeviceInfo();
    fetchVoices();
    renderHistory();
});
