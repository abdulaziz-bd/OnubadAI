import { attachWaveformMeter } from "./waveform"

export interface MicCapture {
  stream: MediaStream
  stop: () => void
}

export class MicPermissionError extends Error {
  constructor(cause: unknown) {
    super(
      cause instanceof Error && cause.name === "NotAllowedError"
        ? "Microphone access was denied. Allow microphone access in your browser settings to use Live conversation."
        : "Could not access the microphone. Check that a microphone is connected and not in use by another app."
    )
    this.name = "MicPermissionError"
  }
}

// Kept separate from the realtime session so a level meter works even without one.
export async function startMicCapture(
  onLevel: (level: number) => void
): Promise<MicCapture> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("This browser does not support microphone access.")
  }

  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    })
  } catch (cause) {
    throw new MicPermissionError(cause)
  }

  const meter = attachWaveformMeter(stream, onLevel)

  return {
    stream,
    stop: () => {
      meter.stop()
      stream.getTracks().forEach((track) => track.stop())
    },
  }
}
