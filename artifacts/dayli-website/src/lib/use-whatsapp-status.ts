/**
 * React hook that asks the api-server whether the public WhatsApp
 * destination is available. The result decides whether user-facing
 * CTAs are enabled.
 *
 * We deliberately route through the backend so a number override can
 * be changed at runtime without rebuilding the website.
 *
 * The hook fetches once on mount and caches the result for the
 * lifetime of the page. If the api-server is unavailable, the known
 * live Dayli number remains usable.
 */
import { useEffect, useState } from "react";
import {
  apiUrl,
  buildWhatsappUrl,
  INITIAL_WHATSAPP_STATUS,
  type WhatsappStatus,
} from "./site";

let cached: WhatsappStatus | null = null;
let inflight: Promise<WhatsappStatus> | null = null;

async function fetchStatus(): Promise<WhatsappStatus> {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const response = await fetch(apiUrl("/whatsapp/status"), {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        return INITIAL_WHATSAPP_STATUS;
      }
      const body = (await response.json()) as {
        enabled?: boolean;
        number?: string;
      };
      const number = typeof body?.number === "string" ? body.number : "";
      const enabled = Boolean(body?.enabled) && number.length > 0;
      const status: WhatsappStatus = {
        enabled,
        number,
        url: enabled ? buildWhatsappUrl(number) : "",
      };
      cached = status;
      return status;
    } catch {
      return INITIAL_WHATSAPP_STATUS;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export function useWhatsappStatus(): WhatsappStatus {
  const [status, setStatus] = useState<WhatsappStatus>(
    cached ?? INITIAL_WHATSAPP_STATUS,
  );
  useEffect(() => {
    let mounted = true;
    void fetchStatus().then((s) => {
      if (mounted) setStatus(s);
    });
    return () => {
      mounted = false;
    };
  }, []);
  return status;
}
