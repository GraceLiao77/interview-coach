import './Recorder.css'
import { useAudioRecorder } from '../hook/useAudioRecorder'

interface RecorderProps {
    onComplete: (blob: Blob) => void;
    disabled?: boolean 
}

/**
 * 录音 UI(纯展示,markup + CSS):
 * 录音时只显示波形 + 计时器(不显示字幕,符合 PRD)。
 */
export function Recorder({onComplete, disabled}: RecorderProps) {
  const { status, seconds, audioUrl, blob, error, start, stop } = useAudioRecorder()
  return (
    <div className="recorder">
      {status === 'recording' ? (
        <div className="rec-live">
          <span className="rec-dot" />
          <div className="rec-wave" aria-hidden>
            <span /><span /><span /><span /><span /><span /><span />
          </div>
          <span className="rec-time">{formatTime(seconds)}</span>
          <button type="button" className="rec-btn rec-stop" onClick={stop}>
            ⏹ Stop
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="rec-btn rec-start"
          onClick={() => void start()}
          disabled={disabled}
        >
          🎙 {audioUrl ? 'Re-record' : 'Record answer'}
        </button>
      )}

      {error && <p className="rec-error" role="alert">{error}</p>}

      {status === 'stopped' && audioUrl && (
        <>
          <audio className="rec-playback" controls src={audioUrl} />
          <button
            type="button"
            className="submit-btn"
            disabled={disabled || !blob}
            onClick={() => blob && onComplete(blob)}
          >
            Submit recording
          </button>
        </>
      )}

      {disabled && (
        <p className="rec-status">
          <span className="rec-spinner" aria-hidden />
          Transcribing…
        </p>
      )}
    </div>
  )
}

/** 秒 → mm:ss(纯格式化) */
function formatTime(total: number): string {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
