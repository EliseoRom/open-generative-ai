/**
 * MuAPI key storage: in-memory + sessionStorage only.
 * Never writes document.cookie. Migrates leftover localStorage once, then deletes it.
 */

export const API_KEY_STORAGE_KEY = 'muapi_key';
export const DESIGN_AGENT_TOKEN_KEY = 'token';

let memoryKey = null;
let purgedLegacyCookie = false;

function canUseDom() {
    return typeof window !== 'undefined';
}

function expireLegacyCookie() {
    if (!canUseDom() || purgedLegacyCookie) return;
    purgedLegacyCookie = true;
    try {
        // Drop a leftover JS cookie without reading its value.
        document.cookie = `${API_KEY_STORAGE_KEY}=; path=/; max-age=0; SameSite=Lax`;
        document.cookie = `${API_KEY_STORAGE_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
    } catch {
        /* ignore */
    }
}

function readSession() {
    if (!canUseDom()) return null;
    try {
        return sessionStorage.getItem(API_KEY_STORAGE_KEY);
    } catch {
        return null;
    }
}

function writeSession(key) {
    if (!canUseDom()) return;
    try {
        if (key) sessionStorage.setItem(API_KEY_STORAGE_KEY, key);
        else sessionStorage.removeItem(API_KEY_STORAGE_KEY);
    } catch {
        /* private mode */
    }
}

function migrateFromLocalStorage() {
    if (!canUseDom()) return null;
    try {
        const leftover = localStorage.getItem(API_KEY_STORAGE_KEY);
        if (leftover) {
            localStorage.removeItem(API_KEY_STORAGE_KEY);
            localStorage.removeItem(DESIGN_AGENT_TOKEN_KEY);
            return leftover;
        }
        localStorage.removeItem(DESIGN_AGENT_TOKEN_KEY);
    } catch {
        /* ignore */
    }
    return null;
}

export function getApiKey() {
    expireLegacyCookie();
    if (memoryKey) return memoryKey;
    if (canUseDom() && window.__MUAPI_KEY__) {
        memoryKey = window.__MUAPI_KEY__;
        return memoryKey;
    }
    const fromSession = readSession();
    if (fromSession) {
        memoryKey = fromSession;
        return memoryKey;
    }
    const migrated = migrateFromLocalStorage();
    if (migrated) {
        memoryKey = migrated;
        writeSession(migrated);
        return memoryKey;
    }
    return null;
}

export function setApiKey(key) {
    expireLegacyCookie();
    const trimmed = (key || '').trim();
    memoryKey = trimmed || null;
    writeSession(memoryKey);
    if (canUseDom()) {
        if (memoryKey) window.__MUAPI_KEY__ = memoryKey;
        else delete window.__MUAPI_KEY__;
        try {
            localStorage.removeItem(API_KEY_STORAGE_KEY);
            localStorage.removeItem(DESIGN_AGENT_TOKEN_KEY);
        } catch {
            /* ignore */
        }
    }
}

export function clearApiKey() {
    setApiKey('');
}
