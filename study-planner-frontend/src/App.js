import React, { useState, useEffect } from "react";
import { Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { useGoogleLogin } from "@react-oauth/google";
import axios from "axios";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const COLORS = [
  "#ffd6d6", "#d6e5ff", "#d6ffd6", "#fff4d6", "#e5d6ff", "#ffd6f2",
  "#f9d6ff", "#d6fff8", "#ffe6cc", "#d6fff4", "#f7ffd6", "#ffd6cc"
];

function App() {
  const [subjects, setSubjects] = useState([]);
  const [progress, setProgress] = useState({});
  const [deadlines, setDeadlines] = useState({});
  const [difficulties, setDifficulties] = useState({});
  const [dailyHours, setDailyHours] = useState(4);
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState(null);
  const [accessToken, setAccessToken] = useState(null);

  // ✅ New Login Hook
  const login = useGoogleLogin({
    scope: "https://www.googleapis.com/auth/calendar.events",
    onSuccess: (tokenResponse) => {
      setAccessToken(tokenResponse.access_token);
      console.log("✅ Logged in successfully");
    },
    onError: () => alert("❌ Google Sign-in failed"),
  });

  // 🔔 Notification permission
  useEffect(() => {
    if (Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }, []);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("study-planner-data");
    if (saved) {
      const data = JSON.parse(saved);
      setSubjects(data.subjects || [{ name: "", chapters: "" }]);
      setProgress(data.progress || {});
      setDeadlines(data.deadlines || {});
      setDifficulties(data.difficulties || {});
      setDailyHours(data.dailyHours || 4);
    } else {
      setSubjects([{ name: "", chapters: "" }]);
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    const data = { subjects, progress, deadlines, difficulties, dailyHours };
    localStorage.setItem("study-planner-data", JSON.stringify(data));
  }, [subjects, progress, deadlines, difficulties, dailyHours]);

  const updateSubject = (index, field, value) => {
    const newSubjects = [...subjects];
    newSubjects[index][field] = value;
    setSubjects(newSubjects);
  };

  const addSubject = () => {
    setSubjects([...subjects, { name: "", chapters: "" }]);
  };

  const updateProgress = (subject, value) => {
    setProgress({ ...progress, [subject]: Number(value) });
  };

  const updateDeadline = (subject, value) => {
    setDeadlines({ ...deadlines, [subject]: value });
  };

  const updateDifficulties = (subject, value) => {
    const values = value.split(",").map((v) => parseFloat(v.trim()) || 1);
    setDifficulties({ ...difficulties, [subject]: values });
  };

  const getColor = (subject) => {
    const index = subjects.findIndex((s) => s.name === subject);
    return COLORS[index % COLORS.length];
  };

  const getPlan = async () => {
    setError(null);
    const syllabus = {};
    for (let sub of subjects) {
      if (sub.name && sub.chapters) {
        syllabus[sub.name] = { chapters: Number(sub.chapters) };
      }
    }
    if (Object.keys(syllabus).length === 0) {
      setError("Please add at least one subject.");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          syllabus,
          progress,
          deadlines,
          difficulties,
          daily_hours: dailyHours,
        }),
      });
      if (!res.ok) throw new Error("Network response was not ok");

      const data = await res.json();
      setPlan(data);

      Object.entries(data.daily_schedule).forEach(([date, tasks]) => {
        const totalHours = tasks.reduce((sum, t) => sum + t.hours, 0);
        if (totalHours > dailyHours && Notification.permission === "granted") {
          new Notification("📌 Overloaded Day!", {
            body: `${date} has ${totalHours}h of study!`,
          });
        }
      });
    } catch (err) {
      setError("Failed to fetch plan: " + err.message);
    }
  };

  const markChapterDone = (subject) => {
    const current = progress[subject] || 0;
    const total = subjects.find((s) => s.name === subject)?.chapters || 0;

    if (current + 1 >= total) {
      setSubjects((prev) => prev.filter((s) => s.name !== subject));
      const { [subject]: _, ...newProgress } = progress;
      setProgress(newProgress);
      const { [subject]: __, ...newDeadlines } = deadlines;
      setDeadlines(newDeadlines);
      const { [subject]: ___, ...newDiff } = difficulties;
      setDifficulties(newDiff);
    } else {
      setProgress({ ...progress, [subject]: current + 1 });
    }

    if (Notification.permission === "granted") {
      new Notification("✅ Chapter Completed", {
        body: `You completed a chapter of ${subject}`,
        icon: "https://img.icons8.com/color/48/book.png",
      });
    }

    setTimeout(() => getPlan(), 100);
  };

  const clearAll = () => {
    setSubjects([{ name: "", chapters: "" }]);
    setProgress({});
    setDeadlines({});
    setDifficulties({});
    setDailyHours(4);
    setPlan(null);
    localStorage.removeItem("study-planner-data");
  };

  const exportToCalendar = async () => {
    if (!plan || !accessToken) return alert("🔐 Please sign in and generate a plan first!");

    for (const [date, tasks] of Object.entries(plan.daily_schedule)) {
      for (const task of tasks) {
        const event = {
          summary: `${task.subject} - Chapter ${task.chapter}`,
          start: { date, timeZone: "Asia/Kolkata" },
          end: { date, timeZone: "Asia/Kolkata" },
        };

        try {
          await axios.post(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events",
            event,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
            }
          );
        } catch (err) {
          console.error("❌ Event insert failed", err);
        }
      }
    }

    alert("📅 Events pushed to Google Calendar!");
  };

  const getPieBarData = () => {
    if (!plan) return null;
    const labels = plan.tasks.map((t) => t.subject);
    const completed = plan.tasks.map((t) => t.done_chapters);
    const remaining = plan.tasks.map((t) => t.remaining_chapters);
    return { labels, completed, remaining };
  };

  const pieBar = getPieBarData();

  return (
    <div style={{ maxWidth: 900, margin: "auto", padding: 20, fontFamily: "Arial" }}>
      <h1>📘 Personalized Study Planner</h1>

      {subjects.map((sub, idx) => (
        <div key={idx} style={{
          marginBottom: 15,
          backgroundColor: getColor(sub.name),
          padding: 10,
          borderRadius: 10,
        }}>
          <input
            type="text"
            placeholder="Subject Name"
            value={sub.name}
            onChange={(e) => updateSubject(idx, "name", e.target.value)}
            style={{ marginRight: 10, width: 150 }}
          />
          <input
            type="number"
            placeholder="Total Chapters"
            value={sub.chapters}
            onChange={(e) => updateSubject(idx, "chapters", e.target.value)}
            style={{ marginRight: 10, width: 130 }}
          />
          <input
            type="number"
            placeholder="Completed"
            value={progress[sub.name] || ""}
            onChange={(e) => updateProgress(sub.name, e.target.value)}
            style={{ marginRight: 10, width: 130 }}
          />
          <input
            type="date"
            value={deadlines[sub.name] || ""}
            onChange={(e) => updateDeadline(sub.name, e.target.value)}
            style={{ marginBottom: 5, width: 170 }}
          />
          <br />
          <input
            type="text"
            placeholder="Difficulties (e.g. 1,1.5)"
            value={(difficulties[sub.name] || []).join(",")}
            onChange={(e) => updateDifficulties(sub.name, e.target.value)}
            style={{ width: 450, marginTop: 5 }}
          />
        </div>
      ))}

      <button onClick={addSubject}>+ Add Subject</button>
      <br /><br />
      <label>
        Daily Study Hours:{" "}
        <input
          type="number"
          value={dailyHours}
          onChange={(e) => setDailyHours(Number(e.target.value))}
          min={1}
          max={24}
        />
      </label>

      <div style={{ marginTop: 20 }}>
        <button onClick={getPlan}>📅 Generate Study Plan</button>
        <button onClick={clearAll} style={{ marginLeft: 10 }}>❌ Clear All</button>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {plan && (
        <>
          <h2>📌 Prioritized Study Tasks</h2>
          <table border="1" cellPadding="10" style={{ width: "100%", marginBottom: 30 }}>
            <thead>
              <tr>
                <th>Subject</th><th>Done</th><th>Remain</th><th>Deadline</th>
                <th>Days Left</th><th>Priority</th><th>Progress</th><th>✔</th>
              </tr>
            </thead>
            <tbody>
              {plan.tasks.map((task) => {
                const ratio = task.done_chapters / task.total_chapters;
                return (
                  <tr key={task.subject} style={{ backgroundColor: getColor(task.subject) }}>
                    <td>{task.subject}</td>
                    <td>{task.done_chapters}</td>
                    <td>{task.remaining_chapters}</td>
                    <td>{task.deadline}</td>
                    <td>{task.days_left}</td>
                    <td>{task.priority}</td>
                    <td>
                      <div style={{ background: "#ccc", width: 100, height: 10 }}>
                        <div style={{ background: "#4caf50", width: `${ratio * 100}%`, height: 10 }}></div>
                      </div>
                    </td>
                    <td><button onClick={() => markChapterDone(task.subject)}>+1</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <h2>📅 Calendar View</h2>
          <div style={{ display: "grid", gap: "10px", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))" }}>
            {Object.entries(plan.daily_schedule).map(([date, tasks]) => (
              <div key={date} style={{ border: "1px solid #aaa", borderRadius: 8, padding: 10 }}>
                <strong>{date}</strong>
                <ul>
                  {tasks.map((task, idx) => (
                    <li key={idx} style={{ backgroundColor: getColor(task.subject), padding: 5, borderRadius: 5, marginBottom: 4 }}>
                      <b>{task.subject}</b> - Chapter {task.chapter} ({task.hours}hr)
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <h2>📊 Visualization</h2>
          <Pie
            data={{
              labels: pieBar.labels,
              datasets: [{ data: pieBar.completed.map((c, i) => c + pieBar.remaining[i]), backgroundColor: COLORS }],
            }}
          />
          <Bar
            data={{
              labels: pieBar.labels,
              datasets: [
                { label: "Completed", data: pieBar.completed, backgroundColor: "#4caf50" },
                { label: "Remaining", data: pieBar.remaining, backgroundColor: "#f44336" },
              ],
            }}
          />

          <div style={{ marginTop: 20 }}>
            <button onClick={login}>🔐 Sign In</button>
            <button onClick={exportToCalendar} style={{ margin: "0 10px" }}>📆 Export to Google Calendar</button>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
