// Upstream error text is useful in an alert but can echo a visitor's email
// address back (some providers quote the offending field). Strip anything
// address-shaped and cap the length before it leaves the function.
export function redactEmails(text: string, maxLength = 500): string {
  return String(text)
    .replace(/[^\s@<>"']+@[^\s@<>"']+/g, "[email]")
    .slice(0, maxLength);
}
