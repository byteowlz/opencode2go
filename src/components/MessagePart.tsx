import { memo } from "react"
// Temporarily disabled to fix split() error
// // import ReactMarkdown from "react-markdown"
// import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
// import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
// // import remarkGfm from 'remark-gfm'
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

const MarkdownContent = memo(({ content }: { content: string }) => {
  // Comprehensive safety checks
  if (typeof content !== 'string') {
    console.warn('MarkdownContent received non-string content:', typeof content, content)
    return <div className="error-content">Invalid content type: {typeof content}</div>
  }
  
  if (!content || content.trim() === '') {
    return <div></div>
  }
  
  // Additional safety: ensure content doesn't contain objects or arrays
  let safeContent: string
  try {
    safeContent = String(content)
  } catch (error) {
    console.error('Failed to convert content to string:', error)
    return <div className="error-content">Failed to render content</div>
  }
  
  // Temporarily disabled markdown components
  // const markdownComponents = { ... }

  // Temporarily use plain text to isolate ReactMarkdown issue
  return (
    <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)' }}>
      {safeContent}
    </div>
  )
})

export const MessagePart = memo(({ part }: MessagePartProps) => {
  // Handle text parts
  if (part.type === "text" && part.text) {
    const textContent = typeof part.text === 'string' ? part.text : String(part.text || "")
    return (
      <div className="message-part text-part">
        <MarkdownContent content={textContent} />
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

  // Handle reasoning parts (new part type from SDK)
  if (part.type === "reasoning") {
    return (
      <div className="message-part reasoning-part">
        <div className="reasoning-container">
          <div className="reasoning-header">
            <span className="reasoning-icon">🤔</span>
            <span className="reasoning-text">AI Reasoning</span>
          </div>
          <div className="reasoning-content">
            <MarkdownContent content={typeof part.text === 'string' ? part.text : String(part.text || "")} />
          </div>
        </div>
      </div>
    )
  }

  // Handle patch parts (new part type from SDK)  
  if (part.type === "patch") {
    return (
      <div className="message-part patch-part">
        <div className="patch-container">
          <div className="patch-header">
            <span className="patch-icon">📝</span>
            <span className="patch-text">Code Patch Applied</span>
          </div>
        </div>
      </div>
    )
  }

  // Handle agent parts (new part type from SDK)
  if (part.type === "agent") {
    return (
      <div className="message-part agent-part">
        <div className="agent-container">
          <div className="agent-header">
            <span className="agent-icon">🤖</span>
            <span className="agent-text">Agent: {part.tool || "Unknown"}</span>
          </div>
        </div>
      </div>
    )
  }

  // Handle step-start parts
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

  // Handle step-finish parts
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

  // Handle snapshot parts
  if (part.type === "snapshot") {
    const snapshotData = part.snapshot?.data
    const hasSnapshotData = snapshotData !== undefined && snapshotData !== null

    return (
      <div className="message-part snapshot-part">
        <div className="snapshot-container">
          <div className="snapshot-header">
            <span className="snapshot-icon">⚡</span>
            <span className="snapshot-title">
              {part.snapshot?.title || `Snapshot ${part.snapshot?.id || part.id}`}
            </span>
          </div>
          {part.snapshot?.url && (
            <div className="snapshot-content">
              <a 
                href={part.snapshot.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="snapshot-link"
              >
                View Snapshot →
              </a>
            </div>
          )}
          {hasSnapshotData && (
            <div className="snapshot-data">
              <pre className="snapshot-data-content">
                {JSON.stringify(snapshotData, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Handle file parts
  if (part.type === "file" && part.filename) {
    return (
      <div className="message-part file-part">
        <div className="file-attachment">
          <span className="file-label">⎘ Attachment:</span>
          <span className="file-name">{part.filename}</span>
        </div>
      </div>
    )
  }

  // Fallback for unknown part types
  return (
    <div className="message-part unknown-part">
      <div className="unknown-content">
        <span>Unknown part type: {part.type}</span>
        {part.text && <pre>{part.text}</pre>}
      </div>
    </div>
  )
})
