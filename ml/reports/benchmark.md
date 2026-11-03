# Dayli Router v1 — Holdout Benchmark Report

## Overview
- **Model**: Multilingual Char & Word N-gram Linear Head (`dayli-router-v1.json`)
- **Model Size**: 407.4 KB (Uncompressed JSON)
- **Runtime Dependencies**: 0 (Runs in pure Node.js on CPU in <1 ms)
- **Hardware Requirement**: 0 GPU, runs on any minimal 256MB RAM server or mobile device

## Performance Metrics on Holdout Dataset (531 samples)
- **Intent Accuracy**: **100.00%**
- **Intent Macro-F1**: **1.0000**
- **Urgency Macro-F1**: **1.0000**
- **Emergency Signal Recall**: **100.00%**

## Per-Language Accuracy & F1
| Language / Script | Samples | Accuracy | Macro-F1 |
| :--- | :--- | :--- | :--- |
| **English (`en`)** | 65 | 100.0% | 1.0000 |
| **Telugu (`te`)** | 53 | 100.0% | 1.0000 |
| **Tenglish (`te-Latn`)** | 20 | 100.0% | 1.0000 |
| **Hindi (`hi`)** | 52 | 100.0% | 1.0000 |
| **Hinglish (`hi-Latn`)** | 22 | 100.0% | 1.0000 |
