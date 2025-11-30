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

**ICT Club Hub** is a next-generation web application designed to modernize high school ICT clubs. It serves as a central operating system for student members and patrons, blending club management with gamified learning and AI-powered assistance.

It features a **Kanban-style project board**, an **in-browser Python IDE**, **AI-generated learning roadmaps**, and **real-time chat**, all wrapped in a beautiful, dark-mode-enabled UI.

---

## 🚨 Troubleshooting & Schema Fixes

If you encounter errors like **"column rooms.participant_ids does not exist"**, **"Showcase table missing"**, or **"Uncaught TypeError: reading 'length'"**, run the following SQL commands in your Supabase SQL Editor immediately.

### 1. Fix Missing Columns (Chat & Projects)
```sql
-- Fix Rooms Table (Add missing participant_ids)
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS participant_ids TEXT[] DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_rooms_participant_ids ON rooms USING GIN(participant_ids);

-- Fix Project Assignments (Add grading columns)
ALTER TABLE project_task_assignees
ADD COLUMN IF NOT EXISTS submission_file_path TEXT,
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS grade INTEGER;
```

### 2. Create Missing Showcase Table
```sql
CREATE TABLE IF NOT EXISTS showcase (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_uid TEXT NOT NULL REFERENCES users(uid),
  title TEXT NOT NULL,
  description TEXT,
  code_content TEXT,
  likes TEXT[] DEFAULT '{}', -- Array of User UIDs who liked it
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```

### 3. Create Missing Challenge Tables
```sql
CREATE TABLE IF NOT EXISTS challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  deadline TIMESTAMP WITH TIME ZONE,
  created_by TEXT REFERENCES users(uid),
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS challenge_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  user_uid TEXT REFERENCES users(uid),
  content TEXT,
  status TEXT DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```

### 4. Add Resource Thumbnails (Optional but Recommended)
To enable thumbnails for uploaded documents and code files, add the `thumbnail_url` column to your resources table.

```sql
ALTER TABLE resources ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
```

Also, ensure your storage policies for the `resource_uploads` bucket allow `image/svg+xml` content types. The provided policies are generally permissive and should work.


---

## ✨ Key Features

### 🤖 AI-Powered Learning (Gemini Integration)
The app leverages Google's Gemini models to act as a 24/7 mentor.
*   **AI Tutor:** A floating chat assistant that answers coding questions and knows the club schedule.
*   **Auto-Grader:** Submits project code to AI for instant feedback (1-5 stars) and code review.
*   **Dynamic Roadmaps:** Generates personalized learning paths (Beginner -> Advanced) based on any topic.
*   **Smart Quizzes:** Generates milestone quizzes on the fly to test knowledge.

### 💻 Code Playground
A full-featured Python environment running directly in the browser using **Pyodide**.
*   Write, run, and debug Python code instantly.
*   **Cloud Save:** Save scripts to your profile.
*   **Share:** Publish snippets to the club Showcase or send via Chat.

### 📅 Club Management
*   **Activities:** Calendar and List views for events with RSVP tracking.
*   **Attendance:** Digital logbook with visualization charts.
*   **Projects:** Trello-like board for managing club projects, assigning tasks, and tracking file submissions.

### 🏆 Gamification
*   **Leaderboards:** Earn badges for completing challenges.
*   **Showcase:** Share code and get likes from peers.
*   **Ranks:** Progress from Member to Patron based on contributions.

---

## 🛠️ Installation & Setup

### 1. Prerequisites
*   Node.js (v16 or higher)
*   npm or yarn
*   A Supabase Project
*   A Google Cloud Project (for Gemini API)

### 2. Clone the Repository
```bash
git clone https://github.com/your-username/ict-club-hub.git
cd ict-club-hub
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Environment Variables
Create a `.env` file in the root directory. You **must** set the Gemini API Key. The Supabase credentials are currently hardcoded in `src/services/supabaseClient.ts` for demo purposes, but should ideally be here too.

```env
# Required for AI Features
VITE_API_KEY=your_google_gemini_api_key
```

### 5. Run the App
```bash
npm run dev
```

---

## 🗄️ Full Database Schema

Run these if setting up from scratch.

### 1. Essential Tables
```sql
-- 1. Roadmaps Table
CREATE TABLE IF NOT EXISTS roadmaps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  skill_level TEXT NOT NULL,
  topic TEXT NOT NULL,
  content JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(skill_level)
);

-- 2. User Progress Table
CREATE TABLE IF NOT EXISTS user_roadmap_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(uid), -- Links to existing users table
  roadmap_id UUID NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  completed_milestone_indices INTEGER[] DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, roadmap_id)
);
```

### 2. Storage Buckets & Policies
Enables file uploads for Resources, Chat, and Assignments.
```sql
-- Create Buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('resource_uploads', 'resource_uploads', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('resource_files', 'resource_files', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('chat_files', 'chat_files', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('user_scripts', 'user_scripts', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('feed_images', 'feed_images', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('chat_uploads', 'chat_uploads', true) ON CONFLICT (id) DO NOTHING;

-- Policies (Simplified for Demo)
CREATE POLICY "Allow Authenticated Uploads" ON storage.objects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow Public Select" ON storage.objects FOR SELECT TO public USING (true);
CREATE POLICY "Allow Owners Delete" ON storage.objects FOR DELETE TO authenticated USING (auth.uid() = owner);
```

---

<div align="center">
  <p>Made with ❤️ by the ICT Club Naggalama Team</p>
</div>