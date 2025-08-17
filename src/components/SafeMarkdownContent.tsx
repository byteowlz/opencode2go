import { memo } from "react"

interface SafeMarkdownContentProps {
  content: string
}

export const SafeMarkdownContent = memo(({ content }: SafeMarkdownContentProps) => {
  // Ultra-safe content handling
  if (content === null || content === undefined) {
    return <div></div>
  }
  
  if (typeof content !== 'string') {
    console.error('SafeMarkdownContent: Invalid content type:', typeof content, content)
    return <div className="error-content">Invalid content: {typeof content}</div>
  }
  
  if (content.trim() === '') {
    return <div></div>
  }
  
  // For now, just render as plain text to isolate the issue
  return (
    <div style={{ whiteSpace: 'pre-wrap' }}>
      {content}
    </div>
  )
})