# 🚀 ICT Club Hub (Naggalama)

![Banner](https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=EC4899,8B5CF6,6366f1&height=250&section=header&text=ICT%20Club%20Hub&fontSize=80&fontColor=ffffff&desc=Connect.%20Code.%20Create.&descSize=20&fontAlignY=40)

<div align="center">

[![React](https://img.shields.io/badge/React-18.2-blue?logo=react&style=for-the-badge)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript&style=for-the-badge)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.0-38bdf8?logo=tailwindcss&style=for-the-badge)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ecf8e?logo=supabase&style=for-the-badge)](https://supabase.com/)
[![Gemini AI](https://img.shields.io/badge/Gemini-AI-8E75B2?logo=googlebard&style=for-the-badge)](https://deepmind.google/technologies/gemini/)

</div>

---

## 📖 Overview

**ICT Club Hub** is a next-generation "Operating System" designed specifically for high school ICT clubs. It centralizes club management, gamified learning, and AI-powered mentorship into a single, sleek platform.

Built with **React, TypeScript, and Supabase**, the hub empowers students to learn programming through structured roadmaps, real-time collaboration, and hands-on coding challenges.

---

## ✨ Core Features

### 🤖 AI-Powered Mentorship (Gemini 2.0/2.5)
The platform integrates advanced AI to provide 24/7 guidance:
*   **AI Tutor:** A context-aware assistant that answers coding questions and provides club information.
*   **Smart Roadmaps:** Generates personalized learning paths (Beginner to Advanced) for any tech topic.
*   **Milestone Quizzes:** Dynamically generates quizzes to test knowledge after completing roadmap milestones.
*   **AI Challenge Generator:** Patrons can describe concepts, and the AI crafts creative, scenario-based coding challenges tailored to different skill levels.
*   **Instant Code Feedback:** AI analyzes challenge submissions to provide constructive reviews and 5-star ratings.

### 💻 Advanced Python IDE (Code Playground)
A robust coding environment running directly in the browser using **Pyodide**.
*   **Zero Setup:** Run Python code instantly without installing anything.
*   **AI Hints:** Get smart suggestions for your code. The AI can even **apply suggested edits** directly to your script with one click.
*   **Cloud Persistence:** Save and manage your scripts in the cloud.
*   **Showcase Integration:** Publish your best scripts to the community showcase.

### 📅 Club Management & Collaboration
*   **Kanban Projects:** Manage club projects with a Trello-style board, task assignments, and progress tracking.
*   **Real-time Chat:** Communicate with club members in public rooms or private threads, with support for file and code sharing.
*   **Digital Attendance:** Track and visualize club attendance with automated charts and logs.
*   **Resources Hub:** Centralized storage for learning materials, documentation, and useful links.

### 🏆 Gamification & Growth
*   **Leaderboard:** Climb the ranks by earning badges through coding challenges and contributions.
*   **Club Showcase:** A social feed for members to share projects, get likes, and inspire others.
*   **Role-Based Access:** Distinct features for **Members** (Learners) and **Patrons** (Admins/Teachers).

---

## 🛠️ Getting Started

### 1. Prerequisites
*   Node.js (v18 or higher recommended)
*   A Supabase project for the backend.
*   A Google Gemini API Key for AI features.

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/your-username/ict-club-hub.git

# Install dependencies
npm install
```

### 3. Configuration
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_KEY=your_google_gemini_api_key
```

### 4. Database Setup
The complete database schema including RLS policies can be found in `db_schema.sql`. Run these commands in your Supabase SQL Editor to set up the required tables and storage buckets.

### 5. Run Development Server
```bash
npm run dev
```

---

## 🏗️ Tech Stack
*   **Frontend:** React 18, Vite, Tailwind CSS, Lucide Icons, Headless UI.
*   **Backend:** Supabase (Auth, Postgres, Real-time, Storage).
*   **AI:** Google Gemini API (Flash/Pro).
*   **Runtime:** Pyodide (for in-browser Python execution).
*   **Deployment:** Vercel / Netlify.

---

## 🤝 Help & Support

If you encounter issues during setup (e.g., missing database columns), please refer to the `db_schema.sql` file for the most up-to-date table definitions. 

For feature requests or bug reports, please contact the **ICT Club Naggalama Team**.

---

<div align="center">
  <p>Made with ❤️ by the ICT Club Naggalama Team</p>
  <p>© 2026 ICT Club Hub</p>
</div>
