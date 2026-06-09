import React, { useState, useRef, useEffect } from 'react';
import Icon from './Icons';

const PALETTE_CMDS = [
  { icon: 'sparkle', label: 'Agent: Run task…', hint: 'Ctrl+I', grp: 'Agent' },
  { icon: 'terminal', label: 'New terminal', hint: 'Ctrl+`', grp: 'Terminal' },
  { icon: 'swap', label: 'Translate path: Windows → Linux', hint: '', grp: 'W2L' },
  { icon: 'swap', label: 'Translate path: Linux → Windows', hint: '', grp: 'W2L' },
  { icon: 'file', label: 'Open file: src/routes.js', hint: '', grp: 'Files' },
  { icon: 'file', label: 'Open file: src/server.js', hint: '', grp: 'Files' },
  { icon: 'git', label: 'Git: status', hint: '', grp: 'Git' },
  { icon: 'refresh', label: 'Restart dev server', hint: '', grp: 'Tasks' },
  { icon: 'settings', label: 'Open settings', hint: 'Ctrl+,', grp: 'App' },
];

export function CommandPalette({ open, onClose }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQ('');
      setSel(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  if (!open) return null;
  const filtered = PALETTE_CMDS.filter(c => c.label.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="overlay" onClick={onClose}>
      <div className="palette" onClick={e => e.stopPropagation()}>
        <div className="palette-input">
          <Icon name="search" size={16} style={{ color: 'var(--text-faint)' }} />
          <input ref={inputRef} value={q} placeholder="Type a command or search…"
            onChange={e => { setQ(e.target.value); setSel(0); }}
            onKeyDown={e => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(filtered.length - 1, s + 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(0, s - 1)); }
              if (e.key === 'Enter') onClose();
              if (e.key === 'Escape') onClose();
            }} />
          <span className="palette-esc">esc</span>
        </div>
        <div className="palette-list">
          {filtered.map((c, i) => (
            <div key={i} className={'palette-item' + (i === sel ? ' sel' : '')} onMouseEnter={() => setSel(i)} onClick={onClose}>
              <Icon name={c.icon} size={15} style={{ color: i === sel ? 'var(--accent)' : 'var(--text-dim)' }} />
              <span className="lbl">{c.label}</span>
              <span className="grp">{c.grp}</span>
              {c.hint && <span className="hint">{c.hint}</span>}
            </div>
          ))}
          {filtered.length === 0 && <div className="palette-empty">No matching commands</div>}
        </div>
      </div>
    </div>
  );
}

function diffRows(before, after) {
  const b = before ? before.split('\n') : [];
  const a = after ? after.split('\n') : [];
  const bset = new Set(b);
  const rows = [];
  let bn = 1, an = 1;
  for (const line of a) {
    if (bset.has(line)) {
      rows.push({ t: 'ctx', ln: line, bn: bn++, an: an++ });
    } else {
      rows.push({ t: 'add', ln: line, an: an++ });
    }
  }
  return rows;
}

export function DiffViewer({ step, onClose, onAcceptApplied }) {
  if (!step) return null;
  const rows = diffRows(step.before, step.after);
  const adds = rows.filter(r => r.t === 'add').length;

  const handleAccept = async () => {
    if (step.fullPath && step.after) {
      const res = await window.w2l.writeFile({
        filePath: step.fullPath,
        content: step.after
      });
      if (res.success) {
        onAcceptApplied();
        onClose();
      } else {
        alert("Failed to write file: " + res.error);
      }
    } else {
      onClose();
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="diffview" onClick={e => e.stopPropagation()}>
        <div className="diffview-head">
          <Icon name="pencil" size={15} style={{ color: 'var(--accent)' }} />
          <code>{step.file}</code>
          <span className="diffview-stat"><span className="add">+{adds}</span> <span className="del">−0</span></span>
          <span className="grow" />
          <span className="diffview-tag">Proposed by agent</span>
          <button className="icon" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>
        <div className="diffview-body">
          {rows.map((r, i) => (
            <div key={i} className={'dv-row ' + r.t}>
              <span className="dv-ln">{r.bn || ''}</span>
              <span className="dv-ln">{r.an || ''}</span>
              <span className="dv-sign">{r.t === 'add' ? '+' : ''}</span>
              <span className="dv-code">{r.ln || ' '}</span>
            </div>
          ))}
        </div>
        <div className="diffview-foot">
          <span className="hint">The agent will apply this once you accept.</span>
          <span className="grow" />
          <button className="btn ghost" onClick={onClose}>Reject</button>
          <button className="btn primary" onClick={handleAccept}>
            <Icon name="check" size={14} /> Accept &amp; apply
          </button>
        </div>
      </div>
    </div>
  );
}
