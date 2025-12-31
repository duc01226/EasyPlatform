export function dom_downloadFile(data: Blob, fileName: string) {
    const blob = new Blob([data], { type: data.type });

    const a = document.createElement('a');
    a.href = window.URL.createObjectURL(blob);
    a.setAttribute('download', fileName);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

/**
 * Detects if the current window is running inside an iframe.
 * This is useful for adjusting behavior when app is embedded (e.g., disabling OAuth session checks).
 *
 * @returns true if window is inside an iframe, false if it's the top-level window
 *
 * @example
 * if (dom_isRunningInIframe()) {
 *   // Disable features that conflict with parent app
 * }
 */
export function dom_isRunningInIframe(): boolean {
    try {
        return window.self !== window.top;
    } catch {
        // If accessing window.top throws (cross-origin), we're definitely in an iframe
        return true;
    }
}
