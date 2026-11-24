// ============================================================
// Dual Channel Signal Generator + Custom Drawn Waveforms
// p5.js canvas is used only as the background. Audio uses Web Audio API.
// LEFT / RIGHT controls are mixed into a single MONO output for iOS compatibility.
// ============================================================

let audioCtx = null;
let oscL = null, oscR = null;
let gainL = null, gainR = null;
let masterGain = null;
let playMode = "stop";

let freqInputL, freqInputR, freqSliderL, freqSliderR;
let freqDisplayL, freqDisplayR, waveL, waveR;
let volumeL, volumeR, volumeDisplayL, volumeDisplayR, statusText;

const DRAW_POINTS = 256;
let customWaveL = new Array(DRAW_POINTS).fill(0);
let customWaveR = new Array(DRAW_POINTS).fill(0);
let periodicWaveL = null, periodicWaveR = null;
let cyclesL = 1, cyclesR = 1;
let smoothL = 0, smoothR = 0;
let normalizeL = false, normalizeR = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  const bgCanvas = document.querySelector("canvas");
  if (bgCanvas) {
    bgCanvas.style.position = "fixed";
    bgCanvas.style.left = "0";
    bgCanvas.style.top = "0";
    bgCanvas.style.zIndex = "-1";
    bgCanvas.style.pointerEvents = "none";
  }
  createStyle();
  createAppContainer();
  buildUI();
}

function draw() { background(245); }

