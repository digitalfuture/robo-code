# RoboCore Interface

Local web interface for controlling the Robot Arm, designed to run on the secondary Windows 10 controller unit.

<div align="center">
  <table>
    <tr>
      <td><img src="./images/desktop.png" height="300" /></td>
      <td><img src="./images/mobile.png" height="300" /></td>
    </tr>
  </table>
</div>


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
