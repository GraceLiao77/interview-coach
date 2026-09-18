import { useEffect, useRef } from 'react'
import './Recorder.css'
import { useAudioRecorder } from '../hook/useAudioRecorder'

interface RecorderProps {
  /** 录音一停就把音频交出去(父组件拿去转写) */
  onComplete: (blob: Blob) => void
  /** 父组件正在转写时锁住录音按钮 */
  disabled?: boolean
  /** 忙碌时显示的文案 */
  busyLabel?: string
}

/** 录音条:按钮 + 回放播放器排在同一行。录音时只显示波形和计时器,不显示实时字幕。 */
export function Recorder({ onComplete, disabled, busyLabel = 'Transcribing…' }: RecorderProps) {
  const { status, seconds, audioUrl, blob, error, start, stop } = useAudioRecorder()

  // 永远指向最新的 onComplete。下面的 effect 只依赖 blob —— 把 onComplete 放进
  // 依赖数组会变成"每渲染一次就提交一次"(父组件每次渲染都生成新函数)。
  const onCompleteRef = useRef(onComplete)
  useEffect(() => {
    onCompleteRef.current = onComplete
  })

  useEffect(() => {
    if (blob) onCompleteRef.current(blob)
  }, [blob])

  return (
    <div className="recorder">
      {status === 'recording' ? (
        <div className="rec-live">
          <span className="rec-dot" />
          <div className="rec-wave" aria-hidden>
            <span /><span /><span /><span /><span /><span /><span />
          </div>
          <span className="rec-time">{formatTime(seconds)}</span>
          <button
            type="button"
            className="rec-stop"
            onClick={stop}
            aria-label="Stop recording"
            title="Stop recording"
          >
            <svg viewBox="0 0 24 24" aria-hidden>
              <rect x="7" y="7" width="10" height="10" rx="2.5" fill="currentColor" />
            </svg>
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="rec-btn rec-start"
          onClick={() => void start()}
          disabled={disabled}
        >
          <MicIcon />
          {audioUrl ? 'Re-record' : 'Record answer'}
        </button>
      )}

      {status === 'stopped' && audioUrl && (
        <audio className="rec-playback" controls src={audioUrl} />
      )}

      {disabled && (
        <span className="rec-status">
          <span className="rec-spinner" aria-hidden />
          {busyLabel}
        </span>
      )}

      {error && <p className="rec-error" role="alert">{error}</p>}
    </div>
  )
}

function MicIcon() {
  return (
    <svg
      className="rec-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden
    >
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </svg>
  )
}

/** 秒 → mm:ss */
function formatTime(total: number): string {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
