// History management
let history = JSON.parse(localStorage.getItem('ttsHistory') || '[]');

function saveHistory(type, text, translation = null, lang = null) {
    const item = {
        id: Date.now(),
        type,
        text,
        translation,
        lang,
        timestamp: new Date().toLocaleString('ko-KR')
    };
    
    history.unshift(item);
    if (history.length > 50) history = history.slice(0, 50);
    localStorage.setItem('ttsHistory', JSON.stringify(history));
    renderHistory();
}

function deleteHistoryItem(id) {
    history = history.filter(item => item.id !== id);
    localStorage.setItem('ttsHistory', JSON.stringify(history));
    renderHistory();
}

function clearAllHistory() {
    if (confirm('모든 히스토리를 삭제하시겠습니까?')) {
        history = [];
        localStorage.setItem('ttsHistory', JSON.stringify(history));
        renderHistory();
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('클립보드에 복사되었습니다!');
    }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('클립보드에 복사되었습니다!');
    });
}

function renderHistory() {
    const historyList = document.getElementById('historyList');
    const emptyHistory = document.getElementById('emptyHistory');
    
    if (history.length === 0) {
        historyList.innerHTML = '';
        emptyHistory.style.display = 'block';
        return;
    }
    
    emptyHistory.style.display = 'none';
    
    const typeNames = {
        'read': '📖 원문 읽기',
        'translate': '🌐 번역하기',
        'translate-read': '🔊 번역 후 읽기'
    };
    
    historyList.innerHTML = history.map(item => `
        <div class="history-item">
            <div class="history-header">
                <span class="history-type ${item.type}">${typeNames[item.type] || item.type}</span>
                <span class="history-time">${item.timestamp}</span>
            </div>
            <div class="history-content">
                <div>${item.text}</div>
                ${item.translation ? `<div class="history-translation">→ ${item.translation}</div>` : ''}
            </div>
            <div class="history-actions">
                <button class="history-btn" onclick="copyToClipboard(\`${item.text.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`)">
                    <svg class="icon" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/>
                        <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/>
                    </svg>
                    복사
                </button>
                ${item.translation ? `
                <button class="history-btn" onclick="copyToClipboard(\`${item.translation.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`)">
                    <svg class="icon" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/>
                        <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/>
                    </svg>
                    번역 복사
                </button>
                ` : ''}
                <button class="history-btn delete" onclick="deleteHistoryItem(${item.id})">
                    <svg class="icon" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
                    </svg>
                    삭제
                </button>
            </div>
        </div>
    `).join('');
}

document.getElementById('clearAllBtn').addEventListener('click', clearAllHistory);

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
        
        if (tabName === 'history') {
            renderHistory();
        }
    });
});

// Speech synthesis variables
let synth = window.speechSynthesis;
let currentUtterance = null;
let fullText = '';
let currentCharIndex = 0;
let isPaused = false;

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
const readSelectionBtn = document.getElementById('readSelectionBtn');
const resumeBtn = document.getElementById('resumeBtn');
const restartBtn = document.getElementById('restartBtn');
const stopBtn = document.getElementById('stopBtn');
const textInput = document.getElementById('textInput');
const voiceLang = document.getElementById('voiceLang');
const status = document.getElementById('status');

function speakText(text, startFrom = 0) {
    if (!synth) {
        showStatus('음성 합성을 지원하지 않는 브라우저입니다.', 'error');
        return;
    }

    synth.cancel();
    
    const textToSpeak = text.substring(startFrom);
    if (!textToSpeak.trim()) {
        showStatus('읽을 내용이 없습니다.', 'error');
        return;
    }

    currentUtterance = new SpeechSynthesisUtterance(textToSpeak);
    currentUtterance.lang = voiceLang.value;
    currentUtterance.rate = parseFloat(speedRate.value);
    
    currentUtterance.onstart = () => {
        readBtn.style.display = 'none';
        readSelectionBtn.style.display = 'none';
        resumeBtn.style.display = 'none';
        restartBtn.style.display = 'none';
        stopBtn.style.display = 'flex';
        isPaused = false;
        showStatus('읽는 중...', 'info');
    };
    
    currentUtterance.onend = () => {
        if (!isPaused) {
            readBtn.style.display = 'flex';
            readSelectionBtn.style.display = 'flex';
            resumeBtn.style.display = 'none';
            restartBtn.style.display = 'none';
            stopBtn.style.display = 'none';
            currentCharIndex = 0;
            showStatus('읽기 완료!', 'success');
        }
    };
    
    currentUtterance.onboundary = (event) => {
        if (event.name === 'word' || event.name === 'sentence') {
            currentCharIndex = startFrom + event.charIndex;
        }
    };
    
    currentUtterance.onerror = (e) => {
        console.error('TTS error:', e);
        readBtn.style.display = 'flex';
        readSelectionBtn.style.display = 'flex';
        resumeBtn.style.display = 'none';
        restartBtn.style.display = 'none';
        stopBtn.style.display = 'none';
        showStatus('오류 발생: ' + e.error, 'error');
    };
    
    synth.speak(currentUtterance);
}

// 전체 읽기
readBtn.addEventListener('click', () => {
    const text = textInput.value.trim();
    
    if (!text) {
        showStatus('텍스트를 입력해주세요.', 'error');
        return;
    }
    
    fullText = text;
    currentCharIndex = 0;
    speakText(text, 0);
    saveHistory('read', text, null, voiceLang.value);
});

