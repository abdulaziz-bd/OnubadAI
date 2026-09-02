import { RealtimeEventBus } from "./events"
import { SessionConfig, TurnDetectionMode } from "../translation/provider"

// WebRTC client for the OpenAI Realtime Translation API.
export class RealtimeSession {
  private pc: RTCPeerConnection | null = null
  private dataChannel: RTCDataChannel | null = null
  private bus = new RealtimeEventBus()
  private remoteAudio: HTMLAudioElement | null = null
  private inputTranscriptBuffer = ""
  private outputTranscriptBuffer = ""
  private inputCommitTimer: ReturnType<typeof setTimeout> | null = null
  private outputCommitTimer: ReturnType<typeof setTimeout> | null = null

  on: RealtimeEventBus["on"] = (type, handler) => this.bus.on(type, handler)

  async connect(config: SessionConfig, micStream: MediaStream): Promise<void> {

    const tokenRes = await fetch("/api/realtime/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceLanguage: config.sourceLanguage,
        targetLanguage: config.targetLanguage,
      }),
    })
    if (!tokenRes.ok) {
      const body = await tokenRes.json().catch(() => ({}))
      throw new Error(
        body.error ?? "Could not start a realtime session (check OPENAI_API_KEY on the server)."
      )
    }
    const session = await tokenRes.json()
    const realtimeUrl: string = session.realtimeUrl
    const ephemeralKey: string | undefined =
      session.authMode === "none" ? undefined : session.value ?? session.client_secret?.value
    if (session.authMode !== "none" && !ephemeralKey) {
      throw new Error("Realtime session response was missing a client secret.")
    }

    const pc = new RTCPeerConnection()
    this.pc = pc

    this.remoteAudio = new Audio()
    this.remoteAudio.autoplay = true
    pc.ontrack = (event) => {
      if (this.remoteAudio) this.remoteAudio.srcObject = event.streams[0]
    }

    micStream.getAudioTracks().forEach((track) => pc.addTrack(track, micStream))

    const dc = pc.createDataChannel("oai-events")
    this.dataChannel = dc
    dc.addEventListener("message", (event) => this.handleServerEvent(event.data))

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    const sdpRes = await fetch(realtimeUrl, {
      method: "POST",
      body: offer.sdp,
      headers: ephemeralKey
        ? { Authorization: `Bearer ${ephemeralKey}`, "Content-Type": "application/sdp" }
        : { "Content-Type": "application/sdp" },
    })
    if (!sdpRes.ok) {
      const errBody = await sdpRes.text().catch(() => "(unreadable)")
      console.error(`SDP exchange failed [${sdpRes.status}]:`, errBody)
      throw new Error(`Realtime endpoint rejected SDP (${sdpRes.status}): ${errBody}`)
    }
    const answerSdp = await sdpRes.text()
    await pc.setRemoteDescription({ type: "answer", sdp: answerSdp })
  }

  // Tap-to-talk: mute/unmute the outgoing track instead of tearing down the connection.
  setMicEnabled(enabled: boolean) {
    this.pc?.getSenders().forEach((sender) => {
      if (sender.track) sender.track.enabled = enabled
    })
  }

  setTurnDetection(mode: TurnDetectionMode) {
    this.dataChannel?.send(JSON.stringify({
      type: "session.update",
      session: {
        audio: {
          input: {
            turn_detection:
              mode === "server_vad"
                ? { type: "server_vad", threshold: 0.5, prefix_padding_ms: 300, silence_duration_ms: 500 }
                : null,
          },
        },
      },
    }))
  }

  disconnect() {
    this.dataChannel?.close()
    this.pc?.getSenders().forEach((sender) => sender.track?.stop())
    this.pc?.close()
    this.pc = null
    this.dataChannel = null
    this.remoteAudio = null
    this.inputTranscriptBuffer = ""
    this.outputTranscriptBuffer = ""
    if (this.inputCommitTimer) { clearTimeout(this.inputCommitTimer); this.inputCommitTimer = null }
    if (this.outputCommitTimer) { clearTimeout(this.outputCommitTimer); this.outputCommitTimer = null }
  }

  private handleServerEvent(raw: string) {
    let data: any
    try {
      data = JSON.parse(raw)
    } catch {
      return
    }

    switch (data.type) {
      // Speech activity detection (VAD)
      case "input_audio_buffer.speech_started":
        this.bus.emit({ type: "speech.start", speaker: "you" })
        break
      case "input_audio_buffer.speech_stopped":
        this.bus.emit({ type: "speech.end", speaker: "you" })
        // Fallback: commit input buffer after 500 ms if the done event doesn't arrive first
        if (this.inputTranscriptBuffer) {
          if (this.inputCommitTimer) clearTimeout(this.inputCommitTimer)
          this.inputCommitTimer = setTimeout(() => {
            if (this.inputTranscriptBuffer) {
              this.bus.emit({ type: "transcript.final", speaker: "you", text: this.inputTranscriptBuffer })
              this.inputTranscriptBuffer = ""
            }
            this.inputCommitTimer = null
          }, 500)
        }
        break

      // Source-language transcript (what the speaker said)
      case "session.input_transcript.delta":
        this.inputTranscriptBuffer += data.delta ?? ""
        this.bus.emit({ type: "transcript.partial", speaker: "you", text: this.inputTranscriptBuffer })
        break
      case "session.input_transcript.done": {
        // Cancel fallback timer — use authoritative server text
        if (this.inputCommitTimer) { clearTimeout(this.inputCommitTimer); this.inputCommitTimer = null }
        const inputText = data.transcript ?? data.text ?? this.inputTranscriptBuffer
        if (inputText) this.bus.emit({ type: "transcript.final", speaker: "you", text: inputText })
        this.inputTranscriptBuffer = ""
        break
      }

      // Target-language translation (what the model speaks back)
      case "session.output_transcript.delta": {
        const wasEmpty = !this.outputTranscriptBuffer
        this.outputTranscriptBuffer += data.delta ?? ""
        if (wasEmpty) this.bus.emit({ type: "speech.start", speaker: "them" })
        this.bus.emit({ type: "translation.partial", speaker: "them", text: this.outputTranscriptBuffer })
        // Fallback: commit 1 s after the last delta if done event doesn't arrive
        if (this.outputCommitTimer) clearTimeout(this.outputCommitTimer)
        this.outputCommitTimer = setTimeout(() => {
          if (this.outputTranscriptBuffer) {
            this.bus.emit({ type: "translation.final", speaker: "them", text: this.outputTranscriptBuffer })
            this.bus.emit({ type: "speech.end", speaker: "them" })
            this.outputTranscriptBuffer = ""
          }
          this.outputCommitTimer = null
        }, 1000)
        break
      }
      case "session.output_transcript.done": {
        // Cancel fallback timer — use authoritative server text
        if (this.outputCommitTimer) { clearTimeout(this.outputCommitTimer); this.outputCommitTimer = null }
        const outputText = data.transcript ?? data.text ?? this.outputTranscriptBuffer
        if (outputText) {
          this.bus.emit({ type: "translation.final", speaker: "them", text: outputText })
          this.bus.emit({ type: "speech.end", speaker: "them" })
        }
        this.outputTranscriptBuffer = ""
        break
      }

      case "error":
        this.bus.emit({ type: "error", message: data.error?.message ?? "Realtime session error." })
        break
      default:
        console.log("[realtime]", data.type, data)
        break
    }
  }
}