function createStyle() {
  const style = document.createElement("style");
  style.textContent = `
    * { box-sizing: border-box; }
    html, body { margin:0; padding:0; width:100%; min-height:100%; background:#f5f5f5; font-family:Arial,Helvetica,sans-serif; }
    body { overflow-x:hidden; }
    #signalGeneratorApp { width:85%; max-width:980px; margin:15px auto; padding:18px; background:white; border-radius:16px; box-shadow:0 4px 18px rgba(0,0,0,.14); }
    .title { text-align:center; font-size:26px; font-weight:bold; margin-bottom:4px; }
    .subtitle { text-align:center; color:#666; font-size:14px; margin-bottom:18px; }
    .channels { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; }
    .channel { min-width:0; padding:15px; border:2px solid #ddd; border-radius:14px; background:#fafafa; }
    .channelTitle { text-align:center; font-size:22px; font-weight:bold; margin-bottom:14px; }
    .control { margin-bottom:15px; }
    .control label, .customWaveArea label { display:block; font-size:14px; font-weight:bold; margin-bottom:5px; }
    input[type=number], select { width:100%; height:38px; font-size:17px; padding:5px 8px; border-radius:7px; border:1px solid #aaa; background:white; }
    input[type=range] { width:100%; margin-top:10px; cursor:pointer; }
    .frequencyDisplay { text-align:center; font-size:21px; font-weight:bold; margin-top:6px; }
    .volumeDisplay { text-align:center; font-size:17px; font-weight:bold; margin-top:4px; }
    .buttons { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:9px; margin-top:17px; }
    button { min-height:45px; font-size:17px; font-weight:bold; border:none; border-radius:10px; cursor:pointer; background:#e5e5e5; transition:transform .05s,background .15s; }
    button:active { transform:scale(.97); }
    #playButton { background:#b9e6c7; } #stopButton { background:#ddd; }
    .status { margin-top:14px; padding:10px; text-align:center; font-weight:bold; font-size:18px; border-radius:8px; background:#eee; }
    .notice { margin-top:12px; text-align:center; font-size:12px; line-height:1.5; color:#666; }
    .customWaveArea { display:none; margin:8px 0 15px; padding:10px; border:1px solid #cbd5e1; border-radius:10px; background:#fff; }
    .customWaveArea.active { display:block; }
    .waveDrawCanvas, .wavePreviewCanvas { display:block; touch-action:none; width:100%; height:160px; border:1px solid #aaa; border-radius:8px; background:#fff; }
    .wavePreviewCanvas { margin-top:8px; background:#f8fbff; }
    .previewLabel { margin:8px 0 3px; font-size:12px; font-weight:bold; color:#285b86; }
    .drawHint { color:#666; font-size:11px; margin:5px 0; line-height:1.4; }
    .clearDrawButton { width:100%; min-height:34px; font-size:14px; margin-top:6px; background:#e7e7e7; }
    .waveOptions { margin-top:10px; padding:9px; background:#f4f7fb; border-radius:8px; }
    .waveOption { margin:8px 0; }
    .waveOption label { font-size:12px; font-weight:normal; }
    .waveOptionValue { text-align:right; font-size:12px; color:#555; }
    .waveOption input[type=range] { margin-top:3px; }
    .checkRow { display:flex; align-items:center; gap:7px; font-size:12px; margin-top:8px; }
    @media(max-width:650px) {
      #signalGeneratorApp { width:94%; margin:8px auto; padding:12px; }
      .title { font-size:20px; } .subtitle { font-size:11px; margin-bottom:10px; }
      .channels { grid-template-columns:1fr; gap:8px; } .channel { padding:9px; }
      .channelTitle { font-size:17px; margin-bottom:8px; } .control { margin-bottom:10px; }
      .control label, .customWaveArea label { font-size:12px; }
      input[type=number],select { height:34px; font-size:14px; }
      .frequencyDisplay { font-size:16px; } .volumeDisplay { font-size:14px; }
      .buttons { gap:5px; margin-top:10px; } button { min-height:40px; font-size:13px; padding:4px; }
      .status { font-size:14px; margin-top:9px; padding:7px; } .notice { font-size:10px; }
      .waveDrawCanvas, .wavePreviewCanvas { height:140px; }
    }
    @media(max-height:600px) and (orientation:landscape) {
      #signalGeneratorApp { width:90%; margin:4px auto; padding:8px; }
      .title { font-size:18px; } .subtitle { display:none; }
      .channel { padding:7px; } .channelTitle { font-size:15px; margin-bottom:4px; }
      .control { margin-bottom:5px; } .control label { font-size:10px; margin-bottom:2px; }
      input[type=number],select { height:28px; font-size:12px; } input[type=range] { margin-top:4px; }
      .frequencyDisplay { font-size:13px; margin-top:1px; } .volumeDisplay { font-size:12px; margin-top:1px; }
      .buttons { margin-top:5px; } button { min-height:30px; font-size:11px; }
      .status { margin-top:5px; padding:4px; font-size:11px; } .notice { display:none; }
      .waveDrawCanvas, .wavePreviewCanvas { height:120px; }
    }
  `;
  document.head.appendChild(style);
}

function createAppContainer() {
  const old = document.getElementById("signalGeneratorApp");
  if (old) old.remove();
  const app = document.createElement("div");
  app.id = "signalGeneratorApp";
  document.body.appendChild(app);
}

