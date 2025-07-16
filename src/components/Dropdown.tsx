import { useState, useRef, useEffect } from "react"
import "./Dropdown.css"

interface DropdownOption {
  value: string
  label: string
}

interface DropdownProps {
  options: DropdownOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  maxWidth?: string
}

export function Dropdown({ options, value, onChange, placeholder = "Select...", maxWidth = "150px" }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [openUpward, setOpenUpward] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((opt) => opt.value === value)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
  }

  const handleToggle = () => {
    if (!isOpen && dropdownRef.current) {
      // Check if dropdown should open upward
      const rect = dropdownRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      const menuHeight = Math.min(200, options.length * 40) // Estimate menu height

      // Open upward if there's not enough space below but enough space above
      setOpenUpward(spaceBelow < menuHeight && spaceAbove > menuHeight)
    }
    setIsOpen(!isOpen)
  }

  return (
    <div className="dropdown" ref={dropdownRef} style={{ maxWidth }}>
      <button className="dropdown-trigger" onClick={handleToggle} type="button">
        <span className="dropdown-value">{selectedOption ? selectedOption.label : placeholder}</span>
        <span className={`dropdown-arrow ${isOpen ? "open" : ""}`}>▼</span>
      </button>

      {isOpen && (
        <div className={`dropdown-menu ${openUpward ? "dropdown-menu-upward" : ""}`}>
          {options.map((option) => (
            <button
              key={option.value}
              className={`dropdown-option ${option.value === value ? "selected" : ""}`}
              onClick={() => handleSelect(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
