import { useState } from "react"
import "./CyclingButton.css"

interface CyclingButtonOption {
  value: string
  label: string
  description?: string
}

interface CyclingButtonProps {
  options: CyclingButtonOption[]
  value: string
  onChange: (value: string) => void
  maxWidth?: string
}

export function CyclingButton({ options, value, onChange, maxWidth = "80px" }: CyclingButtonProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  const currentIndex = options.findIndex(option => option.value === value)
  const currentOption = options[currentIndex] || options[0]

  const handleClick = () => {
    if (options.length <= 1) return

    setIsAnimating(true)
    setTimeout(() => setIsAnimating(false), 200)

    const nextIndex = (currentIndex + 1) % options.length
    onChange(options[nextIndex].value)
  }

  return (
    <button
      className={`cycling-button ${isAnimating ? 'animating' : ''}`}
      onClick={handleClick}
      style={{ maxWidth }}
      title={currentOption?.description || `Click to cycle through modes. Current: ${currentOption?.label}`}
      type="button"
    >
      <span className="cycling-button-label">
        {currentOption?.label || 'Unknown'}
      </span>
    </button>
  )
}
