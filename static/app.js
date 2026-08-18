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

    // Audio Player Elements
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
    const btnSpeedToggle = document.getElementById('btnSpeedToggle');

    const downloadArea = document.getElementById('downloadArea');
    const btnDownloadMain = document.getElementById('btnDownloadMain');
    const dlMetaInfo = document.getElementById('dlMetaInfo');

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

    // --- Format Time Helper (HH:MM:SS or MM:SS) ---
    function formatTime(seconds) {
        if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) return '00:00';
        const totalSecs = Math.floor(seconds);
        const hrs = Math.floor(totalSecs / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        const secs = totalSecs % 60;

        if (hrs > 0) {
            return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
        showToast('Đã nạp văn bản truyện dài mẫu! Bấm "Tạo Giọng Nói" để thử nghiệm đa luồng.', 'info');
    });

    btnClearText.addEventListener('click', () => {
        textInput.value = '';
        updateTextStats();
    });

    // Set initial text
    textInput.value = "Xin chào! Bạn có thể nhập nội dung văn bản vào đây để tôi đọc cho bạn nghe nhé.";
    updateTextStats();

    // --- TTS Generation with Real-time Progress Tracking ---
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
        const threads = parseInt(threadsSlider.value, 10) || 10;
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

            while (!isDone && pollAttempts < 1200) {
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

            // Dọn dẹp URL blob cũ
            if (currentBlobUrl) {
                URL.revokeObjectURL(currentBlobUrl);
            }

            currentBlobUrl = URL.createObjectURL(audioBlob);
            currentAudioDuration = finalDuration;

            audioElement.src = currentBlobUrl;
            audioElement.playbackRate = activePlaybackSpeed;

            // Update Player UI
            currentPlayingVoice.textContent = voiceName;
            currentPlayingPreview.textContent = `Đã tạo & ghép hoàn tất ${totalChunks} đoạn (${text.length} ký tự)`;
            playerStatus.textContent = `Đã xong (${formatTime(finalDuration)})`;
            playerStatus.classList.add('active');

            // Reset scrubber & set duration
            progressFill.style.width = '0%';
            currentTimeDisplay.textContent = '00:00';
            durationTimeDisplay.textContent = formatTime(finalDuration);

            // Enable player controls
            btnPlayPause.disabled = false;
            btnRewind10.disabled = false;
            btnForward10.disabled = false;

            // Setup Dedicated Download Button
            const downloadFilename = `audio_story_${Date.now()}.mp3`;
            btnDownloadMain.href = currentBlobUrl;
            btnDownloadMain.download = downloadFilename;
            dlMetaInfo.textContent = `${formatTime(finalDuration)} • ${formatFileSize(audioBlob.size)} • MP3`;
            downloadArea.style.display = 'block';

            // Auto Play Audio
            audioElement.play().catch(() => {});

            // Save to Local History
            saveToHistory({
                id: Date.now(),
                taskId: taskId,
                text: text,
                voiceType: voiceType,
                voiceName: voiceName,
                rate: rate,
                chunks: totalChunks,
                duration: finalDuration,
                size: audioBlob.size,
                timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
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

    // --- Audio Player Controls ---
    btnPlayPause.addEventListener('click', () => {
        if (!audioElement.src) return;
        if (audioElement.paused) {
            audioElement.play();
        } else {
            audioElement.pause();
        }
    });

    btnRewind10.addEventListener('click', () => {
        if (!audioElement.src) return;
        audioElement.currentTime = Math.max(0, audioElement.currentTime - 10);
    });

    btnForward10.addEventListener('click', () => {
        if (!audioElement.src) return;
        const dur = currentAudioDuration || audioElement.duration || 0;
        audioElement.currentTime = Math.min(dur, audioElement.currentTime + 10);
    });

    // Cycle Playback Speeds: 1.0x -> 1.25x -> 1.5x -> 2.0x -> 0.8x
    const speedCycle = [1.0, 1.25, 1.5, 2.0, 0.8];
    btnSpeedToggle.addEventListener('click', () => {
        const currIdx = speedCycle.indexOf(activePlaybackSpeed);
        const nextIdx = (currIdx + 1) % speedCycle.length;
        activePlaybackSpeed = speedCycle[nextIdx];
        audioElement.playbackRate = activePlaybackSpeed;
        btnSpeedToggle.textContent = `${activePlaybackSpeed.toFixed(1)}x`;
        showToast(`Tốc độ phát: ${activePlaybackSpeed.toFixed(1)}x`, 'info');
    });

    audioElement.addEventListener('play', () => {
        btnPlayPause.innerHTML = '<i class="fa-solid fa-pause"></i>';
        visualizer.classList.add('playing');
        playerStatus.textContent = 'Đang phát';
    });

    audioElement.addEventListener('pause', () => {
        btnPlayPause.innerHTML = '<i class="fa-solid fa-play"></i>';
        visualizer.classList.remove('playing');
        playerStatus.textContent = 'Tạm dừng';
    });

    audioElement.addEventListener('ended', () => {
        btnPlayPause.innerHTML = '<i class="fa-solid fa-play"></i>';
        visualizer.classList.remove('playing');
        progressFill.style.width = '0%';
        currentTimeDisplay.textContent = '00:00';
        playerStatus.textContent = 'Đã phát xong';
    });

    // Smooth Scrubber & Accurate Duration Display
    audioElement.addEventListener('timeupdate', () => {
        if (isScrubbing) return;
        const effectiveDuration = (currentAudioDuration && currentAudioDuration > 0)
            ? currentAudioDuration
            : (audioElement.duration && isFinite(audioElement.duration) ? audioElement.duration : 0);

        if (effectiveDuration > 0) {
            const pct = Math.min(100, (audioElement.currentTime / effectiveDuration) * 100);
            progressFill.style.width = `${pct}%`;
            durationTimeDisplay.textContent = formatTime(effectiveDuration);
        }

        currentTimeDisplay.textContent = formatTime(audioElement.currentTime);
    });

    audioElement.addEventListener('loadedmetadata', () => {
        if (!currentAudioDuration && isFinite(audioElement.duration)) {
            currentAudioDuration = audioElement.duration;
        }
        durationTimeDisplay.textContent = formatTime(currentAudioDuration);
    });

    // Scrubber Seeking Events (Click & Drag)
    function seekToPosition(e) {
        const rect = progressContainer.getBoundingClientRect();
        const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const ratio = clickX / rect.width;
        const effectiveDuration = (currentAudioDuration && currentAudioDuration > 0)
            ? currentAudioDuration
            : (audioElement.duration && isFinite(audioElement.duration) ? audioElement.duration : 0);

        if (effectiveDuration > 0) {
            audioElement.currentTime = ratio * effectiveDuration;
            progressFill.style.width = `${ratio * 100}%`;
            currentTimeDisplay.textContent = formatTime(audioElement.currentTime);
        }
    }

    progressContainer.addEventListener('mousedown', (e) => {
        if (!audioElement.src) return;
        isScrubbing = true;
        seekToPosition(e);

        function onMouseMove(moveEvent) {
            if (isScrubbing) {
                seekToPosition(moveEvent);
            }
        }

        function onMouseUp() {
            isScrubbing = false;
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        }

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    });

    // Touch support for mobile scrubber
    progressContainer.addEventListener('touchstart', (e) => {
        if (!audioElement.src || !e.touches[0]) return;
        isScrubbing = true;
        seekToPosition(e.touches[0]);
    });

    progressContainer.addEventListener('touchmove', (e) => {
        if (isScrubbing && e.touches[0]) {
            seekToPosition(e.touches[0]);
        }
    });

    progressContainer.addEventListener('touchend', () => {
        isScrubbing = false;
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
        history.unshift(item);
        if (history.length > 25) history.pop();
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
                    <button class="btn-icon btn-history-dl" title="Tải file MP3 này">
                        <i class="fa-solid fa-download"></i>
                    </button>` : ''}
                    <button class="btn-icon btn-reuse-history" title="Nạp lại nội dung và cài đặt">
                        <i class="fa-solid fa-arrow-rotate-left"></i>
                    </button>
                </div>
            `;

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
