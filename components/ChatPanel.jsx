'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2 } from 'lucide-react'

function renderMarkdown(text) {
  const lines = text.split('\n')
  const elements = []
  let listItems = []
  let listType = null

  function flushList() {
    if (listItems.length > 0) {
      const Tag = listType === 'ol' ? 'ol' : 'ul'
      elements.push(<Tag key={`list-${elements.length}`}>{listItems}</Tag>)
      listItems = []
      listType = null
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const bulletMatch = line.match(/^[-*]\s+(.+)/)
    const numberedMatch = line.match(/^\d+[.)]\s+(.+)/)

    if (bulletMatch) {
      if (listType !== 'ul') flushList()
      listType = 'ul'
      listItems.push(<li key={i} dangerouslySetInnerHTML={{ __html: inlineFormat(bulletMatch[1]) }} />)
    } else if (numberedMatch) {
      if (listType !== 'ol') flushList()
      listType = 'ol'
      listItems.push(<li key={i} dangerouslySetInnerHTML={{ __html: inlineFormat(numberedMatch[1]) }} />)
    } else {
      flushList()
      if (line.trim() === '') continue
      elements.push(<p key={i} dangerouslySetInnerHTML={{ __html: inlineFormat(line) }} />)
    }
  }
  flushList()
  return elements
}

function inlineFormat(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\|/g, ' | ')
}

export default function ChatPanel({ findings, maintenance }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `VoltHawk AI online. I have analyzed ${findings.length} inspection findings from drone footage. I can help you prioritize repairs, assess NERC compliance, generate work orders, or estimate risk exposure. What would you like to know?`,
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return

    const userMessage = { role: 'user', content: text }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)

    try {
      const conversationHistory = updatedMessages.map(m => ({ role: m.role, content: m.content }))

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conversationHistory, findings, maintenance }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Request failed (${response.status})`)
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.content?.[0]?.text || 'No response received.',
      }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <div className="bg-surface-1 border border-border rounded-xl flex flex-col h-full min-h-[600px]">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Bot className="w-4 h-4 text-accent" />
        <h3 className="text-sm font-semibold text-text-primary">AI Inspection Co-Pilot</h3>
        <span className="ml-auto w-2 h-2 rounded-full bg-low animate-pulse" />
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="shrink-0 w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-accent" />
              </div>
            )}
            <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed chat-message ${msg.role === 'user' ? 'bg-accent/10 text-text-primary' : 'bg-surface-2 text-text-primary'}`}>
              {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
            </div>
            {msg.role === 'user' && (
              <div className="shrink-0 w-7 h-7 rounded-lg bg-surface-3 flex items-center justify-center">
                <User className="w-4 h-4 text-text-secondary" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="shrink-0 w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-accent" />
            </div>
            <div className="bg-surface-2 rounded-xl px-4 py-3 text-sm text-text-secondary flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing...
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2 bg-surface-2 rounded-xl px-3 py-2 border border-border focus-within:border-accent/50 transition-colors">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about findings, NERC compliance, dispatch plans..."
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-secondary/60 outline-none"
            disabled={loading}
          />
          <button onClick={handleSend} disabled={loading || !input.trim()} className="p-1.5 rounded-lg text-accent hover:bg-accent/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
