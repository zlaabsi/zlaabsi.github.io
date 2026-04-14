# TODO

- Semantic search: re-benchmark the embedding model once the published corpus is materially larger than the current public site. We are using `onnx-community/embeddinggemma-300m-ONNX` in `q4` for now because it loads more easily in-browser, but this should be revisited against stronger alternatives when there are many more published documents to index.
- Growth stack: once the Cloudflare worker is deployed and the newsletter secrets are set, publish a dedicated privacy page covering email signup, analytics, and click-heatmap collection.
