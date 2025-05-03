import { renderTemplate } from "../lib/template.ts";
import { type Agent } from "./index.ts";

export const systemContext = (agent: Agent): string => {
  const templateData = {
    name: agent.name,
    bio: agent.bio,
    skills: agent.skills,
    tools: agent.tools,
    agents: agent.agents,
    currentTime: getCurrentTimeInTimeZone(),
  };

  return renderTemplate("system-context", templateData);
};

const getCurrentTimeInTimeZone = (
  timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone,
): string =>
  new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: true, // For AM/PM format
  }).format(new Date());
