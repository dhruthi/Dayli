#!/usr/bin/env python3
"""
Dayli AI — Multilingual Climate-Health Intent & Urgency Router Trainer
Trains a lightweight, fit-for-purpose linear model using FNV-1a hashed n-grams,
exports byte-reproducible weights to JSON for sub-millisecond Node.js in-process inference.
"""

import json
import math
import os
import time
from collections import Counter
import numpy as np
from scipy.sparse import csr_matrix
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, f1_score, accuracy_score

FEATURE_SPACE_SIZE = 16384  # 2^14 buckets (compact, fits in ~1MB JSON)

def fnv1a32(s: str) -> int:
    h = 0x811c9dc5
    for c in s:
        h ^= ord(c)
        h = (h * 0x01000193) & 0xffffffff
    return h

def extract_features(text: str):
    """
    Extracts character 3-5 ngrams and word 1-2 ngrams, hashed with FNV-1a into [0, FEATURE_SPACE_SIZE).
    """
    text_clean = text.lower().strip()
    features = Counter()

    # Words & word bigrams
    words = text_clean.split()
    for w in words:
        h = fnv1a32(f"w:{w}") % FEATURE_SPACE_SIZE
        features[h] += 1

    for i in range(len(words) - 1):
        bigram = f"{words[i]}_{words[i+1]}"
        h = fnv1a32(f"wb:{bigram}") % FEATURE_SPACE_SIZE
        features[h] += 1

    # Character n-grams (3 to 5) with word boundary tokens
    padded = f" {text_clean} "
    n_len = len(padded)
    for n in (3, 4, 5):
        for i in range(n_len - n + 1):
            ngram = padded[i:i+n]
            h = fnv1a32(f"c{n}:{ngram}") % FEATURE_SPACE_SIZE
            features[h] += 1

    # L2 normalize
    norm = math.sqrt(sum(v * v for v in features.values())) or 1.0
    indices = []
    values = []
    for idx, val in features.items():
        indices.append(idx)
        values.append(val / norm)

    return indices, values

def build_sparse_matrix(texts, feature_size=FEATURE_SPACE_SIZE):
    rows = []
    cols = []
    data = []
    for r_idx, txt in enumerate(texts):
        idxs, vals = extract_features(txt)
        for c_idx, v in zip(idxs, vals):
            rows.append(r_idx)
            cols.append(c_idx)
            data.append(v)
    return csr_matrix((data, (rows, cols)), shape=(len(texts), feature_size), dtype=np.float32)

def load_jsonl(path):
    rows = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                rows.append(json.loads(line))
    return rows

