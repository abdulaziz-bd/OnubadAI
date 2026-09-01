// Real mic-level meter via the Web Audio API; no network or key required.

export interface WaveformMeter {
  stop: () => void
}

export function attachWaveformMeter(
  stream: MediaStream,
  onLevel: (level: number) => void
): WaveformMeter {
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
  const audioContext: AudioContext = new AudioCtx()
  const source = audioContext.createMediaStreamSource(stream)
  const analyser = audioContext.createAnalyser()
  analyser.fftSize = 256
  analyser.smoothingTimeConstant = 0.75
  source.connect(analyser)

  const data = new Uint8Array(analyser.frequencyBinCount)
  let raf = 0

  const tick = () => {
    analyser.getByteFrequencyData(data)
    let sum = 0
    for (let i = 0; i < data.length; i++) sum += data[i]
    const level = Math.min(1, sum / data.length / 128)
    onLevel(level)
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)

  return {
    stop: () => {
      cancelAnimationFrame(raf)
      source.disconnect()
      analyser.disconnect()
      void audioContext.close()
    },
  }
}
