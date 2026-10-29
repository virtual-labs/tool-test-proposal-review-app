export function formatDate(value, zone, pattern) {
  const date = new Date(value);
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: zone, year:'numeric', month:'short', day:'2-digit', hour:'2-digit', minute:'2-digit', hour12:true
  }).formatToParts(date).map(p => [p.type, p.value]));
  if (pattern === 'yyyy-MM-dd') {
    return new Intl.DateTimeFormat('en-CA', {timeZone:zone, year:'numeric', month:'2-digit',day:'2-digit'}).format(date);
  }
  return `${parts.day} ${parts.month} ${parts.year}, ${parts.hour}:${parts.minute} ${parts.dayPeriod}`;
}
