import React, { useState, useEffect } from 'react';
import Icon from './Icons';

function TreeNode({ node, depth, onOpen, activeFile }) {
  const [open, setOpen] = useState(node.open ?? false);
  const pad = 10 + depth * 14;

  if (node.type === 'dir') {
    return (
      <div>
        <div className="tree-row" style={{ paddingLeft: pad }} onClick={() => setOpen(o => !o)}>
          <Icon name="chevron" size={13} sw={2}
                style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s', color: 'var(--text-faint)' }} />
          <Icon name={open ? 'folder-open' : 'folder'} size={15}
                style={{ color: open ? 'var(--accent)' : 'var(--text-dim)' }} />
          <span>{node.name}</span>
        </div>
        {open && node.children && node.children.map((c, i) =>
          <TreeNode key={i} node={c} depth={depth + 1} onOpen={onOpen} activeFile={activeFile} />)}
      </div>
    );
  }

  const active = activeFile === node.path;
  return (
    <div className={'tree-row file' + (active ? ' active' : '')} style={{ paddingLeft: pad + 16 }}
         onClick={() => onOpen(node.path)}>
      <Icon name="file" size={14} style={{ color: 'var(--text-faint)' }} />
      <span>{node.name}</span>
      {/* If file is routes.js or modified, we can show a badge */}
      {node.name === 'routes.js' && active && <span className="tree-badge">M</span>}
    </div>
  );
}

export function Explorer({ winRoot, nixRoot, activeFile, onOpen, refreshKey, onRefresh, collapsed }) {
  const [tree, setTree] = useState([]);

  useEffect(() => {
    let active = true;
    if (winRoot) {
      window.w2l.readWorkspaceDir(winRoot).then((res) => {
        if (active) setTree(res);
      });
    }
    return () => { active = false; };
  }, [winRoot, refreshKey]);

  return (
    <div className="panel explorer" style={collapsed ? { display: 'none' } : undefined}>
      <div className="panel-head">
        <span>Explorer</span>
        <span className="grow" />
        <button className="icon" title="New file" onClick={onRefresh}><Icon name="plus" size={15} /></button>
        <button className="icon" title="Refresh" onClick={onRefresh}><Icon name="refresh" size={14} /></button>
      </div>

      <div className="exp-project">
        <Icon name="git" size={13} style={{ color: 'var(--text-dim)' }} />
        <span className="name">{winRoot ? winRoot.split(/[\\/]/).pop() : 'w2l'}</span>
        <span className="branch">main</span>
      </div>

      <div className="tree">
        {tree.map((n, i) => (
          <TreeNode key={i} node={n} depth={0} onOpen={onOpen} activeFile={activeFile} />
        ))}
      </div>

      <div className="pathmap">
        <div className="pathmap-title">
          <Icon name="swap" size={13} style={{ color: 'var(--accent)' }} /> 
          Path translation
        </div>
        <div className="pathmap-row">
          <span className="os win"><span className="dot" />Windows</span>
          <code className="win">{winRoot || 'C:\\...'}</code>
        </div>
        <div className="pathmap-row">
          <span className="os linux"><span className="dot" />Linux (WSL virtualized)</span>
          <code className="linux">{nixRoot || '/mnt/c/...'}</code>
        </div>
        <div className="pathmap-note">Auto-mapped · live</div>
      </div>
    </div>
  );
}

export default Explorer;
