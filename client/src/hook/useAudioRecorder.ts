import { useCallback, useEffect, useRef, useState } from 'react'

export type RecorderStatus = 'idle' | 'recording' | 'stopped'

/** 录音:管麦克风、计时、产出 Blob。UI 一概不管。 */
export function useAudioRecorder() {
  const [status, setStatus] = useState<RecorderStatus>('idle')
  const [seconds, setSeconds] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)

  // MediaRecorder 的回调在几十秒后才执行,那时 state 的闭包早就旧了 —— 回调里一律走 ref
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const urlRef = useRef<string | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const revokeUrl = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current)
      urlRef.current = null
    }
  }, [])

  /** 不 stop track,浏览器标签页的录音红点会一直亮着 */
  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  const start = useCallback(async () => {
    if (status === 'recording') return // 挡住重复点击:否则会开出第二个 recorder,第一个 stream 泄漏

    setError(null)
    try {
      // 等待授权
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      // 允许，拒绝直接进入catch
      streamRef.current = stream

      // MVP:不指定格式,用浏览器默认(Chrome 是 webm/opus)。上传时按 webm 处理。
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onerror = () => {
        setError('录音出错,请重试')
        clearTimer()
        releaseStream()
        setStatus('idle')
      }

      recorder.onstop = () => {
        const recorded = new Blob(chunksRef.current, { type: recorder.mimeType })
        // 副作用放 setState 外面:updater 必须是纯函数,StrictMode 会调用两次
        revokeUrl()
        const url = URL.createObjectURL(recorded)
        urlRef.current = url
        console.log(recorded, url, 'stop---')
        setBlob(recorded)
        setAudioUrl(url)
        clearTimer()
        releaseStream()
        setStatus('stopped')
      }

      recorder.start()
      recorderRef.current = recorder

      setSeconds(0)
      setStatus('recording')
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
    } catch (e) {
      const err = e as DOMException
      setError(
        err.name === 'NotAllowedError'
          ? '麦克风权限被拒绝,请在浏览器地址栏允许后重试'
          : err.name === 'NotFoundError'
            ? '没有找到麦克风设备'
            : `录音失败:${err.message}`,
      )
      releaseStream()
      setStatus('idle')
    }
  }, [status, clearTimer, releaseStream, revokeUrl])

  const stop = useCallback(() => {
    clearTimer() // 不等 onstop,让秒数立刻定格
    recorderRef.current?.stop()
  }, [clearTimer])

  useEffect(() => {
    return () => {
      if (recorderRef.current?.state === 'recording') {
        recorderRef.current.onstop = null // 组件都没了,别再 setState
        recorderRef.current.stop()
      }
      clearTimer()
      releaseStream()
      revokeUrl()
    }
  }, [clearTimer, releaseStream, revokeUrl])

  return { status, seconds, audioUrl, blob, error, start, stop }
}
