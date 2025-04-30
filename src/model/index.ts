import { Model, ModelDescription } from "./types.ts";
import { ollamaModel } from "./ollama.ts";

class ModelManager {
  private models: ModelDescription[];

  constructor(models: ModelDescription[]) {
    this.models = models;
  }

  private getModelByName(name: string): ModelDescription | undefined {
    return this.models.find((model) => model.name === name);
  }

  public newModel(name: string): Model | undefined {
    return this.getModelByName(name)?.factory();
  }
}

const modelManager = new ModelManager([
  ollamaModel(
    "qwq:latest",
    "An efficient model optimized for rapid conversational responses. Strengths include fast inference and concise, contextually relevant replies, ideal for lightweight, agent-based interactions. However, it tends to struggle with nuanced instructions, complex reasoning tasks, and maintaining context over extended dialogues.",
    131000,
  ),
  ollamaModel(
    "mistral:latest",
    "A powerful, open-weight conversational AI model renowned for its strong reasoning capabilities, good balance of speed and accuracy, and versatility across tasks. Its strengths lie in generating detailed and contextually aware responses and handling multi-turn conversations. Weaknesses include occasional verbosity, challenges with highly specialized domain knowledge, and slight inconsistencies in factual recall.",
    32768,
  ),
  ollamaModel(
    "llama3.1:latest",
    "An advanced general-purpose language model known for excellent reasoning, robust multilingual support, and context retention across extensive conversations. Llama3 is particularly effective at intricate reasoning tasks, nuanced instruction-following, and creative content generation. Weaknesses involve higher computational demands, slightly slower inference speeds, and occasional verbosity or repetitive phrasing in longer interactions.",
    128000,
  ),
  ollamaModel(
    "llama3.2:latest",
    "An advanced general-purpose language model known for excellent reasoning, robust multilingual support, and context retention across extensive conversations. Llama3 is particularly effective at intricate reasoning tasks, nuanced instruction-following, and creative content generation. Weaknesses involve higher computational demands, slightly slower inference speeds, and occasional verbosity or repetitive phrasing in longer interactions.",
    128000,
  ),
  ollamaModel(
    "deepseek-r1:14b",
    "A highly performant conversational model specifically fine-tuned for detailed reasoning, structured content generation, and rigorous logical consistency. DeepSeek excels in technical and analytical contexts, providing accurate and comprehensive responses. However, it may display slower response times, higher resource usage, and occasional difficulty managing informal or highly ambiguous conversational prompts.",
    128000,
  ),
  ollamaModel(
    "qwen2.5-coder:14b",
    "A specialized coding assistant model with exceptional proficiency in programming languages, debugging tasks, and software development assistance. Its strengths are precise, syntactically correct code generation, detailed code explanations, and effective debugging suggestions. However, Qwen2.5-Coder tends to be less effective in general conversational use-cases, creative content generation, or tasks requiring broad domain knowledge outside software development.",
    32768,
  ),
]);

export default modelManager;
