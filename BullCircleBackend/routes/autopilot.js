// routes/autopilot.js
import express from 'express';
import { PythonShell } from 'python-shell';
import { getAlphaHistory } from '../lib/alphaHistory.js';
import path from 'path';

const router = express.Router();
let autopilotProcess = null;

// Start autopilot: send config to Python ML model
router.post('/start', async (req, res) => {
  try {
    const { intervalMins, targetAmt, floorAmt } = req.body;
    if (!intervalMins) {
      return res.status(400).json({ error: 'intervalMins is required' });
    }

    // If a process is already running, reject
    if (autopilotProcess) {
      return res.status(409).json({ error: 'Autopilot already running' });
    }

    // Spawn Python ML script as long-running process
    const script = path.join(process.cwd(), 'ml_model', 'autopilot_loop.py');
    autopilotProcess = new PythonShell(script, {
      mode: 'json',
      pythonOptions: ['-u'],
      args: [intervalMins, targetAmt, floorAmt]
    });

    autopilotProcess.on('message', msg => {
      console.log('[Autopilot]', msg);
    });
    autopilotProcess.on('error', err => {
      console.error('[Autopilot error]', err);
    });
    autopilotProcess.on('close', () => {
      console.log('[Autopilot] process closed');
      autopilotProcess = null;
    });

    res.json({ started: true });
  } catch (err) {
    console.error('[Autopilot start error]', err);
    res.status(500).json({ error: err.message });
  }
});

// Stop autopilot
router.post('/stop', (req, res) => {
  try {
    if (!autopilotProcess) {
      return res.status(409).json({ error: 'No autopilot process running' });
    }

    autopilotProcess.end(err => {
      if (err) console.error('[Autopilot stop error]', err);
    });
    autopilotProcess = null;
    res.json({ stopped: true });
  } catch (err) {
    console.error('[Autopilot stop error]', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
