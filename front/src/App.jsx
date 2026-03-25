import { useState, useEffect, useRef } from "react";

const API = "https://dashboard.bo-kl.com/api";

const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAYS_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const HOURS = Array.from({ length: 13 }, (_, i) => i + 8);

const PRIORITY_CONFIG = {
  haute:   { label: "High",   color: "#FF4757", bg: "rgba(255,71,87,0.12)" },
  moyenne: { label: "Medium", color: "#FFA502", bg: "rgba(255,165,2,0.12)" },
  basse:   { label: "Low",    color: "#2ED573", bg: "rgba(46,213,115,0.12)" },
};

const TSHIRT_SIZES = ["S", "M", "L", "XL"];
const TSHIRT_COLORS = { S: "#2ED573", M: "#FFA502", L: "#FF6B81", XL: "#FF4757" };

const FOCUS_BLOCKS = [
  { label: "Focus Block", color: "#6C63FF" },
  { label: "Meeting",     color: "#FF4757" },
  { label: "Creative",    color: "#FFA502" },
  { label: "Admin",       color: "#2ED573" },
  { label: "Break",       color: "#A4B0BE" },
];

// ── Date helpers ────────────────────────────────────

function pad(n) { return String(n).padStart(2, "0"); }

function toDateStr(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getDayIndex(date) {
  const d = date.getDay();
  return d === 0 ? 6 : d - 1;
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay() === 0 ? 6 : d.getDay() - 1;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function daysInMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

// ── API helper ──────────────────────────────────────

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

// ── Sub-components ──────────────────────────────────

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

function TagInput({ tags, onChange }) {
  const [input, setInput] = useState("");
  function addTag() {
    const t = input.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setInput("");
  }
  function removeTag(tag) { onChange(tags.filter(t => t !== tag)); }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
      {tags.map(tag => (
        <span key={tag} style={{ background: "rgba(108,99,255,0.15)", color: "#6C63FF", borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
          #{tag}
          <span onClick={() => removeTag(tag)} style={{ cursor: "pointer", opacity: 0.6, fontSize: 10 }}>✕</span>
        </span>
      ))}
      <input value={input} onChange={e => setInput(e.target.value)}
        onKeyDown={e => (e.key === "Enter" || e.key === ",") && addTag()}
        placeholder="Add tag…"
        style={{ background: "transparent", border: "none", outline: "none", color: "#E8E8F0", fontSize: 12, width: 80 }} />
    </div>
  );
}

function CarryOverPicker({ enabled, onChange, mode, onModeChange, value, onValueChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, color: enabled ? "#6C63FF" : "#A4B0BE" }}>
        <div onClick={() => onChange(!enabled)} style={{
          width: 16, height: 16, borderRadius: 4, border: `2px solid ${enabled ? "#6C63FF" : "#A4B0BE"}`,
          background: enabled ? "#6C63FF" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10
        }}>{enabled ? "✓" : ""}</div>
        Carry over
      </label>
      {enabled && (
        <>
          <div style={{ display: "flex", gap: 4 }}>
            {["days", "date"].map(m => (
              <button key={m} onClick={() => onModeChange(m)} style={{
                padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                background: mode === m ? "rgba(108,99,255,0.2)" : "rgba(255,255,255,0.04)",
                color: mode === m ? "#6C63FF" : "#A4B0BE",
                border: `1px solid ${mode === m ? "#6C63FF40" : "transparent"}`,
              }}>{m === "days" ? "N days" : "Until date"}</button>
            ))}
          </div>
          {mode === "days" ? (
            <input type="number" min={1} max={30} value={value || 1}
              onChange={e => onValueChange(e.target.value)}
              style={{ width: 50, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "3px 8px", fontSize: 12, color: "#E8E8F0", textAlign: "center" }} />
          ) : (
            <input type="date" value={value || ""}
              onChange={e => onValueChange(e.target.value)}
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "3px 8px", fontSize: 12, color: "#E8E8F0" }} />
          )}
        </>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────

export default function Dashboard() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [selectedDate, setSelectedDate] = useState(today);
  const [calView, setCalView] = useState("week"); // "week" | "month"
  const [weekStart, setWeekStart] = useState(startOfWeek(today));
  const [monthDate, setMonthDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const [tasks, setTasks] = useState([]);
  const [objective, setObjective] = useState("");
  const [editObj, setEditObj] = useState(false);
  const [objInput, setObjInput] = useState("");
  const [note, setNote] = useState("");
  const [schedule, setSchedule] = useState([]);
  const [backlog, setBacklog] = useState([]);
  const [loading, setLoading] = useState(true);

  // New task form
  const [newTask, setNewTask] = useState("");
  const [newPriority, setNewPriority] = useState("moyenne");
  const [newSize, setNewSize] = useState(null);
  const [newTags, setNewTags] = useState([]);
  const [newCarryOver, setNewCarryOver] = useState(false);
  const [newCarryMode, setNewCarryMode] = useState("days");
  const [newCarryValue, setNewCarryValue] = useState(1);

  // Backlog form
  const [newBacklogText, setNewBacklogText] = useState("");
  const [newBacklogPriority, setNewBacklogPriority] = useState("moyenne");
  const [newBacklogSize, setNewBacklogSize] = useState(null);
  const [newBacklogTags, setNewBacklogTags] = useState([]);

  // UI state
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [focusMode, setFocusMode] = useState(false);
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [focusLeft, setFocusLeft] = useState(null);
  const [focusRunning, setFocusRunning] = useState(false);
  const [blockType, setBlockType] = useState(0);
  const [saving, setSaving] = useState(false);

  const timerRef = useRef(null);
  const noteTimer = useRef(null);

  const dayIndex = getDayIndex(selectedDate);
  const dateStr = toDateStr(selectedDate);

  // Load data when selected date changes
  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetch(`/tasks/${dayIndex}/${dateStr}`),
      apiFetch(`/objectives/${dayIndex}`),
      apiFetch(`/notes/${dayIndex}`),
      apiFetch(`/schedule/${dayIndex}`),
      apiFetch(`/backlog`),
    ]).then(([t, o, n, s, b]) => {
      setTasks(t);
      setObjective(o.text || "");
      setNote(n.content || "");
      setSchedule(s);
      setBacklog(b);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [dateStr]);

  // Focus timer
  useEffect(() => {
    if (focusRunning && focusLeft > 0) {
      timerRef.current = setTimeout(() => setFocusLeft(f => f - 1), 1000);
    } else if (focusRunning && focusLeft === 0) {
      setFocusRunning(false);
    }
    return () => clearTimeout(timerRef.current);
  }, [focusRunning, focusLeft]);

  function startFocus() { setFocusLeft(focusMinutes * 60); setFocusRunning(true); setFocusMode(true); }
  function stopFocus() { setFocusRunning(false); setFocusLeft(null); setFocusMode(false); }

  // Compute carry_over_until date
  function computeCarryUntil() {
    if (!newCarryOver) return null;
    if (newCarryMode === "date") return newCarryValue || null;
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + parseInt(newCarryValue || 1));
    return toDateStr(d);
  }

  async function addTask() {
    if (!newTask.trim()) return;
    setSaving(true);
    try {
      const task = await apiFetch("/tasks", {
        method: "POST",
        body: JSON.stringify({
          day_index: dayIndex,
          text: newTask.trim(),
          priority: newPriority,
          position: tasks.length,
          tshirt_size: newSize,
          tags: newTags,
          carry_over: newCarryOver,
          carry_over_until: computeCarryUntil(),
        }),
      });
      setTasks(t => [...t, task]);
      setNewTask(""); setNewTags([]); setNewSize(null); setNewCarryOver(false); setNewCarryValue(1);
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  async function toggleTask(id, done) {
    const task = tasks.find(t => t.id === id);
    setTasks(t => t.map(tk => tk.id === id ? { ...tk, done: !tk.done } : tk));
    try {
      await apiFetch(`/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ done: !done, position: task.position, tshirt_size: task.tshirt_size, tags: task.tags, carry_over: task.carry_over, carry_over_until: task.carry_over_until }),
      });
    } catch (e) { console.error(e); }
  }

  async function deleteTask(id) {
    setTasks(t => t.filter(tk => tk.id !== id));
    try { await apiFetch(`/tasks/${id}`, { method: "DELETE" }); }
    catch (e) { console.error(e); }
  }

  async function saveObjective() {
    setObjective(objInput); setEditObj(false);
    try {
      await apiFetch("/objectives", { method: "POST", body: JSON.stringify({ day_index: dayIndex, text: objInput }) });
    } catch (e) { console.error(e); }
  }

  function handleNoteChange(val) {
    setNote(val);
    clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(async () => {
      try { await apiFetch("/notes", { method: "POST", body: JSON.stringify({ day_index: dayIndex, content: val }) }); }
      catch (e) { console.error(e); }
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
    setTasks(list); setDragging(null); setDragOver(null);
    try {
      await Promise.all(list.map((t, i) =>
        apiFetch(`/tasks/${t.id}`, { method: "PATCH", body: JSON.stringify({ done: t.done, position: i, tshirt_size: t.tshirt_size, tags: t.tags, carry_over: t.carry_over, carry_over_until: t.carry_over_until }) })
      ));
    } catch (e) { console.error(e); }
  }

  async function toggleSlot(hour) {
    const existing = schedule.find(s => s.hour === hour);
    if (existing) {
      setSchedule(s => s.filter(sl => sl.hour !== hour));
      try { await apiFetch(`/schedule/${dayIndex}/${hour}`, { method: "DELETE" }); }
      catch (e) { console.error(e); }
    } else {
      const newSlot = { day_index: dayIndex, hour, block_type: blockType };
      setSchedule(s => [...s, newSlot]);
      try { await apiFetch("/schedule", { method: "POST", body: JSON.stringify(newSlot) }); }
      catch (e) { console.error(e); }
    }
  }

  async function addBacklog() {
    if (!newBacklogText.trim()) return;
    try {
      const item = await apiFetch("/backlog", {
        method: "POST",
        body: JSON.stringify({ text: newBacklogText.trim(), priority: newBacklogPriority, tshirt_size: newBacklogSize, tags: newBacklogTags }),
      });
      setBacklog(b => [item, ...b]);
      setNewBacklogText(""); setNewBacklogTags([]); setNewBacklogSize(null);
    } catch (e) { console.error(e); }
  }

  async function scheduleFromBacklog(id) {
    try {
      const task = await apiFetch(`/backlog/${id}/schedule`, {
        method: "POST",
        body: JSON.stringify({ day_index: dayIndex, position: tasks.length }),
      });
      setBacklog(b => b.filter(item => item.id !== id));
      setTasks(t => [...t, task]);
    } catch (e) { console.error(e); }
  }

  async function deleteBacklog(id) {
    setBacklog(b => b.filter(item => item.id !== id));
    try { await apiFetch(`/backlog/${id}`, { method: "DELETE" }); }
    catch (e) { console.error(e); }
  }

  const done = tasks.filter(t => t.done).length;
  const total = tasks.length;
  const highTasks = tasks.filter(t => t.priority === "haute" && !t.done);
  const focusFormatted = focusLeft !== null
    ? `${pad(Math.floor(focusLeft / 60))}:${pad(focusLeft % 60)}`
    : `${pad(focusMinutes)}:00`;

  // ── Week navigation ─────────────────────────────

  function WeekNav() {
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={() => setWeekStart(d => addDays(d, -7))} style={navBtn}>‹</button>
        <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 6 }}>
          {days.map((d, i) => {
            const isSelected = sameDay(d, selectedDate);
            const isToday = sameDay(d, today);
            return (
              <button key={i} className="day-btn" onClick={() => { setSelectedDate(d); setWeekStart(startOfWeek(d)); }} style={{
                padding: "9px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                background: isSelected ? "#6C63FF" : "transparent",
                color: isSelected ? "#fff" : isToday ? "#6C63FF" : "#A4B0BE",
                border: isToday && !isSelected ? "1px solid rgba(108,99,255,0.3)" : "1px solid transparent",
                transition: "all 0.18s", minWidth: 52, textAlign: "center"
              }}>
                <div style={{ fontSize: 10, marginBottom: 2 }}>{DAYS_SHORT[i]}</div>
                <div>{d.getDate()}</div>
              </button>
            );
          })}
        </div>
        <button onClick={() => setWeekStart(d => addDays(d, 7))} style={navBtn}>›</button>
        <span style={{ fontSize: 12, color: "#A4B0BE", marginLeft: 4 }}>
          {MONTHS[weekStart.getMonth()]} {weekStart.getFullYear()}
        </span>
      </div>
    );
  }

  function MonthNav() {
    const firstDay = startOfMonth(monthDate);
    const totalDays = daysInMonth(monthDate);
    const startOffset = getDayIndex(firstDay);
    const cells = Array.from({ length: startOffset + totalDays }, (_, i) => {
      if (i < startOffset) return null;
      return new Date(monthDate.getFullYear(), monthDate.getMonth(), i - startOffset + 1);
    });

    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <button onClick={() => setMonthDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} style={navBtn}>‹</button>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#E8E8F0" }}>{MONTHS[monthDate.getMonth()]} {monthDate.getFullYear()}</span>
          <button onClick={() => setMonthDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} style={navBtn}>›</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
          {DAYS_SHORT.map(d => <div key={d} style={{ textAlign: "center", fontSize: 10, color: "#A4B0BE", padding: "4px 0" }}>{d}</div>)}
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const isSelected = sameDay(d, selectedDate);
            const isToday = sameDay(d, today);
            return (
              <button key={i} onClick={() => { setSelectedDate(d); setWeekStart(startOfWeek(d)); setMonthDate(new Date(d.getFullYear(), d.getMonth(), 1)); }} style={{
                padding: "6px 0", borderRadius: 8, fontSize: 12, fontWeight: isToday ? 700 : 400,
                background: isSelected ? "#6C63FF" : "transparent",
                color: isSelected ? "#fff" : isToday ? "#6C63FF" : "#E8E8F0",
                border: isToday && !isSelected ? "1px solid rgba(108,99,255,0.3)" : "1px solid transparent",
                transition: "all 0.15s", cursor: "pointer"
              }}>{d.getDate()}</button>
            );
          })}
        </div>
      </div>
    );
  }

  const navBtn = {
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
    color: "#A4B0BE", borderRadius: 8, width: 28, height: 28, fontSize: 16,
    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer"
  };

  // ── Task card ───────────────────────────────────

  function TaskCard({ task, isCarryOver = false }) {
    const pCfg = PRIORITY_CONFIG[task.priority];
    return (
      <div className="task-row"
        draggable onDragStart={() => handleDragStart(task.id)}
        onDragOver={e => handleDragOver(e, task.id)}
        onDrop={() => handleDrop(task.id)}
        style={{
          padding: "12px 14px", borderRadius: 12,
          background: dragOver === task.id ? "rgba(108,99,255,0.1)" : isCarryOver ? "rgba(255,255,255,0.02)" : pCfg.bg,
          border: `1px solid ${isCarryOver ? "rgba(255,255,255,0.08)" : pCfg.color + "30"}`,
          opacity: task.done ? 0.45 : 1,
          transition: "all 0.15s", cursor: "grab"
        }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div onClick={() => toggleTask(task.id, task.done)} style={{
            width: 20, height: 20, borderRadius: 6, flexShrink: 0, cursor: "pointer",
            background: task.done ? pCfg.color : "transparent",
            border: `2px solid ${pCfg.color}`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11
          }}>{task.done ? "✓" : ""}</div>
          <span style={{ flex: 1, fontSize: 14, textDecoration: task.done ? "line-through" : "none" }}>{task.text}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {isCarryOver && <span style={{ fontSize: 10, color: "#A4B0BE", background: "rgba(255,255,255,0.06)", borderRadius: 5, padding: "2px 6px" }}>↩ carry</span>}
            {task.tshirt_size && (
              <span style={{ fontSize: 10, fontWeight: 700, color: TSHIRT_COLORS[task.tshirt_size], background: `${TSHIRT_COLORS[task.tshirt_size]}18`, borderRadius: 5, padding: "2px 7px" }}>{task.tshirt_size}</span>
            )}
            <span style={{ fontSize: 10, letterSpacing: 1, color: pCfg.color, textTransform: "uppercase", fontWeight: 700, background: pCfg.bg, padding: "3px 8px", borderRadius: 6 }}>{pCfg.label}</span>
            <button className="del-btn" onClick={() => deleteTask(task.id)} style={{ opacity: 0, fontSize: 14, color: "#A4B0BE", background: "transparent", transition: "opacity 0.15s", border: "none", cursor: "pointer" }}>✕</button>
          </div>
        </div>
        {task.tags && task.tags.length > 0 && (
          <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
            {task.tags.map(tag => (
              <span key={tag} style={{ fontSize: 10, color: "#6C63FF", background: "rgba(108,99,255,0.1)", borderRadius: 5, padding: "2px 7px" }}>#{tag}</span>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Render ──────────────────────────────────────

  return (
    <div style={{
      minHeight: "100vh", background: "#0D0F14",
      fontFamily: "'Syne', 'DM Sans', sans-serif", color: "#E8E8F0",
      backgroundImage: "radial-gradient(ellipse at 20% 50%, rgba(108,99,255,0.07) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(255,71,87,0.05) 0%, transparent 50%)",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&family=DM+Mono&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        input, textarea, select { outline: none; border: none; background: transparent; color: inherit; font-family: inherit; }
        button { cursor: pointer; border: none; font-family: inherit; background: transparent; }
        .task-row:hover .del-btn { opacity: 1 !important; }
        .slot-cell:hover { background: rgba(108,99,255,0.18) !important; }
        .day-btn:hover { background: rgba(255,255,255,0.06) !important; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.5); }
      `}</style>

      {/* Focus overlay */}
      {focusMode && (
        <div onClick={stopFocus} style={{
          position: "fixed", inset: 0, zIndex: 100, background: "rgba(10,10,18,0.97)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer"
        }}>
          <div style={{ fontSize: 11, letterSpacing: 6, color: "#6C63FF", textTransform: "uppercase", marginBottom: 24 }}>Focus Mode</div>
          <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: -2, color: focusLeft === 0 ? "#2ED573" : "#E8E8F0", fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>
            {focusLeft === 0 ? "✓ Done" : focusFormatted}
          </div>
          {objective && <div style={{ marginTop: 32, color: "#A4B0BE", fontSize: 16, maxWidth: 400, textAlign: "center" }}>🎯 {objective}</div>}
          {highTasks.length > 0 && <div style={{ marginTop: 20, color: "#FF4757", fontSize: 13 }}>⚡ {highTasks[0].text}</div>}
          <div style={{ marginTop: 48, fontSize: 12, color: "rgba(255,255,255,0.2)", letterSpacing: 2 }}>CLICK TO EXIT</div>
        </div>
      )}

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 5, color: "#6C63FF", textTransform: "uppercase", marginBottom: 6 }}>Productivity Dashboard</div>
            <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1, lineHeight: 1 }}>
              {DAYS_FULL[getDayIndex(selectedDate)]}, {MONTHS[selectedDate.getMonth()]} {selectedDate.getDate()}
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {saving && <span style={{ fontSize: 11, color: "#A4B0BE", letterSpacing: 2 }}>Saving…</span>}
            <Clock />
            <button onClick={focusRunning ? stopFocus : startFocus} style={{
              background: focusRunning ? "rgba(255,71,87,0.15)" : "rgba(108,99,255,0.15)",
              border: `1px solid ${focusRunning ? "#FF4757" : "#6C63FF"}`,
              color: focusRunning ? "#FF4757" : "#6C63FF",
              borderRadius: 10, padding: "8px 18px", fontSize: 13, fontWeight: 600,
            }}>{focusRunning ? "⏹ Stop" : "⏱ Focus"}</button>
          </div>
        </div>

        {/* Calendar navigation */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            {["week", "month"].map(v => (
              <button key={v} onClick={() => setCalView(v)} style={{
                padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: calView === v ? "rgba(108,99,255,0.2)" : "rgba(255,255,255,0.04)",
                color: calView === v ? "#6C63FF" : "#A4B0BE",
                border: `1px solid ${calView === v ? "#6C63FF40" : "transparent"}`,
              }}>{v.charAt(0).toUpperCase() + v.slice(1)}</button>
            ))}
            <button onClick={() => { setSelectedDate(today); setWeekStart(startOfWeek(today)); setMonthDate(new Date(today.getFullYear(), today.getMonth(), 1)); }} style={{
              padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: "rgba(255,255,255,0.04)", color: "#A4B0BE", border: "1px solid transparent",
            }}>Today</button>
          </div>
          {calView === "week" ? <WeekNav /> : <MonthNav />}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#A4B0BE", fontSize: 14, letterSpacing: 2 }}>Loading…</div>
        ) : (
          <>
            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
              {[
                { label: "Tasks completed", value: done, max: total || 1, color: "#2ED573", display: `${done}/${total}` },
                { label: "High priority remaining", value: highTasks.length, max: Math.max(total, 1), color: "#FF4757", display: String(highTasks.length) },
                { label: "Scheduled blocks", value: schedule.length, max: 13, color: "#6C63FF", display: String(schedule.length) },
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

              {/* Left column */}
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                {/* Objective */}
                <div style={{ background: "rgba(108,99,255,0.08)", borderRadius: 16, padding: "20px 24px", border: "1px solid rgba(108,99,255,0.2)" }}>
                  <div style={{ fontSize: 11, letterSpacing: 4, color: "#6C63FF", textTransform: "uppercase", marginBottom: 12 }}>🎯 Daily Objective</div>
                  {editObj ? (
                    <div style={{ display: "flex", gap: 10 }}>
                      <input value={objInput} onChange={e => setObjInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && saveObjective()}
                        placeholder="What's your main goal today?"
                        style={{ flex: 1, background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "10px 14px", fontSize: 14, border: "1px solid rgba(108,99,255,0.3)" }} autoFocus />
                      <button onClick={saveObjective} style={{ background: "#6C63FF", color: "#fff", borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 600 }}>OK</button>
                    </div>
                  ) : (
                    <div onClick={() => { setObjInput(objective); setEditObj(true); }} style={{ cursor: "pointer", fontSize: 16, fontWeight: 600, color: objective ? "#E8E8F0" : "rgba(255,255,255,0.25)", minHeight: 26 }}>
                      {objective || "Click to set an objective…"}
                    </div>
                  )}
                </div>

                {/* Tasks */}
                <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 16, padding: "20px 24px", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ fontSize: 11, letterSpacing: 4, color: "#A4B0BE", textTransform: "uppercase", marginBottom: 16 }}>Tasks</div>

                  {/* Add task form */}
                  <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 12, padding: "14px", marginBottom: 16, border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                      <input value={newTask} onChange={e => setNewTask(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && addTask()}
                        placeholder="New task…"
                        style={{ flex: 1, background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "10px 14px", fontSize: 14, border: "1px solid rgba(255,255,255,0.07)" }} />
                      <select value={newPriority} onChange={e => setNewPriority(e.target.value)}
                        style={{ background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "10px 12px", fontSize: 13, color: PRIORITY_CONFIG[newPriority].color, border: `1px solid ${PRIORITY_CONFIG[newPriority].color}40`, cursor: "pointer" }}>
                        {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k} style={{ background: "#1A1C24", color: v.color }}>{v.label}</option>)}
                      </select>
                      <button onClick={addTask} style={{ background: "#6C63FF", color: "#fff", borderRadius: 10, padding: "10px 16px", fontSize: 18, fontWeight: 700 }}>+</button>
                    </div>

                    {/* T-shirt size */}
                    <div style={{ display: "flex", gap: 6, marginBottom: 10, alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "#A4B0BE", marginRight: 4 }}>Size:</span>
                      {TSHIRT_SIZES.map(s => (
                        <button key={s} onClick={() => setNewSize(newSize === s ? null : s)} style={{
                          padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                          background: newSize === s ? `${TSHIRT_COLORS[s]}20` : "rgba(255,255,255,0.04)",
                          color: newSize === s ? TSHIRT_COLORS[s] : "#A4B0BE",
                          border: `1px solid ${newSize === s ? TSHIRT_COLORS[s] + "50" : "transparent"}`,
                        }}>{s}</button>
                      ))}
                    </div>

                    {/* Tags */}
                    <div style={{ marginBottom: 10 }}>
                      <TagInput tags={newTags} onChange={setNewTags} />
                    </div>

                    {/* Carry over */}
                    <CarryOverPicker
                      enabled={newCarryOver} onChange={setNewCarryOver}
                      mode={newCarryMode} onModeChange={setNewCarryMode}
                      value={newCarryValue} onValueChange={setNewCarryValue}
                    />
                  </div>

                  {/* Task list */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {tasks.length === 0 && (
                      <div style={{ color: "rgba(255,255,255,0.18)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No tasks — free day!</div>
                    )}
                    {tasks.map(task => (
                      <TaskCard key={task.id} task={task} isCarryOver={task.day_index !== dayIndex} />
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 16, padding: "20px 24px", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ fontSize: 11, letterSpacing: 4, color: "#A4B0BE", textTransform: "uppercase", marginBottom: 12 }}>📝 Daily Notes</div>
                  <textarea value={note} onChange={e => handleNoteChange(e.target.value)}
                    placeholder="Capture ideas, blockers, learnings…"
                    rows={4}
                    style={{ width: "100%", background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "12px 14px", fontSize: 14, border: "1px solid rgba(255,255,255,0.07)", resize: "none", lineHeight: 1.6 }} />
                </div>
              </div>

              {/* Right column */}
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                {/* Focus timer */}
                <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 16, padding: "20px 24px", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ fontSize: 11, letterSpacing: 4, color: "#A4B0BE", textTransform: "uppercase", marginBottom: 14 }}>⏱ Focus Timer</div>
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
                  }}>{focusRunning ? "⏹ Stop focus" : "▶ Start focus"}</button>
                </div>

                {/* Schedule */}
                <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 16, padding: "20px 24px", border: "1px solid rgba(255,255,255,0.05)", flex: 1 }}>
                  <div style={{ fontSize: 11, letterSpacing: 4, color: "#A4B0BE", textTransform: "uppercase", marginBottom: 14 }}>🗓 Schedule</div>
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
                          display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: 8, cursor: "pointer",
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

            {/* Backlog */}
            <div style={{ marginTop: 28, background: "rgba(255,255,255,0.02)", borderRadius: 16, padding: "24px", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ fontSize: 11, letterSpacing: 4, color: "#A4B0BE", textTransform: "uppercase", marginBottom: 18 }}>📋 Backlog</div>

              {/* Add backlog item */}
              <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 12, padding: "14px", marginBottom: 18, border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <input value={newBacklogText} onChange={e => setNewBacklogText(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addBacklog()}
                    placeholder="Add to backlog…"
                    style={{ flex: 1, background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "10px 14px", fontSize: 14, border: "1px solid rgba(255,255,255,0.07)" }} />
                  <select value={newBacklogPriority} onChange={e => setNewBacklogPriority(e.target.value)}
                    style={{ background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "10px 12px", fontSize: 13, color: PRIORITY_CONFIG[newBacklogPriority].color, border: `1px solid ${PRIORITY_CONFIG[newBacklogPriority].color}40`, cursor: "pointer" }}>
                    {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k} style={{ background: "#1A1C24", color: v.color }}>{v.label}</option>)}
                  </select>
                  <button onClick={addBacklog} style={{ background: "#6C63FF", color: "#fff", borderRadius: 10, padding: "10px 16px", fontSize: 18, fontWeight: 700 }}>+</button>
                </div>
                <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "#A4B0BE", marginRight: 4 }}>Size:</span>
                  {TSHIRT_SIZES.map(s => (
                    <button key={s} onClick={() => setNewBacklogSize(newBacklogSize === s ? null : s)} style={{
                      padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                      background: newBacklogSize === s ? `${TSHIRT_COLORS[s]}20` : "rgba(255,255,255,0.04)",
                      color: newBacklogSize === s ? TSHIRT_COLORS[s] : "#A4B0BE",
                      border: `1px solid ${newBacklogSize === s ? TSHIRT_COLORS[s] + "50" : "transparent"}`,
                    }}>{s}</button>
                  ))}
                </div>
                <TagInput tags={newBacklogTags} onChange={setNewBacklogTags} />
              </div>

              {/* Backlog list */}
              {backlog.length === 0 ? (
                <div style={{ color: "rgba(255,255,255,0.18)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>Backlog is empty</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
                  {backlog.map(item => {
                    const pCfg = PRIORITY_CONFIG[item.priority];
                    return (
                      <div key={item.id} style={{ background: pCfg.bg, borderRadius: 12, padding: "12px 14px", border: `1px solid ${pCfg.color}30` }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                          <span style={{ flex: 1, fontSize: 13 }}>{item.text}</span>
                          <div style={{ display: "flex", gap: 4 }}>
                            {item.tshirt_size && (
                              <span style={{ fontSize: 10, fontWeight: 700, color: TSHIRT_COLORS[item.tshirt_size], background: `${TSHIRT_COLORS[item.tshirt_size]}18`, borderRadius: 5, padding: "2px 7px" }}>{item.tshirt_size}</span>
                            )}
                            <span style={{ fontSize: 10, color: pCfg.color, fontWeight: 700, background: pCfg.bg, padding: "2px 7px", borderRadius: 5 }}>{pCfg.label}</span>
                          </div>
                        </div>
                        {item.tags && item.tags.length > 0 && (
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                            {item.tags.map(tag => (
                              <span key={tag} style={{ fontSize: 10, color: "#6C63FF", background: "rgba(108,99,255,0.1)", borderRadius: 5, padding: "2px 7px" }}>#{tag}</span>
                            ))}
                          </div>
                        )}
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => scheduleFromBacklog(item.id)} style={{
                            flex: 1, padding: "6px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                            background: "rgba(108,99,255,0.15)", color: "#6C63FF", border: "1px solid rgba(108,99,255,0.2)"
                          }}>→ Schedule today</button>
                          <button onClick={() => deleteBacklog(item.id)} style={{
                            padding: "6px 10px", borderRadius: 8, fontSize: 11,
                            background: "rgba(255,255,255,0.04)", color: "#A4B0BE", border: "1px solid transparent"
                          }}>✕</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}