import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import joblib

# Sample data
data = {
    "rsi":    [30, 70, 50, 25, 80, 60, 40, 35, 65, 45],
    "macd":   [0.01, -0.02, 0.00, 0.03, -0.05, 0.02, -0.01, 0.01, 0.00, -0.02],
    "volume": [1000000, 2000000, 1500000, 800000, 2500000, 1800000, 1200000, 950000, 2300000, 1600000],
    "target": [1, 0, 0, 1, 0, 1, 0, 1, 0, 1]  # 1 = buy, 0 = hold
}

df = pd.DataFrame(data)

X = df[["rsi", "macd", "volume"]]
y = df["target"]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

clf = RandomForestClassifier(n_estimators=100, random_state=42)
clf.fit(X_train, y_train)

predictions = clf.predict(X_test)
accuracy = accuracy_score(y_test, predictions)
print(f"Model Accuracy: {accuracy * 100:.2f}%")

joblib.dump(clf, "model.joblib")
print("Model saved to model.joblib")

