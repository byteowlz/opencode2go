import { memo } from "react"
import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import remarkGfm from 'remark-gfm'
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
  const markdownComponents = {
    code({ className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '')
      const language = match ? match[1] : 'text'
      const childrenStr = String(children)
      
      // Check if it's a code block (not inline)
      if (!props.inline && (match || childrenStr.includes('\n'))) {
        return (
          <SyntaxHighlighter
            style={oneDark as any}
            language={language}
            PreTag="div"
            customStyle={{
              margin: '2px 0',
              padding: '8px',
              fontSize: '0.9em',
              lineHeight: '1.4',
              backgroundColor: 'var(--color-bg-element)',
              border: '1px solid var(--color-border)'
            }}
          >
            {childrenStr.replace(/\n$/, '')}
          </SyntaxHighlighter>
        )
      }
      
      // Inline code
      return (
        <code className={className} {...props}>
          {children}
        </code>
      )
    }
  }

  return (
    <ReactMarkdown 
      components={markdownComponents}
      remarkPlugins={[remarkGfm]}
    >
      {content}
    </ReactMarkdown>
  )
})

export const MessagePart = memo(({ part }: MessagePartProps) => {
  // Handle text parts
  if (part.type === "text" && part.text) {
    return (
      <div className="message-part text-part">
        <MarkdownContent content={part.text} />
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

  // Handle tool-invocation parts
  if (part.type === "tool-invocation") {
    return (
      <div className="message-part tool-invocation-part">
        <div className="tool-invocation-container">
          <div className="tool-invocation-header">
            <span className="tool-invocation-icon">⚙</span>
            <span className="tool-invocation-text">
              Invoking {part.invocation?.tool || "tool"}...
            </span>
          </div>
          {part.invocation?.input && (
            <div className="tool-invocation-input">
              <pre className="tool-invocation-input-content">
                {JSON.stringify(part.invocation.input, null, 2)}
              </pre>
            </div>
          )}
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
          {part.snapshot?.data && (
            <div className="snapshot-data">
              <pre className="snapshot-data-content">
                {JSON.stringify(part.snapshot.data, null, 2)}
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