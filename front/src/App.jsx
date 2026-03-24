import { useState, useEffect, useRef } from "react";

const API = "https://dashboard.bo-kl.com/api";

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const FULL_DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const HOURS = Array.from({ length: 13 }, (_, i) => i + 8);

const PRIORITY_CONFIG = {
  haute: { label: "Haute", color: "#FF4757", bg: "rgba(255,71,87,0.12)" },
  moyenne: { label: "Moyenne", color: "#FFA502", bg: "rgba(255,165,2,0.12)" },
  basse: { label: "Basse", color: "#2ED573", bg: "rgba(46,213,115,0.12)" },
};

const FOCUS_BLOCKS = [
  { label: "Bloc Focus", color: "#6C63FF" },
  { label: "Réunion", color: "#FF4757" },
  { label: "Créatif", color: "#FFA502" },
  { label: "Admin", color: "#2ED573" },
  { label: "Pause", color: "#A4B0BE" },
];

function getToday() {
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1;
}
function pad(n) { return String(n).padStart(2, "0"); }

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span style={{ fontFamily: "'DM Mono', monospace", letterSpacing: 2, fontSize: 13, color: "#A4B0BE" }}>
      {pad(time.getHours())}:{pad(time.getMinutes())}:{pad(time.getSeconds())}
    </span>
  );
}

function ProgressRing({ value, max, color, size = 54 }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const pct = max === 0 ? 0 : Math.min(value / max, 1);
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
        strokeWidth={5} strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.5s ease" }} />
    </svg>
  );
}

