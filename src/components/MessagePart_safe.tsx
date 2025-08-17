import { memo } from "react"
import { OpenCodePart } from "../services/opencode"
import { 
  BashTool, 
  EditTool, 
  TodoWriteTool, 
  ReadTool, 
  WriteTool, 
  FallbackTool 
} from "./ToolComponents"

interface MessagePartProps {
  part: OpenCodePart
  isLast?: boolean
}

const SafeTextContent = memo(({ content }: { content: string }) => {
  // Ultra-safe content handling
  if (content === null || content === undefined) {
    return <div></div>
  }
  
  if (typeof content !== 'string') {
    console.error('SafeTextContent: Invalid content type:', typeof content, content)
    return <div className="error-content">Invalid content: {typeof content}</div>
  }
  
  if (content.trim() === '') {
    return <div></div>
  }
  
  // Render as plain text with basic formatting
  return (
    <div style={{ 
      whiteSpace: 'pre-wrap', 
      fontFamily: 'var(--font-mono)',
      lineHeight: '1.4'
    }}>
      {content}
    </div>
  )
})

export const MessagePart = memo(({ part }: MessagePartProps) => {
  // Handle text parts
  if (part.type === "text" && part.text) {
    const textContent = typeof part.text === 'string' ? part.text : String(part.text || "")
    return (
      <div className="message-part text-part">
        <SafeTextContent content={textContent} />
      </div>
    )
  }

  // Handle tool parts
  if (part.type === "tool" && part.tool) {
    switch (part.tool) {
      case "bash":
        return <BashTool part={part} />
      case "edit":
        return <EditTool part={part} />
      case "todowrite":
        return <TodoWriteTool part={part} />
      case "todoread":
        return <TodoWriteTool part={part} />
      case "read":
        return <ReadTool part={part} />
      case "write":
        return <WriteTool part={part} />
      case "grep":
      case "glob":
      case "list":
      case "webfetch":
      case "task":
      default:
        return <FallbackTool part={part} />
    }
  }

  // Handle reasoning parts
  if (part.type === "reasoning") {
    return (
      <div className="message-part reasoning-part">
        <div className="reasoning-container">
          <div className="reasoning-header">
            <span className="reasoning-icon">🤔</span>
            <span className="reasoning-text">AI Reasoning</span>
          </div>
          <div className="reasoning-content">
            <SafeTextContent content={typeof part.text === 'string' ? part.text : String(part.text || "")} />
          </div>
        </div>
      </div>
    )
  }

  // Handle step parts
  if (part.type === "step-start") {
    return (
      <div className="message-part step-part step-start">
        <div className="step-indicator">
          <span className="step-icon">▶</span>
          <span className="step-text">Starting step...</span>
        </div>
      </div>
    )
  }

  if (part.type === "step-finish") {
    return (
      <div className="message-part step-part step-finish">
        <div className="step-indicator">
          <span className="step-icon">◼</span>
          <span className="step-text">Step completed</span>
        </div>
      </div>
    )
  }

  // Fallback for unknown part types
  return (
    <div className="message-part unknown-part">
      <div className="unknown-content">
        <span>Unknown part type: {part.type}</span>
        {part.text && <pre>{String(part.text)}</pre>}
      </div>
    </div>
  )
})