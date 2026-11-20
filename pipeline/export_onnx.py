"""
One-time export of the online query model to an int8-quantized ONNX artifact
for Ruby's onnxruntime gem, with post-export FP32-vs-ONNX cosine verification.
"""

import argparse
import os
import shutil
import sys

try:
    from .config import ONNX_DIR, ONNX_MAX_TOKENS, ONLINE_MODEL_NAME, ONLINE_MODEL_REVISION
except ImportError:
    from config import ONNX_DIR, ONNX_MAX_TOKENS, ONLINE_MODEL_NAME, ONLINE_MODEL_REVISION

PARITY_PROBES = [
    "novela mexicana revolucion",
    "filosofia contemporanea mujeres",
    "poesia latinoamericana amor",
]


def verify_quantized_parity(fp32_dir, quantized_dir, min_cosine=0.98):
    import numpy as np
    import onnxruntime as ort
    from tokenizers import Tokenizer

    tok = Tokenizer.from_file(str(quantized_dir / "tokenizer.json"))
    tok.enable_truncation(max_length=ONNX_MAX_TOKENS)
    tok.enable_padding(pad_id=0, length=ONNX_MAX_TOKENS)

    fp32_sess = ort.InferenceSession(str(fp32_dir / "model.onnx"), providers=["CPUExecutionProvider"])
    q_sess = ort.InferenceSession(str(quantized_dir / "model_quantized.onnx"), providers=["CPUExecutionProvider"])

    def encode_all(sess):
        in_names = {i.name for i in sess.get_inputs()}
        out_names = [o.name for o in sess.get_outputs()]
        encs = tok.encode_batch(PARITY_PROBES)
        ids = np.array([e.ids for e in encs], dtype=np.int64)
        mask = np.array([e.attention_mask for e in encs], dtype=np.int64)
        feeds = {"input_ids": ids, "attention_mask": mask}
        if "token_type_ids" in in_names:
            feeds["token_type_ids"] = np.zeros_like(ids, dtype=np.int64)
        out = sess.run(out_names, feeds)[0]
        exp = np.expand_dims(mask, -1).astype(np.float32)
        pooled = np.sum(out * exp, axis=1) / np.clip(np.sum(exp, axis=1), 1e-9, None)
        return pooled / np.linalg.norm(pooled, axis=1, keepdims=True)

    v_fp32 = encode_all(fp32_sess)
    v_q = encode_all(q_sess)
    cosines = np.sum(v_fp32 * v_q, axis=1)
    mean_cos = float(np.mean(cosines))
    print(f"FP32 vs INT8 mean cosine across {len(PARITY_PROBES)} probes: {mean_cos:.4f}")
    if mean_cos < min_cosine:
        raise RuntimeError(f"Quantization parity below threshold ({mean_cos:.4f} < {min_cosine})")


def main():
    parser = argparse.ArgumentParser(description="Export online query model to quantized ONNX.")
    parser.add_argument("--quant-target", choices=("avx2", "avx512_vnni", "arm64"), default="avx2")
    args = parser.parse_args()

    try:
        from optimum.onnxruntime import ORTModelForFeatureExtraction, ORTQuantizer
        from optimum.onnxruntime.configuration import AutoQuantizationConfig
        from transformers import AutoTokenizer
    except ImportError:
        print(
            "ERROR: optimum + onnxruntime + transformers are required.\n"
            "       pip install -r requirements-export.txt",
            file=sys.stderr,
        )
        sys.exit(1)

    ONNX_DIR.mkdir(parents=True, exist_ok=True)
    fp32_dir = ONNX_DIR.with_suffix(".fp32")
    if fp32_dir.exists():
        shutil.rmtree(fp32_dir)

    print(f"Exporting {ONLINE_MODEL_NAME}@{ONLINE_MODEL_REVISION[:7]} to ONNX...")
    model = ORTModelForFeatureExtraction.from_pretrained(
        ONLINE_MODEL_NAME,
        export=True,
        revision=ONLINE_MODEL_REVISION,
    )
    model.save_pretrained(fp32_dir)

    tokenizer = AutoTokenizer.from_pretrained(ONLINE_MODEL_NAME, revision=ONLINE_MODEL_REVISION)
    tokenizer.save_pretrained(fp32_dir)

    quantizer = ORTQuantizer.from_pretrained(fp32_dir)
    config_factory = getattr(AutoQuantizationConfig, args.quant_target)
    qconfig = config_factory(is_static=False, per_channel=True)
    quantizer.quantize(quantization_config=qconfig, save_dir=ONNX_DIR)

    for fname in os.listdir(fp32_dir):
        if fname.startswith("tokenizer") or fname in ("special_tokens_map.json", "vocab.txt"):
            shutil.move(str(fp32_dir / fname), str(ONNX_DIR / fname))

    verify_quantized_parity(fp32_dir, ONNX_DIR)
    shutil.rmtree(fp32_dir, ignore_errors=True)
    print(f"ONNX artifacts written cleanly to {ONNX_DIR}/")


if __name__ == "__main__":
    main()
