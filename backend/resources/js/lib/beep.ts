// POS beep utility using Web Audio API
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

export function playBeep(type: 'success' | 'error' = 'success'): void {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    if (type === 'success') {
      oscillator.frequency.value = 880; // A5 note
      gainNode.gain.value = 0.3;
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.08); // 80ms
    } else {
      oscillator.frequency.value = 220; // A3 note (lower)
      gainNode.gain.value = 0.3;
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.12); // 120ms
    }
    
    oscillator.onended = () => {
      oscillator.disconnect();
      gainNode.disconnect();
    };
  } catch (e) {
    console.warn('Audio playback failed:', e);
  }
}