function buildUI() {
  const app = document.getElementById("signalGeneratorApp");
  app.innerHTML = `
    <div class="title">Dual Channel Signal Generator</div>
    <div class="subtitle">Dual frequency controls · Mono audio output · Custom waveform drawing</div>
    <div class="channels">
      ${channelMarkup("L", "LEFT")}
      ${channelMarkup("R", "RIGHT")}
    </div>
    <div class="buttons">
      <button id="playButton">Play</button><button id="stopButton">Stop</button>
    </div>
    <div id="statusText" class="status">STOPPED</div>
    <div class="notice">Both signal channels are mixed into one mono output and played through both sides of headphones/speakers. Press Play to start both signals together. Custom waveforms are drawn from left to right; the drawing repeats as one cycle.</div>
  `;

  freqInputL = document.getElementById("freqInputL"); freqInputR = document.getElementById("freqInputR");
  freqSliderL = document.getElementById("freqSliderL"); freqSliderR = document.getElementById("freqSliderR");
  freqDisplayL = document.getElementById("freqDisplayL"); freqDisplayR = document.getElementById("freqDisplayR");
  waveL = document.getElementById("waveL"); waveR = document.getElementById("waveR");
  volumeL = document.getElementById("volumeL"); volumeR = document.getElementById("volumeR");
  volumeDisplayL = document.getElementById("volumeDisplayL"); volumeDisplayR = document.getElementById("volumeDisplayR");
  statusText = document.getElementById("statusText");

  freqSliderL.value = frequencyToSlider(440); freqSliderR.value = frequencyToSlider(440);
  bindFrequency("L"); bindFrequency("R");
  waveL.addEventListener("change", () => { toggleCustomArea("L"); updateWaveform(); });
  waveR.addEventListener("change", () => { toggleCustomArea("R"); updateWaveform(); });
  volumeL.addEventListener("input", () => { volumeDisplayL.textContent = volumeL.value + " %"; updateVolume(); });
  volumeR.addEventListener("input", () => { volumeDisplayR.textContent = volumeR.value + " %"; updateVolume(); });
  document.getElementById("playButton").addEventListener("click", () => startAudio("both"));
  document.getElementById("stopButton").addEventListener("click", stopAudio);
  setupCustomWaveDrawing("L", customWaveL);
  setupCustomWaveDrawing("R", customWaveR);
  setupWaveOptions("L"); setupWaveOptions("R");
}

function channelMarkup(ch, title) {
  return `<div class="channel"><div class="channelTitle">${title}</div>
    <div class="control"><label for="freqInput${ch}">Frequency (Hz)</label>
      <input id="freqInput${ch}" type="number" value="440" min="20" max="20000" step="1">
      <input id="freqSlider${ch}" type="range" min="0" max="1000" value="447" step="1">
      <div id="freqDisplay${ch}" class="frequencyDisplay">440 Hz</div></div>
    <div class="control"><label for="wave${ch}">Waveform</label>
      <select id="wave${ch}"><option value="sine">Sine</option><option value="square">Square</option><option value="triangle">Triangle</option><option value="sawtooth">Sawtooth</option><option value="custom">Custom (Draw)</option></select></div>
    <div id="customArea${ch}" class="customWaveArea"><label>Draw your waveform (left → right = one cycle)</label>
      <canvas id="drawCanvas${ch}" class="waveDrawCanvas" width="512" height="200"></canvas>
      <div class="drawHint">Center line = 0. Top = +1, bottom = −1. Draw with mouse or touch.</div>
      <div class="previewLabel">Corrected waveform preview (live)</div>
      <canvas id="previewCanvas${ch}" class="wavePreviewCanvas" width="512" height="200" aria-label="Corrected waveform preview"></canvas>
      <button type="button" id="clearDraw${ch}" class="clearDrawButton">Clear waveform</button>
      <div class="waveOptions"><strong>Options / Waveform correction</strong>
        <div class="waveOption"><label for="cycles${ch}">Wave cycles / repeat count</label><input id="cycles${ch}" type="range" min="1" max="8" value="1" step="1"><div id="cyclesDisplay${ch}" class="waveOptionValue">1 cycle</div></div>
        <div class="waveOption"><label for="smooth${ch}">Smooth correction</label><input id="smooth${ch}" type="range" min="0" max="100" value="0" step="5"><div id="smoothDisplay${ch}" class="waveOptionValue">0 % (off)</div></div>
        <label class="checkRow"><input id="normalize${ch}" type="checkbox"> Normalize amplitude (scale to full range)</label>
      </div></div>
    <div class="control"><label for="volume${ch}">Volume</label><input id="volume${ch}" type="range" min="0" max="100" value="30" step="1"><div id="volumeDisplay${ch}" class="volumeDisplay">30 %</div></div>
  </div>`;
}

