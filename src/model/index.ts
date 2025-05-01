import { type Model, type ModelDescription } from "./types.ts";
import { ollamaModel } from "./ollama.ts";
import { claudeModel } from "./claude.ts";
export  { type Model, type ModelDescription } from "./types.ts";

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

export const models = new ModelManager([
  ollamaModel(
    "qwq:latest",
    "An efficient model optimized for rapid conversational responses. Strengths include fast inference and concise, contextually relevant replies, ideal for lightweight, agent-based interactions. However, it tends to struggle with nuanced instructions, complex reasoning tasks, and maintaining context over extended dialogues.",
  ),
  ollamaModel(
    "mistral:latest",
    "A powerful, open-weight conversational AI model renowned for its strong reasoning capabilities, good balance of speed and accuracy, and versatility across tasks. Its strengths lie in generating detailed and contextually aware responses and handling multi-turn conversations. Weaknesses include occasional verbosity, challenges with highly specialized domain knowledge, and slight inconsistencies in factual recall.",
  ),
  ollamaModel(
    "llama3.1:latest",
    "An advanced general-purpose language model known for excellent reasoning, robust multilingual support, and context retention across extensive conversations. Llama3 is particularly effective at intricate reasoning tasks, nuanced instruction-following, and creative content generation. Weaknesses involve higher computational demands, slightly slower inference speeds, and occasional verbosity or repetitive phrasing in longer interactions.",
  ),
  ollamaModel(
    "llama3.2:latest",
    "An advanced general-purpose language model known for excellent reasoning, robust multilingual support, and context retention across extensive conversations. Llama3 is particularly effective at intricate reasoning tasks, nuanced instruction-following, and creative content generation. Weaknesses involve higher computational demands, slightly slower inference speeds, and occasional verbosity or repetitive phrasing in longer interactions.",
  ),
  ollamaModel(
    "deepseek-r1:14b",
    "A highly performant conversational model specifically fine-tuned for detailed reasoning, structured content generation, and rigorous logical consistency. DeepSeek excels in technical and analytical contexts, providing accurate and comprehensive responses. However, it may display slower response times, higher resource usage, and occasional difficulty managing informal or highly ambiguous conversational prompts.",
  ),
  ollamaModel(
    "qwen2.5-coder:14b",
    "A specialized coding assistant model with exceptional proficiency in programming languages, debugging tasks, and software development assistance. Its strengths are precise, syntactically correct code generation, detailed code explanations, and effective debugging suggestions. However, Qwen2.5-Coder tends to be less effective in general conversational use-cases, creative content generation, or tasks requiring broad domain knowledge outside software development.",
  ),
  claudeModel(
    "claude-3.7-sonnet",
    "Claude Sonnet 3.7 is Anthropic's advanced AI assistant, offering exceptional reasoning, creativity, and nuanced responses. It excels at complex tasks, follows detailed instructions precisely, and maintains context well. Best for sophisticated content creation, in-depth analysis, and professional communications requiring a balance of insight and efficiency.",
    {
      modelId: "claude-3-7-sonnet-latest",
      apiKey: Deno.env.get("ANTHROPIC_API_KEY") || "",
      temperature: 0.0,
    },
  ),
  claudeModel(
    "claude-3.5-sonnet",
    "Claude Sonnet 3.5 is Anthropic's advanced AI assistant, offering exceptional reasoning, creativity, and nuanced responses. It excels at complex tasks, follows detailed instructions precisely, and maintains context well. Best for sophisticated content creation, in-depth analysis, and professional communications requiring a balance of insight and efficiency.",
    {
      modelId: "claude-3-5-haiku-latest",
      apiKey: Deno.env.get("ANTHROPIC_API_KEY") || "",
      temperature: 0.0,
    },
  ),
]);

export default models;
