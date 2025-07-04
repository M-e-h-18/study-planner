from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)

def calculate_priority(remaining, days_left):
    if days_left <= 0:
        return remaining * 10
    return remaining / days_left

def generate_daily_schedule(subjects_data, user_daily_hours):
    today = datetime.today().date()
    subjects_plan = {}

    for subj, data in subjects_data.items():
        deadline_date = datetime.strptime(data["deadline"], "%Y-%m-%d").date()
        days_left = max((deadline_date - today).days, 1)

        completed = data.get("completed", 0)
        total_chapters = data["chapters"]
        difficulty = data.get("difficulty", [1] * total_chapters)

        # Pad difficulty if shorter than chapters
        if len(difficulty) < total_chapters:
            difficulty += [1] * (total_chapters - len(difficulty))

        remaining_chapters = total_chapters - completed
        weighted_remaining = sum(difficulty[completed:total_chapters])

        subjects_plan[subj] = {
            "remaining": remaining_chapters,
            "weighted_remaining": weighted_remaining,
            "difficulty": difficulty[completed:total_chapters],
            "days_left": days_left,
            "completed": completed,
            "total_chapters": total_chapters,
        }

    # Limit to 30 days max
    max_deadline = max(datetime.strptime(data["deadline"], "%Y-%m-%d").date() for data in subjects_data.values())
    total_days = min((max_deadline - today).days + 1, 30)

    daily_hours_left = {today + timedelta(days=i): user_daily_hours for i in range(total_days)}
    schedule = {today + timedelta(days=i): [] for i in range(total_days)}

    for subj, plan in subjects_plan.items():
        chapter_indices = list(range(plan["completed"], plan["total_chapters"]))
        for chap_idx in chapter_indices:
            relative_idx = chap_idx - plan["completed"]
            chap_difficulty = plan["difficulty"][relative_idx] if relative_idx < len(plan["difficulty"]) else 1
            hours_needed = chap_difficulty

            assigned = False
            for day in sorted(daily_hours_left.keys()):
                if daily_hours_left[day] >= hours_needed:
                    schedule[day].append({
                        "subject": subj,
                        "chapter": chap_idx + 1,
                        "hours": hours_needed
                    })
                    daily_hours_left[day] -= hours_needed
                    assigned = True
                    break

            if not assigned:
                max_day = sorted(daily_hours_left.keys())[-1]
                schedule[max_day].append({
                    "subject": subj,
                    "chapter": chap_idx + 1,
                    "hours": hours_needed
                })
                daily_hours_left[max_day] -= hours_needed

    formatted_schedule = {}
    for day, tasks in schedule.items():
        formatted_schedule[day.strftime("%Y-%m-%d")] = tasks

    return formatted_schedule

@app.route("/api/plan", methods=["POST"])
def generate_plan():
    data = request.json
    syllabus = data.get("syllabus", {})
    progress = data.get("progress", {})
    deadlines = data.get("deadlines", {})
    difficulties = data.get("difficulties", {})
    user_daily_hours = data.get("daily_hours", 4)

    today = datetime.today().date()
    tasks = []
    subjects_data = {}

    # Handle merging subjects with same name
    for subject, details in syllabus.items():
        name = subject.strip()
        chapters = details.get("chapters", 0)
        done = progress.get(name, 0)
        deadline = deadlines.get(name) or (today + timedelta(days=30)).strftime("%Y-%m-%d")
        diffs = difficulties.get(name, [1] * chapters)

        if name not in subjects_data:
            subjects_data[name] = {
                "chapters": chapters,
                "completed": done,
                "deadline": deadline,
                "difficulty": diffs,
            }
        else:
            # merge chapters & difficulties
            subjects_data[name]["chapters"] += chapters
            subjects_data[name]["completed"] += done
            subjects_data[name]["difficulty"] += diffs

    for subject, data in subjects_data.items():
        total = data["chapters"]
        completed = data["completed"]
        remaining = total - completed
        deadline = datetime.strptime(data["deadline"], "%Y-%m-%d").date()
        days_left = (deadline - today).days

        if remaining <= 0:
            continue

        # pad difficulty if short
        if len(data["difficulty"]) < total:
            data["difficulty"] += [1] * (total - len(data["difficulty"]))

        priority = calculate_priority(remaining, days_left)
        tasks.append({
            "subject": subject,
            "total_chapters": total,
            "done_chapters": completed,
            "remaining_chapters": remaining,
            "deadline": deadline.strftime("%Y-%m-%d"),
            "days_left": days_left,
            "priority": round(priority, 2)
        })

    tasks.sort(key=lambda x: x["priority"], reverse=True)
    daily_schedule = generate_daily_schedule(subjects_data, user_daily_hours)

    return jsonify({
        "tasks": tasks,
        "daily_schedule": daily_schedule
    })

if __name__ == "__main__":
    app.run(debug=True)
