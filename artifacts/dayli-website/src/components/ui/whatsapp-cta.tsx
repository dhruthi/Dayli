import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WHATSAPP_ENABLED, WHATSAPP_URL } from "@/lib/site";
import { useLocale } from "@/hooks/use-locale";

type ButtonProps = React.ComponentProps<typeof Button>;

interface WhatsAppCTAProps extends Omit<ButtonProps, "asChild"> {
  label: string;
  block?: boolean;
  noticeAfter?: boolean;
  trailingIcon?: React.ReactNode;
}

/**
 * Renders a WhatsApp call-to-action that becomes an anchor link when a
 * VITE_WHATSAPP_NUMBER is configured, and a clearly-labelled disabled button
 * with a "setup in progress" notice when it is not. This avoids ever sending
 * visitors to wa.me without a destination number.
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

  if (!WHATSAPP_ENABLED) {
    const pendingLabel = t.layout.whatsappPending;
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
          <span className="truncate">{pendingLabel}</span>
          {trailingIcon}
        </Button>
        {noticeAfter && (
          <p
            className={cn(
              "mt-2 text-xs text-muted-foreground",
              block ? "text-center" : "",
            )}
          >
            <span className="opacity-80">{label}:</span> {pendingLabel}
          </p>
        )}
      </div>
    );
  }

  return (
    <a
      href={WHATSAPP_URL}
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
