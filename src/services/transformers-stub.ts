// Stub for @huggingface/transformers to avoid build issues in web deployment
// The actual service uses fallback implementations when transformers is not available

export default {
  // Provide empty exports to satisfy imports
  pipeline: () => null,
  env: {},
};