// 선택 영역 읽기
readSelectionBtn.addEventListener('click', () => {
    const selectionStart = textInput.selectionStart;
    const selectionEnd = textInput.selectionEnd;
    
    if (selectionStart === selectionEnd) {
        showStatus('텍스트를 먼저 선택해주세요.', 'error');
        return;
    }
    
    const selectedText = textInput.value.substring(selectionStart, selectionEnd).trim();
    
    if (!selectedText) {
        showStatus('선택한 텍스트가 없습니다.', 'error');
        return;
    }
    
    fullText = selectedText;
    currentCharIndex = 0;
    showStatus('선택한 부분을 읽습니다.', 'info');
    speakText(selectedText, 0);
    saveHistory('read', selectedText, null, voiceLang.value);
});

resumeBtn.addEventListener('click', () => {
    if (fullText) {
        speakText(fullText, currentCharIndex);
    }
});

restartBtn.addEventListener('click', () => {
    if (fullText) {
        currentCharIndex = 0;
        speakText(fullText, 0);
    }
});

stopBtn.addEventListener('click', () => {
    isPaused = true;
    synth.cancel();
    readBtn.style.display = 'none';
    readSelectionBtn.style.display = 'none';
    resumeBtn.style.display = 'flex';
    restartBtn.style.display = 'flex';
    stopBtn.style.display = 'none';
    showStatus('정지됨 - 이어서 읽기 또는 처음부터 선택', 'info');
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
        saveHistory('translate', text, translated);
    } catch (error) {
        showTranslateStatus('번역 실패: ' + error.message, 'error');
    } finally {
        translateBtn.disabled = false;
    }
});

// Tab 3: Translate and Read
const trBtn = document.getElementById('trBtn');
const trResumeBtn = document.getElementById('trResumeBtn');
const trRestartBtn = document.getElementById('trRestartBtn');
const trStopBtn = document.getElementById('trStopBtn');
const trReadInput = document.getElementById('trReadInput');
const trSourceLang = document.getElementById('trSourceLang');
const trTargetLang = document.getElementById('trTargetLang');
const trOutput = document.getElementById('trOutput');
const trStatus = document.getElementById('trStatus');

let trFullText = '';
let trCurrentCharIndex = 0;
let trIsPaused = false;

function speakTranslatedText(text, startFrom = 0) {
    if (!synth) {
        showTrStatus('음성 합성을 지원하지 않는 브라우저입니다.', 'error');
        return;
    }

    synth.cancel();
    
    const textToSpeak = text.substring(startFrom);
    if (!textToSpeak.trim()) {
        showTrStatus('읽을 내용이 없습니다.', 'error');
        return;
    }

    currentUtterance = new SpeechSynthesisUtterance(textToSpeak);
    currentUtterance.lang = trTargetLang.value;
    currentUtterance.rate = parseFloat(trSpeedRate.value);
    
    currentUtterance.onstart = () => {
        trBtn.style.display = 'none';
        trResumeBtn.style.display = 'none';
        trRestartBtn.style.display = 'none';
        trStopBtn.style.display = 'flex';
        trIsPaused = false;
        showTrStatus('읽는 중...', 'info');
    };
    
    currentUtterance.onend = () => {
        if (!trIsPaused) {
            trBtn.style.display = 'flex';
            trResumeBtn.style.display = 'none';
            trRestartBtn.style.display = 'none';
            trStopBtn.style.display = 'none';
            trCurrentCharIndex = 0;
            showTrStatus('읽기 완료!', 'success');
        }
    };
    
    currentUtterance.onboundary = (event) => {
        if (event.name === 'word' || event.name === 'sentence') {
            trCurrentCharIndex = startFrom + event.charIndex;
        }
    };
    
    currentUtterance.onerror = (e) => {
        console.error('TTS error:', e);
        trBtn.style.display = 'flex';
        trResumeBtn.style.display = 'none';
        trRestartBtn.style.display = 'none';
        trStopBtn.style.display = 'none';
        showTrStatus('오류 발생: ' + e.error, 'error');
    };
    
    synth.speak(currentUtterance);
}

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
        saveHistory('translate-read', text, translated, trTargetLang.value);
        
        trFullText = translated;
        trCurrentCharIndex = 0;
        speakTranslatedText(translated, 0);
        trBtn.disabled = false;
    } catch (error) {
        showTrStatus('번역 실패: ' + error.message, 'error');
        trBtn.disabled = false;
    }
});

trResumeBtn.addEventListener('click', () => {
    if (trFullText) {
        speakTranslatedText(trFullText, trCurrentCharIndex);
    }
});

trRestartBtn.addEventListener('click', () => {
    if (trFullText) {
        trCurrentCharIndex = 0;
        speakTranslatedText(trFullText, 0);
    }
});

trStopBtn.addEventListener('click', () => {
    trIsPaused = true;
    synth.cancel();
    trBtn.style.display = 'none';
    trResumeBtn.style.display = 'flex';
    trRestartBtn.style.display = 'flex';
    trStopBtn.style.display = 'none';
    showTrStatus('정지됨 - 이어서 읽기 또는 처음부터 선택', 'info');
});

// Translation API
async function translateText(text, from, to) {
    const fromLang = from === 'auto' ? '' : from;
    const toLang = to.split('-')[0];
    
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
    
    tooltip.style.left = rect.left + 'px';
    tooltip.style.top = (rect.bottom + 5) + 'px';

    try {
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

// PWA Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(reg => console.log('Service Worker registered'))
        .catch(err => console.log('Service Worker registration failed'));
}

// iOS standalone mode
if (window.navigator.standalone) {
    document.body.style.paddingTop = '20px';
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    renderHistory();
});
