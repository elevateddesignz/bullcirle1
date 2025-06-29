#!/usr/bin/env python3
import sys, json

def main():
    features = json.load(sys.stdin)
    # TODO: implement volume_breakouts logic here
    recommendation = "hold"
    confidence    = 0.50
    print(json.dumps({
        "strategy": "volume_breakouts",
        "recommendation": recommendation,
        "confidence": confidence
    }))

if __name__ == "__main__":
    main()
