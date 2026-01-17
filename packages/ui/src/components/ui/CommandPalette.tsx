import { useState, useEffect, useRef } from 'react'
import { useUIStore } from '../../stores/ui'
import { useCommands, filterCommands, type Command } from '../../hooks/useCommands'
import { cn } from '../../lib/utils'

export function CommandPalette() {
  const isOpen = useUIStore((s) => s.commandPaletteOpen)
  const closeCommandPalette = useUIStore((s) => s.closeCommandPalette)

  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const commands = useCommands()
  const filteredCommands = filterCommands(commands, search)

  // Group commands by category
  const groupedCommands = groupByCategory(filteredCommands)

  // Flatten for keyboard navigation
  const flatCommands = filteredCommands

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setSearch('')
      setSelectedIndex(0)
      // Focus input after a brief delay to ensure DOM is ready
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [isOpen])

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [search])

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedItem = listRef.current.querySelector('[data-selected="true"]')
      selectedItem?.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((i) => Math.min(i + 1, flatCommands.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((i) => Math.max(i - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (flatCommands[selectedIndex]) {
            flatCommands[selectedIndex].action()
            closeCommandPalette()
          }
          break
        case 'Escape':
          e.preventDefault()
          closeCommandPalette()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedIndex, flatCommands, closeCommandPalette])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeCommandPalette}
      />

      {/* Dialog */}
      <div className="absolute left-1/2 top-[20%] w-full max-w-lg -translate-x-1/2 px-4">
        <div className="overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl">
          {/* Search input */}
          <div className="flex items-center gap-3 border-b border-[hsl(var(--border))] px-4">
            <svg
              className="h-4 w-4 text-[hsl(var(--muted-foreground))]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type a command..."
              className="flex-1 bg-transparent py-3 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none"
            />
            <kbd className="hidden rounded bg-[hsl(var(--muted))] px-1.5 py-0.5 text-xs text-[hsl(var(--muted-foreground))] sm:inline-block">
              esc
            </kbd>
          </div>

          {/* Command list */}
          <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
            {flatCommands.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
                No commands found
              </div>
            ) : (
              Object.entries(groupedCommands).map(([category, cmds]) => (
                <div key={category}>
                  {/* Category header */}
                  <div className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    {formatCategory(category)}
                  </div>

                  {/* Commands in category */}
                  {cmds.map((cmd) => {
                    const globalIndex = flatCommands.findIndex((c) => c.id === cmd.id)
                    const isSelected = globalIndex === selectedIndex

                    return (
                      <CommandItem
                        key={cmd.id}
                        command={cmd}
                        selected={isSelected}
                        onSelect={() => {
                          cmd.action()
                          closeCommandPalette()
                        }}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                      />
                    )
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-4 border-t border-[hsl(var(--border))] px-4 py-2 text-xs text-[hsl(var(--muted-foreground))]">
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-[hsl(var(--muted))] px-1 py-0.5">
                <span className="text-[10px]">&#9650;&#9660;</span>
              </kbd>
              <span>navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-[hsl(var(--muted))] px-1 py-0.5">
                <span className="text-[10px]">&#9166;</span>
              </kbd>
              <span>select</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-[hsl(var(--muted))] px-1 py-0.5">esc</kbd>
              <span>close</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

interface CommandItemProps {
  command: Command
  selected: boolean
  onSelect: () => void
  onMouseEnter: () => void
}

function CommandItem({ command, selected, onSelect, onMouseEnter }: CommandItemProps) {
  return (
    <button
      data-selected={selected}
      onClick={onSelect}
      onMouseEnter={onMouseEnter}
      className={cn(
        'flex w-full items-center gap-3 px-4 py-2 text-left text-sm',
        'transition-colors',
        selected
          ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
          : 'text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]'
      )}
    >
      <span className={cn('flex-shrink-0', selected ? 'opacity-100' : 'opacity-70')}>
        {command.icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="truncate font-medium">{command.title}</div>
        {command.description && (
          <div
            className={cn(
              'truncate text-xs',
              selected ? 'text-[hsl(var(--primary-foreground))]/70' : 'text-[hsl(var(--muted-foreground))]'
            )}
          >
            {command.description}
          </div>
        )}
      </div>
      {command.shortcut && (
        <kbd
          className={cn(
            'flex-shrink-0 rounded px-1.5 py-0.5 text-xs font-mono',
            selected
              ? 'bg-[hsl(var(--primary-foreground))]/20 text-[hsl(var(--primary-foreground))]'
              : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
          )}
        >
          {command.shortcut}
        </kbd>
      )}
    </button>
  )
}

/**
 * Group commands by category
 */
function groupByCategory(commands: Command[]): Record<string, Command[]> {
  const groups: Record<string, Command[]> = {}

  // Define category order
  const categoryOrder = ['email', 'navigation', 'settings']

  for (const category of categoryOrder) {
    const cmds = commands.filter((c) => c.category === category)
    if (cmds.length > 0) {
      groups[category] = cmds
    }
  }

  return groups
}

/**
 * Format category name for display
 */
function formatCategory(category: string): string {
  const names: Record<string, string> = {
    email: 'Email Actions',
    navigation: 'Navigation',
    settings: 'Settings',
  }
  return names[category] ?? category
}
