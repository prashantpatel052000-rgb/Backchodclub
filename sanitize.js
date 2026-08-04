// Shared helper to prevent stored XSS: escapes any user-supplied text
// before it gets inserted into innerHTML template strings, so a name,
// post, or comment containing HTML/script tags renders as plain text
// instead of running as code in someone else's browser.
export function escapeHTML(value) {

    if (value === null || value === undefined) return "";

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}
