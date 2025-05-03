import { parse as parseYaml } from "https://deno.land/std@0.224.0/yaml/mod.ts";
import { debugPrefix } from "../lib/cli.ts";
import { AgentConfig } from "../agent/index.ts";

/**
 * Load agent configurations from the agents.yaml file
 */
export async function loadAgentsConfig(): Promise<AgentConfig[]> {
  try {
    // Read the YAML file
    const content = await Deno.readTextFile("./agents.yaml");

    // Parse the YAML content
    const config = parseYaml(content) as { agents: AgentConfig[] };

    // Return the array of agent configurations
    const agents = config.agents || [];
    debugPrefix("Config", `Loaded ${agents.length} agents from configuration`);

    return agents;
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      debugPrefix("Config", "agents.yaml file not found");
      return [];
    }

    debugPrefix("Config", `Error loading agents config: ${e instanceof Error ? e.message : String(e)}`);
    throw e;
  }
}
