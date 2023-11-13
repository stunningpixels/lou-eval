export default class BaseProvider {
  constructor(modelName) {
    const model = this.constructor
      .getModels()
      .find((m) => m.name === modelName);
    this.modelName = model.name;
    this.maxTokens = model.maxTokens;
  }
}
