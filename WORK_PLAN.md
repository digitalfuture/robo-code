# RoboCore Interface - Work Plan

## Current Status
- **Project Initialized**: Vite + Vue 3 + TypeScript.
- **Basic Layout**: `App.vue` implements a dashboard grid with Header, Camera View, Status Panel, and Footer.
- **Components Created**:
  - `CameraFeed.vue`: Main visualizer.
  - `RobotStatus.vue`: Telemetry display.
  - `ConsoleLog.vue`: System logger.
  - `ControlPanel.vue`: Input controls.

## Vision
A premium, sci-fi inspired interface ("RoboCore v2.0") for controlling an industrial robot arm. Focus on "Rich Aesthetics", dark mode, glassmorphism, and responsive interactivity.

---

## Phase 1: Visual Polish & Component Logic (Completed)
- [x] **Design System**: Refined Scifi/Cyberpunk palette.
- [x] **CameraFeed**: Implemented HUD, AI Bounding Boxes, and Static Noise effects.
- [x] **RobotStatus**: Implemented Radial Gauges and Matrix layout.
- [x] **ControlPanel**: Added Emergency Stop, Mode Switching, and Jog Controls.

## Phase 2: State Management & Integration (In Progress)
- [x] **Service Layer**: Created `robotState.ts` with RobotState interface.
- [x] **Backend Bridge**: Created Node.js Modbus TCP Proxy (`/server`).
- [x] **Blind Protocol Implementation**: Implemented default ESTUN register mapping (Placeholders).
- [ ] **Validation**: Test with real hardware (Pending access).

## Phase 3: Functionality & Localization (Current Priority)
- [ ] **Russian Localization**: Translate all UI elements to Russian (per "CN-RU translation").
- [ ] **Feature Completeness**:
  - Add "Servo Enable/Disable".
  - Add "Alarm Reset".
  - Add "Return to Home".
  - Ensure Coordinate Systems (Base/Tool/User) are selectable.
- [ ] **Data Mapping**: Finalize Modbus register addresses from manual.

---

**Next Immediate Step**: Review and enhance `ControlPanel.vue` and `RobotStatus.vue` for visual flair and interactivity.
