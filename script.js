/**
 * ============================================
 * ANYTHING GOES - Game Show Web App
 * ============================================
 * Author: Barnaboss Puli
 * LinkedIn: www.linkedin.com/barnaboss-puli
 * Created: December 2024
 * 
 * Game logic and functionality
 * 
 * Inspired by the Distractible Podcast episode
 * "Anything Goes" - This is a fan-made project.
 * ============================================
 */

let audioContext;
let isPlaying = false;
let sirenOscillator;
let sirenGain;
let clockInterval = null;
let clockGain = null;

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function startClockTick() {
    initAudio();
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    clockGain = audioContext.createGain();
    clockGain.gain.setValueAtTime(0.08, audioContext.currentTime); // Very faint
    clockGain.connect(audioContext.destination);

    function tick() {
        if (!clockGain) return;
        
        const tickOsc = audioContext.createOscillator();
        const tickEnv = audioContext.createGain();
        
        tickOsc.type = 'sine';
        tickOsc.frequency.setValueAtTime(800, audioContext.currentTime);
        tickOsc.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.05);
        
        tickEnv.gain.setValueAtTime(0.3, audioContext.currentTime);
        tickEnv.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
        
        tickOsc.connect(tickEnv);
        tickEnv.connect(clockGain);
        
        tickOsc.start();
        tickOsc.stop(audioContext.currentTime + 0.1);
    }

    tick();
    clockInterval = setInterval(tick, 500);
}

function stopClockTick() {
    if (clockInterval) {
        clearInterval(clockInterval);
        clockInterval = null;
    }
    clockGain = null;
}

function startSiren() {
    initAudio();
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    sirenOscillator = audioContext.createOscillator();
    sirenGain = audioContext.createGain();
    
    sirenOscillator.type = 'sawtooth';
    sirenOscillator.frequency.setValueAtTime(440, audioContext.currentTime);
    
    const lfo = audioContext.createOscillator();
    const lfoGain = audioContext.createGain();
    lfo.frequency.setValueAtTime(4, audioContext.currentTime);
    lfoGain.gain.setValueAtTime(400, audioContext.currentTime);
    
    lfo.connect(lfoGain);
    lfoGain.connect(sirenOscillator.frequency);
    
    sirenOscillator.connect(sirenGain);
    sirenGain.connect(audioContext.destination);
    
    sirenGain.gain.setValueAtTime(0.5, audioContext.currentTime);
    
    lfo.start();
    sirenOscillator.start();
    isPlaying = true;
}

function stopSiren() {
    if (sirenOscillator && isPlaying) {
        sirenOscillator.stop();
        isPlaying = false;
    }
}

let timerRunning = false;
let timerId = null;
let animationId = null;
let scores = { 1: 0, 2: 0 };
let totalTime = 0;
let startTime = 0;

const circumference = 2 * Math.PI * 90; // 565.48

let mainButton, statusEl, sirenOverlay, dismissBtn, donutContainer, donutProgress, donutPercent;

function initDOMElements() {
    mainButton = document.getElementById('mainButton');
    statusEl = document.getElementById('status');
    sirenOverlay = document.getElementById('sirenOverlay');
    dismissBtn = document.getElementById('dismissBtn');
    donutContainer = document.getElementById('donutContainer');
    donutProgress = document.getElementById('donutProgress');
    donutPercent = document.getElementById('donutPercent');
}

function updateScore(contestant, delta) {
    scores[contestant] = scores[contestant] + delta;
    const scoreEl = document.getElementById(`score${contestant}`);
    scoreEl.textContent = scores[contestant];
    
    if (scores[contestant] < 0) {
        scoreEl.classList.add('negative');
    } else {
        scoreEl.classList.remove('negative');
    }
}

function updateDonut(progress) {
    const offset = circumference * (1 - progress);
    donutProgress.style.strokeDashoffset = offset;
    donutPercent.textContent = Math.round(progress * 100) + '%';
}

function animateDonut() {
    if (!timerRunning) return;
    
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, totalTime - elapsed);
    const progress = remaining / totalTime;
    
    updateDonut(progress);
    
    if (remaining > 0) {
        animationId = requestAnimationFrame(animateDonut);
    }
}

function startTimer() {
    if (timerRunning) return;

    initAudio();

    totalTime = Math.floor(Math.random() * (120000 - 1000 + 1)) + 1000;
    startTime = Date.now();
    
    timerRunning = true;
    
    mainButton.classList.add('hidden');
    donutContainer.classList.add('visible');
    
    statusEl.textContent = 'TIMER ACTIVE';
    statusEl.classList.add('active');

    startClockTick();

    updateDonut(1);
    animateDonut();

    timerId = setTimeout(() => {
        triggerSiren();
    }, totalTime);
}

