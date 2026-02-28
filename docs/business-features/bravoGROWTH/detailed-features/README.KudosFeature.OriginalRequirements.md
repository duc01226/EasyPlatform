# BUSINESS REQUIREMENTS DOCUMENT: ORIENT KUDOS

---

## 1. Project Overview
* [cite_start]**Project Name:** Orient Kudos - Peer to Peer Employee Recognition System [cite: 3]
* [cite_start]**Client:** Orient Software Development Corporation [cite: 4]
* [cite_start]**Document Version:** V1.0.0 [cite: 7]
* [cite_start]**Date:** 12/12/2025 [cite: 8]
* [cite_start]**Approach:** Agile [cite: 5]
* [cite_start]**Platform:** bravo SUITE [cite: 1, 9]

---

## 2. System Overview
[cite_start]Orient Kudos is an internal recognition platform designed to encourage positive feedback and collaboration by allowing employees to send "kudos" (cookies) to teammates[cite: 21, 23, 24].

**Core Objectives:**
* [cite_start]Track peer-to-peer kudos sent and received[cite: 25].
* [cite_start]Promote company values via tagged recognitions[cite: 26].
* [cite_start]Provide transparency through analytics and leaderboards[cite: 27].
* [cite_start]Enable employees to manage their recognition preferences and privacy[cite: 28].



---

## 3. User Roles & Permissions
| Role                   | Permissions                                                                                                    |
| :--------------------- | :------------------------------------------------------------------------------------------------------------- |
| **Employee (Default)** | [cite_start]Send/receive kudos, view history, view feed, view leaderboard, adjust settings[cite: 30].          |
| **Admin (PnC)**        | [cite_start]Manage system configuration, quotas, tags, and organizational structure; view analytics[cite: 30]. |

---

## 4. Main Features Roadmap
### MVP Phase
1.  [cite_start]**Home Feed:** Social-style feed for latest kudos[cite: 34].
2.  [cite_start]**Send Kudos Modal:** Interface for giving cookies[cite: 35].
3.  [cite_start]**My History:** Personal log of sent and received kudos[cite: 36].
4.  [cite_start]**Leaderboard:** Competitive rankings[cite: 37].
5.  [cite_start]**Reporting:** Basic data exports[cite: 38].
6.  [cite_start]**Notifications:** Activity alerts[cite: 43].
7.  [cite_start]**MS Teams Integration:** Embedded app module[cite: 44].

### Phase 2
* [cite_start]Analytics & Dashboards[cite: 46].
* [cite_start]User Settings[cite: 47].
* [cite_start]Enhanced UI/UX for Admins and Employees on Bravo[cite: 48, 49].

---

## 5. Functional Requirements

### 5.1 Home Feed (HF)
* [cite_start]**HF-01:** Display kudos in reverse chronological order (newest first)[cite: 87].
* [cite_start]**HF-02:** Posts must include sender/receiver info, quantity, message, tags, and timestamp[cite: 88].
* [cite_start]**HF-05:** Users cannot edit or delete kudos posts[cite: 92].
* [cite_start]**HF-08:** Sidebar must display Weekly Quota, Trending Tags, and Weekly Winner[cite: 96].
* [cite_start]**HF-10:** Weekly Winner card shows the top recipient/giver of the week[cite: 99].

### 5.2 Send Kudos (SK)
* [cite_start]**SK-01:** User must choose exactly one recipient from the directory[cite: 120].
* [cite_start]**SK-02:** Selection of 1-3 cookies via a quantity slider[cite: 121].
* [cite_start]**SK-03:** System must validate and enforce the weekly quota[cite: 123].
* [cite_start]**SK-07:** Upon sending, the system must update the record, quota, feed, and leaderboard[cite: 131].
* [cite_start]**SK-09:** Users are restricted from sending kudos to themselves[cite: 134].

### 5.3 My History (MH)
* [cite_start]**MH-01:** Provides two distinct views: **Received** and **Sent**[cite: 156].
* [cite_start]**MH-05:** Search bar for filtering by message content or employee name[cite: 161].
* [cite_start]**MH-06:** Displays aggregate totals of cookies received and sent[cite: 162].
* [cite_start]**MH-09:** Items in the history cannot be edited or deleted by the user[cite: 165].

### 5.4 Leaderboard & Reporting (LB/RP)
* [cite_start]**LB-01:** Support for filtering data by time periods (all time, current, past)[cite: 190, 178].
* [cite_start]**LB-03:** Top 3 performers displayed in a podium layout[cite: 192].
* [cite_start]**RP-04:** Multi-filter logic (Employee + Department + Time) for results[cite: 216].
* [cite_start]**RP-05:** Authorized users can export leaderboard data to Excel[cite: 202, 217].

---

## 6. Integrations & Technical Requirements
### Microsoft Teams (MT)
* [cite_start]**MT-02:** User authentication via Microsoft SSO (Azure AD)[cite: 253].
* [cite_start]**MT-05:** Fully functional "Send Kudos" modal within the Teams environment[cite: 259].
* [cite_start]**MT-09:** Responsive UI that adjusts to Teams window sizing[cite: 265].

### Notifications (NT)
* [cite_start]**NT-01:** Generate in-app notifications on both Bravo and MS Teams upon receiving kudos[cite: 228].
* [cite_start]**NT-03:** Teams alerts must deep-link to the Orient Kudos Teams app[cite: 232].
* [cite_start]**NT-07:** Fallback to Bravo in-app notifications if Teams delivery fails[cite: 244].

---

## 7. Cross-Feature Constraints
* [cite_start]**Weekly Quota:** Default is 5 cookies per week, resetting every week[cite: 268, 269].
* [cite_start]**Tags:** (Optional for MVP) Used for trending analytics; multiple tags can be selected[cite: 271, 277, 278].
* [cite_start]**Security:** Only authenticated users can access the system; kudos messages are internal only[cite: 282, 283].

---

## 8. Appendix - Wireframes
1.  [cite_start]**Home Feed:** Main social view[cite: 286].
2.  [cite_start]**Send Kudos Modal:** Pop-up interface[cite: 294].
3.  [cite_start]**History:** User's personal activity log[cite: 295].
4.  [cite_start]**Leaderboard:** Organizational rankings[cite: 298].
