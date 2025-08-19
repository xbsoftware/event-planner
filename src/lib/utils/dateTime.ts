// Date/time formatting helpers reused across components
export function formatDateReadable(
  dateString: string,
  locale: string = "en-US",
  options?: Intl.DateTimeFormatOptions
) {
  return new Date(dateString).toLocaleDateString(
    locale,
    options ?? {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );
}

export function formatTimeReadable(
  timeString: string,
  locale: string = "en-US"
) {
  return new Date(`2000-01-01T${timeString}`).toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatDateTimeReadable(
  dateString: string,
  locale: string = "en-US"
) {
  return new Date(dateString).toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Tiny wrappers (presets) for common formats
export const formatDateShort = (dateString: string, locale: string = "en-US") =>
  formatDateReadable(dateString, locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export const formatDateLong = (dateString: string, locale: string = "en-US") =>
  formatDateReadable(dateString, locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

export const formatDateTimeShort = (
  dateString: string,
  locale: string = "en-US"
) => formatDateTimeReadable(dateString, locale);

export const formatTimeShort = (timeString: string, locale: string = "en-US") =>
  formatTimeReadable(timeString, locale);

// Event date-time helper
export function getDateTimeInfo(
  event: {
    startDate: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
  },
  locale: string = "en-US"
): string {
  const startDateText = formatDateReadable(event.startDate, locale);
  const startTimeText = event.startTime
    ? formatTimeReadable(event.startTime, locale)
    : "";
  const hasEndInfo = !!event.endDate || !!event.endTime;
  const endDateRaw = event.endDate || event.startDate;
  const endDateText = formatDateReadable(endDateRaw, locale);
  const endTimeText = event.endTime
    ? formatTimeReadable(event.endTime, locale)
    : "";
  const isSameDay = endDateRaw === event.startDate;

  if (!hasEndInfo) {
    return `${startDateText}${startTimeText ? ` ${startTimeText}` : ""}`;
  }

  if (isSameDay) {
    return `${startDateText}${startTimeText ? ` ${startTimeText}` : ""}${
      endTimeText ? ` - ${endTimeText}` : ""
    }`;
  }

  return `${startDateText}${
    startTimeText ? ` ${startTimeText}` : ""
  } - ${endDateText}${endTimeText ? ` ${endTimeText}` : ""}`;
}
