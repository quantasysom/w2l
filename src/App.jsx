import React, { useState, useEffect } from 'react';
import Icon from './components/Icons';
import Explorer from './components/Explorer';
import TerminalPanel from './components/TerminalPanel';
import AgentPanel from './components/AgentPanel';
import { CommandPalette, DiffViewer } from './components/Overlays';
import { useTweaks, TweaksPanel, TweakSection, TweakColor, TweakRadio, TweakSelect } from './components/TweaksPanel';
import './components.css';

const ACCENTS = {
  teal:   { a: '#2ee6c0', dim: '#1fa98c', glow: 'rgba(46,230,192,.16)', ink: '#04130f' },
  blue:   { a: '#4c9df7', dim: '#2f7fd6', glow: 'rgba(76,157,247,.16)', ink: '#031021' },
  green:  { a: '#5ad97a', dim: '#3aa857', glow: 'rgba(90,217,122,.16)', ink: '#04150a' },
  violet: { a: '#a586f7', dim: '#7d5fd6', glow: 'rgba(165,134,247,.18)', ink: '#0f0820' },
  amber:  { a: '#f5b13d', dim: '#cf8e20', glow: 'rgba(245,177,61,.16)', ink: '#1c1203' },
};

const TWEAK_DEFAULTS = {
  accent: "teal",
  theme: "dark",
  mono: "'JetBrains Mono'",
  density: "regular"
};

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [diffStep, setDiffStep] = useState(null);
  const [activeFile, setActiveFile] = useState('');
  const [agentState, setAgentState] = useState('idle');

  // Directory paths
  const [winRoot, setWinRoot] = useState('');
  const [nixRoot, setNixRoot] = useState('');
  const [cwdWin, setCwdWin] = useState('');
  const [cwdNix, setCwdNix] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Initialize paths from Electron main process
  useEffect(() => {
    window.w2l.getInitData().then((data) => {
      setWinRoot(data.winRoot);
      setNixRoot(data.nixRoot);
      setCwdWin(data.winRoot);
      setCwdNix(data.nixRoot);
    });
  }, []);

  // Apply tweaks to :root
  useEffect(() => {
    const r = document.documentElement;
    const ac = ACCENTS[t.accent] || ACCENTS.teal;
    r.style.setProperty('--accent', ac.a);
    r.style.setProperty('--accent-dim', ac.dim);
    r.style.setProperty('--accent-glow', ac.glow);
    r.style.setProperty('--accent-ink', ac.ink);
    r.setAttribute('data-theme', t.theme);
    r.setAttribute('data-density', t.density);
    r.style.setProperty('--font-mono', t.mono + ", ui-monospace, monospace");
  }, [t]);

  // Keyboard shortcuts: Ctrl+K / Ctrl+P palette
  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'p')) {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setTweaksOpen((o) => !o);
      }
      if (e.key === 'Escape') {
        setPaletteOpen(false);
        setTweaksOpen(false);
        setDiffStep(null);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const handleCwdChange = (newWin, newNix) => {
    setCwdWin(newWin);
    setCwdNix(newNix);
  };

  const triggerDirUpdate = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="app">
      {/* Title Bar */}
      <div className="titlebar">
        <div className="tb-brand">
          <span className="tb-logo">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
              <rect x="1.5" y="1.5" width="21" height="21" rx="6" fill="var(--accent)" opacity="0.14"/>
              <rect x="1.5" y="1.5" width="21" height="21" rx="6" stroke="var(--accent)" strokeWidth="1.3"/>
              <path d="M6 8.5l3 3-3 3" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M11.5 15.5h6" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </span>
          <span className="tb-title">W2L<span className="sub">terminal-shell</span></span>
        </div>
        <div className="tb-menu">
          {['File', 'Edit', 'View', 'Terminal', 'Agent', 'Help'].map(m => (
            <button key={m} onClick={() => {
              if (m === 'Agent') setPaletteOpen(true);
              if (m === 'Terminal') setTweaksOpen(true);
            }}>{m}</button>
          ))}
        </div>
        <div className="tb-spacer" />
        <div className="tb-shell-badge" onClick={() => setPaletteOpen(true)}>
          <span className="dot" /> bash · Windows Native · W2L Emulator
        </div>
        <div className="tb-winctl">
          <button title="Minimize"><Icon name="min" size={15} /></button>
          <button title="Maximize"><Icon name="max" size={13} /></button>
          <button className="close" title="Close" onClick={() => window.close()}><Icon name="x" size={15} /></button>
        </div>
      </div>

      {/* Workspace */}
      <div className="workspace">
        <Explorer 
          winRoot={winRoot} 
          nixRoot={nixRoot}
          activeFile={activeFile} 
          onOpen={setActiveFile} 
          refreshKey={refreshKey}
          onRefresh={triggerDirUpdate}
        />
        <TerminalPanel 
          winRoot={winRoot}
          nixRoot={nixRoot}
          cwdWin={cwdWin}
          cwdNix={cwdNix}
          onCwdChange={handleCwdChange}
          onDirUpdate={triggerDirUpdate}
        />
        <AgentPanel 
          winRoot={winRoot}
          onViewDiff={setDiffStep} 
          onActivity={setAgentState} 
          onDirUpdate={triggerDirUpdate}
        />
      </div>

      {/* Status Bar */}
      <div className="statusbar">
        <div className="sb-item clickable" onClick={() => setPaletteOpen(true)}>
          <Icon name="git" size={13} /> <span>main</span>
        </div>
        <div className="sb-sep" />
        <div className="sb-item">
          <span className="k">cwd</span>
          <span className="sb-path" title={cwdWin}>{cwdWin ? cwdWin.replace(/^(.*?[\\/].*?[\\/]).*([\\/].*)$/, '$1...$2') : 'C:\\...'}</span>
          <Icon name="swap" size={12} style={{ color: 'var(--text-faint)' }} />
          <span className="sb-path linux" title={cwdNix}>{cwdNix ? cwdNix.replace(/^(.*?[/].*?[/]).*([/].*)$/, '$1...$2') : '/mnt/c/...'}</span>
        </div>
        <div className="sb-sep" />
        <div className="sb-item"><span className="k">shell</span> bash 5.2</div>
        <div className="sb-grow" />
        <div className="sb-item accent">
          <span className="d-pulse" style={{ background: agentState === 'running' ? 'var(--accent)' : 'var(--text-faint)' }} />
          agent {agentState === 'running' ? 'working' : 'idle'}
        </div>
        <div className="sb-sep" />
        <div className="sb-item">UTF-8</div>
        <div className="sb-item">LF</div>
        <div className="sb-item clickable" onClick={() => setPaletteOpen(true)}><Icon name="search" size={12} /> Ctrl+K</div>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <DiffViewer step={diffStep} onClose={() => setDiffStep(null)} onAcceptApplied={triggerDirUpdate} />

      <TweaksPanel title="Appearance Settings" open={tweaksOpen} onClose={() => setTweaksOpen(false)}>
        <TweakSection label="Appearance" />
        <TweakColor label="Accent" value={ACCENTS[t.accent] ? ACCENTS[t.accent].a : ACCENTS.teal.a}
          options={[ACCENTS.teal.a, ACCENTS.blue.a, ACCENTS.green.a, ACCENTS.violet.a, ACCENTS.amber.a]}
          onChange={v => {
            const k = Object.keys(ACCENTS).find(k => ACCENTS[k].a === v) || 'teal';
            setTweak('accent', k);
          }} />
        <TweakRadio label="Theme" value={t.theme} options={['dark', 'light']} onChange={v => setTweak('theme', v)} />
        <TweakRadio label="Density" value={t.density} options={['compact', 'regular', 'comfy']} onChange={v => setTweak('density', v)} />
        <TweakSection label="Terminal" />
        <TweakSelect label="Mono font" value={t.mono}
          options={["'JetBrains Mono'", "'IBM Plex Mono'", "'Geist Mono'", "ui-monospace"]}
          onChange={v => setTweak('mono', v)} />
      </TweaksPanel>
    </div>
  );
}

export default App;
