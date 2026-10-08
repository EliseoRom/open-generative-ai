import { LocalModelManager } from './LocalModelManager.js';
import { isLocalAIAvailable } from '../lib/localInferenceClient.js';
import { t } from '../lib/i18n.js';
import { getApiKey, setApiKey } from '../lib/apiKeyStore.js';

export function SettingsModal(onClose) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:100;';

    const modal = document.createElement('div');
    modal.style.cssText = 'background:var(--bg-card,#111);border-radius:1rem;border:1px solid rgba(255,255,255,0.08);width:min(90vw,36rem);max-height:85vh;display:flex;flex-direction:column;overflow:hidden;';

    // ── Header ────────────────────────────────────────────────────────────────
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:1.25rem 1.5rem;border-bottom:1px solid rgba(255,255,255,0.06);flex-shrink:0;';
    header.innerHTML = `
        <h2 style="font-size:1rem;font-weight:800;color:#fff;margin:0;">${t('settings.title')}</h2>
        <button id="settings-close-btn" style="color:rgba(255,255,255,0.4);background:none;border:none;cursor:pointer;padding:4px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
    `;
    modal.appendChild(header);

    // ── Tabs ──────────────────────────────────────────────────────────────────
    const TABS = [
        { id: 'api', label: t('settings.apiKey') },
        ...(isLocalAIAvailable() ? [{ id: 'local', label: t('settings.localModels') }] : []),
    ];

    let activeTab = 'api';

    const tabBar = document.createElement('div');
    tabBar.style.cssText = 'display:flex;gap:0.25rem;padding:0.75rem 1.5rem 0;border-bottom:1px solid rgba(255,255,255,0.06);flex-shrink:0;';

    const tabBtns = {};
    TABS.forEach(({ id, label }) => {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.style.cssText = 'padding:0.4rem 0.75rem;border-radius:0.5rem 0.5rem 0 0;font-size:0.75rem;font-weight:700;border:none;cursor:pointer;transition:all 0.15s;';
        btn.onclick = () => switchTab(id);
        tabBtns[id] = btn;
        tabBar.appendChild(btn);
    });
    modal.appendChild(tabBar);

    // ── Body ──────────────────────────────────────────────────────────────────
    const body = document.createElement('div');
    body.style.cssText = 'flex:1;overflow-y:auto;padding:1.5rem;';
    modal.appendChild(body);

    // ── Tab: API Key ──────────────────────────────────────────────────────────
    const apiPanel = document.createElement('div');
    const apiWrap = document.createElement('div');
    apiWrap.style.cssText = 'display:flex;flex-direction:column;gap:0.75rem;';

    const field = document.createElement('div');
    const label = document.createElement('label');
    label.style.cssText = 'display:block;font-size:0.75rem;color:rgba(255,255,255,0.5);margin-bottom:0.4rem;font-weight:600;';
    label.textContent = t('settings.muapiKeyLabel');
    const keyInput = document.createElement('input');
    keyInput.id = 'settings-api-key';
    keyInput.type = 'password';
    keyInput.style.cssText = 'width:100%;box-sizing:border-box;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:0.75rem;padding:0.6rem 0.9rem;color:#fff;font-size:0.875rem;outline:none;';
    keyInput.placeholder = t('settings.keyPlaceholder');
    keyInput.value = getApiKey() || '';
    field.appendChild(label);
    field.appendChild(keyInput);

    const note = document.createElement('p');
    note.style.cssText = 'font-size:0.7rem;color:rgba(255,255,255,0.3);margin:0;white-space:pre-line;';
    note.textContent = t('settings.keyNote');

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;justify-content:flex-end;gap:0.5rem;margin-top:0.5rem;';
    const cancelBtn = document.createElement('button');
    cancelBtn.id = 'settings-cancel-btn';
    cancelBtn.style.cssText = 'padding:0.5rem 1rem;border-radius:0.5rem;background:none;border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.6);font-size:0.75rem;font-weight:700;cursor:pointer;';
    cancelBtn.textContent = t('common.cancel');
    const saveBtn = document.createElement('button');
    saveBtn.id = 'settings-save-btn';
    saveBtn.style.cssText = 'padding:0.5rem 1rem;border-radius:0.5rem;background:var(--color-primary,#22d3ee);color:#000;font-size:0.75rem;font-weight:700;cursor:pointer;border:none;';
    saveBtn.textContent = t('common.save');
    actions.appendChild(cancelBtn);
    actions.appendChild(saveBtn);

    apiWrap.appendChild(field);
    apiWrap.appendChild(note);
    apiWrap.appendChild(actions);
    apiPanel.appendChild(apiWrap);

    // ── Tab: Local Models ─────────────────────────────────────────────────────
    const localPanel = LocalModelManager();

    // ── Tab switching ─────────────────────────────────────────────────────────
    const switchTab = (id) => {
        activeTab = id;
        body.innerHTML = '';

        TABS.forEach(({ id: tid }) => {
            const btn = tabBtns[tid];
            if (tid === id) {
                btn.style.background = 'rgba(255,255,255,0.08)';
                btn.style.color = '#fff';
            } else {
                btn.style.background = 'transparent';
                btn.style.color = 'rgba(255,255,255,0.4)';
            }
        });

        if (id === 'api') body.appendChild(apiPanel);
        if (id === 'local') body.appendChild(localPanel);
    };

    switchTab('api');

    // ── API key save/cancel handlers ──────────────────────────────────────────
    const close = () => {
        if (document.body.contains(overlay)) document.body.removeChild(overlay);
        if (onClose) onClose();
    };

    cancelBtn.onclick = close;
    saveBtn.onclick = () => {
        const key = keyInput.value.trim();
        if (key) {
            setApiKey(key);
            close();
        } else {
            alert(t('settings.invalidKey'));
        }
    };

    header.querySelector('#settings-close-btn').onclick = close;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    overlay.appendChild(modal);
    return overlay;
}
