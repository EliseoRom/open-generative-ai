"use client";

import { CreateAgentPage } from "ai-agent";
import "ai-agent/dist/tailwind.css";
import { useCallback, useEffect, useState } from "react";
import { getApiKey } from "@/src/lib/apiKeyStore";
import { useMuapiAxios } from "@/lib/useMuapiAxios";

export default function AgentCreateClient() {
  useMuapiAxios();
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const apiKey = getApiKey();
    if (!apiKey) return;
    fetch("/api/v1/account/balance", {
      headers: { "x-api-key": apiKey },
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data) setUserData(data); })
      .catch(() => {});
  }, []);

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
    <CreateAgentPage
      useUser={useUser}
      usedIn="studio"
    />
  );
}