function triggerSiren() {
    stopClockTick();
    
    sirenOverlay.classList.add('active');
    startSiren();
    resetTimer();
}

function resetTimer() {
    timerRunning = false;
    if (timerId) {
        clearTimeout(timerId);
        timerId = null;
    }
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    
    stopClockTick();
    
    mainButton.classList.remove('hidden');
    donutContainer.classList.remove('visible');
    
    statusEl.textContent = 'READY';
    statusEl.classList.remove('active');
    
    updateDonut(1);
}

function dismissSiren() {
    sirenOverlay.classList.remove('active');
    stopSiren();
    showWheel();
}

let wheelOverlay, wheelSvg, wheelSpinBtn, wheelResult, wheelMinInput, wheelMaxInput;
let wheelUpdateBtn, contestantSelect, awardBtn1, awardBtn2, wheelCloseBtn;
let wheelMin = 0;
let wheelMax = 10;
let wheelSpinning = false;
let currentWheelValue = null;
let currentRotation = 0;

const wheelColors = [
    '#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff',
    '#5f27cd', '#00d2d3', '#ff6b35', '#7bed9f', '#a55eea',
    '#fd79a8', '#0abde3', '#10ac84', '#ee5a24', '#7158e2'
];

function initWheelElements() {
    wheelOverlay = document.getElementById('wheelOverlay');
    wheelSvg = document.getElementById('wheelSvg');
    wheelSpinBtn = document.getElementById('wheelSpinBtn');
    wheelResult = document.getElementById('wheelResult');
    wheelMinInput = document.getElementById('wheelMin');
    wheelMaxInput = document.getElementById('wheelMax');
    wheelUpdateBtn = document.getElementById('wheelUpdateBtn');
    contestantSelect = document.getElementById('contestantSelect');
    awardBtn1 = document.getElementById('awardBtn1');
    awardBtn2 = document.getElementById('awardBtn2');
    wheelCloseBtn = document.getElementById('wheelCloseBtn');
}

function generateWheel() {
    const values = [];
    for (let i = wheelMin; i <= wheelMax; i++) {
        values.push(i);
    }
    
    const numSegments = values.length;
    const anglePerSegment = 360 / numSegments;
    const radius = 95;
    const centerX = 100;
    const centerY = 100;
    
    let svgContent = '';
    
    values.forEach((value, index) => {
        const startAngle = index * anglePerSegment - 90;
        const endAngle = startAngle + anglePerSegment;
        
        const startRad = (startAngle * Math.PI) / 180;
        const endRad = (endAngle * Math.PI) / 180;
        
        const x1 = centerX + radius * Math.cos(startRad);
        const y1 = centerY + radius * Math.sin(startRad);
        const x2 = centerX + radius * Math.cos(endRad);
        const y2 = centerY + radius * Math.sin(endRad);
        
        const largeArcFlag = anglePerSegment > 180 ? 1 : 0;
        
        const pathD = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
        
        const color = wheelColors[index % wheelColors.length];
        
        svgContent += `<path d="${pathD}" fill="${color}" stroke="#fff" stroke-width="1"/>`;
        
        // Add text
        const textAngle = startAngle + anglePerSegment / 2;
        const textRad = (textAngle * Math.PI) / 180;
        const textRadius = radius * 0.65;
        const textX = centerX + textRadius * Math.cos(textRad);
        const textY = centerY + textRadius * Math.sin(textRad);
        
        svgContent += `<text x="${textX}" y="${textY}" class="wheel-segment-text" transform="rotate(${textAngle + 90}, ${textX}, ${textY})">${value}</text>`;
    });
    
    wheelSvg.innerHTML = svgContent;
}

function showWheel() {
    wheelOverlay.classList.add('active');
    wheelResult.textContent = '';
    contestantSelect.style.display = 'none';
    wheelSpinBtn.disabled = false;
    currentWheelValue = null;
    generateWheel();
    
    const name1 = document.getElementById('name1').value || 'Contestant 1';
    const name2 = document.getElementById('name2').value || 'Contestant 2';
    awardBtn1.textContent = name1;
    awardBtn2.textContent = name2;
}

function hideWheel() {
    wheelOverlay.classList.remove('active');
    wheelSvg.style.transition = 'none';
    wheelSvg.style.transform = 'rotate(0deg)';
    currentRotation = 0;
}

