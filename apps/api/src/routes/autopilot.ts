import { Router } from 'express';
import path from 'path';
import { PythonShell } from 'python-shell';

const router = Router();

let autopilotProcess: PythonShell | null = null;

router.post('/start', async (req, res) => {
  try {
    const { intervalMins, targetAmt, floorAmt } = req.body ?? {};
    if (!intervalMins) {
      return res.status(400).json({ error: 'intervalMins is required' });
    }
    if (autopilotProcess) {
      return res.status(409).json({ error: 'Autopilot already running' });
    }

    const script = path.join(process.cwd(), 'ml_model', 'autopilot_loop.py');
    autopilotProcess = new PythonShell(script, {
      mode: 'json',
      pythonOptions: ['-u'],
      args: [intervalMins, targetAmt, floorAmt]
    });

    autopilotProcess.on('message', message => {
      console.log('[Autopilot]', message);
    });
    autopilotProcess.on('error', error => {
      console.error('[Autopilot error]', error);
    });
    autopilotProcess.on('close', () => {
      console.log('[Autopilot] process closed');
      autopilotProcess = null;
    });

    return res.json({ started: true });
  } catch (error) {
    console.error('[Autopilot start error]', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to start autopilot' });
  }
});

router.post('/stop', (_req, res) => {
  try {
    if (!autopilotProcess) {
      return res.status(409).json({ error: 'No autopilot process running' });
    }
    autopilotProcess.end(err => {
      if (err) {
        console.error('[Autopilot stop error]', err);
      }
    });
    autopilotProcess = null;
    return res.json({ stopped: true });
  } catch (error) {
    console.error('[Autopilot stop error]', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to stop autopilot' });
  }
});

export default router;
