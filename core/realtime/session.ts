import { RealtimeEventBus } from "./events"
import { SessionConfig, TurnDetectionMode } from "../translation/provider"

// WebRTC client for any OpenAI Realtime API compatible endpoint; owns connection lifecycle only.
export class RealtimeSession {
  private pc: RTCPeerConnection | null = null
  private dataChannel: RTCDataChannel | null = null
  private bus = new RealtimeEventBus()
  private remoteAudio: HTMLAudioElement | null = null

  on: RealtimeEventBus["on"] = (type, handler) => this.bus.on(type, handler)

  async connect(config: SessionConfig, micStream: MediaStream): Promise<void> {
    this.bus.emit({ type: "connecting" })

    const tokenRes = await fetch("/api/realtime/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceLanguage: config.sourceLanguage,
        targetLanguage: config.targetLanguage,
        voice: config.voice ?? "verse",
        turnDetection: config.turnDetection,
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
    dc.addEventListener("open", () => {
      dc.send(
        JSON.stringify({
          type: "session.update",
          session: {
            instructions: `You are a live interpreter. Transcribe the speaker's ${config.sourceLanguage} audio, then speak a natural ${config.targetLanguage} translation. Do not add commentary.`,
            turn_detection:
              config.turnDetection === "server_vad"
                ? { type: "server_vad" }
                : null,
          },
        })
      )
      this.bus.emit({ type: "ready" })
    })
    dc.addEventListener("message", (event) => this.handleServerEvent(event.data))
    dc.addEventListener("close", () => this.bus.emit({ type: "closed" }))

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
      throw new Error("The realtime endpoint rejected the connection.")
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
    this.dataChannel?.send(
      JSON.stringify({
        type: "session.update",
        session: {
          turn_detection: mode === "server_vad" ? { type: "server_vad" } : null,
        },
      })
    )
  }

  disconnect() {
    this.dataChannel?.close()
    this.pc?.getSenders().forEach((sender) => sender.track?.stop())
    this.pc?.close()
    this.pc = null
    this.dataChannel = null
    this.remoteAudio = null
  }

  private handleServerEvent(raw: string) {
    let data: any
    try {
      data = JSON.parse(raw)
    } catch {
      return
    }

    switch (data.type) {
      case "input_audio_buffer.speech_started":
        this.bus.emit({ type: "speech.start", speaker: "you" })
        break
      case "input_audio_buffer.speech_stopped":
        this.bus.emit({ type: "speech.end", speaker: "you" })
        break
      case "conversation.item.input_audio_transcription.delta":
        this.bus.emit({ type: "transcript.partial", speaker: "you", text: data.delta ?? "" })
        break
      case "conversation.item.input_audio_transcription.completed":
        this.bus.emit({ type: "transcript.final", speaker: "you", text: data.transcript ?? "" })
        break
      case "response.output_audio_transcript.delta":
        this.bus.emit({ type: "translation.partial", speaker: "them", text: data.delta ?? "" })
        break
      case "response.output_audio_transcript.done":
        this.bus.emit({ type: "translation.final", speaker: "them", text: data.transcript ?? "" })
        break
      case "error":
        this.bus.emit({ type: "error", message: data.error?.message ?? "Realtime session error." })
        break
      default:
        // Unrecognized event types are ignored rather than thrown.
        break
    }
  }
}
