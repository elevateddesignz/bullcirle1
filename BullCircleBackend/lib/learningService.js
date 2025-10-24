let memory = [];

export const learningService = {
  async adjustSignals(rawSignals) {
    // no adjustments by default
    return rawSignals;
  },
  async recordOutcome(signals, executed) {
    memory.push({ signals, executed, timestamp: new Date().toISOString() });
    if (memory.length % 100 === 0) {
      console.log('Retraining model…', memory.length, 'entries');
      // put your training code here
    }
  },
};
