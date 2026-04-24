import { useState, useRef, useEffect } from 'react'

interface ComboBoxProps {
  value: string
  options: string[]
  onChange: (value: string) => void
  placeholder?: string
}

export default function ComboBox({
  value,
  options,
  onChange,
  placeholder
}: ComboBoxProps) {

  const [open, setOpen] = useState(false)
  const [input, setInput] = useState(value ?? '')
  const [highlight, setHighlight] = useState(-1)

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setInput(value ?? '')
  }, [value])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
        setHighlight(-1)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = options.filter(opt =>
    opt.toLowerCase().includes(input.toLowerCase())
  )

  const exactMatch = options.some(
    opt => opt.toLowerCase() === input.toLowerCase()
  )

  const showCreate = input.trim() !== '' && !exactMatch

  const list = [
    ...filtered,
    ...(showCreate ? [`__create__${input.trim()}`] : [])
  ]

  const handleInput = (val: string) => {
    setInput(val)
    onChange(val)
    setOpen(true)
    setHighlight(-1)
  }

  const handleSelect = (val: string) => {
    setInput(val)
    onChange(val)
    setOpen(false)
    setHighlight(-1)
  }

  const handleCreate = () => {
    const newVal = input.trim()
    if (!newVal) return
    handleSelect(newVal)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight(prev => Math.min(prev + 1, list.length - 1))
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight(prev => Math.max(prev - 1, 0))
    }

    if (e.key === 'Enter') {
      e.preventDefault()

      const selected = list[highlight]

      if (!selected) {
        if (input.trim()) handleCreate()
        return
      }

      if (selected.startsWith('__create__')) {
        handleCreate()
      } else {
        handleSelect(selected)
      }
    }
  }

  return (
    <div ref={containerRef} style={s.container}>
      <input
        style={s.input}
        value={input}
        placeholder={placeholder ?? 'Type to search or create...'}
        onChange={e => handleInput(e.target.value)}
        onFocus={() => {
          setOpen(true)
          setHighlight(0)
        }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />

      {open && (filtered.length > 0 || showCreate) && (
        <div style={s.dropdown}>

          {/* Existing options */}
          {filtered.map((opt, index) => (
            <div
              key={opt}
              style={{
                ...s.option,
                background: index === highlight ? '#eef2ff' : 'transparent'
              }}
              onMouseDown={() => handleSelect(opt)}
            >
              {opt}
            </div>
          ))}

          {/* Create new option */}
          {showCreate && (
            <div
              style={{
                ...s.createOption,
                background: highlight === filtered.length ? '#eef2ff' : '#fafaf9'
              }}
              onMouseDown={handleCreate}
            >
              <span style={s.createLabel}>Create</span>
              <span style={s.createValue}>"{input.trim()}"</span>
            </div>
          )}

        </div>
      )}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100%'
  },

  input: {
    width: '100%',
    padding: '8px 12px',
    fontSize: 14,
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    outline: 'none',
    boxSizing: 'border-box'
  },

  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
    zIndex: 1000,
    maxHeight: 220,
    overflowY: 'auto'
  },

  option: {
    padding: '9px 12px',
    fontSize: 13,
    cursor: 'pointer',
    borderBottom: '1px solid #f3f4f6'
  },

  createOption: {
    padding: '9px 12px',
    fontSize: 13,
    cursor: 'pointer',
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    borderTop: '1px solid #f3f4f6'
  },

  createLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: '#6366f1',
    background: '#ede9fe',
    padding: '2px 6px',
    borderRadius: 10
  },

  createValue: {
    color: '#374151'
  }
}