function bindFrequency(ch) {
  const input = ch === "L" ? freqInputL : freqInputR;
  const slider = ch === "L" ? freqSliderL : freqSliderR;
  const display = ch === "L" ? freqDisplayL : freqDisplayR;
  input.addEventListener("input", () => {
    if (input.value === "") return;
    const f = clampFrequency(Number(input.value));
    slider.value = frequencyToSlider(f); display.textContent = Math.round(f) + " Hz";
    updateFrequency();
  });
  slider.addEventListener("input", () => {
    const f = sliderToFrequency(Number(slider.value));
    input.value = Math.round(f); display.textContent = Math.round(f) + " Hz";
    updateFrequency();
  });
}

function toggleCustomArea(ch) {
  const select = ch === "L" ? waveL : waveR;
  document.getElementById("customArea" + ch).classList.toggle("active", select.value === "custom");
}

// Draw a live preview of the waveform after repeat, smoothing and normalization options.
function renderWavePreview(ch, data) {
  const canvas = document.getElementById("previewCanvas" + ch);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const cycles = ch === "L" ? cyclesL : cyclesR;
  const smoothing = ch === "L" ? smoothL : smoothR;
  const normalize = ch === "L" ? normalizeL : normalizeR;
  const processed = processCustomWave(data, cycles, smoothing, normalize);
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#f8fbff"; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#e3eaf1"; ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y <= h; y += 25) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  ctx.strokeStyle = "#8a8a8a"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, h/2); ctx.lineTo(w, h/2); ctx.stroke();
  ctx.strokeStyle = "#e49a27"; ctx.lineWidth = 3; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.beginPath();
  processed.forEach((v, i) => { const x = i/(processed.length-1)*w, y = (1-v)*h/2; if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); }); ctx.stroke();
}

// Draw editor: fill missing samples by interpolation, so fast strokes do not leave gaps.
function setupCustomWaveDrawing(ch, data) {
  const canvas = document.getElementById("drawCanvas" + ch);
  const ctx = canvas.getContext("2d");
  let drawing = false;
  let previous = null;

  function render() {
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#e8e8e8"; ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y <= h; y += 25) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.strokeStyle = "#8a8a8a"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, h/2); ctx.lineTo(w, h/2); ctx.stroke();
    ctx.strokeStyle = "#1479d2"; ctx.lineWidth = 3; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.beginPath();
    data.forEach((v, i) => { const x = i/(data.length-1)*w, y = (1-v)*h/2; if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); }); ctx.stroke();
    renderWavePreview(ch, data);
  }
  function coords(e) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX-rect.left)/rect.width));
    const y = Math.max(-1, Math.min(1, 1-2*(e.clientY-rect.top)/rect.height));
    return {x, y};
  }
  function plot(p) {
    const index = Math.round(p.x*(data.length-1));
    if (previous) {
      const start = Math.round(previous.x*(data.length-1));
      const end = index;
      const lo = Math.min(start,end), hi = Math.max(start,end);
      for (let i=lo; i<=hi; i++) {
        const t = hi===lo ? 1 : (i-start)/(end-start);
        data[i] = previous.y + (p.y-previous.y)*t;
      }
    } else data[index] = p.y;
    previous = p;
    render();
    if ((ch === "L" ? waveL : waveR).value === "custom") updateWaveform();
  }
  canvas.addEventListener("pointerdown", e => { e.preventDefault(); drawing=true; previous=null; canvas.setPointerCapture(e.pointerId); plot(coords(e)); });
  canvas.addEventListener("pointermove", e => { if (!drawing) return; e.preventDefault(); plot(coords(e)); });
  const finish = () => { drawing=false; previous=null; };
  canvas.addEventListener("pointerup", finish); canvas.addEventListener("pointercancel", finish); canvas.addEventListener("lostpointercapture", finish);
  document.getElementById("clearDraw"+ch).addEventListener("click", () => { data.fill(0); render(); if ((ch === "L" ? waveL : waveR).value === "custom") updateWaveform(); });
  render();
}

