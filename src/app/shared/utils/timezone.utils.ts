/**
 * The zone to fall back to when the runtime will not say what it is using.
 *
 * UTC rather than a guess: a date rendered in the wrong zone reads as a
 * perfectly ordinary date and gives no sign that it is wrong, whereas UTC is at
 * least the same answer everywhere.
 */
export const FALLBACK_TIMEZONE = 'UTC';

/**
 * The timezone this device is set to.
 *
 * Asked of `Intl` rather than derived from the clock offset, because an offset
 * cannot tell `Europe/London` from `Africa/Abidjan` in winter and says nothing
 * about when summer time starts.
 *
 * @returns The device's IANA timezone, or UTC when the runtime will not say.
 */
export function deviceTimezone(): string {
  try {
    return (
      Intl.DateTimeFormat().resolvedOptions().timeZone || FALLBACK_TIMEZONE
    );
  } catch {
    return FALLBACK_TIMEZONE;
  }
}

/**
 * Determines whether a string names a timezone this runtime can convert with.
 *
 * Resolved by asking `Intl` to use it rather than by comparing against a list,
 * so a stored value the browser cannot honour is caught here rather than
 * throwing in the middle of rendering a page.
 *
 * @param timezone - The candidate identifier.
 * @returns True when the identifier names a usable timezone.
 */
export function isUsableTimezone(
  timezone: string | null | undefined,
): timezone is string {
  if (!timezone) {
    return false;
  }

  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });

    return true;
  } catch {
    return false;
  }
}

/**
 * The timezones this runtime can offer in a picker.
 *
 * Read from the runtime rather than held as a list in the repository, so the
 * offered zones are the ones the browser can actually convert with and no
 * release is needed when the IANA database gains a city. Older runtimes without
 * `supportedValuesOf` get the device's own zone and UTC, which is enough to
 * keep the control usable rather than empty.
 *
 * @returns The available IANA identifiers, sorted, with UTC first.
 */
export function availableTimezones(): string[] {
  const supported =
    typeof Intl.supportedValuesOf === 'function'
      ? Intl.supportedValuesOf('timeZone')
      : [deviceTimezone()];

  const withoutUtc = supported
    .filter(zone => zone !== FALLBACK_TIMEZONE)
    .sort((left, right) => left.localeCompare(right));

  return [FALLBACK_TIMEZONE, ...withoutUtc];
}

/**
 * Describes a timezone the way a settings page should label it.
 *
 * `Europe/London` is what gets stored, but "Europe/London (GMT+1)" is what
 * tells somebody they have picked the right one.
 *
 * @param timezone - The IANA identifier.
 * @param now - The instant to describe the offset at; defaults to now.
 * @returns The identifier with its current offset, or the identifier alone.
 */
export function describeTimezone(timezone: string, now = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    }).formatToParts(now);

    const offset = parts.find(part => part.type === 'timeZoneName')?.value;

    return offset ? `${timezone} (${offset})` : timezone;
  } catch {
    return timezone;
  }
}
