/**
 * CapCut TTS Studio Web Frontend Logic
 * Hỗ trợ tạo TTS truyện dài, tách đoạn thông minh, xử lý đa luồng & theo dõi tiến trình thời gian thực
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

    const threadsSlider = document.getElementById('threadsSlider');
    const threadsValueDisplay = document.getElementById('threadsValueDisplay');
    const chkAutoSplit = document.getElementById('chkAutoSplit');

    const textInput = document.getElementById('textInput');
    const charCount = document.getElementById('charCount');
    const wordCount = document.getElementById('wordCount');
    const chunkEstimate = document.getElementById('chunkEstimate');
    const btnSampleText = document.getElementById('btnSampleText');
    const btnSampleLongText = document.getElementById('btnSampleLongText');
    const btnClearText = document.getElementById('btnClearText');
    const btnGenerate = document.getElementById('btnGenerate');

    // Progress Card Elements
    const progressCard = document.getElementById('progressCard');
    const taskPercentBadge = document.getElementById('taskPercentBadge');
    const taskProgressBar = document.getElementById('taskProgressBar');
    const taskDoneChunksText = document.getElementById('taskDoneChunksText');
    const taskStatusText = document.getElementById('taskStatusText');
    const taskThreadsBadge = document.getElementById('taskThreadsBadge');
    const taskElapsedText = document.getElementById('taskElapsedText');

    // Audio Player Elements (Card Player)
    const playerCard = document.getElementById('playerCard');
    const visualizer = document.getElementById('visualizer');
    const playerStatus = document.getElementById('playerStatus');
    const currentPlayingVoice = document.getElementById('currentPlayingVoice');
    const currentPlayingPreview = document.getElementById('currentPlayingPreview');
    const audioElement = document.getElementById('audioElement');

    const progressContainer = document.getElementById('progressContainer');
    const progressFill = document.getElementById('progressFill');
    const progressHandle = document.getElementById('progressHandle');
    const currentTimeDisplay = document.getElementById('currentTime');
    const durationTimeDisplay = document.getElementById('durationTime');

    const btnPlayPause = document.getElementById('btnPlayPause');
    const btnRewind10 = document.getElementById('btnRewind10');
    const btnForward10 = document.getElementById('btnForward10');
    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');
    const btnShuffle = document.getElementById('btnShuffle');
    const btnRepeat = document.getElementById('btnRepeat');

    const btnVolume = document.getElementById('btnVolume');
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeValText = document.getElementById('volumeValText');

    const btnSettings = document.getElementById('btnSettings');
    const speedMenuPopup = document.getElementById('speedMenuPopup');
    const speedOptBtns = document.querySelectorAll('.speed-opt-btn');

    const btnQuickDownload = document.getElementById('btnQuickDownload');
    const downloadArea = document.getElementById('downloadArea');
    const btnDownloadMain = document.getElementById('btnDownloadMain');
    const dlMetaInfo = document.getElementById('dlMetaInfo');

    // Fixed Bottom Player Bar Elements
    const fixedBottomPlayer = document.getElementById('fixedBottomPlayer');
    const fixedProgressContainer = document.getElementById('fixedProgressContainer');
    const fixedProgressFill = document.getElementById('fixedProgressFill');
    const fixedProgressHandle = document.getElementById('fixedProgressHandle');
    const fixedTrackTitle = document.getElementById('fixedTrackTitle');
    const fixedCurrentTime = document.getElementById('fixedCurrentTime');
    const fixedDurationTime = document.getElementById('fixedDurationTime');

    const fixedBtnPlayPause = document.getElementById('fixedBtnPlayPause');
    const fixedBtnRewind10 = document.getElementById('fixedBtnRewind10');
    const fixedBtnForward10 = document.getElementById('fixedBtnForward10');
    const fixedBtnPrev = document.getElementById('fixedBtnPrev');
    const fixedBtnNext = document.getElementById('fixedBtnNext');
    const fixedBtnShuffle = document.getElementById('fixedBtnShuffle');
    const fixedBtnRepeat = document.getElementById('fixedBtnRepeat');
    const fixedBtnSpeed = document.getElementById('fixedBtnSpeed');
    const fixedBtnVolume = document.getElementById('fixedBtnVolume');
    const fixedVolumeSlider = document.getElementById('fixedVolumeSlider');
    const fixedBtnDownload = document.getElementById('fixedBtnDownload');
    const btnHideFixedPlayer = document.getElementById('btnHideFixedPlayer');

    const historyList = document.getElementById('historyList');
    const btnClearHistory = document.getElementById('btnClearHistory');
    const toastContainer = document.getElementById('toastContainer');

    // --- State ---
    let allVoices = [];
    let currentLangFilter = 'vi-VN';
    let currentBlobUrl = null;
    let currentAudioDuration = 0;
    let isScrubbing = false;
    let activePlaybackSpeed = 1.0;
    let isShuffle = false;
    let repeatMode = 0; // 0: off, 1: repeat current, 2: repeat all
    let lastVolume = 1.0;
    let currentPlayingIndex = -1;

    let generationTimer = null;
    let generationStartTime = 0;
    const STORAGE_KEY = 'capcut_tts_web_history_v2';

    // --- Sample Texts ---
    const sampleShortTexts = [
        "Xin chào các bạn! Đây là giọng đọc nhân tạo từ CapCut cực kỳ tự nhiên và sống động.",
        "Chào mừng bạn đến với CapCut Text-to-Speech Web Studio. Chúc bạn có những trải nghiệm tuyệt vời!",
        "Hôm nay trời thật đẹp, hãy cùng lắng nghe đoạn audio mẫu được tạo ra bằng công nghệ AI giọng nói nhé."
    ];

    const sampleLongStory =
`TIẾNG LÒNG CÁ MẶN BỊ ĐẠI LÃO NGHE THẤY: CẢ GIỚI HÀO MÔN RUNG CHUYỂN!
Chương 1. Tiệc thọ sóng gió, tiếng lòng vạch mặt kẻ giết người!.

Chương một: Trong đại sảnh hoa lệ của khách sạn Đế Cảnh, tiếng đàn vĩ cầm du dương như dải lụa mỏng manh len lỏi qua từng góc nhỏ. Hương rượu vang hòa quyện cùng mùi nước hoa đắt tiền, tạo nên một không gian đậm chất thượng lưu. 

Hôm nay là đại thọ bảy mươi tuổi của Lục lão gia tử - nhân vật quyền lực bậc nhất kinh thành, không ai là không muốn nhân cơ hội này để lấy lòng ông.

Ở một góc khuất gần bàn tráng miệng, Khương Ninh lười biếng dựa người vào ghế sô pha, một tay cầm ly nước cam, một tay nhón lấy miếng bánh dâu tây bỏ vào miệng. Cô mặc một chiếc váy dạ hội màu đen đơn giản, hoàn toàn tách biệt với những tiểu thư khuê các đang xúng xính váy áo dạ hội lộng lẫy quanh đây.

"Làm cá mặn thật là thoải mái..." Khương Ninh thở dài thỏa mãn trong lòng. Vừa xuyên không vào cuốn tiểu thuyết ngôn tình này được ba ngày, cô đã nhanh chóng xác định được tôn chỉ sống của mình: Không tranh, không đoạt, ăn no ngủ kỹ, an hưởng tuổi già sớm.

Đột nhiên, từ phía cửa chính vang lên một hồi xôn xao. Đám đông tự động dạt sang hai bên, nhường đường cho một người đàn ông trẻ tuổi đang ngồi trên xe lăn được đẩy vào.

Người đàn ông khoác một chiếc áo măng tô dạ đen tuyền, gương mặt tuấn mỹ góc cạnh nhưng lại tái nhợt như ngọc không tì vết. Đôi mắt sâu thẳm đen láy như đáy vực sâu, tỏa ra khí tức lạnh lẽo đến thấu xương. Đó chính là Lục Thời Dực - người thừa kế duy nhất của tập đoàn Lục Thị, nhưng sau một tai nạn bí ẩn nửa năm trước, anh đã bị liệt hai chân và trở nên tàn nhẫn, khép kín.`;

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
        }, 4500);
    }

    // --- Format Time Helper (H:MM:SS or MM:SS) ---
    function formatTime(seconds) {
        if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) return '00:00';
        const totalSecs = Math.floor(seconds);
        const hrs = Math.floor(totalSecs / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        const secs = totalSecs % 60;

        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function formatFileSize(bytes) {
        if (!bytes || bytes <= 0) return '';
        if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(1)} KB`;
        }
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
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
            if (currentLangFilter !== 'all') {
                const matchLang = (v.lang && v.lang.toLowerCase() === currentLangFilter.toLowerCase()) ||
                                  (v.lan && v.lan.toLowerCase() === currentLangFilter.toLowerCase());
                if (!matchLang) return false;
            }
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

    // --- Threads Slider Event ---
    threadsSlider.addEventListener('input', (e) => {
        threadsValueDisplay.textContent = `${e.target.value} Luồng`;
        updateTextStats();
    });

    // --- Text Input & Stats Events ---
    function estimateChunks(text) {
        if (!text.trim()) return 0;
        if (!chkAutoSplit.checked || (text.length <= 200 && !text.includes('\n'))) return 1;
        return Math.max(1, Math.ceil(text.length / 200));
    }

    function updateTextStats() {
        const text = textInput.value;
        charCount.textContent = text.length;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        wordCount.textContent = words;

        const estChunks = estimateChunks(text);
        chunkEstimate.textContent = `${estChunks} đoạn (${threadsSlider.value} luồng)`;
    }

    textInput.addEventListener('input', updateTextStats);
    chkAutoSplit.addEventListener('change', updateTextStats);
    threadsSlider.addEventListener('change', updateTextStats);

    btnSampleText.addEventListener('click', () => {
        const randomSample = sampleShortTexts[Math.floor(Math.random() * sampleShortTexts.length)];
        textInput.value = randomSample;
        updateTextStats();
    });

    btnSampleLongText.addEventListener('click', () => {
        textInput.value = sampleLongStory;
        updateTextStats();
        showToast('Đã nạp văn bản truyện dài mẫu! Bấm "Tạo Giọng Nói" để trải nghiệm.', 'info');
    });

    btnClearText.addEventListener('click', () => {
        textInput.value = '';
        updateTextStats();
    });

    // Set initial text
    textInput.value = "Xin chào! Bạn có thể nhập nội dung văn bản vào đây để tôi đọc cho bạn nghe nhé.";
    updateTextStats();

    // ==========================================
    // --- TTS Generation with Real-time Progress Tracking ---
    // ==========================================
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
        const threads = parseInt(threadsSlider.value, 10) || 50;
        const autoSplit = chkAutoSplit.checked;
        const voiceName = selectedOption.textContent;

        const estChunks = estimateChunks(text);

        // UI Loading state & Show Progress Card
        btnGenerate.disabled = true;
        btnGenerate.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Đang khởi động tạo audio...</span>`;

        progressCard.style.display = 'block';
        taskPercentBadge.textContent = '0%';
        taskProgressBar.style.width = '0%';
        taskDoneChunksText.textContent = `0 / ${estChunks} đoạn`;
        taskStatusText.textContent = `Đang cắt đoạn & gửi task...`;
        taskThreadsBadge.textContent = `${threads} Luồng`;
        taskElapsedText.textContent = '00:00';

        playerStatus.textContent = `Đang xử lý ${estChunks} đoạn...`;
        playerStatus.classList.remove('active');

        // Start elapsed timer
        generationStartTime = Date.now();
        if (generationTimer) clearInterval(generationTimer);
        generationTimer = setInterval(() => {
            const elapsedSecs = Math.floor((Date.now() - generationStartTime) / 1000);
            taskElapsedText.textContent = formatTime(elapsedSecs);
        }, 1000);

        try {
            // 1. Gửi request tạo task bất đồng bộ
            const startRes = await fetch('/api/tts/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text,
                    voice: voiceType,
                    resource_id: resourceId,
                    rate: rate,
                    threads: threads,
                    auto_split: autoSplit
                })
            });

            if (!startRes.ok) {
                const err = await startRes.json().catch(() => ({}));
                throw new Error(err.detail || `Lỗi máy chủ (${startRes.status})`);
            }

            const startData = await startRes.json();
            const taskId = startData.task_id;
            const totalChunks = startData.total_chunks;

            taskDoneChunksText.textContent = `0 / ${totalChunks} đoạn`;
            btnGenerate.innerHTML = `<i class="fa-solid fa-bolt"></i> <span>Đang chạy đa luồng (${totalChunks} đoạn)...</span>`;

            // 2. Poll trạng thái từng đoạn theo thời gian thực (real-time progress)
            let isDone = false;
            let pollAttempts = 0;
            let finalDuration = 0;
            let finalSize = 0;

            while (!isDone && pollAttempts < 1500) {
                await new Promise(r => setTimeout(r, 400));
                pollAttempts++;

                const statusRes = await fetch(`/api/tts/status/${taskId}`);
                if (!statusRes.ok) continue;

                const statusData = await statusRes.json();
                const doneChunks = statusData.completed_chunks || 0;
                const percent = Math.min(statusData.percent || 0, 100);

                taskPercentBadge.textContent = `${percent}%`;
                taskProgressBar.style.width = `${percent}%`;
                taskDoneChunksText.textContent = `${doneChunks} / ${totalChunks} đoạn`;

                if (statusData.status === 'processing') {
                    taskStatusText.textContent = `Đang tải đa luồng (${doneChunks}/${totalChunks})...`;
                } else if (statusData.status === 'merging') {
                    taskStatusText.textContent = `Đang ghép ${totalChunks} file MP3...`;
                } else if (statusData.status === 'completed') {
                    taskStatusText.textContent = `Hoàn tất 100%!`;
                    taskPercentBadge.textContent = '100%';
                    taskProgressBar.style.width = '100%';
                    finalDuration = statusData.duration_seconds || 0;
                    finalSize = statusData.audio_size || 0;
                    isDone = true;
                    break;
                } else if (statusData.status === 'error') {
                    throw new Error(statusData.error_message || 'Xử lý thất bại trên server');
                }
            }

            if (!isDone) {
                throw new Error('Quá thời gian chờ phản hồi từ hệ thống.');
            }

            // 3. Tải stream file MP3 hoàn chỉnh
            const audioRes = await fetch(`/api/tts/audio/${taskId}`);
            if (!audioRes.ok) {
                throw new Error('Không thể tải file âm thanh đã ghép.');
            }

            const audioBlob = await audioRes.blob();

            // Load audio into our unified audio player
            loadAudioBlobIntoPlayer({
                blob: audioBlob,
                duration: finalDuration,
                voiceName: voiceName,
                voiceType: voiceType,
                text: text,
                totalChunks: totalChunks,
                taskId: taskId,
                rate: rate
            });

            showToast(`🎉 Đã tạo thành công ${totalChunks} đoạn âm thanh (${formatTime(finalDuration)})!`, 'success');
        } catch (err) {
            showToast(`Lỗi tạo TTS: ${err.message}`, 'error');
            playerStatus.textContent = 'Thất bại';
            taskStatusText.textContent = `Lỗi: ${err.message}`;
        } finally {
            if (generationTimer) clearInterval(generationTimer);
            btnGenerate.disabled = false;
            btnGenerate.innerHTML = '<i class="fa-solid fa-play"></i> <span>Tạo Giọng Nói (TTS)</span>';
        }
    });

    // ==========================================
    // --- Audio Player Controller (Image 2 UI) ---
    // ==========================================
    function loadAudioBlobIntoPlayer({ blob, duration, voiceName, voiceType, text, totalChunks, taskId, rate }) {
        if (currentBlobUrl) {
            URL.revokeObjectURL(currentBlobUrl);
        }

        currentBlobUrl = URL.createObjectURL(blob);
        currentAudioDuration = duration;

        audioElement.src = currentBlobUrl;
        audioElement.playbackRate = activePlaybackSpeed;
        audioElement.volume = lastVolume;

        // Update Card Player Information
        currentPlayingVoice.textContent = voiceName;
        currentPlayingPreview.textContent = `Đã tạo & ghép hoàn tất ${totalChunks} đoạn (${text.length} ký tự)`;
        playerStatus.textContent = `Sẵn sàng (${formatTime(duration)})`;
        playerStatus.classList.add('active');

        // Update Time displays
        currentTimeDisplay.textContent = '00:00';
        durationTimeDisplay.textContent = formatTime(duration);
        progressFill.style.width = '0%';

        // Update Fixed Bottom Bar Information
        fixedTrackTitle.textContent = voiceName;
        fixedCurrentTime.textContent = '00:00';
        fixedDurationTime.textContent = formatTime(duration);
        fixedProgressFill.style.width = '0%';
        fixedBottomPlayer.style.display = 'block';

        // Enable All Player Controls
        enablePlayerControls(true);

        // Setup Download Links
        const downloadFilename = `audio_story_${voiceType}_${Date.now()}.mp3`;
        btnQuickDownload.href = currentBlobUrl;
        btnQuickDownload.download = downloadFilename;
        btnQuickDownload.style.display = 'flex';

        fixedBtnDownload.href = currentBlobUrl;
        fixedBtnDownload.download = downloadFilename;

        btnDownloadMain.href = currentBlobUrl;
        btnDownloadMain.download = downloadFilename;
        dlMetaInfo.textContent = `${formatTime(duration)} • ${formatFileSize(blob.size)} • MP3`;
        downloadArea.style.display = 'block';

        // Auto Play
        audioElement.play().catch(() => {
            console.log('Autoplay was blocked by browser policy; user can click Play.');
        });

        // Save to History
        saveToHistory({
            id: Date.now(),
            taskId: taskId,
            text: text,
            voiceType: voiceType,
            voiceName: voiceName,
            rate: rate,
            chunks: totalChunks,
            duration: duration,
            size: blob.size,
            timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        });
    }

    function enablePlayerControls(enabled = true) {
        const controls = [
            btnPlayPause, btnRewind10, btnForward10, btnPrev, btnNext, btnShuffle, btnRepeat,
            fixedBtnPlayPause, fixedBtnRewind10, fixedBtnForward10, fixedBtnPrev, fixedBtnNext, fixedBtnShuffle, fixedBtnRepeat
        ];
        controls.forEach(ctrl => {
            if (ctrl) ctrl.disabled = !enabled;
        });
    }

    // --- Play / Pause Toggle ---
    function togglePlayPause() {
        if (!audioElement.src) return;
        if (audioElement.paused) {
            audioElement.play();
        } else {
            audioElement.pause();
        }
    }

    btnPlayPause.addEventListener('click', togglePlayPause);
    fixedBtnPlayPause.addEventListener('click', togglePlayPause);

    // Audio Play / Pause Events (Sync UI)
    audioElement.addEventListener('play', () => {
        btnPlayPause.innerHTML = '<i class="fa-solid fa-pause"></i>';
        fixedBtnPlayPause.innerHTML = '<i class="fa-solid fa-pause"></i>';
        visualizer.classList.add('playing');
        playerStatus.textContent = 'Đang phát';
        playerStatus.classList.add('active');
    });

    audioElement.addEventListener('pause', () => {
        btnPlayPause.innerHTML = '<i class="fa-solid fa-play"></i>';
        fixedBtnPlayPause.innerHTML = '<i class="fa-solid fa-play"></i>';
        visualizer.classList.remove('playing');
        playerStatus.textContent = 'Tạm dừng';
    });

    // --- Ended Handler with Shuffle & Repeat ---
    audioElement.addEventListener('ended', () => {
        visualizer.classList.remove('playing');

        if (repeatMode === 1) {
            // Repeat current track
            audioElement.currentTime = 0;
            audioElement.play();
            return;
        }

        const history = loadHistory();

        if (isShuffle && history.length > 1) {
            // Pick random history track
            const randomIdx = Math.floor(Math.random() * history.length);
            playHistoryTrackByIndex(randomIdx);
            return;
        }

        if (repeatMode === 2 && history.length > 0) {
            // Play next in history
            const nextIdx = (currentPlayingIndex + 1) % history.length;
            playHistoryTrackByIndex(nextIdx);
            return;
        }

        // Normal ended
        btnPlayPause.innerHTML = '<i class="fa-solid fa-play"></i>';
        fixedBtnPlayPause.innerHTML = '<i class="fa-solid fa-play"></i>';
        progressFill.style.width = '0%';
        fixedProgressFill.style.width = '0%';
        currentTimeDisplay.textContent = '00:00';
        fixedCurrentTime.textContent = '00:00';
        playerStatus.textContent = 'Đã phát xong';
    });

    // --- Seek Controls ---
    function rewind10() {
        if (!audioElement.src) return;
        audioElement.currentTime = Math.max(0, audioElement.currentTime - 10);
    }

    function forward10() {
        if (!audioElement.src) return;
        const dur = getEffectiveDuration();
        audioElement.currentTime = Math.min(dur, audioElement.currentTime + 10);
    }

    btnRewind10.addEventListener('click', rewind10);
    fixedBtnRewind10.addEventListener('click', rewind10);
    btnForward10.addEventListener('click', forward10);
    fixedBtnForward10.addEventListener('click', forward10);

    // Prev / Next Track navigation
    function handlePrevTrack() {
        if (!audioElement.src) return;
        if (audioElement.currentTime > 3) {
            audioElement.currentTime = 0;
            return;
        }
        const history = loadHistory();
        if (history.length > 1 && currentPlayingIndex > 0) {
            playHistoryTrackByIndex(currentPlayingIndex - 1);
        } else {
            audioElement.currentTime = 0;
        }
    }

    function handleNextTrack() {
        if (!audioElement.src) return;
        const history = loadHistory();
        if (history.length > 1 && currentPlayingIndex < history.length - 1) {
            playHistoryTrackByIndex(currentPlayingIndex + 1);
        } else {
            const dur = getEffectiveDuration();
            audioElement.currentTime = dur;
        }
    }

    btnPrev.addEventListener('click', handlePrevTrack);
    fixedBtnPrev.addEventListener('click', handlePrevTrack);
    btnNext.addEventListener('click', handleNextTrack);
    fixedBtnNext.addEventListener('click', handleNextTrack);

    // --- Shuffle & Repeat Toggle ---
    function toggleShuffle() {
        isShuffle = !isShuffle;
        btnShuffle.classList.toggle('active', isShuffle);
        fixedBtnShuffle.classList.toggle('active', isShuffle);
        showToast(isShuffle ? 'Đã bật phát ngẫu nhiên (Shuffle)' : 'Đã tắt phát ngẫu nhiên', 'info');
    }

    btnShuffle.addEventListener('click', toggleShuffle);
    fixedBtnShuffle.addEventListener('click', toggleShuffle);

    function toggleRepeat() {
        repeatMode = (repeatMode + 1) % 3;
        if (repeatMode === 0) {
            btnRepeat.classList.remove('active');
            fixedBtnRepeat.classList.remove('active');
            btnRepeat.title = 'Lặp lại: Tắt';
            fixedBtnRepeat.title = 'Lặp lại: Tắt';
            showToast('Chế độ lặp lại: Tắt', 'info');
        } else if (repeatMode === 1) {
            btnRepeat.classList.add('active');
            fixedBtnRepeat.classList.add('active');
            btnRepeat.title = 'Lặp lại: 1 bài hiện tại';
            fixedBtnRepeat.title = 'Lặp lại: 1 bài hiện tại';
            showToast('Chế độ lặp lại: Lặp lại bài này', 'info');
        } else {
            btnRepeat.classList.add('active');
            fixedBtnRepeat.classList.add('active');
            btnRepeat.title = 'Lặp lại: Toàn bộ danh sách';
            fixedBtnRepeat.title = 'Lặp lại: Toàn bộ danh sách';
            showToast('Chế độ lặp lại: Lặp lại toàn bộ', 'info');
        }
    }

    btnRepeat.addEventListener('click', toggleRepeat);
    fixedBtnRepeat.addEventListener('click', toggleRepeat);

    // --- Volume & Mute Controls ---
    function setVolume(val) {
        val = Math.max(0, Math.min(1, val));
        audioElement.volume = val;
        volumeSlider.value = val;
        fixedVolumeSlider.value = val;
        volumeValText.textContent = `${Math.round(val * 100)}%`;

        let iconClass = 'fa-volume-high';
        if (val === 0) iconClass = 'fa-volume-xmark';
        else if (val < 0.5) iconClass = 'fa-volume-low';

        btnVolume.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
        fixedBtnVolume.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
        if (val > 0) lastVolume = val;
    }

    volumeSlider.addEventListener('input', (e) => setVolume(parseFloat(e.target.value)));
    fixedVolumeSlider.addEventListener('input', (e) => setVolume(parseFloat(e.target.value)));

    function toggleMute() {
        if (audioElement.volume > 0) {
            lastVolume = audioElement.volume;
            setVolume(0);
        } else {
            setVolume(lastVolume || 1.0);
        }
    }

    btnVolume.addEventListener('click', toggleMute);
    fixedBtnVolume.addEventListener('click', toggleMute);

    // --- Speed Settings ---
    function setPlaybackSpeed(speed) {
        activePlaybackSpeed = speed;
        audioElement.playbackRate = speed;
        fixedBtnSpeed.textContent = `${speed.toFixed(speed % 1 === 0 ? 1 : 2)}x`;

        speedOptBtns.forEach(btn => {
            if (parseFloat(btn.dataset.speed) === speed) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    btnSettings.addEventListener('click', (e) => {
        e.stopPropagation();
        speedMenuPopup.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.settings-control-wrapper')) {
            speedMenuPopup.classList.remove('open');
        }
    });

    speedOptBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const spd = parseFloat(btn.dataset.speed);
            setPlaybackSpeed(spd);
            speedMenuPopup.classList.remove('open');
            showToast(`Tốc độ phát: ${spd}x`, 'info');
        });
    });

    const speedCycle = [1.0, 1.25, 1.5, 2.0, 0.8];
    fixedBtnSpeed.addEventListener('click', () => {
        const currIdx = speedCycle.indexOf(activePlaybackSpeed);
        const nextIdx = (currIdx + 1) % speedCycle.length;
        setPlaybackSpeed(speedCycle[nextIdx]);
        showToast(`Tốc độ phát: ${activePlaybackSpeed}x`, 'info');
    });

    // Hide fixed player bar button
    btnHideFixedPlayer.addEventListener('click', () => {
        fixedBottomPlayer.style.display = 'none';
    });

    // --- Scrubber Helper ---
    function getEffectiveDuration() {
        return (currentAudioDuration && currentAudioDuration > 0)
            ? currentAudioDuration
            : (audioElement.duration && isFinite(audioElement.duration) ? audioElement.duration : 0);
    }

    // Smooth Scrubber & Accurate Duration Display
    audioElement.addEventListener('timeupdate', () => {
        if (isScrubbing) return;
        const dur = getEffectiveDuration();

        if (dur > 0) {
            const pct = Math.min(100, (audioElement.currentTime / dur) * 100);
            progressFill.style.width = `${pct}%`;
            fixedProgressFill.style.width = `${pct}%`;

            durationTimeDisplay.textContent = formatTime(dur);
            fixedDurationTime.textContent = formatTime(dur);
        }

        currentTimeDisplay.textContent = formatTime(audioElement.currentTime);
        fixedCurrentTime.textContent = formatTime(audioElement.currentTime);
    });

    audioElement.addEventListener('loadedmetadata', () => {
        if (!currentAudioDuration && isFinite(audioElement.duration)) {
            currentAudioDuration = audioElement.duration;
        }
        durationTimeDisplay.textContent = formatTime(currentAudioDuration);
        fixedDurationTime.textContent = formatTime(currentAudioDuration);
    });

    // Scrubber Seeking Events for any track container
    function bindScrubber(container) {
        function seek(e) {
            const rect = container.getBoundingClientRect();
            const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
            const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
            const ratio = clickX / rect.width;
            const dur = getEffectiveDuration();

            if (dur > 0) {
                audioElement.currentTime = ratio * dur;
                const pct = ratio * 100;
                progressFill.style.width = `${pct}%`;
                fixedProgressFill.style.width = `${pct}%`;
                currentTimeDisplay.textContent = formatTime(audioElement.currentTime);
                fixedCurrentTime.textContent = formatTime(audioElement.currentTime);
            }
        }

        container.addEventListener('mousedown', (e) => {
            if (!audioElement.src) return;
            isScrubbing = true;
            seek(e);

            function onMouseMove(moveEvent) {
                if (isScrubbing) seek(moveEvent);
            }

            function onMouseUp() {
                isScrubbing = false;
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
            }

            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        });

        container.addEventListener('touchstart', (e) => {
            if (!audioElement.src || !e.touches[0]) return;
            isScrubbing = true;
            seek(e);
        });

        container.addEventListener('touchmove', (e) => {
            if (isScrubbing && e.touches[0]) seek(e);
        });

        container.addEventListener('touchend', () => {
            isScrubbing = false;
        });
    }

    bindScrubber(progressContainer);
    bindScrubber(fixedProgressContainer);

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
        // Do not trigger if typing in text inputs
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

        if (e.code === 'Space') {
            e.preventDefault();
            togglePlayPause();
        } else if (e.code === 'ArrowLeft') {
            e.preventDefault();
            rewind10();
        } else if (e.code === 'ArrowRight') {
            e.preventDefault();
            forward10();
        } else if (e.code === 'ArrowUp') {
            e.preventDefault();
            setVolume(audioElement.volume + 0.1);
        } else if (e.code === 'ArrowDown') {
            e.preventDefault();
            setVolume(audioElement.volume - 0.1);
        } else if (e.code === 'KeyM') {
            e.preventDefault();
            toggleMute();
        }
    });

    // ==========================================
    // --- History Management ---
    // ==========================================
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
        history.unshift(item);
        if (history.length > 30) history.pop();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
        renderHistory();
    }

    async function playHistoryTrackByIndex(index) {
        const history = loadHistory();
        if (index < 0 || index >= history.length) return;
        const item = history[index];
        currentPlayingIndex = index;

        if (item.taskId) {
            try {
                showToast(`Đang tải audio "${item.voiceName || item.voiceType}" từ lịch sử...`, 'info');
                const res = await fetch(`/api/tts/audio/${item.taskId}`);
                if (!res.ok) throw new Error('Audio đã hết hạn trên server cache.');
                const blob = await res.blob();
                loadAudioBlobIntoPlayer({
                    blob: blob,
                    duration: item.duration || 0,
                    voiceName: item.voiceName || item.voiceType,
                    voiceType: item.voiceType,
                    text: item.text,
                    totalChunks: item.chunks || 1,
                    taskId: item.taskId,
                    rate: item.rate || 1.0
                });
            } catch (err) {
                showToast(`Không thể phát: ${err.message}`, 'error');
            }
        }
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

        history.forEach((item, index) => {
            const el = document.createElement('div');
            el.className = 'history-item';
            const durStr = item.duration ? formatTime(item.duration) : '';
            const sizeStr = item.size ? formatFileSize(item.size) : '';

            el.innerHTML = `
                <div class="history-info">
                    <div class="history-meta">
                        <span>${item.voiceName || item.voiceType}</span>
                        <span class="history-rate">(${item.rate}x &bull; ${item.chunks || 1} đoạn ${durStr ? '&bull; ' + durStr : ''} ${sizeStr ? '&bull; ' + sizeStr : ''} &bull; ${item.timestamp})</span>
                    </div>
                    <div class="history-text" title="${item.text}">${item.text}</div>
                </div>
                <div class="history-actions">
                    ${item.taskId ? `
                    <button class="btn-icon btn-history-play" title="Nghe đoạn này">
                        <i class="fa-solid fa-play"></i>
                    </button>
                    <button class="btn-icon btn-history-dl" title="Tải file MP3 này">
                        <i class="fa-solid fa-download"></i>
                    </button>` : ''}
                    <button class="btn-icon btn-reuse-history" title="Nạp lại nội dung và cài đặt">
                        <i class="fa-solid fa-arrow-rotate-left"></i>
                    </button>
                </div>
            `;

            // Play action from history
            const btnPlay = el.querySelector('.btn-history-play');
            if (btnPlay) {
                btnPlay.addEventListener('click', () => {
                    playHistoryTrackByIndex(index);
                });
            }

            // Download action from history
            const btnDl = el.querySelector('.btn-history-dl');
            if (btnDl && item.taskId) {
                btnDl.addEventListener('click', async () => {
                    try {
                        btnDl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
                        const res = await fetch(`/api/tts/audio/${item.taskId}`);
                        if (!res.ok) throw new Error('Audio đã hết hạn trong bộ nhớ đệm server.');
                        const blob = await res.blob();
                        const dlUrl = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = dlUrl;
                        a.download = `audio_story_${item.taskId.slice(0, 8)}.mp3`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(dlUrl);
                        showToast('Đang tải file audio...', 'success');
                    } catch (err) {
                        showToast(`Lỗi tải: ${err.message}`, 'error');
                    } finally {
                        btnDl.innerHTML = '<i class="fa-solid fa-download"></i>';
                    }
                });
            }

            // Reuse action
            el.querySelector('.btn-reuse-history').addEventListener('click', () => {
                textInput.value = item.text;
                updateTextStats();
                rateSlider.value = item.rate;
                rateValueDisplay.textContent = `${item.rate}x`;
                updatePresetButtons(item.rate.toString());

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
