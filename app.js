// Tab switching
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(tc => tc.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(tabName).classList.add('active');
    });
});

// Speech synthesis
let currentUtterance = null;

// Speed control
const speedRate = document.getElementById('speedRate');
const speedValue = document.getElementById('speedValue');
const trSpeedRate = document.getElementById('trSpeedRate');
const trSpeedValue = document.getElementById('trSpeedValue');

speedRate.addEventListener('input', (e) => {
    speedValue.textContent = parseFloat(e.target.value).toFixed(1) + 'x';
});

trSpeedRate.addEventListener('input', (e) => {
    trSpeedValue.textContent = parseFloat(e.target.value).toFixed(1) + 'x';
});

// Tab 1: Read original text
const readBtn = document.getElementById('readBtn');
const stopBtn = document.getElementById('stopBtn');
const textInput = document.getElementById('textInput');
const voiceLang = document.getElementById('voiceLang');
const status = document.getElementById('status');

readBtn.addEventListener('click', () => {
    const text = textInput.value.trim();
    if (!text) {
        showStatus('텍스트를 입력해주세요.', 'error');
        return;
    }

    if ('speechSynthesis' in window) {
        // Stop any ongoing speech
        window.speechSynthesis.cancel();

        currentUtterance = new SpeechSynthesisUtterance(text);
        currentUtterance.lang = voiceLang.value;
        currentUtterance.rate = parseFloat(speedRate.value);

        currentUtterance.onstart = () => {
            readBtn.style.display = 'none';
            stopBtn.style.display = 'flex';
            showStatus('읽는 중...', 'info');
        };

        currentUtterance.onend = () => {
            readBtn.style.display = 'flex';
            stopBtn.style.display = 'none';
            showStatus('읽기 완료!', 'success');
        };

        currentUtterance.onerror = (e) => {
            readBtn.style.display = 'flex';
            stopBtn.style.display = 'none';
            showStatus('오류가 발생했습니다: ' + e.error, 'error');
        };

        window.speechSynthesis.speak(currentUtterance);
    } else {
        showStatus('이 브라우저는 음성 합성을 지원하지 않습니다.', 'error');
    }
});

stopBtn.addEventListener('click', () => {
    window.speechSynthesis.cancel();
    readBtn.style.display = 'flex';
    stopBtn.style.display = 'none';
    showStatus('정지되었습니다.', 'info');
});

// Tab 2: Translate
const translateBtn = document.getElementById('translateBtn');
const translateInput = document.getElementById('translateInput');
const sourceLang = document.getElementById('sourceLang');
const targetLang = document.getElementById('targetLang');
const translateOutput = document.getElementById('translateOutput');
const translateStatus = document.getElementById('translateStatus');

translateBtn.addEventListener('click', async () => {
    const text = translateInput.value.trim();
    if (!text) {
        showTranslateStatus('텍스트를 입력해주세요.', 'error');
        return;
    }

    showTranslateStatus('번역 중...', 'info');
    translateBtn.disabled = true;

    try {
        const translated = await translateText(text, sourceLang.value, targetLang.value);
        translateOutput.innerHTML = makeClickableWords(translated);
        showTranslateStatus('번역 완료!', 'success');
    } catch (error) {
        showTranslateStatus('번역 실패: ' + error.message, 'error');
    } finally {
        translateBtn.disabled = false;
    }
});

// Tab 3: Translate and Read
const trBtn = document.getElementById('trBtn');
const trStopBtn = document.getElementById('trStopBtn');
const trReadInput = document.getElementById('trReadInput');
const trSourceLang = document.getElementById('trSourceLang');
const trTargetLang = document.getElementById('trTargetLang');
const trOutput = document.getElementById('trOutput');
const trStatus = document.getElementById('trStatus');

trBtn.addEventListener('click', async () => {
    const text = trReadInput.value.trim();
    if (!text) {
        showTrStatus('텍스트를 입력해주세요.', 'error');
        return;
    }

    showTrStatus('번역 중...', 'info');
    trBtn.disabled = true;

    try {
        const translated = await translateText(text, trSourceLang.value, trTargetLang.value);
        trOutput.innerHTML = makeClickableWords(translated);
        showTrStatus('번역 완료! 읽는 중...', 'info');

        // Read the translated text
        window.speechSynthesis.cancel();
        currentUtterance = new SpeechSynthesisUtterance(translated);
        currentUtterance.lang = trTargetLang.value;
        currentUtterance.rate = parseFloat(trSpeedRate.value);

        currentUtterance.onstart = () => {
            trBtn.style.display = 'none';
            trStopBtn.style.display = 'flex';
        };

        currentUtterance.onend = () => {
            trBtn.style.display = 'flex';
            trStopBtn.style.display = 'none';
            showTrStatus('완료!', 'success');
        };

        currentUtterance.onerror = (e) => {
            trBtn.style.display = 'flex';
            trStopBtn.style.display = 'none';
            showTrStatus('음성 오류: ' + e.error, 'error');
        };

        window.speechSynthesis.speak(currentUtterance);
        trBtn.disabled = false;
    } catch (error) {
        showTrStatus('번역 실패: ' + error.message, 'error');
        trBtn.disabled = false;
    }
});

trStopBtn.addEventListener('click', () => {
    window.speechSynthesis.cancel();
    trBtn.style.display = 'flex';
    trStopBtn.style.display = 'none';
    showTrStatus('정지되었습니다.', 'info');
});

// Translation API (using MyMemory free API)
async function translateText(text, from, to) {
    const fromLang = from === 'auto' ? '' : from;
    const toLang = to.split('-')[0]; // Convert 'en-US' to 'en'
    
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromLang}|${toLang}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.responseStatus === 200) {
        return data.responseData.translatedText;
    } else {
        throw new Error('Translation failed');
    }
}

// Make words clickable for dictionary
function makeClickableWords(text) {
    return text.split(/(\s+)/).map(word => {
        if (word.trim() && /[a-zA-Z가-힣]/.test(word)) {
            return `<span class="word" data-word="${word.trim()}">${word}</span>`;
        }
        return word;
    }).join('');
}

// Word click for dictionary
document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('word')) {
        const word = e.target.dataset.word;
        const rect = e.target.getBoundingClientRect();
        await showDictionary(word, rect);
    } else {
        hideTooltip();
    }
});

// Dictionary lookup
async function showDictionary(word, rect) {
    const tooltip = document.getElementById('tooltip');
    tooltip.textContent = '검색 중...';
    tooltip.classList.add('show');
    
    // Position tooltip
    tooltip.style.left = rect.left + 'px';
    tooltip.style.top = (rect.bottom + 5) + 'px';

    try {
        // Try to translate the word to Korean
        const translation = await translateText(word, 'auto', 'ko');
        tooltip.innerHTML = `<strong>${word}</strong><br>${translation}`;
    } catch (error) {
        tooltip.textContent = '번역 실패';
    }
}

function hideTooltip() {
    const tooltip = document.getElementById('tooltip');
    tooltip.classList.remove('show');
}

// Status helpers
function showStatus(message, type) {
    status.textContent = message;
    status.className = 'status ' + type;
}

function showTranslateStatus(message, type) {
    translateStatus.textContent = message;
    translateStatus.className = 'status ' + type;
}

function showTrStatus(message, type) {
    trStatus.textContent = message;
    trStatus.className = 'status ' + type;
}

// PWA Service Worker registration
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(reg => console.log('Service Worker registered'))
        .catch(err => console.log('Service Worker registration failed'));
}

// iOS standalone mode detection
if (window.navigator.standalone) {
    document.body.style.paddingTop = '20px';
}
