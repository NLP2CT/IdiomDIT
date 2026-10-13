# IdiomDIT

[Project page](https://nlp2ct.github.io/IdiomDIT/)

Original implementation for **"Idioms Understood, Yet Translated Literally: Diagnosing Literal Translation Bias in Multilingual LLMs"**.

## 📖 Introduction

Large language models often produce literal, word-for-word translations of idiomatic expressions even when they demonstrably understand what the idiom means. **IdiomDIT** is a cascaded diagnostic framework built around idiom **D**etection, **I**nterpretation, and idiomatic **T**ranslation, designed to isolate this failure mode, which we call **Literal Translation Bias (LTB)**.

![IdiomDIT overview](assets/overview.png)

<p align="center"><em>Left: a Literal Translation Error (LTE) occurs when a model understands an idiom but translates it word-by-word. Right: the IdiomDIT cascade evaluates Detection, Interpretation, and Translation, combining the outcomes into a diagnostic matrix that isolates know-but-error cases as LTB.</em></p>

Across six language pairs and five models spanning 4B to 70B parameters, LTB persists even when a model detects the idiom and can state its meaning, and how much of the residual error traces back to LTB versus a genuine knowledge gap varies by language direction.

Beyond this behavioral diagnosis, we ask whether LTB is encoded as a specific direction in the model's hidden states. Linear probing recovers a per-layer Literal Translation Direction (LTD) that appears to separate know-but-error instances from know-and-correct ones with high accuracy, but leakage-aware controls show that most of this signal reflects the probe recognizing which idiom it is looking at rather than a genuine bias direction. Erasing the LTD during generation does reduce LTE, but no more than a matched random-direction control, so we treat this hidden-state evidence as correlational rather than causal and release these controls as a reusable protocol for such claims in machine translation.

![Linear probing and directional ablation pipeline](assets/probe_ablation.png)

<p align="center"><em>Linear probing and directional ablation pipeline for the Literal Translation Direction (LTD).</em></p>

## ⚙️ Environment Setup

```bash
pip install -r requirements.txt
cp .env.example .env   # fill in OPENAI_API_KEY
```

Before running anything, in `config.py`, set `MODEL_BASE_DIR` (currently `/pretrain-models`) to wherever you keep local HF model weights, or leave translation-model names as HF hub IDs and let `transformers` resolve them.

Models: Qwen3-4B, Qwen3-8B, Qwen3.5-4B, Qwen3.5-9B (behavioral + mechanistic), Llama-3.3-70B-Instruct (behavioral only).

Judges: `gpt-4o-mini` for Detection/Interpretation, `gpt-5.2` for LTE.

Everything below is run from the repo root. A few scripts use `evaluation.`-qualified imports (e.g. `from evaluation.eval_translation_lte_v4 import ...`), so put the root on `PYTHONPATH` first:
```bash
export PYTHONPATH="$PWD:$PYTHONPATH"
```

## ▶️ Running

### 📦 Data

Not included in this release. Expected layout:
```
data/{Fa,Fi,Fr,Ja,Ko}-En-Idiom/
  ParallelData/*.csv      # idiom, source sentence, gold translation
  Meaning/*_meanings.json # reference meanings (LLM-extracted)
```
- **Fi/Fr/Ja/Ko**: `script/preprocessData/clean_{fi,fr,ja,ko}_en.py` each download the raw idiom dataset directly over HTTP from its public GitHub source (Fi/Fr/Ja from Liu et al. 2023a's `nightingal3/idiom-translation` subtitle corpus, Ko from `Judy-Choi/KISS-Korean-english-Idioms-in-Sentences-dataSet`) and clean it into the schema above. No manual download needed, just run the script.
- **En-Fa**: sourced pre-cleaned from Rezaeimanesh et al. 2025 (see the paper's references for how to obtain it); there's no auto-fetch script for this one since it arrived already cleaned.
- **Reference meanings**: `script/preprocessData/extract_meaning.py` generates them per-idiom via an LLM (idiom + source sentence + gold translation as a semantic anchor).

Everything below reads/writes under `results/{lang_pair}/{model}/...`, laid out by `config.py`'s `get_config()`.

### 🚀 1. Generate model outputs (inference)

```bash
bash run_inference.sh
```
Defaults to all 6 language pairs × all 5 models, loading each model once and running all three IdiomDIT stages under it (`run_all_inference.py --steps 1 2 3 --all-prompts`, one call per model). The three steps are implemented in `inference/detection.py` (step 1), `inference/Interpretation.py` (step 2, 3 rephrased probes per instance), and `inference/translate.py` (step 3, all 4 prompt types). You normally don't call these three files directly. `run_all_inference.py` orchestrates them so the model is loaded only once per run.

Useful overrides: `bash run_inference.sh fi-en ko-en` (subset of pairs), `MODEL=Llama-3.3-70B-Instruct bash run_inference.sh fi-en` (single model), `MAX_SAMPLES=10 bash run_inference.sh fi-en` (smoke test).

### 📝 2. Evaluation

```bash
bash run_eval_detection.sh <MODEL>        # evaluation/eval_detection.py, judge=gpt-4o-mini, all 6 pairs
bash run_eval_interpretation.sh <MODEL>   # evaluation/eval_interpretation.py, judge=gpt-4o-mini, all 6 pairs
bash run_v4_eval.sh <MODEL>               # evaluation/eval_translation_lte_v4.py, judge=gpt-5.2, all 6 pairs
```
`<MODEL>` is one of `Qwen3-4B`, `Qwen3-8B`, `Qwen3.5-4B`, `Qwen3.5-9B`, `Llama-3.3-70B-Instruct`; run all three commands once for each.

### 📊 3. Analysis

**Behavioral analysis** (Findings 1–5).

To visualize the cascade Sankey diagram (Figure 2), run:
```bash
python analysis/visualize_sankey_grid.py
```

**Mechanistic analysis** (Findings 6–8, Qwen3.5-9B only).

To run the main LTD ablation and aggregate it into Table 5, run:
```bash
bash mechanistic/run_v4_gpt52_qwen9b.sh
python analysis/aggregate_ablation.py --model Qwen3.5-9B
```

**Linguistic analysis** (Finding 9, Qwen3.5-9B only).

To score idiom compositionality, run:
```bash
python analysis/score_compositionality.py
```
