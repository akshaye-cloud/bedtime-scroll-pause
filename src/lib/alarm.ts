// Browser APIs are only accessed from user gestures or mounted effects.
let audioContext: AudioContext | undefined;

export async function prepareAlarmAudio(): Promise<boolean> {
  try {
    const BrowserAudioContext = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!BrowserAudioContext) return false;
    audioContext ??= new BrowserAudioContext();
    await audioContext.resume();
    return audioContext.state === "running";
  } catch {
    return false;
  }
}

export function startAlarm(onAudioReady: (ready: boolean) => void): () => void {
  let cancelled = false;
  let source: AudioBufferSourceNode | undefined;
  let filter: BiquadFilterNode | undefined;
  let gain: GainNode | undefined;
  const vibrate = () => {
    try { navigator.vibrate?.([350, 180, 350]); } catch { /* Unsupported devices remain silent. */ }
  };
  vibrate();
  const vibrationTimer = window.setInterval(vibrate, 4000);

  void prepareAlarmAudio().then((ready) => {
    if (cancelled) return;
    onAudioReady(ready);
    const context = audioContext;
    if (!ready || !context) return;
    // Filtered noise with slow surf swells: a seamless sea-wave sound, not a beep.
    const buffer = context.createBuffer(1, context.sampleRate * 12, context.sampleRate);
    const samples = buffer.getChannelData(0);
    let smooth = 0;
    for (let i = 0; i < samples.length; i++) {
      smooth = (smooth + (Math.random() * 2 - 1) * 0.06) / 1.06;
      const swell = 0.2 + 0.8 * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (context.sampleRate * 6)));
      samples[i] = smooth * swell * 3;
    }
    source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1800;
    gain = context.createGain();
    gain.gain.value = 0.65;
    source.connect(filter).connect(gain).connect(context.destination);
    source.start();
  }).catch(() => { if (!cancelled) onAudioReady(false); });

  return () => {
    cancelled = true;
    window.clearInterval(vibrationTimer);
    try { navigator.vibrate?.(0); } catch { /* No vibration API. */ }
    source?.stop();
    source?.disconnect();
    filter?.disconnect();
    gain?.disconnect();
  };
}