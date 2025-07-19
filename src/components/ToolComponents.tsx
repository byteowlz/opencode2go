import { memo } from "react"
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { OpenCodePart } from "../services/opencode"
import { Terminal, Edit, FileText, List, Search, Globe, Bot } from "lucide-react"

interface ToolComponentProps {
  part: OpenCodePart
}

const ToolHeader = memo(({ part }: { part: OpenCodePart }) => {
  const getIcon = () => {
    switch (part.tool) {
      case "bash": return <Terminal size={16} />
      case "edit": return <Edit size={16} />
      case "write": return <FileText size={16} />
      case "read": return <FileText size={16} />
      case "todowrite": return <List size={16} />
      case "todoread": return <List size={16} />
      case "grep": return <Search size={16} />
      case "glob": return <Search size={16} />
      case "list": return <FileText size={16} />
      case "webfetch": return <Globe size={16} />
      case "task": return <Bot size={16} />
      default: return <Terminal size={16} />
    }
  }

  const getStatusIcon = () => {
    switch (part.state?.status) {
      case "completed": return <span className="status-icon status-completed">✓</span>
      case "error": return <span className="status-icon status-error">✗</span>
      case "running": return <span className="status-icon status-running">●</span>
      default: return <span className="status-icon status-pending">○</span>
    }
  }

  return (
    <div className="tool-header">
      <div className="tool-info">
        {getIcon()}
        <span className="tool-name">{part.tool}</span>
      </div>
      <div className="tool-status">
        {getStatusIcon()}
        <span className="tool-status-text">{part.state?.status || "pending"}</span>
      </div>
    </div>
  )
})

export const BashTool = memo(({ part }: ToolComponentProps) => {
  const input = part.state?.input
  const output = part.state?.output

  return (
    <div className="tool-component bash-tool">
      <ToolHeader part={part} />
      <div className="tool-content">
        {input && (
          <div className="tool-input">
            <div className="tool-section-header">Command</div>
            <SyntaxHighlighter
              style={oneDark as any}
              language="bash"
              PreTag="div"
              customStyle={{
                margin: '2px 0',
                padding: '8px',
                fontSize: '0.9em',
                lineHeight: '1.4'
              }}
            >
              {input.command || input}
            </SyntaxHighlighter>
          </div>
        )}
        {output && (
          <div className="tool-output">
            <div className="tool-section-header">Output</div>
            <pre className="tool-output-text">{output}</pre>
          </div>
        )}
      </div>
    </div>
  )
})

export const EditTool = memo(({ part }: ToolComponentProps) => {
  const input = part.state?.input
  const output = part.state?.output

  return (
    <div className="tool-component edit-tool">
      <ToolHeader part={part} />
      <div className="tool-content">
        {input && (
          <div className="tool-input">
            <div className="tool-section-header">
              Edit: {input.filePath || input.file}
            </div>
            {input.oldString && (
              <div className="edit-section">
                <div className="edit-label edit-remove">− Remove</div>
                <SyntaxHighlighter
                  style={oneDark as any}
                  language="text"
                  PreTag="div"
                  customStyle={{
                    margin: '2px 0',
                    padding: '8px',
                    fontSize: '0.9em',
                    lineHeight: '1.4',
                    backgroundColor: 'rgba(255, 85, 85, 0.1)'
                  }}
                >
                  {input.oldString}
                </SyntaxHighlighter>
              </div>
            )}
            {input.newString && (
              <div className="edit-section">
                <div className="edit-label edit-add">+ Add</div>
                <SyntaxHighlighter
                  style={oneDark as any}
                  language="text"
                  PreTag="div"
                  customStyle={{
                    margin: '2px 0',
                    padding: '8px',
                    fontSize: '0.9em',
                    lineHeight: '1.4',
                    backgroundColor: 'rgba(80, 250, 123, 0.1)'
                  }}
                >
                  {input.newString}
                </SyntaxHighlighter>
              </div>
            )}
          </div>
        )}
        {output && (
          <div className="tool-output">
            <div className="tool-section-header">Result</div>
            <pre className="tool-output-text">{output}</pre>
          </div>
        )}
      </div>
    </div>
  )
})

export const TodoWriteTool = memo(({ part }: ToolComponentProps) => {
  const input = part.state?.input
  const todos = input?.todos || []

  return (
    <div className="tool-component todo-tool">
      <ToolHeader part={part} />
      <div className="tool-content">
        <div className="tool-section-header">Todo List</div>
        <div className="todo-list">
          {todos.map((todo: any, index: number) => (
            <div key={todo.id || index} className={`todo-item todo-${todo.status}`}>
              <div className="todo-status">
                {todo.status === "completed" ? "✓" : 
                 todo.status === "in_progress" ? "●" : 
                 todo.status === "cancelled" ? "✗" : "○"}
              </div>
              <div className="todo-content">
                <div className="todo-text">{todo.content}</div>
                <div className="todo-meta">
                  <span className="todo-priority">{todo.priority}</span>
                  <span className="todo-status-text">{todo.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
})

export const ReadTool = memo(({ part }: ToolComponentProps) => {
  const input = part.state?.input
  const output = part.state?.output

  return (
    <div className="tool-component read-tool">
      <ToolHeader part={part} />
      <div className="tool-content">
        {input && (
          <div className="tool-input">
            <div className="tool-section-header">
              Reading: {input.filePath || input.file}
            </div>
          </div>
        )}
        {output && (
          <div className="tool-output">
            <div className="tool-section-header">File Content</div>
            <SyntaxHighlighter
              style={oneDark as any}
              language="text"
              PreTag="div"
              customStyle={{
                margin: '2px 0',
                padding: '8px',
                fontSize: '0.9em',
                lineHeight: '1.4',
                maxHeight: '400px',
                overflow: 'auto'
              }}
            >
              {output}
            </SyntaxHighlighter>
          </div>
        )}
      </div>
    </div>
  )
})

export const WriteTool = memo(({ part }: ToolComponentProps) => {
  const input = part.state?.input

  return (
    <div className="tool-component write-tool">
      <ToolHeader part={part} />
      <div className="tool-content">
        {input && (
          <div className="tool-input">
            <div className="tool-section-header">
              Writing: {input.filePath || input.file}
            </div>
            {input.content && (
              <SyntaxHighlighter
                style={oneDark as any}
                language="text"
                PreTag="div"
                customStyle={{
                  margin: '2px 0',
                  padding: '8px',
                  fontSize: '0.9em',
                  lineHeight: '1.4',
                  maxHeight: '400px',
                  overflow: 'auto'
                }}
              >
                {input.content}
              </SyntaxHighlighter>
            )}
          </div>
        )}
      </div>
    </div>
  )
})

export const FallbackTool = memo(({ part }: ToolComponentProps) => {
  const input = part.state?.input
  const output = part.state?.output

  return (
    <div className="tool-component fallback-tool">
      <ToolHeader part={part} />
      <div className="tool-content">
        {input && (
          <div className="tool-input">
            <div className="tool-section-header">Input</div>
            <pre className="tool-input-text">{JSON.stringify(input, null, 2)}</pre>
          </div>
        )}
        {output && (
          <div className="tool-output">
            <div className="tool-section-header">Output</div>
            <pre className="tool-output-text">{typeof output === 'string' ? output : JSON.stringify(output, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  )
})