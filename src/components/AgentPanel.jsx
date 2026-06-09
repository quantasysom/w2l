import React, { useState, useRef, useEffect } from 'react';
import Icon from './Icons';

function ToolCard({ step }) {
  const meta = {
    read: { icon: 'eye',   label: 'Read',    color: 'var(--win)' },
    bash: { icon: 'terminal', label: 'Run',  color: 'var(--linux)' },
    edit: { icon: 'pencil', label: 'Edit',   color: 'var(--accent)' },
  }[step.tool || step.kind] || { icon: 'bolt', label: 'Tool', color: 'var(--accent)' };

  return (
    <div className="ag-tool">
      <span className="ag-tool-ic" style={{ color: meta.color }}><Icon name={meta.icon} size={13} /></span>
      <span className="ag-tool-lbl">{meta.label}</span>
      <code className="ag-tool-arg">{step.arg}</code>
      <span className="grow" />
      {step.result && <span className="ag-tool-res"><Icon name="check" size={11} /> {step.result}</span>}
    </div>
  );
}

function DiffCard({ step, onView }) {
  const beforeLines = step.before ? step.before.split('\n') : [];
  const afterLines = step.after ? step.after.split('\n') : [];
  
  // count added lines
  const added = afterLines.filter(l => !beforeLines.includes(l));
  
  return (
    <div className="ag-diff">
      <div className="ag-diff-head">
        <Icon name="pencil" size={13} style={{ color: 'var(--accent)' }} />
        <code>{step.file}</code>
        <span className="ag-diff-stat"><span className="add">+{added.length}</span> <span className="del">−0</span></span>
        <span className="grow" />
        <button className="ag-diff-view" onClick={() => onView(step)}>View diff</button>
      </div>
      <div className="ag-diff-preview">
        {added.slice(0, 4).map((l, i) => (
          <div key={i} className="dl add"><span className="sign">+</span>{l || ' '}</div>
        ))}
        {added.length > 4 && <div className="dl more">+{added.length - 4} more lines…</div>}
      </div>
    </div>
  );
}

function PlanCard({ items, doneCount }) {
  return (
    <div className="ag-plan">
      {items.map((it, i) => (
        <div key={i} className={'ag-plan-item' + (i < doneCount ? ' done' : i === doneCount ? ' active' : '')}>
          <span className="box">
            {i < doneCount ? (
              <Icon name="check" size={11} sw={2.4} />
            ) : i === doneCount ? (
              <span className="spin" />
            ) : null}
          </span>
          <span>{it}</span>
        </div>
      ))}
    </div>
  );
}

