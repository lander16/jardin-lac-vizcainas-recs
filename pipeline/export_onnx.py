"""
One-time conversion of the all-MiniLM-L6-v2 PyTorch model into an
ONNX int8-quantized model that can be loaded by the onnxruntime Ruby
gem at runtime inside the Rails app.

Run this once after editing the model name / revision in
pipeline/embed_books.py, and commit the resulting
data/mini_lm_onnx/ directory. Never run from the Rails server or on
Render — this is a dev-time step only.

Output layout (committed to the repo):
  data/mini_lm_onnx/
    model_quantized.onnx    (~22 MB int8)
    tokenizer.json          (~3 MB WordPiece vocab)
    tokenizer_config.json
    special_tokens_map.json
    config.json
"""

import os
import sys

# Match the name + revision used by embed_books.py so the two pipelines
# stay in lockstep. Honors the same SENTENCE_TRANSFORMER_REVISION env
# var.
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
MODEL_REVISION = os.environ.get("SENTENCE_TRANSFORMER_REVISION")
OUTPUT_DIR = "data/mini_lm_onnx"


def main():
    try:
        from optimum.onnxruntime import ORTModelForFeatureExtraction
        from transformers import AutoTokenizer
    except ImportError:
        print(
            "ERROR: optimum + onnxruntime are required for this one-time conversion.\n"
            "       pip install 'optimum[onnxruntime]' onnx",
            file=sys.stderr,
        )
        sys.exit(1)

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    if MODEL_REVISION:
        rev_label = f"@{MODEL_REVISION[:7]}"
        load_kwargs = { "revision": MODEL_REVISION }
    else:
        rev_label = " (latest)"
        load_kwargs = {}
    print(f"Loading {MODEL_NAME}{rev_label} and exporting to ONNX...")
    model = ORTModelForFeatureExtraction.from_pretrained(
        MODEL_NAME,
        export=True,
        **load_kwargs,
    )
    # Save the unquantized model first, then quantize in place. The
    # quantizer needs a non-optimized model to start from, and the
    # intermediate fp32 file is ~88 MB which is uncomfortable to
    # commit to git (close to GitHub's 100 MB cap). The int8 version
    # is ~22 MB and is what the Rails app actually loads.
    unquantized_dir = OUTPUT_DIR + ".fp32"
    model.save_pretrained(unquantized_dir)

    print("Saving tokenizer files alongside the ONNX model...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, **load_kwargs)
    tokenizer.save_pretrained(unquantized_dir)

    print("Applying dynamic int8 quantization...")
    try:
        from optimum.onnxruntime import ORTQuantizer
        from optimum.onnxruntime.configuration import AutoQuantizationConfig
    except ImportError:
        print(
            "ERROR: optimum.onnxruntime.quantization not available. "
            "Install with: pip install 'optimum[onnxruntime]' onnx",
            file=sys.stderr,
        )
        sys.exit(1)

    quantizer = ORTQuantizer.from_pretrained(unquantized_dir)
    qconfig = AutoQuantizationConfig.avx512_vnni(is_static=False, per_channel=False) \
        if hasattr(AutoQuantizationConfig, "avx512_vnni") \
        else AutoQuantizationConfig.arm64(is_static=False, per_channel=False) \
        if hasattr(AutoQuantizationConfig, "arm64") \
        else AutoQuantizationConfig.avx2(is_static=False, per_channel=False)
    quantizer.quantize(quantization_config=qconfig, save_dir=OUTPUT_DIR)

    # Move the tokenizer files into the quantized output dir.
    import shutil
    for fname in os.listdir(unquantized_dir):
        if fname.startswith("tokenizer") or fname == "special_tokens_map.json" or fname == "vocab.txt":
            shutil.move(os.path.join(unquantized_dir, fname),
                        os.path.join(OUTPUT_DIR, fname))

    import shutil as _shutil
    _shutil.rmtree(unquantized_dir, ignore_errors=True)

    print(f"Done. ONNX artifacts written to {OUTPUT_DIR}/")
    for f in sorted(os.listdir(OUTPUT_DIR)):
        full = os.path.join(OUTPUT_DIR, f)
        size = os.path.getsize(full)
        print(f"  {f:40s} {size / 1024:.1f} KB")


if __name__ == "__main__":
    main()
