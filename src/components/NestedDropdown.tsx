import { useState, useRef, useEffect } from "react"
import "./Dropdown.css"

interface NestedDropdownOption {
  value: string
  label: string
  children?: NestedDropdownOption[]
}

interface NestedDropdownProps {
  options: NestedDropdownOption[]
  value: { provider: string; model: string }
  onChange: (value: { provider: string; model: string }) => void
  placeholder?: string
  maxWidth?: string
}

export function NestedDropdown({ 
  options, 
  value, 
  onChange, 
  placeholder = "Select...", 
  maxWidth = "200px" 
}: NestedDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [openUpward, setOpenUpward] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSelectedProvider(null)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const getCurrentLabel = () => {
    const provider = options.find(p => p.value === value.provider)
    const model = provider?.children?.find(m => m.value === value.model)
    
    if (provider && model) {
      return `${provider.label} • ${model.label}`
    }
    return placeholder
  }

  const handleToggle = () => {
    if (!isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      const menuHeight = 300

      setOpenUpward(spaceBelow < menuHeight && spaceAbove > menuHeight)
    }
    setIsOpen(!isOpen)
    setSelectedProvider(null)
  }

  const handleProviderSelect = (providerValue: string) => {
    if (selectedProvider === providerValue) {
      setSelectedProvider(null)
    } else {
      setSelectedProvider(providerValue)
    }
  }

  const handleModelSelect = (providerValue: string, modelValue: string) => {
    onChange({ provider: providerValue, model: modelValue })
    setIsOpen(false)
    setSelectedProvider(null)
  }

  return (
    <div className="dropdown nested-dropdown" ref={dropdownRef} style={{ maxWidth }}>
      <button className="dropdown-trigger" onClick={handleToggle} type="button">
        <span className="dropdown-value">{getCurrentLabel()}</span>
        <span className={`dropdown-arrow ${isOpen ? "open" : ""}`}>▼</span>
      </button>

      {isOpen && (
        <div className={`dropdown-menu nested-dropdown-menu ${openUpward ? "dropdown-menu-upward" : ""}`}>
          {options.map((provider) => (
            <div key={provider.value} className="nested-dropdown-section">
              <button
                className={`nested-dropdown-header ${selectedProvider === provider.value ? "selected" : ""}`}
                onClick={() => handleProviderSelect(provider.value)}
                type="button"
              >
                <span>{provider.label}</span>
                <span className={`nested-arrow ${selectedProvider === provider.value ? "open" : ""}`}>▶</span>
              </button>
              
              {selectedProvider === provider.value && provider.children && (
                <div className="nested-dropdown-submenu">
                  {provider.children.map((model) => (
                    <button
                      key={model.value}
                      className={`nested-dropdown-model ${
                        value.provider === provider.value && 
                        value.model === model.value ? "active" : ""
                      }`}
                      onClick={() => handleModelSelect(provider.value, model.value)}
                      type="button"
                    >
                      {model.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}