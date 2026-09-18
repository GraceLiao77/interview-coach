import { liquidMetalFragmentShader, ShaderMount } from '@paper-design/shaders'
import { Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import './liquid-metal-button.css'

const IDLE_SPEED = 0.6
const HOVER_SPEED = 1
const CLICK_SPEED = 2.4

interface LiquidMetalButtonProps {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  /** 左侧的 ✨ 图标,暗示这颗按钮背后有模型在跑 */
  icon?: boolean
  type?: 'button' | 'submit'
}

/**
 * 着色器驱动的液态金属按钮。**每个实例会占用一个 WebGL context + 一个渲染循环**,
 * 浏览器对 context 数量有上限(约 16),所以只用在页面级的少数几个主操作上,
 * 别放进会重复渲染的列表里。
 */
export function LiquidMetalButton({
  children,
  onClick,
  disabled,
  icon = true,
  type = 'button',
}: LiquidMetalButtonProps) {
  const shaderHostRef = useRef<HTMLSpanElement>(null)
  const mountRef = useRef<ShaderMount | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const rippleId = useRef(0)
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([])

  useEffect(() => {
    const host = shaderHostRef.current
    if (!host) return

    try {
      mountRef.current = new ShaderMount(
        host,
        liquidMetalFragmentShader,
        {
          // 外观
          u_repetition: 4,
          u_softness: 0.5,
          u_shiftRed: 0.3,
          u_shiftBlue: 0.3,
          u_distortion: 0,
          u_contour: 0,
          u_angle: 45,
          u_shape: 1,
          u_colorBack: [0, 0, 0, 0], // 透明:让底下的静态金属环透出来
          u_colorTint: [1, 1, 1, 1],
          u_isImage: false,
          // 布局:原始代码漏了整组 sizing uniform,其中 u_fit 不传的话图案不会铺满
          // 元素 —— 按钮又宽又扁,结果就是只有左半边有金属、右半边发黑。
          u_fit: 2, // 2 = cover
          u_scale: 1,
          u_rotation: 0,
          u_originX: 0.5,
          u_originY: 0.5,
          u_offsetX: 0,
          u_offsetY: 0,
          u_worldWidth: 0,
          u_worldHeight: 0,
        },
        undefined,
        IDLE_SPEED,
      )
    } catch {
      // WebGL 不可用(无 GPU / context 超限)时静默降级:CSS 渐变兜底,按钮照常能点
      mountRef.current = null
    }

    return () => {
      // 注意是 dispose() 不是 destroy() —— 写错方法名不会报错,只会静默泄漏 context
      mountRef.current?.dispose()
      mountRef.current = null
    }
  }, [])

  // 禁用时停下动画,省电也在视觉上表明"现在点不了"
  useEffect(() => {
    mountRef.current?.setSpeed(disabled ? 0 : IDLE_SPEED)
  }, [disabled])

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    const mount = mountRef.current
    if (mount) {
      mount.setSpeed(CLICK_SPEED)
      setTimeout(() => mountRef.current?.setSpeed(IDLE_SPEED), 300)
    }

    const rect = buttonRef.current?.getBoundingClientRect()
    if (rect) {
      const ripple = { x: e.clientX - rect.left, y: e.clientY - rect.top, id: rippleId.current++ }
      setRipples((prev) => [...prev, ripple])
      setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== ripple.id)), 600)
    }

    onClick?.()
  }

  return (
    <button
      ref={buttonRef}
      type={type}
      className="lmb"
      disabled={disabled}
      onClick={handleClick}
      onMouseEnter={() => !disabled && mountRef.current?.setSpeed(HOVER_SPEED)}
      onMouseLeave={() => mountRef.current?.setSpeed(disabled ? 0 : IDLE_SPEED)}
    >
      <span ref={shaderHostRef} className="lmb-shader" aria-hidden />
      <span className="lmb-face" aria-hidden />

      <span className="lmb-label">
        {icon && <Sparkles className="lmb-icon" size={15} aria-hidden />}
        {children}
      </span>

      {ripples.map((r) => (
        <span key={r.id} className="lmb-ripple" style={{ left: r.x, top: r.y }} />
      ))}
    </button>
  )
}
