#!/usr/bin/env python3
import sys, json

def main():
    features = json.load(sys.stdin)
    # TODO: implement straddles_strangles logic here
    recommendation = "hold"
    confidence    = 0.50
    print(json.dumps({
        "strategy": "straddles_strangles",
        "recommendation": recommendation,
        "confidence": confidence
    }))

if __name__ == "__main__":
    main()
