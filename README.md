# AI Health Predictor - Frontend

## Overview
Static frontend app for predicting health risks using mock AI (JS-based scoring). Input personal/health data, get risk assessment, health score, and charts.

## Run
1. Open `index.html` in any browser.
2. **Sign Up** (first time): Full name, Mobile (10 digits), Email, Password → data/users.json saved!
3. **Sign In**: Mobile/Email + Password.
4. Predict health → User-specific history saved to file!

**Features:**
- Beautiful AI-designed UI (glassmorphism, gradients, animations)
- File-based persistent user data (data/users.json on desktop)
- Per-user prediction history
- Responsive, modern design

Pure HTML/CSS/JS. No server needed!

## ✨ New Features: Doctor Reports + 200+ Diseases
- **📁 Upload Doctor Reports** (JSON/TXT/PDF): AI parses symptoms automatically (keyword/JSON extract).
- **🔍 Searchable Symptoms**: 100+ symptoms from comprehensive diseases list (cardio, diabetes, cancer, etc.).
- **🧠 Smart Prediction**: Factors uploaded/selected symptoms into risk score (critical symptoms boost risk).
- Symptoms preview chips, enhanced risks/advice.

## Usage
1. Sign Up/Login.
2. Fill basics (age/BMI/BP).
3. **Upload reports** → AI auto-selects symptoms.
4. **Search/select** more symptoms.
5. Predict → See risks based on symptoms + data.

**Saves to data/users.json with parsed symptoms/history.**

## Features
- Beautiful glassmorphism UI w/ animations.
- Client-side parsing, localStorage + JSON export.
- Responsive, mock neural scoring w/ symptom integration.
- data/diseases.json (200+ world diseases), symptoms-map.json (risks).