export default function Dashboard() {
  const [activeDay, setActiveDay] = useState(getToday());
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [newPriority, setNewPriority] = useState("moyenne");
  const [objective, setObjective] = useState("");
  const [editObj, setEditObj] = useState(false);
  const [objInput, setObjInput] = useState("");
  const [schedule, setSchedule] = useState([]);
  const [note, setNote] = useState("");
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [focusMode, setFocusMode] = useState(false);
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [focusLeft, setFocusLeft] = useState(null);
  const [focusRunning, setFocusRunning] = useState(false);
  const [blockType, setBlockType] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const timerRef = useRef(null);
  const noteTimer = useRef(null);

  // Load data when day changes
  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetch(`/tasks/${activeDay}`),
      apiFetch(`/objectives/${activeDay}`),
      apiFetch(`/notes/${activeDay}`),
      apiFetch(`/schedule/${activeDay}`),
    ]).then(([t, o, n, s]) => {
      setTasks(t);
      setObjective(o.text || "");
      setNote(n.content || "");
      setSchedule(s);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [activeDay]);

  // Focus timer
  useEffect(() => {
    if (focusRunning && focusLeft > 0) {
      timerRef.current = setTimeout(() => setFocusLeft(f => f - 1), 1000);
    } else if (focusRunning && focusLeft === 0) {
      setFocusRunning(false);
    }
    return () => clearTimeout(timerRef.current);
  }, [focusRunning, focusLeft]);

  function startFocus() {
    setFocusLeft(focusMinutes * 60);
    setFocusRunning(true);
    setFocusMode(true);
  }
  function stopFocus() {
    setFocusRunning(false);
    setFocusLeft(null);
    setFocusMode(false);
  }

  async function addTask() {
    if (!newTask.trim()) return;
    setSaving(true);
    try {
      const task = await apiFetch("/tasks", {
        method: "POST",
        body: JSON.stringify({ day_index: activeDay, text: newTask.trim(), priority: newPriority, position: tasks.length }),
      });
      setTasks(t => [...t, task]);
      setNewTask("");
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  async function toggleTask(id, done) {
    const task = tasks.find(t => t.id === id);
    setTasks(t => t.map(tk => tk.id === id ? { ...tk, done: !tk.done } : tk));
    try {
      await apiFetch(`/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ done: !done, position: task.position }),
      });
    } catch (e) { console.error(e); }
  }

  async function deleteTask(id) {
    setTasks(t => t.filter(tk => tk.id !== id));
    try {
      await apiFetch(`/tasks/${id}`, { method: "DELETE" });
    } catch (e) { console.error(e); }
  }

  async function saveObjective() {
    setObjective(objInput);
    setEditObj(false);
    try {
      await apiFetch("/objectives", {
        method: "POST",
        body: JSON.stringify({ day_index: activeDay, text: objInput }),
      });
    } catch (e) { console.error(e); }
  }

  function handleNoteChange(val) {
    setNote(val);
    clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(async () => {
      try {
        await apiFetch("/notes", {
          method: "POST",
          body: JSON.stringify({ day_index: activeDay, content: val }),
        });
      } catch (e) { console.error(e); }
    }, 800);
  }

  function handleDragStart(id) { setDragging(id); }
  function handleDragOver(e, id) { e.preventDefault(); setDragOver(id); }
  async function handleDrop(targetId) {
    if (dragging === null || dragging === targetId) { setDragging(null); setDragOver(null); return; }
    const list = [...tasks];
    const fromIdx = list.findIndex(t => t.id === dragging);
    const toIdx = list.findIndex(t => t.id === targetId);
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);
    setTasks(list);
    setDragging(null); setDragOver(null);
    try {
      await Promise.all(list.map((t, i) =>
        apiFetch(`/tasks/${t.id}`, { method: "PATCH", body: JSON.stringify({ done: t.done, position: i }) })
      ));
    } catch (e) { console.error(e); }
  }

  async function toggleSlot(hour) {
    const existing = schedule.find(s => s.hour === hour);
    if (existing) {
      setSchedule(s => s.filter(sl => sl.hour !== hour));
      try {
        await apiFetch(`/schedule/${activeDay}/${hour}`, { method: "DELETE" });
      } catch (e) { console.error(e); }
    } else {
      const newSlot = { day_index: activeDay, hour, block_type: blockType };
      setSchedule(s => [...s, newSlot]);
      try {
        await apiFetch("/schedule", { method: "POST", body: JSON.stringify(newSlot) });
      } catch (e) { console.error(e); }
    }
  }

  const done = tasks.filter(t => t.done).length;
  const total = tasks.length;
  const highTasks = tasks.filter(t => t.priority === "haute" && !t.done);
  const focusFormatted = focusLeft !== null
    ? `${pad(Math.floor(focusLeft / 60))}:${pad(focusLeft % 60)}`
    : `${pad(focusMinutes)}:00`;

  return (
    <div style={{
      minHeight: "100vh", background: "#0D0F14",
      fontFamily: "'Syne', 'DM Sans', sans-serif",
      color: "#E8E8F0",
      backgroundImage: "radial-gradient(ellipse at 20% 50%, rgba(108,99,255,0.07) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(255,71,87,0.05) 0%, transparent 50%)",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&family=DM+Mono&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        input, textarea { outline: none; border: none; background: transparent; color: inherit; font-family: inherit; }
        button { cursor: pointer; border: none; font-family: inherit; }
        .task-row:hover .del-btn { opacity: 1 !important; }
        .slot-cell:hover { background: rgba(108,99,255,0.18) !important; }
        .day-btn:hover { background: rgba(255,255,255,0.06) !important; }
      `}</style>

      {/* Focus overlay */}
      {focusMode && (
        <div onClick={stopFocus} style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(10,10,18,0.97)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          cursor: "pointer"
        }}>
          <div style={{ fontSize: 11, letterSpacing: 6, color: "#6C63FF", textTransform: "uppercase", marginBottom: 24 }}>Mode Focus</div>
          <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: -2, color: focusLeft === 0 ? "#2ED573" : "#E8E8F0", fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>
            {focusLeft === 0 ? "✓ Terminé" : focusFormatted}
          </div>
          {objective && <div style={{ marginTop: 32, color: "#A4B0BE", fontSize: 16, maxWidth: 400, textAlign: "center" }}>🎯 {objective}</div>}
          {highTasks.length > 0 && <div style={{ marginTop: 20, color: "#FF4757", fontSize: 13 }}>⚡ {highTasks[0].text}</div>}
          <div style={{ marginTop: 48, fontSize: 12, color: "rgba(255,255,255,0.2)", letterSpacing: 2 }}>CLIQUER POUR QUITTER</div>
        </div>
      )}

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 36 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 5, color: "#6C63FF", textTransform: "uppercase", marginBottom: 6 }}>Tableau de bord</div>
            <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1, lineHeight: 1 }}>Ma Journée</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {saving && <span style={{ fontSize: 11, color: "#A4B0BE", letterSpacing: 2 }}>Sauvegarde…</span>}
            <Clock />
            <button onClick={focusRunning ? stopFocus : startFocus} style={{
              background: focusRunning ? "rgba(255,71,87,0.15)" : "rgba(108,99,255,0.15)",
              border: `1px solid ${focusRunning ? "#FF4757" : "#6C63FF"}`,
              color: focusRunning ? "#FF4757" : "#6C63FF",
              borderRadius: 10, padding: "8px 18px", fontSize: 13, fontWeight: 600,
            }}>
              {focusRunning ? "⏹ Arrêter" : "⏱ Focus"}
            </button>
          </div>
        </div>

        {/* Day selector */}
        <div style={{ display: "flex", gap: 6, marginBottom: 32, padding: "6px", background: "rgba(255,255,255,0.03)", borderRadius: 14, width: "fit-content" }}>
          {DAYS.map((d, i) => (
            <button key={i} className="day-btn" onClick={() => setActiveDay(i)} style={{
              padding: "9px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600,
              background: activeDay === i ? "#6C63FF" : "transparent",
              color: activeDay === i ? "#fff" : "#A4B0BE",
              transition: "all 0.18s",
            }}>{d}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#A4B0BE", fontSize: 14, letterSpacing: 2 }}>
            Chargement…
          </div>
        ) : (
          <>
            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
              {[
                { label: "Tâches complétées", value: done, max: total || 1, color: "#2ED573", display: `${done}/${total}` },
                { label: "Haute priorité restante", value: highTasks.length, max: Math.max(total, 1), color: "#FF4757", display: String(highTasks.length) },
                { label: "Blocs planifiés", value: schedule.length, max: 13, color: "#6C63FF", display: String(schedule.length) },
              ].map((s, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 16, padding: "18px 22px", border: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ position: "relative" }}>
                    <ProgressRing value={s.value} max={s.max} color={s.color} />
                    <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: s.color }}>{s.display}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#A4B0BE" }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>

              {/* Left */}
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                {/* Objectif */}
                <div style={{ background: "rgba(108,99,255,0.08)", borderRadius: 16, padding: "20px 24px", border: "1px solid rgba(108,99,255,0.2)" }}>
                  <div style={{ fontSize: 11, letterSpacing: 4, color: "#6C63FF", textTransform: "uppercase", marginBottom: 12 }}>🎯 Objectif du jour — {FULL_DAYS[activeDay]}</div>
                  {editObj ? (
                    <div style={{ display: "flex", gap: 10 }}>
                      <input value={objInput} onChange={e => setObjInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && saveObjective()}
                        placeholder="Quel est ton objectif principal aujourd'hui ?"
                        style={{ flex: 1, background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "10px 14px", fontSize: 14, border: "1px solid rgba(108,99,255,0.3)" }} autoFocus />
                      <button onClick={saveObjective} style={{ background: "#6C63FF", color: "#fff", borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 600 }}>OK</button>
                    </div>
                  ) : (
                    <div onClick={() => { setObjInput(objective); setEditObj(true); }} style={{ cursor: "pointer", fontSize: 16, fontWeight: 600, color: objective ? "#E8E8F0" : "rgba(255,255,255,0.25)", minHeight: 26 }}>
                      {objective || "Cliquer pour définir un objectif…"}
                    </div>
                  )}
                </div>

                {/* Tasks */}
                <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 16, padding: "20px 24px", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ fontSize: 11, letterSpacing: 4, color: "#A4B0BE", textTransform: "uppercase", marginBottom: 16 }}>Tâches du jour</div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                    <input value={newTask} onChange={e => setNewTask(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && addTask()}
                      placeholder="Nouvelle tâche…"
                      style={{ flex: 1, background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "10px 14px", fontSize: 14, border: "1px solid rgba(255,255,255,0.07)" }} />
                    <select value={newPriority} onChange={e => setNewPriority(e.target.value)}
                      style={{ background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "10px 12px", fontSize: 13, color: PRIORITY_CONFIG[newPriority].color, border: `1px solid ${PRIORITY_CONFIG[newPriority].color}40`, cursor: "pointer" }}>
                      {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k} style={{ background: "#1A1C24", color: v.color }}>{v.label}</option>)}
                    </select>
                    <button onClick={addTask} style={{ background: "#6C63FF", color: "#fff", borderRadius: 10, padding: "10px 16px", fontSize: 18, fontWeight: 700 }}>+</button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {tasks.length === 0 && <div style={{ color: "rgba(255,255,255,0.18)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>Aucune tâche — journée libre !</div>}
                    {tasks.map(task => {
                      const pCfg = PRIORITY_CONFIG[task.priority];
                      return (
                        <div key={task.id} className="task-row"
                          draggable onDragStart={() => handleDragStart(task.id)}
                          onDragOver={e => handleDragOver(e, task.id)}
                          onDrop={() => handleDrop(task.id)}
                          style={{
                            display: "flex", alignItems: "center", gap: 12,
                            padding: "12px 14px", borderRadius: 12,
                            background: dragOver === task.id ? "rgba(108,99,255,0.1)" : pCfg.bg,
                            border: `1px solid ${pCfg.color}30`,
                            opacity: task.done ? 0.45 : 1,
                            transition: "all 0.15s", cursor: "grab"
                          }}>
                          <div onClick={() => toggleTask(task.id, task.done)} style={{
                            width: 20, height: 20, borderRadius: 6, flexShrink: 0, cursor: "pointer",
                            background: task.done ? pCfg.color : "transparent",
                            border: `2px solid ${pCfg.color}`,
                            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11
                          }}>{task.done ? "✓" : ""}</div>
                          <span style={{ flex: 1, fontSize: 14, textDecoration: task.done ? "line-through" : "none" }}>{task.text}</span>
                          <span style={{ fontSize: 10, letterSpacing: 1, color: pCfg.color, textTransform: "uppercase", fontWeight: 700, background: pCfg.bg, padding: "3px 8px", borderRadius: 6 }}>{pCfg.label}</span>
                          <button className="del-btn" onClick={() => deleteTask(task.id)} style={{ opacity: 0, fontSize: 14, color: "#A4B0BE", background: "transparent", transition: "opacity 0.15s" }}>✕</button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Notes */}
                <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 16, padding: "20px 24px", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ fontSize: 11, letterSpacing: 4, color: "#A4B0BE", textTransform: "uppercase", marginBottom: 12 }}>📝 Notes du jour</div>
                  <textarea value={note} onChange={e => handleNoteChange(e.target.value)}
                    placeholder="Capture tes idées, blocages, apprentissages…"
                    rows={4}
                    style={{ width: "100%", background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "12px 14px", fontSize: 14, border: "1px solid rgba(255,255,255,0.07)", resize: "none", lineHeight: 1.6 }} />
                </div>
              </div>

              {/* Right */}
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                {/* Focus timer */}
                <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 16, padding: "20px 24px", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ fontSize: 11, letterSpacing: 4, color: "#A4B0BE", textTransform: "uppercase", marginBottom: 14 }}>⏱ Minuteur Focus</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 42, fontWeight: 700, color: focusRunning ? "#6C63FF" : "#E8E8F0", letterSpacing: -1, marginBottom: 14 }}>{focusFormatted}</div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    {[15, 25, 45, 60].map(m => (
                      <button key={m} onClick={() => { setFocusMinutes(m); setFocusLeft(null); }} style={{
                        flex: 1, padding: "7px 0", borderRadius: 8, fontSize: 12, fontWeight: 600,
                        background: focusMinutes === m ? "rgba(108,99,255,0.2)" : "rgba(255,255,255,0.04)",
                        color: focusMinutes === m ? "#6C63FF" : "#A4B0BE",
                        border: `1px solid ${focusMinutes === m ? "#6C63FF40" : "transparent"}`,
                      }}>{m}min</button>
                    ))}
                  </div>
                  <button onClick={focusRunning ? stopFocus : startFocus} style={{
                    width: "100%", padding: "12px", borderRadius: 12, fontSize: 14, fontWeight: 700,
                    background: focusRunning ? "rgba(255,71,87,0.15)" : "#6C63FF",
                    color: focusRunning ? "#FF4757" : "#fff",
                    border: focusRunning ? "1px solid #FF475740" : "none",
                  }}>{focusRunning ? "⏹ Arrêter le focus" : "▶ Démarrer le focus"}</button>
                </div>

                {/* Planning */}
                <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 16, padding: "20px 24px", border: "1px solid rgba(255,255,255,0.05)", flex: 1 }}>
                  <div style={{ fontSize: 11, letterSpacing: 4, color: "#A4B0BE", textTransform: "uppercase", marginBottom: 14 }}>🗓 Planification horaire</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                    {FOCUS_BLOCKS.map((b, i) => (
                      <button key={i} onClick={() => setBlockType(i)} style={{
                        padding: "5px 10px", borderRadius: 7, fontSize: 11, fontWeight: 600,
                        background: blockType === i ? b.color : "rgba(255,255,255,0.04)",
                        color: blockType === i ? "#fff" : "#A4B0BE",
                        border: `1px solid ${blockType === i ? b.color : "transparent"}`,
                      }}>{b.label}</button>
                    ))}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {HOURS.map(h => {
                      const slot = schedule.find(s => s.hour === h);
                      const block = slot !== undefined ? FOCUS_BLOCKS[slot.block_type] : null;
                      return (
                        <div key={h} className="slot-cell" onClick={() => toggleSlot(h)} style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "7px 10px", borderRadius: 8, cursor: "pointer",
                          background: block ? `${block.color}18` : "rgba(255,255,255,0.02)",
                          border: `1px solid ${block ? block.color + "30" : "transparent"}`,
                          transition: "all 0.15s"
                        }}>
                          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#A4B0BE", width: 32, flexShrink: 0 }}>{pad(h)}h</span>
                          {block ? <span style={{ fontSize: 12, fontWeight: 600, color: block.color }}>{block.label}</span>
                            : <span style={{ fontSize: 11, color: "rgba(255,255,255,0.12)" }}>—</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
