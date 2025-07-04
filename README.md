#  AI-Powered Study Planner

An intelligent, personalized study planner that helps students efficiently manage their time, subjects, and deadlines. Built with a **React.js frontend** and **Flask backend**, this planner automatically generates optimal study schedules and integrates with **Google Calendar** for seamless planning.

---

##  Project Structure
```bash
study-planner/
│
├── study_planner/ # Backend (Flask API)
│ └── app.py # Main Flask application
│ └── requirements.txt # Python dependencies
│
├── study_planner_frontend/ # Frontend (React.js)
│ └── src/ # React source files
│ └── package.json # JS dependencies and scripts
│
└── README.md # Project overview (this file)

```
---

##  Features

- 📅 **AI-generated Study Plans** based on:
  - Chapter difficulty
  - User progress
  - Deadlines
  - Available daily study hours

- 🔔 **Notifications** for:
  - Overloaded days
  - Chapter completions

- 📊 **Visual Analytics** with Pie & Bar Charts (Chart.js)

- 🔐 **Google Sign-In Integration** (OAuth 2.0)

- 📆 **Google Calendar Sync** for pushing daily schedules

- 💾 **Auto-save** using LocalStorage

---

## 🛠 Tech Stack

| Layer     | Technology             |
|-----------|------------------------|
| Frontend  | React.js, Chart.js     |
| Backend   | Flask (Python)         |
| OAuth     | Google Identity Services |
| Calendar  | Google Calendar API    |

---

## ⚙️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/study-planner.git
cd study-planner
```
2. Set Up Backend (Flask)
```bash
cd study_planner
python -m venv venv
venv\Scripts\activate      # On Windows
source venv/bin/activate  # On Mac/Linux

pip install -r requirements.txt
python app.py             # Runs backend on http://localhost:5000
```
3. Set Up Frontend (React)
```bash
cd ../study_planner_frontend
npm install
npm start                 # Runs frontend on http://localhost:3000
```
## How It Works

    Add your subjects, total chapters, and deadlines.

    Specify difficulty per chapter.

    The app:

        Calculates optimal schedule.

        Prioritizes tasks.

        Displays progress and schedule.

    Syncs with Google Calendar (optional).

    Tracks chapter completions and re-plans automatically.

 .gitignore Sample
```bash
# Global
node_modules/
.env
__pycache__/
*.pyc

# React
/build

# Python
venv/
instance/

# VS Code
.vscode/
```
#License

This project is open-source and free to use under the MIT License.


