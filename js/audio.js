/** Original chiptune, effects, and the device's ja-JP voice. */

export function createAudio() {
  let ctx = null;
  let timer = 0;
  let step = 0;
  let enabled = true;
  let notes = [196, 247, 294, 247, 220, 262, 330, 262];

  function ac() {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function blip(freq, dur = 0.12, type = "square", gain = 0.03) {
    if (!enabled) return;
    try {
      const audio = ac();
      const osc = audio.createOscillator();
      const amp = audio.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      amp.gain.value = gain;
      osc.connect(amp);
      amp.connect(audio.destination);
      osc.start();
      amp.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur);
      osc.stop(audio.currentTime + dur);
    } catch { /* autoplay */ }
  }

  function sfx(name) {
    if (name === "crit") { blip(523, 0.08, "square", 0.03); blip(784, 0.14, "triangle", 0.03); }
    else if (name === "hit") blip(220, 0.1, "square", 0.03);
    else if (name === "fizzle") blip(90, 0.18, "sawtooth", 0.03);
    else if (name === "heal") blip(660, 0.14, "triangle", 0.03);
    else if (name === "win") { blip(523, 0.12, "triangle", 0.03); setTimeout(() => blip(659, 0.16, "triangle", 0.03), 120); }
    else if (name === "lose") blip(110, 0.28, "sawtooth", 0.03);
    else blip(440, 0.06, "square", 0.02);
  }

  function tick() {
    if (!enabled) return;
    const n = notes[step % notes.length];
    blip(n, 0.16, "triangle", 0.018);
    if (step % 4 === 0) blip(n / 2, 0.2, "sine", 0.012);
    step += 1;
  }

  function start(mode) {
    notes = mode === "battle"
      ? [262, 311, 392, 311, 294, 349, 440, 349]
      : [196, 247, 294, 247, 220, 262, 330, 262];
    if (!enabled || timer) return;
    try { ac(); } catch { return; }
    tick();
    timer = setInterval(tick, 340);
  }

  function stop() {
    clearInterval(timer);
    timer = 0;
  }

  function setEnabled(on) {
    enabled = !!on;
    if (!enabled) stop();
  }

  function speak(text) {
    if (!enabled || !text || typeof speechSynthesis === "undefined") return;
    try {
      const utter = new SpeechSynthesisUtterance(String(text));
      utter.lang = "ja-JP";
      utter.rate = 0.92;
      const voice = speechSynthesis.getVoices().find((v) => (v.lang || "").toLowerCase().startsWith("ja"));
      if (voice) utter.voice = voice;
      speechSynthesis.cancel();
      speechSynthesis.speak(utter);
    } catch { /* no voice */ }
  }

  return { blip, sfx, start, stop, setEnabled, speak };
}
