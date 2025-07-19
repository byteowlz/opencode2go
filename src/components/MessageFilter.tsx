import { useState, useEffect, useRef } from "react"
import { Filter, Check } from "lucide-react"

export interface MessagePartFilters {
  text: boolean
  tool: boolean
  "tool-invocation": boolean
  "step-start": boolean
  "step-finish": boolean
  file: boolean
  snapshot: boolean
}

interface MessageFilterProps {
  filters: MessagePartFilters
  onFiltersChange: (filters: MessagePartFilters) => void
}

const PART_TYPE_LABELS = {
  text: "Text Content",
  tool: "Tool Results", 
  "tool-invocation": "Tool Invocations",
  "step-start": "Step Start",
  "step-finish": "Step Finish",
  file: "File Attachments",
  snapshot: "Snapshots"
}

const PART_TYPE_ICONS = {
  text: "◉",
  tool: "⚙",
  "tool-invocation": "⚡",
  "step-start": "▶",
  "step-finish": "◼",
  file: "⎘",
  snapshot: "◈"
}

export const MessageFilter = ({ filters, onFiltersChange }: MessageFilterProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleToggleFilter = (partType: keyof MessagePartFilters) => {
    onFiltersChange({
      ...filters,
      [partType]: !filters[partType]
    })
  }

  const getActiveCount = () => {
    return Object.values(filters).filter(Boolean).length
  }

  const getTotalCount = () => {
    return Object.keys(filters).length
  }

  const handleSelectAll = () => {
    const allTrue = Object.keys(filters).reduce((acc, key) => ({
      ...acc,
      [key]: true
    }), {} as MessagePartFilters)
    onFiltersChange(allTrue)
  }

  const handleSelectNone = () => {
    const allFalse = Object.keys(filters).reduce((acc, key) => ({
      ...acc,
      [key]: false
    }), {} as MessagePartFilters)
    onFiltersChange(allFalse)
  }

  return (
    <div className="message-filter" ref={dropdownRef}>
      <button 
        className="settings-button-header filter-button" 
        onClick={() => setIsOpen(!isOpen)}
        title="Filter Message Parts"
      >
        <Filter size={16} />
        {getActiveCount() < getTotalCount() && (
          <span className="filter-badge">{getActiveCount()}</span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="filter-overlay" onClick={() => setIsOpen(false)} />
          <div className="filter-dropdown">
            <div className="filter-header">
              <span className="filter-title">Message Parts</span>
              <div className="filter-actions">
                <button 
                  className="filter-action-btn"
                  onClick={handleSelectAll}
                  title="Select All"
                >
                  All
                </button>
                <button 
                  className="filter-action-btn"
                  onClick={handleSelectNone}
                  title="Select None"
                >
                  None
                </button>
              </div>
            </div>
            
            <div className="filter-list">
              {Object.entries(PART_TYPE_LABELS).map(([partType, label]) => (
                <label 
                  key={partType}
                  className="filter-item"
                >
                  <div className="filter-checkbox-wrapper">
                    <input
                      type="checkbox"
                      className="filter-checkbox"
                      checked={filters[partType as keyof MessagePartFilters]}
                      onChange={() => handleToggleFilter(partType as keyof MessagePartFilters)}
                    />
                    <div className="filter-checkbox-custom">
                      {filters[partType as keyof MessagePartFilters] && (
                        <Check size={12} />
                      )}
                    </div>
                  </div>
                  <div className="filter-label-content">
                    <span className="filter-icon">
                      {PART_TYPE_ICONS[partType as keyof typeof PART_TYPE_ICONS]}
                    </span>
                    <span className="filter-label">{label}</span>
                  </div>
                </label>
              ))}
            </div>

            <div className="filter-footer">
              <span className="filter-count">
                {getActiveCount()} of {getTotalCount()} selected
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}