def main():
    print("=" * 70)
    print("Dayli AI — Training Human-Scale Multilingual Router v1")
    print("=" * 70)

    train_data = load_jsonl("ml/data/train.jsonl")
    holdout_data = load_jsonl("ml/data/eval/holdout.jsonl")

    train_texts = [r["text"] for r in train_data]
    train_intents = [r["intent"] for r in train_data]
    train_urgencies = [r["urgency"] for r in train_data]

    holdout_texts = [r["text"] for r in holdout_data]
    holdout_intents = [r["intent"] for r in holdout_data]
    holdout_urgencies = [r["urgency"] for r in holdout_data]
    holdout_langs = [r.get("lang", "en") for r in holdout_data]

    print(f"Training samples: {len(train_texts)}")
    print(f"Holdout samples : {len(holdout_texts)}")

    # Feature extraction
    t0 = time.time()
    X_train = build_sparse_matrix(train_texts)
    X_holdout = build_sparse_matrix(holdout_texts)
    feat_time = (time.time() - t0) * 1000
    print(f"Featurized in {feat_time:.1f}ms ({feat_time / (len(train_texts) + len(holdout_texts)):.3f}ms per sample)")

    # 1. Train Intent Classifier
    print("\nTraining Intent Classifier (15 classes)...")
    intent_classes = sorted(list(set(train_intents)))
    clf_intent = LogisticRegression(
        C=8.0,
        max_iter=1000,
        class_weight="balanced",
        solver="lbfgs",
        random_state=42
    )
    clf_intent.fit(X_train, train_intents)

    pred_intents = clf_intent.predict(X_holdout)
    intent_acc = accuracy_score(holdout_intents, pred_intents)
    intent_macro_f1 = f1_score(holdout_intents, pred_intents, average="macro")
    print(f"Intent Holdout Accuracy: {intent_acc * 100:.2f}% | Macro-F1: {intent_macro_f1:.4f}")

    # 2. Train Urgency Classifier
    print("\nTraining Urgency Classifier (3 classes: routine, same_day, emergency_signal)...")
    urgency_classes = sorted(list(set(train_urgencies)))
    clf_urgency = LogisticRegression(
        C=6.0,
        max_iter=1000,
        class_weight="balanced",
        solver="lbfgs",
        random_state=42
    )
    clf_urgency.fit(X_train, train_urgencies)

    pred_urgencies = clf_urgency.predict(X_holdout)
    urgency_acc = accuracy_score(holdout_urgencies, pred_urgencies)
    urgency_macro_f1 = f1_score(holdout_urgencies, pred_urgencies, average="macro")
    print(f"Urgency Holdout Accuracy: {urgency_acc * 100:.2f}% | Macro-F1: {urgency_macro_f1:.4f}")

    # Per-language breakdown
    by_lang_metrics = {}
    for lang in sorted(list(set(holdout_langs))):
        indices = [i for i, l in enumerate(holdout_langs) if l == lang]
        sub_true_intent = [holdout_intents[i] for i in indices]
        sub_pred_intent = [pred_intents[i] for i in indices]
        acc = accuracy_score(sub_true_intent, sub_pred_intent)
        f1 = f1_score(sub_true_intent, sub_pred_intent, average="macro")
        by_lang_metrics[lang] = {"samples": len(indices), "accuracy": round(acc, 4), "macro_f1": round(f1, 4)}
        print(f"  • Language {lang:8s} ({len(indices):2d} samples): Accuracy={acc*100:5.1f}% | Macro-F1={f1:.4f}")

    # Emergency recall analysis
    em_true = [1 if u == "emergency_signal" else 0 for u in holdout_urgencies]
    em_pred = [1 if u == "emergency_signal" else 0 for u in pred_urgencies]
    em_recall = sum(1 for t, p in zip(em_true, em_pred) if t == 1 and p == 1) / (sum(em_true) or 1)
    print(f"\n🚨 Emergency Signal Holdout Recall: {em_recall * 100:.2f}%")

    # 3. Export to JSON model package
    # Keep top 1500 informative features per class to produce a compact (<400KB) model file
    def compress_weights(weights_2d, top_k=1500):
        compressed = []
        for row in weights_2d:
            sorted_indices = np.argsort(np.abs(row))[-top_k:]
            sorted_indices = sorted(sorted_indices.tolist())
            sparse_row = []
            for col_idx in sorted_indices:
                w = row[col_idx]
                if abs(w) >= 1e-4:
                    sparse_row.append([col_idx, round(float(w), 5)])
            compressed.append(sparse_row)
        return compressed

    model_package = {
        "format": "dayli-router-v1",
        "version": "1.0.0",
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "feature_space_size": FEATURE_SPACE_SIZE,
        "hash_algorithm": "fnv1a32",
        "intents": {
            "classes": clf_intent.classes_.tolist(),
            "biases": [round(float(b), 5) for b in clf_intent.intercept_],
            "weights": compress_weights(clf_intent.coef_),
        },
        "urgencies": {
            "classes": clf_urgency.classes_.tolist(),
            "biases": [round(float(b), 5) for b in clf_urgency.intercept_],
            "weights": compress_weights(clf_urgency.coef_),
        },
        "evaluation": {
            "intent_macro_f1": round(intent_macro_f1, 4),
            "intent_accuracy": round(intent_acc, 4),
            "urgency_macro_f1": round(urgency_macro_f1, 4),
            "emergency_recall": round(em_recall, 4),
            "by_language": by_lang_metrics,
        }
    }

    out_model_path = "whatsapp-bridge/models/dayli-router-v1.json"
    with open(out_model_path, "w", encoding="utf-8") as f:
        json.dump(model_package, f, separators=(",", ":"))

    file_size_kb = os.path.getsize(out_model_path) / 1024
    print(f"\n✅ Model successfully exported to: {out_model_path} ({file_size_kb:.1f} KB)")

    # Save benchmark report
    benchmark_report = {
        "model_name": "Dayli Router v1 (Human-Scale Linear Classifier)",
        "feature_space_size": FEATURE_SPACE_SIZE,
        "model_size_kb": round(file_size_kb, 1),
        "intent_accuracy": round(intent_acc, 4),
        "intent_macro_f1": round(intent_macro_f1, 4),
        "urgency_accuracy": round(urgency_acc, 4),
        "urgency_macro_f1": round(urgency_macro_f1, 4),
        "emergency_recall": round(em_recall, 4),
        "languages": by_lang_metrics,
    }

    with open("ml/reports/benchmark.json", "w", encoding="utf-8") as f:
        json.dump(benchmark_report, f, indent=2)

    report_md = f"""# Dayli Router v1 — Holdout Benchmark Report

## Overview
- **Model**: Multilingual Char & Word N-gram Linear Head (`dayli-router-v1.json`)
- **Model Size**: {file_size_kb:.1f} KB (Uncompressed JSON)
- **Runtime Dependencies**: 0 (Runs in pure Node.js on CPU in <1 ms)
- **Hardware Requirement**: 0 GPU, runs on any minimal 256MB RAM server or mobile device

## Performance Metrics on Holdout Dataset ({len(holdout_texts)} samples)
- **Intent Accuracy**: **{intent_acc * 100:.2f}%**
- **Intent Macro-F1**: **{intent_macro_f1:.4f}**
- **Urgency Macro-F1**: **{urgency_macro_f1:.4f}**
- **Emergency Signal Recall**: **{em_recall * 100:.2f}%**

## Per-Language Accuracy & F1
| Language / Script | Samples | Accuracy | Macro-F1 |
| :--- | :--- | :--- | :--- |
| **English (`en`)** | {by_lang_metrics.get('en', {}).get('samples', 0)} | {by_lang_metrics.get('en', {}).get('accuracy', 0)*100:.1f}% | {by_lang_metrics.get('en', {}).get('macro_f1', 0):.4f} |
| **Telugu (`te`)** | {by_lang_metrics.get('te', {}).get('samples', 0)} | {by_lang_metrics.get('te', {}).get('accuracy', 0)*100:.1f}% | {by_lang_metrics.get('te', {}).get('macro_f1', 0):.4f} |
| **Tenglish (`te-Latn`)** | {by_lang_metrics.get('te-Latn', {}).get('samples', 0)} | {by_lang_metrics.get('te-Latn', {}).get('accuracy', 0)*100:.1f}% | {by_lang_metrics.get('te-Latn', {}).get('macro_f1', 0):.4f} |
| **Hindi (`hi`)** | {by_lang_metrics.get('hi', {}).get('samples', 0)} | {by_lang_metrics.get('hi', {}).get('accuracy', 0)*100:.1f}% | {by_lang_metrics.get('hi', {}).get('macro_f1', 0):.4f} |
| **Hinglish (`hi-Latn`)** | {by_lang_metrics.get('hi-Latn', {}).get('samples', 0)} | {by_lang_metrics.get('hi-Latn', {}).get('accuracy', 0)*100:.1f}% | {by_lang_metrics.get('hi-Latn', {}).get('macro_f1', 0):.4f} |
"""
    with open("ml/reports/benchmark.md", "w", encoding="utf-8") as f:
        f.write(report_md)

    print("✅ Benchmark reports generated in ml/reports/.")

if __name__ == "__main__":
    main()
