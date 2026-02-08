# RoboCore Interface

Local web interface for controlling the Robot Arm, designed to run on the secondary Windows 10 controller unit.

<p align="center">
  <img src="./images/desktop.png" alt="Desktop Interface" height="300" /> <img src="./images/mobile.png" alt="Mobile Interface" height="300" />
</p>


## Features
- **Virtual Network Interface**: Simulates connection to the robot controller via PoE.
- **AI Camera Feed**: Visualizes the "AI action correction" with bounding boxes and status indicators.
- **Robot Telemetry**: Real-time display of Cartesian coordinates and Joint angles.
- **System Logs**: Tracks connection events and AI interventions.

## Setup & Run

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run locally (Dev mode):
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## Technology Stack
- **Vite**
- **Vue 3** (Composition API, Script Setup)
- **TypeScript**
- **SCSS**