function spinWheel() {
    if (wheelSpinning) return;
    
    wheelSpinning = true;
    wheelSpinBtn.disabled = true;
    wheelResult.textContent = '';
    contestantSelect.style.display = 'none';
    
    const numValues = wheelMax - wheelMin + 1;
    const anglePerSegment = 360 / numValues;
    
    const randomIndex = Math.floor(Math.random() * numValues);
    currentWheelValue = wheelMin + randomIndex;
    
    const targetSegmentCenter = randomIndex * anglePerSegment + anglePerSegment / 2;

    const spins = 5 + Math.floor(Math.random() * 3);
    const targetRotation = currentRotation + (spins * 360) + (360 - targetSegmentCenter);
    
    wheelSvg.style.transition = 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
    wheelSvg.style.transform = `rotate(${targetRotation}deg)`;
    currentRotation = targetRotation;
    
    playWheelTickSound();
    
    setTimeout(() => {
        wheelSpinning = false;
        wheelResult.textContent = currentWheelValue >= 0 ? `+${currentWheelValue}` : `${currentWheelValue}`;
        contestantSelect.style.display = 'flex';
        playWheelWinSound();
    }, 4000);
}

function playWheelTickSound() {
    initAudio();
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    let tickCount = 0;
    const maxTicks = 40;
    
    function tick() {
        if (tickCount >= maxTicks) return;
        
        const tickOsc = audioContext.createOscillator();
        const tickEnv = audioContext.createGain();
        
        tickOsc.type = 'sine';
        tickOsc.frequency.setValueAtTime(600 + Math.random() * 200, audioContext.currentTime);
        
        tickEnv.gain.setValueAtTime(0.1, audioContext.currentTime);
        tickEnv.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.05);
        
        tickOsc.connect(tickEnv);
        tickEnv.connect(audioContext.destination);
        
        tickOsc.start();
        tickOsc.stop(audioContext.currentTime + 0.05);
        
        tickCount++;
        
        const delay = 50 + (tickCount * 5);
        if (tickCount < maxTicks) {
            setTimeout(tick, delay);
        }
    }
    
    tick();
}

function playWheelWinSound() {
    initAudio();
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    const notes = [523.25, 659.25, 783.99, 1046.50];
    
    notes.forEach((freq, i) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioContext.currentTime);
        
        gain.gain.setValueAtTime(0, audioContext.currentTime + i * 0.1);
        gain.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + i * 0.1 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + i * 0.1 + 0.3);
        
        osc.connect(gain);
        gain.connect(audioContext.destination);
        
        osc.start(audioContext.currentTime + i * 0.1);
        osc.stop(audioContext.currentTime + i * 0.1 + 0.3);
    });
}

function awardPoints(contestant) {
    if (currentWheelValue !== null) {
        updateScore(contestant, currentWheelValue);
        hideWheel();
    }
}

function updateWheelRange() {
    let newMin = parseInt(wheelMinInput.value);
    let newMax = parseInt(wheelMaxInput.value);
    
    if (isNaN(newMin)) newMin = 0;
    if (isNaN(newMax)) newMax = 10;
    
    newMin = Math.max(-20, Math.min(20, newMin));
    newMax = Math.max(-20, Math.min(20, newMax));
    
    if (newMin > newMax) {
        wheelMinInput.value = wheelMin;
        wheelMaxInput.value = wheelMax;
        return;
    }
    
    if (newMax - newMin > 40) {
        newMax = newMin + 40;
        wheelMaxInput.value = newMax;
    }
    
    wheelMin = newMin;
    wheelMax = newMax;
    
    wheelMinInput.value = wheelMin;
    wheelMaxInput.value = wheelMax;
    
    wheelSvg.style.transition = 'none';
    wheelSvg.style.transform = 'rotate(0deg)';
    currentRotation = 0;
    
    generateWheel();
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

document.addEventListener('DOMContentLoaded', () => {
    initDOMElements();
    initWheelElements();
    loadTheme();
    generateWheel();
    
    mainButton.addEventListener('click', startTimer);
    dismissBtn.addEventListener('click', dismissSiren);
    
    wheelSpinBtn.addEventListener('click', spinWheel);
    wheelCloseBtn.addEventListener('click', hideWheel);
    wheelUpdateBtn.addEventListener('click', updateWheelRange);
    awardBtn1.addEventListener('click', () => awardPoints(1));
    awardBtn2.addEventListener('click', () => awardPoints(2));
    
    const helpBtn = document.getElementById('helpBtn');
    const helpOverlay = document.getElementById('helpOverlay');
    const helpCloseBtn = document.getElementById('helpCloseBtn');
    
    helpBtn.addEventListener('click', () => {
        helpOverlay.classList.add('active');
    });
    
    helpCloseBtn.addEventListener('click', () => {
        helpOverlay.classList.remove('active');
    });
    
    helpOverlay.addEventListener('click', (e) => {
        if (e.target === helpOverlay) {
            helpOverlay.classList.remove('active');
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (sirenOverlay.classList.contains('active')) {
            dismissSiren();
        }
        if (e.key === 'Escape' && helpOverlay.classList.contains('active')) {
            helpOverlay.classList.remove('active');
        }
    });
    
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
});
window.updateScore = updateScore;