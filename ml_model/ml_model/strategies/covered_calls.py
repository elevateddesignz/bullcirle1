#!/usr/bin/env python3
import sys, json

def main():
    features = json.load(sys.stdin)
    # TODO: implement covered_calls logic here
    recommendation = "hold"
    confidence    = 0.50
    print(json.dumps({
        "strategy": "covered_calls",
        "recommendation": recommendation,
        "confidence": confidence
    }))

if __name__ == "__main__":
    main()
