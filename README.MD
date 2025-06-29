# 🚀 Data Alchemist: AI-Powered Resource Allocation Configurator

Welcome to **Data Alchemist**, a full-stack, AI-driven resource allocation configurator built with **Next.js**, **TypeScript**, **TailwindCSS**, and **OpenAI GPT-4o**. With a strong emphasis on product thinking, real-world AI integration, and user-centric design.

---

## 🌟 Live Demo

👉 [Click here to try the live app](https://your-deployment-link.com)

---

## 💡 Problem Statement

Managing messy spreadsheets across clients, workers, and tasks can be overwhelming—especially for non-technical users. Data Alchemist solves this by:

* Automatically cleaning and validating uploaded data
* Letting users edit data inline with immediate feedback
* Enabling business rule creation using natural language
* Providing intelligent AI recommendations and corrections
* Offering flexible prioritization controls
* Exporting validated data + rule configurations for downstream use

---

## ✅ Core Features Completed

### 📥 Data Ingestion & Grid UI

* Upload CSV/XLSX files for **clients**, **workers**, and **tasks**
* Smart AI-powered **header correction** (even for shuffled/misnamed headers)
* Intuitive, editable data grid with inline error highlights

### ✔️ Data Validation

* Comprehensive real-time validations on upload/edit
* Visual indicators + summary panel for all errors
* Covers over **10+ validations**:

  * Missing required fields
  * Malformed lists/JSON
  * Out-of-range values
  * Duplicate IDs
  * Broken references (e.g. unknown task IDs)
  * Circular co-run dependencies
  * Skill mismatches
  * Overloaded workers / saturated phases

### 🔎 Natural Language Data Retrieval

* Use plain English to filter and search your data
* Examples:

  * "Tasks with duration > 2 and include phase 3"
  * "Clients requesting T001 and T002"

### 🧠 AI Assistant *(In Progress)*

* Create rules by typing them in natural language
* Uses OpenAI GPT-4o via `ai` SDK
* Context-aware rule generation based on uploaded data
* Working currently on full rule integration pipeline

### 🧾 Rule Creation UI

* Co-run, Load-limit, Phase-window, Pattern-match, Precedence override, etc.
* All rules stored and downloadable as a clean `rules.json`

### ⚖️ Prioritization Interface

* Drag & Drop and slider-based weight configuration
* Choose what's more important: fairness, speed, cost, etc.
* Preset templates for quick preference setups

### 📤 Export Functionality

* Cleaned and validated CSV files for each entity
* Rules bundled into `rules.json`
* All ready for downstream resource allocation engines

---

## 🧠 AI Capabilities Summary

* AI header correction on data upload
* Natural language search
* AI rule parsing *(work-in-progress, 90% complete)*
* Auto-suggestions for rules and fixes *(stretch goals underway)*

---

## 🛠️ Tech Stack

| Tech                     | Description                                               |
| ------------------------ | --------------------------------------------------------- |
| **Next.js**              | App framework with `app/` directory and server components |
| **TypeScript**           | Type-safe development for reliability                     |
| **TailwindCSS + ShadCN** | Beautiful UI components and design system                 |
| **React Table**          | Fast editable data grids                                  |
| **Zod**                  | Schema validation                                         |
| **PapaParse / SheetJS**  | CSV/XLSX parsing                                          |
| **OpenAI GPT-4o**        | Natural language understanding + rule generation          |

---

## 📁 Folder Structure

```
/components          → Reusable UI components (Cards, Tabs, Table etc.)
/lib                 → AI engine, validators, utils, types
/app                 → Next.js app routes, layouts
/samples             → Example .csv and .xlsx files
/public              → Assets & icons
```

---

## 📦 Samples Included

* `samples/clients.csv`
* `samples/workers.csv`
* `samples/tasks.csv`
* `rules.json` output sample

---

## 🎯 Milestone Coverage

| Milestone                           | Status          |
| ----------------------------------- | --------------- |
| **Data Ingestion**                  | ✅ Completed     |
| **Inline Editing + Validation**     | ✅ Completed     |
| **Natural Language Retrieval**      | ✅ Completed     |
| **Rule Input UI**                   | ✅ Completed     |
| **Natural Language Rule Creation**  | 🔄 90% Done     |
| **Prioritization Controls**         | ✅ Completed     |
| **Export Functionality**            | ✅ Completed     |
| **Stretch Goals (AI Fixes, Recos)** | 🚧 Work ongoing |

---

## 🙌 Built By

**Gourav Pandey**
👨‍💻 B.Tech 2025 | Full Stack Developer | AI Enthusiast

> "Let the AI do the heavy lifting, so users don’t have to wrestle with spreadsheets."

---

## 🤝 Let’s Connect

* LinkedIn: [Connect with Me](https://linkedin.com/in/gouravpandey009)
* Mail: [gouravpandey009@gmail.com](mailto:pandeygourav09@gmail.com)

---

## 📌 Notes for Recruiters

This project was built with care, innovation, and an AI-first mindset. Every UX and feature was tailored for non-technical users—ensuring clarity, automation, and power in the same workflow. Most AI features are already live, and the remaining ones are nearly complete and being tested.

Your feedback or questions are most welcome!

---
