import React, { useState, useRef, useEffect } from 'react';
import Icon from './Icons';

const PROMPT_USER = 'dev';
const PROMPT_HOST = 'W2L';

function shortNix(cwd, nixRoot) {
  if (!cwd || cwd === '/') return '/';
  if (cwd === '~') return '~';
  
  // Normalize path (remove trailing slash if present, except for root)
  const normalized = cwd.endsWith('/') && cwd.length > 1 ? cwd.slice(0, -1) : cwd;
  
  const segments = normalized.split('/').filter(Boolean);
  return segments.pop() || '/';
}



function PromptSegment({ text, icon, bgColor, textColor, nextBgColor }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'stretch' }}>
      <div style={{
        backgroundColor: bgColor,
        color: textColor,
        display: 'inline-flex',
        alignItems: 'center',
        paddingLeft: '8px',
        paddingRight: '4px',
        fontSize: '11px',
        fontWeight: 'bold',
        fontFamily: 'var(--font-mono)',
        whiteSpace: 'nowrap',
      }}>
        {icon && <span style={{ marginRight: '5px', display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
        {text}
      </div>
      <svg width="10" height="20" viewBox="0 0 10 20" style={{ display: 'block', flexShrink: 0 }}>
        {nextBgColor && <rect width="10" height="20" fill={nextBgColor} />}
        <path d="M0 0 L10 10 L0 20 Z" fill={bgColor} />
      </svg>
    </div>
  );
}

function Prompt({ cwd, nixRoot }) {
  // Translate home shortcut to virtual nix root
  const normalized = cwd === '~' ? nixRoot : cwd;
  const pathString = normalized.endsWith('/') && normalized.length > 1 
    ? normalized.slice(0, -1) 
    : normalized;
    
  let segments = pathString.split('/').filter(Boolean);
  
  // Hande root case
  if (segments.length === 0) {
    segments = ['/'];
  }
  
  // Retrieve the last 3 directories (breadcrumbs)
  const displaySegments = segments.slice(-3);
  
  // Powerline segments color scheme
  const colors = [
    { bg: '#e8457a', text: '#ffffff' }, // Pink
    { bg: '#eedc3a', text: '#111111' }, // Yellow
    { bg: '#20969b', text: '#ffffff' }, // Teal
  ];
  
  return (
    <div className="t-prompt-container" style={{
      display: 'inline-flex',
      alignItems: 'stretch',
      height: '20px',
      borderRadius: '4px',
      overflow: 'hidden',
      marginRight: '8px',
      verticalAlign: 'middle',
    }}>
      {displaySegments.map((segment, index) => {
        const isLast = index === displaySegments.length - 1;
        const color = colors[index] || colors[0];
        const nextColor = isLast ? null : (colors[index + 1] || colors[0]).bg;
        
        return (
          <PromptSegment
            key={index}
            icon={index === 0 ? <Icon name="folder" size={11} sw={2.4} /> : null}
            text={segment}
            bgColor={color.bg}
            textColor={color.text}
            nextBgColor={nextColor}
          />
        );
      })}
    </div>
  );
}



function Line({ line, nixRoot }) {
  const cls = 't-line' + (line.cls ? ' c-' + line.cls : '');
  if (line.echo) {
    return (
      <div className="t-line t-echo">
        <Prompt cwd={line.cwd} nixRoot={nixRoot} /> <span className="t-cmd">{line.echo}</span>
      </div>
    );
  }
  return (
    <div className={cls} style={line.inlineWrap ? { display: 'inline-block', marginRight: 22 } : undefined}>
      {line.text}{line.tail && <span className={'c-' + (line.tailCls || '')}>{line.tail}</span>}
    </div>
  );
}

export function TerminalPanel({ 
  winRoot, nixRoot, 
  cwdWin, cwdNix, 
  onCwdChange, onDirUpdate 
}) {
  const [lines, setLines] = useState([]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [hIdx, setHIdx] = useState(-1);
  const [running, setRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('bash');
  
  const bodyRef = useRef(null);
  const inputRef = useRef(null);
  const stdoutBuffer = useRef('');
  const stderrBuffer = useRef('');

  useEffect(() => {
    if (nixRoot) {
      setLines([
        { text: 'W2L Shell  ·  bash 5.2 (emulated)  ·  type ', cls: 'faint', tail: 'help', tailCls: 'accent' },
        { echo: 'uname -a', cwd: nixRoot },
        { text: 'Linux W2L 6.6.0-w2l #1 SMP x86_64 GNU/Linux  (emulated on Windows 11)', cls: 'dim' },
        { spacer: true },
      ]);
    }
  }, [nixRoot]);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [lines]);

  // Refocus terminal input when command execution ends
  useEffect(() => {
    if (!running) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [running]);


  // Set up stdout/stderr streaming listeners
  useEffect(() => {
    const removeStdout = window.w2l.onCommandStdout((data) => {
      stdoutBuffer.current += data;
      const parts = stdoutBuffer.current.split('\n');
      stdoutBuffer.current = parts.pop() || '';
      
      if (parts.length > 0) {
        setLines((l) => [
          ...l,
          ...parts.map((p) => ({ text: p, cls: 'dim' }))
        ]);
      }
    });

    const removeStderr = window.w2l.onCommandStderr((data) => {
      stderrBuffer.current += data;
      const parts = stderrBuffer.current.split('\n');
      stderrBuffer.current = parts.pop() || '';

      if (parts.length > 0) {
        setLines((l) => [
          ...l,
          ...parts.map((p) => ({ text: p, cls: 'red' }))
        ]);
      }
    });

    return () => {
      removeStdout();
      removeStderr();
    };
  }, []);

  async function submit(e) {
    e.preventDefault();
    const raw = input;
    const trimmed = raw.trim();
    setInput('');
    if (running) return;

    if (trimmed === 'clear') {
      setLines([]);
      if (trimmed) setHistory((h) => [...h, raw]);
      setHIdx(-1);
      return;
    }

    if (trimmed === 'help') {
      const newLines = [
        { echo: 'help', cwd: cwdNix },
        { text: 'W2L emulates these natively in JavaScript / BusyBox:', cls: 'dim' },
        { text: '  ls  pwd  cd  cat  echo  whoami  uname  clear  grep  mkdir  touch  rm  cp  mv', cls: 'dim' },
        { text: 'Extensibility: custom PowerShell wrappers can be run seamlessly.', cls: 'dim' },
        { text: 'Bridges installed: apt (winget wrapper), systemctl, open (path auto-translation).', cls: 'dim' },
        { text: 'Tip: paste a Windows path — W2L auto-translates it.', cls: 'dim' },
        { spacer: true }
      ];
      setLines((l) => [...l, ...newLines]);
      setHistory((h) => [...h, raw]);
      setHIdx(-1);
      return;
    }

    setRunning(true);
    setLines((l) => [...l, { echo: raw || ' ', cwd: cwdNix }]);
    
    // Reset streaming buffers
    stdoutBuffer.current = '';
    stderrBuffer.current = '';

    const res = await window.w2l.runCommand({
      command: raw,
      cwdNix,
      cwdWin
    });

    // Append remaining buffers if any
    const finalLines = [];
    if (stdoutBuffer.current) {
      finalLines.push({ text: stdoutBuffer.current, cls: 'dim' });
      stdoutBuffer.current = '';
    }
    if (stderrBuffer.current) {
      finalLines.push({ text: stderrBuffer.current, cls: 'red' });
      stderrBuffer.current = '';
    }

    if (res.out && res.out.length > 0) {
      res.out.forEach((o) => finalLines.push(o));
    }

    finalLines.push({ spacer: true });
    setLines((l) => [...l, ...finalLines]);

    if (res.cd) {
      onCwdChange(res.cd.win, res.cd.nix);
    }

    if (trimmed) {
      setHistory((h) => [...h, raw]);
      onDirUpdate(); // refresh file tree explorer
    }

    setHIdx(-1);
    setRunning(false);
  }

  // Helper to find common prefix among strings
  function getCommonPrefix(strings) {
    if (!strings || strings.length === 0) return '';
    let common = strings[0];
    for (let i = 1; i < strings.length; i++) {
      let j = 0;
      while (j < common.length && j < strings[i].length && common[j] === strings[i][j]) {
        j++;
      }
      common = common.substring(0, j);
    }
    return common;
  }

  async function handleTabCompletion() {
    if (running) return;

    const words = input.split(' ');
    const lastWord = words[words.length - 1] || '';

    const matches = await window.w2l.getTabCompletion({
      cwdWin,
      lastWord
    });

    if (matches.length === 1) {
      const match = matches[0];
      const suffix = match.isDirectory ? '/' : ' ';
      const completedText = match.completion + suffix;
      
      words[words.length - 1] = completedText;
      setInput(words.join(' '));
    } else if (matches.length > 1) {
      // Print matches to screen
      const optionLines = matches.map(m => m.name + (m.isDirectory ? '/' : ''));
      setLines((l) => [
        ...l,
        { text: optionLines.join('    '), cls: 'faint' },
        { spacer: true }
      ]);
      
      // Auto-complete up to the common prefix
      const completedPrefix = getCommonPrefix(matches.map(m => m.completion));
      if (completedPrefix && completedPrefix.length > lastWord.length) {
        words[words.length - 1] = completedPrefix;
        setInput(words.join(' '));
      }
    }
  }

  function onKey(e) {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const ni = hIdx < 0 ? history.length - 1 : Math.max(0, hIdx - 1);
      if (history[ni] != null) {
        setInput(history[ni]);
        setHIdx(ni);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (hIdx < 0) return;
      const ni = hIdx + 1;
      if (ni >= history.length) {
        setInput('');
        setHIdx(-1);
      } else {
        setInput(history[ni]);
        setHIdx(ni);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleTabCompletion();
    } else if (e.key === 'c' && e.ctrlKey) {
      e.preventDefault();
      if (running) {
        window.w2l.killActiveCommand().then((killed) => {
          if (killed) {
            setLines((l) => [...l, { text: '^C (Process Interrupted)', cls: 'red' }, { spacer: true }]);
            setRunning(false);
          }
        });
      }
    }
  }

  return (
    <div className="panel terminal">
      <div className="term-tabs">
        <div className={`term-tab ${activeTab === 'bash' ? 'active' : ''}`} onClick={() => setActiveTab('bash')}>
          <Icon name="terminal" size={13} />
          <span>bash</span>
          <span className="tt-dot" />
        </div>
        <div className={`term-tab ${activeTab === 'node' ? 'active' : ''}`} onClick={() => setActiveTab('node')}>
          <Icon name="terminal" size={13} style={{ opacity: 0.6 }} />
          <span>node</span>
        </div>
        <button className="term-tab add"><Icon name="plus" size={14} /></button>
        <span className="grow" />
        <div className="term-shellpill">
          <span className="dot" /> BusyBox · Windows Native
        </div>
      </div>

      <div className="term-body" ref={bodyRef} onClick={() => inputRef.current?.focus()}>
        {lines.map((l, i) => {
          if (l.spacer) return <div key={i} style={{ height: 7 }} />;
          if (l.inlineGroup) return (
            <div key={i} className="t-inline-grp">
              {l.inlineGroup.map((o, j) => <span key={j} className={'t-chip ' + (o.cls ? 'c-' + o.cls : '')}>{o.text}</span>)}
            </div>
          );
          return <Line key={i} line={l} nixRoot={nixRoot} />;
        })}

        <form className="t-inputline" onSubmit={submit}>
          <Prompt cwd={cwdNix} nixRoot={nixRoot} />
          <input 
            ref={inputRef} 
            className="t-input" 
            value={input} 
            autoFocus 
            disabled={running}
            spellCheck={false}
            onChange={(e) => setInput(e.target.value)} 
            onKeyDown={onKey}
            placeholder={running ? "Executing command..." : ""} 
          />
          <span className="t-caret" />
        </form>
      </div>
    </div>
  );
}

export default TerminalPanel;