export function AgentPanel({ winRoot, onViewDiff, onActivity, onDirUpdate, collapsed }) {
  const [msgs, setMsgs] = useState([
    { role: 'agent', kind: 'greet', text: "Hi — I'm the W2L agent. I can read and edit files, run shell commands, and work through tasks autonomously. I have placeholders for LLM integration. Try running a simulated task below!" },
  ]);
  const [input, setInput] = useState('');
  const [running, setRunning] = useState(false);
  const [planDone, setPlanDone] = useState(0);
  const bodyRef = useRef(null);

  // Simulated agent task details
  const getAgentTask = () => ({
    prompt: 'Add a /health endpoint to the gateway that returns uptime and version.',
    steps: [
      { kind: 'think', text: "I'll add a health-check route. Plan: read the current routes, add a GET /health handler that reports uptime + version from package.json, then verify the server boots." },
      { kind: 'plan', items: [
          'Read src/routes.js to match existing style',
          'Read package.json for the version field',
          'Add GET /health returning { status, uptime, version }',
          'Restart dev server and curl /health',
        ] },
      { kind: 'tool', tool: 'read', arg: 'src/routes.js', result: 'read 5 lines' },
      { kind: 'tool', tool: 'read', arg: 'package.json', result: 'version = 1.4.2' },
      { kind: 'tool', tool: 'bash', arg: 'cat /mnt/c/Users/dev/.../routes.js | grep router', result: '3 matches' },
      { kind: 'edit', file: 'src/routes.js',
        before:
`const router = require('express').Router();
 
router.get('/users', (req, res) => res.json([]));
router.post('/users', (req, res) => res.status(201).json(req.body));
 
module.exports = router;`,
        after:
`const router = require('express').Router();
const { version } = require('../package.json');
 
router.get('/health', (req, res) => res.json({
  status: 'ok',
  uptime: process.uptime(),
  version,
}));
 
router.get('/users', (req, res) => res.json([]));
router.post('/users', (req, res) => res.status(201).json(req.body));
 
module.exports = router;` },
      { kind: 'tool', tool: 'bash', arg: 'npm run dev', result: 'listening on :8080' },
      { kind: 'tool', tool: 'bash', arg: 'curl -s localhost:8080/api/health', result: '200 OK' },
      { kind: 'result', text: 'Done. Added `GET /api/health` — it returns `{ status, uptime, version }`. Server boots clean and the endpoint responds 200. The version is pulled from package.json so it stays in sync automatically.',
        meta: { files: 1, lines: '+7 −0', cmds: 2 } },
    ],
  });

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [msgs, planDone]);

  function push(m) {
    setMsgs((x) => [...x, m]);
  }

  async function runTask(prompt) {
    if (running) return;
    setRunning(true);
    push({ role: 'user', text: prompt });
    onActivity && onActivity('running');

    const task = getAgentTask();
    let pd = 0;
    setPlanDone(0);
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));

    await wait(800);
    for (const step of task.steps) {
      if (step.kind === 'think') {
        push({ role: 'agent', kind: 'think', text: step.text });
        await wait(1500);
      } else if (step.kind === 'plan') {
        push({ role: 'agent', kind: 'plan', items: step.items });
        await wait(1000);
      } else if (step.kind === 'tool') {
        push({ role: 'agent', kind: 'tool', ...step });
        pd++;
        setPlanDone(Math.min(pd, 4));
        await wait(1200);
      } else if (step.kind === 'edit') {
        // Pre-fill file details with current workspace root
        const fullFilePath = winRoot + '/' + step.file;
        const editStep = {
          ...step,
          fullPath: fullFilePath
        };

        // Attempt to read actual routes file, fallback to step values
        try {
          const currentContent = await window.w2l.readFile(fullFilePath);
          if (currentContent && !currentContent.startsWith('Error:')) {
            editStep.before = currentContent;
            
            // Generate 'after' content using a replacement if before content matches
            if (currentContent.includes("router.get('/users'")) {
              editStep.after = currentContent.replace(
                "const router = require('express').Router();",
                "const router = require('express').Router();\nconst { version } = require('../package.json');\n\nrouter.get('/health', (req, res) => res.json({\n  status: 'ok',\n  uptime: process.uptime(),\n  version,\n}));"
              );
            }
          }
        } catch (e) {
          console.log("File not found, using default mock diff");
        }

        // Push edit card that users can review and apply!
        push({ role: 'agent', kind: 'edit', ...editStep });
        pd++;
        setPlanDone(Math.min(pd, 4));
        
        // Wait until user accepts it or simulated apply runs
        await wait(2000);
      } else if (step.kind === 'result') {
        push({ role: 'agent', kind: 'result', ...step });
        await wait(400);
      }
    }
    
    setRunning(false);
    onActivity && onActivity('idle');
  }

  function send(e) {
    e.preventDefault();
    const v = input.trim();
    if (!v || running) return;
    setInput('');
    runTask(v);
  }

  return (
    <div className="panel agent" style={collapsed ? { display: 'none' } : undefined}>
      <div className="panel-head">
        <Icon name="sparkle" size={14} style={{ color: 'var(--accent)' }} />
        <span style={{ color: 'var(--text-dim)' }}>Agent</span>
        <span className="ag-model">mock · coder</span>
        <span className="grow" />
        <span className={'ag-status ' + (running ? 'busy' : 'idle')}>
          <span className="d" />{running ? 'working' : 'ready'}
        </span>
      </div>

      <div className="ag-body" ref={bodyRef}>
        {msgs.map((m, i) => {
          if (m.role === 'user') return <div key={i} className="ag-msg user"><div className="bubble">{m.text}</div></div>;
          if (m.kind === 'tool') return <ToolCard key={i} step={m} />;
          if (m.kind === 'edit') return <DiffCard key={i} step={m} onView={onViewDiff} />;
          if (m.kind === 'plan') return (
            <div key={i} className="ag-msg agent">
              <div className="ag-block-label"><Icon name="layers" size={12} /> Plan</div>
              <PlanCard items={m.items} doneCount={planDone} />
            </div>
          );
          if (m.kind === 'think') return (
            <div key={i} className="ag-msg agent">
              <div className="ag-think">{m.text}</div>
            </div>
          );
          if (m.kind === 'result') return (
            <div key={i} className="ag-msg agent">
              <div className="ag-result">
                <div className="ag-result-head"><Icon name="check" size={13} sw={2.4} /> Task complete</div>
                <p>{m.text}</p>
                <div className="ag-result-meta">
                  <span><b>{m.meta.files}</b> file</span>
                  <span className="ln">{m.meta.lines}</span>
                  <span><b>{m.meta.cmds}</b> commands</span>
                </div>
              </div>
            </div>
          );
          return (
            <div key={i} className="ag-msg agent">
              <div className="ag-avatar"><Icon name="sparkle" size={13} /></div>
              <div className="ag-text">{m.text}</div>
            </div>
          );
        })}
      </div>

      {!running && msgs.length <= 1 && (
        <div className="ag-suggest">
          <div className="ag-suggest-lbl">Try a task</div>
          <button onClick={() => runTask(getAgentTask().prompt)}>
            <Icon name="bolt" size={13} style={{ color: 'var(--accent)' }} />
            {getAgentTask().prompt}
          </button>
          <button onClick={() => runTask('Translate this Windows path and cd into it: C:\\Users\\dev\\projects')}>
            <Icon name="swap" size={13} style={{ color: 'var(--win)' }} />
            Translate a Windows path and cd into it
          </button>
        </div>
      )}

      <form className="ag-compose" onSubmit={send}>
        <div className="ag-compose-inner">
          <textarea value={input} placeholder="Ask the agent to build, fix, or run something…"
            rows={1} spellCheck={false}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { send(e); } }} />
          <div className="ag-compose-bar">
            <span className="ag-ctx"><Icon name="file" size={11} /> Workspace ready</span>
            <span className="grow" />
            <button type="submit" className="ag-send" disabled={running || !input.trim()}>
              <Icon name="send" size={14} />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default AgentPanel;
