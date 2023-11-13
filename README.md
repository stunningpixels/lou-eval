# lou-eval

This exists to track the progress of LLM context utilisation

## How it works

### Preparing the data

- We generate sentences in the format `My name is ${randomName} and I am from ${randomCountry} and I have a pet ${randomAnimal}.`
- For 10 of the sentences we change `${randomAnimal}` from an animal to a fruit
- We then randomise the order of the sentences

### Querying the model

We append the following query to the end of the data part of the prompt:

```
Who has a pet fruit instead of a pet animal? Respond with a JSON list all the instances you find in the format: [{"name":"NAME OF PERSON","fruit":"NAME OF FRUIT"},...]. DO NOT INCLUDE ANY ANIMALS.
```

### Parsing the data

We then count how many successful matches and false positives were returned.

### Notes

So that the eval does a good job of modelling real world RAG challenges:

- Answers come from many places in the doc
- Answers do not have exact keyword overlap with query
- Similar/misleading information is included in the prompt
- We sample 10X at each token length, not enough to be statistically significant, but estimate 土 1 accuracy which is good enough and doesn't break the bank

## How to use

- Add your keys in `.env`
- Run `npm run start`
- Choose a model in the CLI
- The model will be automatically evaluated, taking 10 samples at each context length starting at 1k tokens and doubling up to the maximum context length supported by the model
- Data is saved in the `/data` directory

## Future plans

- Evaluate other models (Claude, Open Source...)
