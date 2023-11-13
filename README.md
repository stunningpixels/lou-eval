# lou-eval

This exists to track the progress of LLM context utilisation

## How to use

- Add your keys in .env
- Run `npm run start`
- Choose a model in the CLI
- The model will be automatically evaluated, taking 10 samples at each context length starting at 1k tokens and doubling up to the maximum context length supported by the model
- Data is saved in the `/data` directory

## Future plans

- Evaluate other models (Claude, Open Source...)
