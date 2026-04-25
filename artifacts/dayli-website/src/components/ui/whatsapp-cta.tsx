import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWhatsappStatus } from "@/lib/use-whatsapp-status";
import { useLocale } from "@/hooks/use-locale";

type ButtonProps = React.ComponentProps<typeof Button>;

interface WhatsAppCTAProps extends Omit<ButtonProps, "asChild"> {
  label: string;
  block?: boolean;
  noticeAfter?: boolean;
  trailingIcon?: React.ReactNode;
}

/**
 * Renders a WhatsApp call-to-action that becomes an anchor link when
 * the api-server reports the WhatsApp Business integration is wired up
 * (all five Meta secrets present + a display number configured), and a
 * clearly-labelled disabled button with a "setup in progress" notice
 * when it is not. This avoids ever sending visitors to a wa.me link
 * pointing at a number whose webhook would 503.
 */
export function WhatsAppCTA({
  label,
  block,
  noticeAfter,
  trailingIcon,
  className,
  variant,
  size,
  ...rest
}: WhatsAppCTAProps) {
  const { t } = useLocale();
  const widthCls = block ? "w-full" : "";
  const { enabled, url } = useWhatsappStatus();

  if (!enabled) {
    const pendingLabel = t.layout.whatsappPending;
    // Concise on-button copy: keeps the original label so the user knows
    // the channel ("WhatsApp"), with a small "soon" affordance + clock
    // icon. The full multi-line explanation is exposed via aria-label /
    // title (assistive tech and tooltip) and via the optional
    // `noticeAfter` line below the button — that way the pill stays a
    // reasonable width and never breaks the navbar/hero layout.
    return (
      <div className={cn(block && "w-full")}>
        <Button
          type="button"
          disabled
          aria-disabled="true"
          aria-label={`${label} — ${pendingLabel}`}
          title={pendingLabel}
          variant={variant}
          size={size}
          className={cn(widthCls, "gap-2", className)}
          {...rest}
        >
          <Clock size={14} className="shrink-0 opacity-80" aria-hidden="true" />
          <span className="truncate">{label}</span>
          <span className="opacity-70 hidden sm:inline">· {t.layout.whatsappSoon}</span>
          {trailingIcon}
        </Button>
        {noticeAfter && (
          <p
            className={cn(
              "mt-2 text-xs text-muted-foreground",
              block ? "text-center" : "",
            )}
          >
            {pendingLabel}
          </p>
        )}
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(block && "block w-full")}
    >
      <Button
        type="button"
        variant={variant}
        size={size}
        className={cn(widthCls, className)}
        {...rest}
      >
        {label}
        {trailingIcon}
      </Button>
    </a>
  );
}
