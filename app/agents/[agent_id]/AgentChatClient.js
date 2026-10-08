"use client";

import { AiAgent } from "ai-agent";
import "ai-agent/dist/tailwind.css";
import { useCallback, useEffect, useState } from "react";
import { getApiKey } from "@/src/lib/apiKeyStore";
import { useMuapiAxios } from "@/lib/useMuapiAxios";

const BASE = "/api/agents";

export default function AgentChatClient({ agentId, conversationId }) {
  useMuapiAxios();
  const [agentDetails, setAgentDetails] = useState(null);
  const [initialHistory, setInitialHistory] = useState(null);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const apiKey = getApiKey();
    if (!apiKey) return;

    const headers = { "x-api-key": apiKey };

    (async () => {
      try {
        const bal = await fetch("/api/v1/account/balance", { headers, cache: "no-store" });
        if (bal.ok) setUserData(await bal.json());
      } catch {
        /* ignore */
      }

      if (!agentId) return;

      try {
        let res = await fetch(`${BASE}/by-slug/${agentId}`, { headers, cache: "no-store" });
        if (!res.ok && agentId.length > 20) {
          res = await fetch(`${BASE}/${agentId}`, { headers, cache: "no-store" });
        }
        if (res.ok) setAgentDetails(await res.json());
      } catch {
        /* ignore */
      }

      if (conversationId) {
        try {
          const hist = await fetch(
            `${BASE}/${agentId}/conversations/${conversationId}`,
            { headers, cache: "no-store" }
          );
          if (hist.ok) setInitialHistory(await hist.json());
        } catch {
          /* ignore */
        }
      }
    })();
  }, [agentId, conversationId]);

  const useUser = useCallback(
    () => ({
      user: {
        username: userData?.email?.split("@")[0] || "Studio User",
        name: userData?.email?.split("@")[0] || "Studio User",
        email: userData?.email || null,
        profile_photo: null,
        balance: userData?.balance || 0,
      },
      isAuthorized: !!userData,
    }),
    [userData]
  );

  return (
    <div className="h-screen w-full bg-black">
      <AiAgent
        initialAgentDetails={agentDetails}
        initialHistory={initialHistory}
        useUser={useUser}
        usedIn="muapiapp"
      />
    </div>
  );
}