function setupWaveOptions(ch) {
  const cycle = document.getElementById("cycles" + ch);
  const smooth = document.getElementById("smooth" + ch);
  const norm = document.getElementById("normalize" + ch);
  const cycleDisplay = document.getElementById("cyclesDisplay" + ch);
  const smoothDisplay = document.getElementById("smoothDisplay" + ch);
  cycle.addEventListener("input", () => {
    if (ch === "L") cyclesL = Number(cycle.value); else cyclesR = Number(cycle.value);
    cycleDisplay.textContent = cycle.value + (Number(cycle.value) === 1 ? " cycle" : " cycles");
    renderWavePreview(ch, ch === "L" ? customWaveL : customWaveR);
    updateWaveform();
  });
  smooth.addEventListener("input", () => {
    if (ch === "L") smoothL = Number(smooth.value); else smoothR = Number(smooth.value);
    smoothDisplay.textContent = smooth.value + " %" + (Number(smooth.value) === 0 ? " (off)" : "");
    renderWavePreview(ch, ch === "L" ? customWaveL : customWaveR);
    updateWaveform();
  });
  norm.addEventListener("change", () => {
    if (ch === "L") normalizeL = norm.checked; else normalizeR = norm.checked;
    renderWavePreview(ch, ch === "L" ? customWaveL : customWaveR);
    updateWaveform();
  });
}

// Apply repeat, smoothing and optional amplitude normalization to the hand-drawn samples.
function processCustomWave(data, cycles, smoothing, normalize) {
  const N = data.length;
  const repeated = new Array(N);
  for (let i = 0; i < N; i++) {
    const phase = (i / N * cycles) % 1;
    const pos = phase * N;
    const a = Math.floor(pos) % N, b = (a + 1) % N;
    const t = pos - Math.floor(pos);
    repeated[i] = data[a] * (1 - t) + data[b] * t;
  }
  // Smooth with a short circular moving-average filter; strength controls passes.
  const passes = Math.round(smoothing / 12.5);
  let result = repeated;
  for (let pass = 0; pass < passes; pass++) {
    const next = new Array(N);
    for (let i = 0; i < N; i++) {
      next[i] = (result[(i - 2 + N) % N] + 2 * result[(i - 1 + N) % N] + 3 * result[i] + 2 * result[(i + 1) % N] + result[(i + 2) % N]) / 9;
    }
    result = next;
  }
  if (normalize) {
    const peak = Math.max(...result.map(v => Math.abs(v)));
    if (peak > 0.00001) result = result.map(v => v / peak);
  }
  return result;
}

// Fourier series approximation of the processed drawn samples, used by PeriodicWave.
function createCustomPeriodicWave(data, cycles, smoothing, normalize) {
  if (!audioCtx) return null;
  const processed = processCustomWave(data, cycles, smoothing, normalize);
  const N = processed.length;
  const harmonics = Math.min(64, Math.floor(N/2)-1);
  const real = new Float32Array(harmonics+1);
  const imag = new Float32Array(harmonics+1);
  // DC component is zeroed intentionally; center the drawn waveform around 0.
  for (let k=1; k<=harmonics; k++) {
    let a=0, b=0;
    for (let n=0; n<N; n++) {
      const phase=2*Math.PI*k*n/N;
      a += processed[n]*Math.cos(phase);
      b += processed[n]*Math.sin(phase);
    }
    real[k] = 2*a/N;
    imag[k] = 2*b/N;
  }
  return audioCtx.createPeriodicWave(real, imag, {disableNormalization:false});
}

function applyWave(ch) {
  if (!audioCtx) return;
  const osc = ch === "L" ? oscL : oscR;
  const sel = ch === "L" ? waveL : waveR;
  const data = ch === "L" ? customWaveL : customWaveR;
  if (sel.value === "custom") {
    const cycles = ch === "L" ? cyclesL : cyclesR;
    const smoothing = ch === "L" ? smoothL : smoothR;
    const normalize = ch === "L" ? normalizeL : normalizeR;
    const p = createCustomPeriodicWave(data, cycles, smoothing, normalize);
    if (p) { if (ch === "L") periodicWaveL=p; else periodicWaveR=p; osc.setPeriodicWave(p); }
  } else osc.type = sel.value;
}

