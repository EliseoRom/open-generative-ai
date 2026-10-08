import AgentChatClient from "./AgentChatClient";

export async function generateMetadata() {
  return {
    title: `Agent Chat — EliseoRom / Open Generative AI`,
  };
}

/**
 * Key is never read from cookies (P0). The client injects x-api-key from sessionStorage.
 */
export default async function AgentPage({ params }) {
  const { agent_id } = await params;
  return (
    <AgentChatClient agentId={agent_id} />
  );
}
