/**
 * React hook that asks the api-server whether the WhatsApp Business API
 * integration is actually wired up (i.e. whether all five Meta secrets
 * are present and the webhook would actually accept calls). The result
 * decides whether user-facing CTAs are enabled.
 *
 * We deliberately route through the backend instead of trusting only
 * the build-time `VITE_WHATSAPP_NUMBER` env var because that env var
 * being set does NOT guarantee the backend is configured — a CTA that
 * launches WhatsApp into a number with no working webhook would create
 * a black hole user experience.
 *
 * The hook fetches once on mount and caches the result for the
 * lifetime of the page. Failure to reach the api-server is treated as
 * "disabled" — better to hide the CTA than to advertise a broken one.
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
        return { enabled: false, number: "", url: "" };
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
      return { enabled: false, number: "", url: "" };
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
