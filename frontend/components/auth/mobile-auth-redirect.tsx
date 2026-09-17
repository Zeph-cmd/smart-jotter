"use client";

import { useEffect } from "react";

const MOBILE_AUTH_SCHEME = "smartjotter://auth";

export function MobileAuthRedirect() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isMobileAuth = ["1", "true"].includes(
      params.get("mobile")?.toLowerCase() ?? ""
    );

    if (!isMobileAuth || !window.location.hash.includes("access_token=")) {
      return;
    }

    window.location.replace(`${MOBILE_AUTH_SCHEME}${window.location.hash}`);
  }, []);

  return null;
}