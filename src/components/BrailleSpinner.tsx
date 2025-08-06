import React, { useState, useEffect } from "react"

const brailleFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]

interface BrailleSpinnerProps {
  className?: string
  speed?: number
}

export const BrailleSpinner: React.FC<BrailleSpinnerProps> = ({ 
  className = "", 
  speed = 120 
}) => {
  const [frameIndex, setFrameIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % brailleFrames.length)
    }, speed)

    return () => clearInterval(interval)
  }, [speed])

  return (
    <span className={`braille-spinner ${className}`}>
      {brailleFrames[frameIndex]}
    </span>
  )
}