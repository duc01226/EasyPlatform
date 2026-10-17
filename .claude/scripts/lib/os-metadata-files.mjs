// Files a desktop file browser writes on its own into any folder it has open (macOS Finder,
// Windows Explorer). No generator produces them and they are never mirror content, yet they
// reappear seconds after deletion. One list for every mirror writer and verifier, so a writer never
// copies what its verifier ignores. Resolves no project root and imports nothing, so a read-only
// gate can import it statically without loading a mirror generator.
const OS_METADATA_BASENAMES = new Set(['.ds_store', 'thumbs.db', 'desktop.ini']);

/** True when `name` is the basename of an OS metadata file. Case-insensitive: the spelling on disk varies on Windows. */
export function isOsMetadataFileName(name) {
    return OS_METADATA_BASENAMES.has(String(name).toLowerCase());
}
