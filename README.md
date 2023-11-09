# lou-eval

This exists to track the progress of LLM context utilisation

## How to use

- Add your keys in .env
- Modify the bottom of attention.js
  - Choose your model here `const result = await run(MODELS.gpt40314);`
  - Choose your context length you want to test `const MAX_TOKENS = 4000;`
    - Don't forget to leave some headroom for completion, if you're testing 128k tokens set this to 127.5k

## Future plans

Want to evaluate other models? Create a PR! Sorry the code is pretty messy, hope to clean this up.
