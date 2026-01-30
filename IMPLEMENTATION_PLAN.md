# The 3rd Academy - Implementation Plan

## Current Status: MVP Phase
Last Updated: 2026-01-30

---

## Phase 1: Authentication & Core Setup ✅ COMPLETE

- [x] Supabase project setup
- [x] Email/password authentication
- [x] LinkedIn OAuth integration
- [x] Role-based access control (candidate, mentor, employer, school_admin)
- [x] Protected routes by role
- [x] Auth state persistence
- [x] Profile creation on signup

---

## Phase 2: Database Schema ✅ COMPLETE

### Core Tables
- [x] profiles (user info, role, avatar, onboarding status)
- [x] candidate_profiles (skills, resume, tier, entry_path)
- [x] mentor_profiles (industry, specializations, capacity)
- [x] employer_profiles (company info, verification)

### Credentialing Tables
- [x] skill_passports (verification code, tier, behavioral scores)
- [x] growth_log_entries (activity timeline)
- [x] mentor_assignments (mentor-candidate links)
- [x] mentor_observations (behavioral scoring)
- [x] endorsements (proceed/redirect/pause decisions)

### Training & Projects Tables
- [x] bridgefast_modules (training content)
- [x] bridgefast_progress (completion tracking)
- [x] liveworks_projects (project marketplace)
- [x] liveworks_milestones (project phases)
- [x] liveworks_applications (candidate applications)

### Exchange Tables
- [x] t3x_connections (employer-candidate links)
- [x] employer_feedback (30/60/90 day reviews)
- [x] talentvisa_nominations (premium credential)
- [x] notifications (user alerts)

---

## Phase 3: Candidate Dashboard 🟢 75% COMPLETE

### Overview Page
- [x] Welcome message with user name
- [x] Stats cards (tier, growth log count, mentor loops, days active)
- [x] Journey progress tracker
- [x] Recent activity feed

### Profile Page
- [x] Edit personal info (name, headline, bio, location)
- [x] Avatar upload/delete
- [x] Resume upload/delete
- [x] Skills management (add/remove)
- [x] Profile completion tracking
- [x] Entry path stored on signup

### Growth Log Page
- [x] Timeline view with icons
- [x] Event type filtering visual
- [x] Auto-logging on actions (resume upload)
- [ ] Behavioral trends charts
- [ ] Export functionality

### Skill Passport Page
- [x] Progress display (mentor loops needed)
- [x] Earning requirements explanation
- [x] Basic credential display when earned
- [ ] **QR code verification**
- [ ] **PDF export**
- [ ] **Shareable link generation**
- [ ] **Behavioral dimension breakdown**

### Training (BridgeFast) Page
- [x] Module listing
- [x] Progress tracking (not started/in progress/completed)
- [x] Start module button
- [ ] Actual training content/videos
- [ ] Quiz functionality
- [ ] Completion certificates

### Projects (LiveWorks) Page
- [x] Browse open projects
- [x] Project details display
- [x] Apply button (UI only)
- [ ] Application form modal
- [ ] Track applied projects
- [ ] Project workspace

### Settings Page
- [x] Account info display
- [x] Notification preferences (UI only)
- [x] Delete account (UI only)
- [ ] Working notification toggles
- [ ] Password change functionality

---

## Phase 4: Mentor Dashboard 🟡 45% COMPLETE

### Overview Page
- [x] Stats (active mentees, observations, endorsements)
- [x] Capacity alert
- [x] Quick action buttons
- [ ] Pending observations alert
- [ ] Calendar integration

### My Mentees Page
- [x] Assigned candidates list
- [x] Candidate tier and loop display
- [x] View/Observe buttons
- [ ] Candidate detail modal
- [ ] Assignment history

### Observations Page
- [x] Observations list
- [x] Observation status (locked/draft)
- [ ] **NEW: Record Observation Form** ⬅️ PRIORITY 1
- [ ] Edit draft observations
- [ ] Lock/finalize observations

### Endorsements (NEW PAGE NEEDED)
- [ ] **NEW: Endorsement Form** ⬅️ PRIORITY 2
- [ ] Proceed/Redirect/Pause decision
- [ ] Justification text
- [ ] Redirect recommendations
- [ ] Endorsement history

### Schedule Page
- [x] Availability toggles (UI only)
- [ ] Save availability to database
- [ ] Session scheduling
- [ ] Calendar view

### Profile Page
- [x] Professional info editing
- [x] Specializations management
- [x] Accepting mentees toggle
- [x] Max mentees setting

---

## Phase 5: Employer Dashboard 🟡 55% COMPLETE

### Overview Page
- [x] Stats (connections, hires, projects)
- [x] Verification status
- [x] Quick actions

### T3X Search Page
- [x] Candidate listing
- [x] Tier filtering
- [x] Skills display
- [ ] Advanced filters (location, experience)
- [ ] Save search
- [ ] Connection request button

