import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { SECTION_IDS, pathForSection, type SectionId } from '../app/sections.tsx';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onSignOut?: () => void;
  isLoggedIn: boolean;
}

const SECTION_LABELS: Record<SectionId, string> = {
  home: 'Home',
  about: 'About',
  services: 'Services',
  finance: 'Finance',
  investment: 'Investment',
  groceries: 'Groceries',
  networth: 'Net Worth',
  goals: 'Goals',
  analytics: 'Analytics',
};

interface Command {
  id: string;
  group: 'Go to' | 'Actions';
  label: string;
  hint?: string;
  run: () => void;
}

function cycleTheme(): void {
  const root = document.documentElement;
  const next = root.classList.contains('dark') ? 'light' : 'dark';
  try {
    localStorage.setItem('theme', next);
  } catch {
    // ignore persistence failures
  }
  // ThemeSwitcher syncs its own state off this event.
  window.dispatchEvent(new CustomEvent('app:theme', { detail: next }));
}

/**
 * Command palette (Phase 6): Cmd/Ctrl+K navigation + quick actions.
 * Controlled by the parent (`open`/`onClose`); filters as you type with
 * full keyboard support (up/down/enter/escape).
 */
const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose, onSignOut, isLoggedIn }) => {
  const navigate = useNavigate();
  const [query, setQuery] = React.useState('');
  const [activeIndex, setActiveIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const commands = React.useMemo<Command[]>(() => {
    const go: Command[] = SECTION_IDS.map((section) => ({
      id: `go-${section}`,
      group: 'Go to',
      label: SECTION_LABELS[section],
      run: () => navigate(pathForSection(section)),
    }));
    const actions: Command[] = [
      {
        id: 'upload',
        group: 'Actions',
        label: 'Upload statement',
        hint: 'Finance',
        run: () => navigate(pathForSection('finance')),
      },
      {
        id: 'theme',
        group: 'Actions',
        label: 'Toggle light / dark theme',
        run: cycleTheme,
      },
    ];
    if (isLoggedIn && onSignOut) {
      actions.push({ id: 'signout', group: 'Actions', label: 'Sign out', run: onSignOut });
    }
    return [...go, ...actions];
  }, [navigate, onSignOut, isLoggedIn]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) => c.label.toLowerCase().includes(q) || (c.hint ?? '').toLowerCase().includes(q)
    );
  }, [commands, query]);

  // Reset on open; autofocus the input.
  React.useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      // Defer so the modal exists before focusing.
      const t = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(t);
    }
  }, [open ]);

  React.useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const runActive = React.useCallback(() => {
    const command = filtered[activeIndex];
    if (!command) return;
    onClose();
    command.run();
  }, [filtered, activeIndex, onClose]);

  if (!open) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      runActive();
    }
  };

  let lastGroup: Command['group'] | null = null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-lg rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 border-b border-gray-200 dark:border-gray-700">
          <Search className="h-4 w-4 text-gray-400" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a command or search…"
            aria-label="Type a command or search"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-list"
            aria-activedescendant={filtered[activeIndex] ? `cmd-${filtered[activeIndex].id}` : undefined}
            className="w-full py-3 bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400"
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600 text-gray-500">
            esc
          </kbd>
        </div>
        <ul id="command-palette-list" role="listbox" className="max-h-80 overflow-y-auto py-2">
          {filtered.map((command, index) => {
            const header =
              command.group !== lastGroup ? (
                <li
                  key={`group-${command.group}`}
                  aria-hidden
                  className="px-4 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400"
                >
                  {command.group}
                </li>
              ) : null;
            lastGroup = command.group;
            return (
              <React.Fragment key={command.id}>
                {header}
                <li
                  id={`cmd-${command.id}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  onClick={() => {
                    onClose();
                    command.run();
                  }}
                  onMouseMove={() => setActiveIndex(index)}
                  className={`px-4 py-2 text-sm cursor-pointer flex items-center justify-between ${
                    index === activeIndex
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span>{command.label}</span>
                  {command.hint && (
                    <span className="text-xs text-gray-400">{command.hint}</span>
                  )}
                </li>
              </React.Fragment>
            );
          })}
          {filtered.length === 0 && (
            <li className="px-4 py-6 text-sm text-center text-gray-500">
              No matching commands.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default CommandPalette;
