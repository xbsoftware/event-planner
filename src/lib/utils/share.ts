export function getEventPublicUrl(eventId: string): string {
  if (typeof window === "undefined") return `/events/${eventId}`;
  return `${window.location.origin}/events/${eventId}`;
}

export async function shareUrl(
  url: string,
  title?: string,
  text?: string
): Promise<"shared" | "copied"> {
  try {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      await (navigator as any).share({ title, text, url });
      return "shared";
    }
  } catch (err) {
    // fall through to clipboard
  }

  if (typeof navigator !== "undefined" && navigator.clipboard) {
    await navigator.clipboard.writeText(url);
    return "copied";
  }

  // Fallback: create a temporary input to copy
  const el = document.createElement("input");
  el.value = url;
  document.body.appendChild(el);
  el.select();
  document.execCommand("copy");
  document.body.removeChild(el);
  return "copied";
}

export async function shareEventLink(eventId: string, label?: string) {
  const url = getEventPublicUrl(eventId);
  const result = await shareUrl(url, label ?? "Event", "Check out this event");
  return { result, url };
}