### Connections Page
- [x] Connection list with status
- [ ] Accept/Decline actions
- [ ] Message candidate
- [ ] Schedule interview

### Projects Page
- [x] Project creation form
- [x] Project listing
- [ ] Edit project
- [ ] Milestone management
- [ ] Candidate selection
- [ ] Project completion flow

### Feedback Page (NEW)
- [ ] 30/60/90 day feedback forms
- [ ] Feedback history
- [ ] Candidate performance rating

### Company Profile
- [x] Company info editing
- [x] Verification status display
- [ ] Logo upload
- [ ] Verification request

---

## Phase 6: Core Workflow Features 🟢 COMPLETE

### PRIORITY 1: Mentor Observation Form
**Status: ✅ COMPLETE**

Requirements:
- [x] Modal/page for recording observations
- [x] Candidate selector (from assigned mentees)
- [x] Session date picker
- [x] Behavioral dimension scoring (8 dimensions, 1-5 scale):
  - [x] Communication
  - [x] Problem Solving
  - [x] Adaptability
  - [x] Collaboration
  - [x] Initiative
  - [x] Time Management
  - [x] Professionalism
  - [x] Learning Agility
- [x] Strengths text field (multi-line)
- [x] Areas for improvement text field
- [x] Additional notes
- [x] Save as draft vs Submit/Lock
- [x] Auto-create growth log entry on submit
- [x] Increment mentor_loops count on 3rd observation

### PRIORITY 2: Endorsement Workflow
**Status: ✅ COMPLETE**

Requirements:
- [x] Endorsement form after 3 observations
- [x] Decision selector: Proceed / Redirect / Pause
- [x] Justification text (required)
- [x] If Redirect: select BridgeFast module or LiveWorks
- [x] Submit endorsement
- [x] Auto-update candidate tier based on decision
- [x] Auto-create growth log entry
- [x] Trigger Skill Passport generation on "Proceed"
- [x] Notification to candidate

### PRIORITY 3: Skill Passport Generation
**Status: ✅ COMPLETE**

Requirements:
- [x] Generate passport after "Proceed" endorsement
- [x] Unique verification code
- [x] Aggregate behavioral scores from observations
- [x] Store in skill_passports table
- [x] Update candidate_profiles.has_skill_passport
- [x] Display passport with:
  - [x] Candidate name and photo
  - [x] Readiness tier
  - [x] Behavioral dimension scores (bar chart visualization)
  - [x] Average behavioral score
  - [ ] QR code for verification (placeholder - needs QR library)
  - [x] Issue date and expiry
- [x] Shareable public link (copy to clipboard)
- [ ] PDF export (future enhancement)
- [ ] Verification page for employers (future enhancement)

---

## Phase 7: Additional Features (Future)

### TalentVisa System
- [ ] Mentor nomination form
- [ ] Committee review interface
- [ ] Rarity controls (max 5% of candidates)
- [ ] Premium badge display

### Civic Access Lab (Schools)
- [ ] School admin dashboard
- [ ] Student cohort management
- [ ] Teacher observation interface
- [ ] School analytics

### Admin Panel
- [ ] User management
- [ ] Platform analytics
- [ ] Content moderation
- [ ] System configuration

### Notifications System
- [ ] Email notifications
- [ ] In-app notification center
- [ ] Notification preferences

### Messaging System
- [ ] Direct messaging
- [ ] Message threads
- [ ] File attachments

---

## SQL Migrations Created

- [x] 002_actual_schema.sql - Base schema
- [x] 003_fix_rls_policies.sql - RLS policies
- [x] 004_fix_skills_and_rls.sql - Skills saving fix
- [x] 005_avatars_storage.sql - Avatar storage bucket
- [x] 006_add_entry_path.sql - Entry path column

---

## Current Sprint: Core Credentialing Loop ✅ COMPLETE

### Goals:
1. ✅ Fix journey completion checks
2. ✅ Build Mentor Observation Form
3. ✅ Build Endorsement Workflow
4. ✅ Build Skill Passport Generation

### Success Criteria:
- Mentor can record behavioral observations for candidates
- Mentor can issue Proceed/Redirect/Pause endorsement
- Candidate receives Skill Passport after "Proceed"
- Skill Passport displays with verification

---

## File Locations

```
src/
├── pages/
│   ├── dashboard/
│   │   ├── CandidateDashboard.tsx (1690 lines)
│   │   ├── MentorDashboard.tsx (needs observation form)
│   │   └── EmployerDashboard.tsx
│   ├── GetStarted.tsx (signup with entry path)
│   └── [public pages]
├── contexts/
│   └── AuthContext.tsx
├── lib/
│   └── supabase.ts
├── types/
│   └── database.types.ts
└── components/
    └── ui/ (shadcn components)
```

---

## Notes

- All dashboards use nested Routes for sub-pages
- Supabase RLS policies need to be run manually
- Storage buckets (resumes, avatars) created via SQL
- Entry path selection functional in signup flow