async function initAudio() {
  if (audioCtx) {
    if (audioCtx.state !== "running") await audioCtx.resume();
    return;
  }
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) { alert("This browser does not support Web Audio API."); return; }
  // Create the context in the play-button gesture for iOS Safari.
  audioCtx = new AudioContextClass({ latencyHint: "interactive" });
  oscL = audioCtx.createOscillator(); oscR = audioCtx.createOscillator();
  gainL = audioCtx.createGain(); gainR = audioCtx.createGain();
  gainL.gain.value=0; gainR.gain.value=0;
  // Mono summing mixer: both channel signals feed the same gain node.
  // A mono node connected to destination is rendered to both speaker sides.
  masterGain=audioCtx.createGain();
  masterGain.channelCount=1;
  masterGain.channelCountMode="explicit";
  masterGain.channelInterpretation="speakers";
  masterGain.gain.value=1;
  oscL.connect(gainL); gainL.connect(masterGain);
  oscR.connect(gainR); gainR.connect(masterGain);
  masterGain.connect(audioCtx.destination);
  oscL.frequency.value=Number(freqInputL.value); oscR.frequency.value=Number(freqInputR.value);
  oscL.type="sine"; oscR.type="sine";
  oscL.start(); oscR.start();
  await audioCtx.resume();
}

async function startAudio(mode) {
  try {
    await initAudio();
    if (!audioCtx) return;
    // iOS Safari requires AudioContext to be resumed from a user gesture.
    if (audioCtx.state !== "running") await audioCtx.resume();
    if (audioCtx.state !== "running") {
      statusText.textContent = "Audio could not start. Tap Play again.";
      return;
    }
    playMode=mode; updateFrequency(); updateWaveform(); updateVolume();
    if (mode==="both") statusText.textContent="PLAYING : BOTH SIGNALS (MONO)";
    else if (mode==="left") statusText.textContent="PLAYING : LEFT ONLY (MONO)";
    else if (mode==="right") statusText.textContent="PLAYING : RIGHT ONLY (MONO)";
  } catch (err) {
    console.error("Audio start error:", err);
    statusText.textContent = "Audio error: " + (err && err.message ? err.message : "Please tap Play again.");
  }
}
function stopAudio() { playMode="stop"; updateVolume(); statusText.textContent="STOPPED"; }

function updateFrequency() {
  if (!audioCtx) return;
  const fL=clampFrequency(Number(freqInputL.value)); const fR=clampFrequency(Number(freqInputR.value));
  const now=audioCtx.currentTime;
  [oscL.frequency,oscR.frequency].forEach(param=>param.cancelScheduledValues(now));
  oscL.frequency.setTargetAtTime(fL,now,.01); oscR.frequency.setTargetAtTime(fR,now,.01);
}
function updateWaveform() { if (!audioCtx) return; applyWave("L"); applyWave("R"); }
function updateVolume() {
  if (!audioCtx) return;
  const lv=Number(volumeL.value)/100, rv=Number(volumeR.value)/100;
  let l=0,r=0;
  // When both waveforms play, halve each contribution to avoid excessive summed level.
  if (playMode==="both") { l=lv*0.5; r=rv*0.5; }
  else if (playMode==="left") l=lv;
  else if (playMode==="right") r=rv;
  const now=audioCtx.currentTime;
  gainL.gain.cancelScheduledValues(now); gainR.gain.cancelScheduledValues(now);
  gainL.gain.setTargetAtTime(l,now,.01); gainR.gain.setTargetAtTime(r,now,.01);
}
function clampFrequency(f) { return Math.min(20000,Math.max(20,f)); }
function sliderToFrequency(value) { const minF=20,maxF=20000,t=value/1000; return minF*Math.pow(maxF/minF,t); }
function frequencyToSlider(frequency) { frequency=clampFrequency(frequency); const t=Math.log(frequency/20)/Math.log(20000/20); return Math.round(t*1000); }
function windowResized() { resizeCanvas(windowWidth,windowHeight); }
