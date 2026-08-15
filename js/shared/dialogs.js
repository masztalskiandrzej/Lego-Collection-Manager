/**
 * Dialogs — zamiana natywnych alert()/confirm() na modale w stylu aplikacji.
 *
 * Użycie:
 *   Dialogs.alert('Zapisano!', { type: 'success' })            -> Promise<void>
 *   Dialogs.confirm('Usunąć element?', { danger: true })       -> Promise<boolean>
 *
 * Opcje alert:  { type: 'info'|'success'|'error'|'warning', title? }
 * Opcje confirm: { title?, confirmLabel?, cancelLabel?, danger? }
 * Tekst wiadomości obsługuje \n (białe linie są zachowane).
 *
 * Awaryjnie (brak DOM) deleguje do natywnych alert/confirm.
 */
(function () {
    const ICONS = {
        info: 'ℹ️',
        success: '✅',
        error: '❌',
        warning: '⚠️',
        question: '❓'
    };

    function injectStyle() {
        if (document.getElementById('dialogs-style')) return;
        const css = [
            '.dlg-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;',
            'align-items:center;justify-content:center;z-index:10000;opacity:0;',
            'transition:opacity .18s ease;padding:20px}',
            '.dlg-overlay.dlg-open{opacity:1}',
            '.dlg-card{background:#fff;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.25);',
            'max-width:420px;width:100%;padding:26px 24px 20px;transform:translateY(8px);',
            'transition:transform .18s ease;font-family:inherit}',
            '.dlg-overlay.dlg-open .dlg-card{transform:translateY(0)}',
            '[data-theme="dark"] .dlg-card{background:#1e2430;color:#e8eaf0;',
            'box-shadow:0 12px 40px rgba(0,0,0,.6)}',
            '.dlg-title{display:flex;align-items:center;gap:10px;font-size:1.05rem;font-weight:700;',
            'margin:0 0 12px}',
            '.dlg-title-icon{font-size:1.4rem;line-height:1}',
            '.dlg-message{margin:0 0 20px;font-size:.95rem;line-height:1.55;white-space:pre-line;',
            'color:#444;max-height:60vh;overflow:auto}',
            '[data-theme="dark"] .dlg-message{color:#b8bfcc}',
            '.dlg-actions{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap}',
            '.dlg-btn{border:none;border-radius:10px;padding:10px 18px;font-size:.9rem;font-weight:600;',
            'cursor:pointer;transition:filter .15s, transform .1s;font-family:inherit}',
            '.dlg-btn:hover{filter:brightness(1.05)}.dlg-btn:active{transform:scale(.98)}',
            '.dlg-btn-cancel{background:#eceff3;color:#333}',
            '[data-theme="dark"] .dlg-btn-cancel{background:#2a3140;color:#dfe3ea}',
            '.dlg-btn-ok{background:#001f3f;color:#fff}',
            '.dlg-btn-ok.dlg-danger{background:#d32f2f}',
            '@media (max-width:480px){.dlg-card{padding:20px 16px 16px}.dlg-actions .dlg-btn{flex:1}}'
        ].join('');
        const style = document.createElement('style');
        style.id = 'dialogs-style';
        style.textContent = css;
        document.head.appendChild(style);
    }

    function build(opts) {
        injectStyle();
        const overlay = document.createElement('div');
        overlay.className = 'dlg-overlay';
        const card = document.createElement('div');
        card.className = 'dlg-card';
        card.innerHTML =
            '<div class="dlg-title"><span class="dlg-title-icon"></span><span class="dlg-title-text"></span></div>' +
            '<div class="dlg-message"></div>' +
            '<div class="dlg-actions"></div>';
        overlay.appendChild(card);
        return { overlay, card };
    }

    /**
     * alert(message, opts) -> Promise<void>
     */
    function alertBox(message, opts) {
        opts = opts || {};
        return new Promise(function (resolve) {
            try {
                const type = opts.type || 'info';
                const ui = build();
                ui.card.querySelector('.dlg-title-icon').textContent = ICONS[type] || ICONS.info;
                ui.card.querySelector('.dlg-title-text').textContent =
                    opts.title || (window.I18N ? window.I18N.t('dlg.noticeTitle') : '');
                ui.card.querySelector('.dlg-message').textContent = message || '';

                const actions = ui.card.querySelector('.dlg-actions');
                const ok = document.createElement('button');
                ok.className = 'dlg-btn dlg-btn-ok';
                ok.textContent = window.t ? window.t('dlg.ok') : 'OK';
                ok.addEventListener('click', close);
                actions.appendChild(ok);

                function close() {
                    ui.overlay.classList.remove('dlg-open');
                    setTimeout(function () { ui.overlay.remove(); }, 200);
                    resolve();
                }
                ui.overlay.addEventListener('click', function (e) {
                    if (e.target === ui.overlay) close();
                });
                document.body.appendChild(ui.overlay);
                requestAnimationFrame(function () { ui.overlay.classList.add('dlg-open'); ok.focus(); });
            } catch (e) {
                window.alert(message); // awaryjnie
                resolve();
            }
        });
    }

    /**
     * confirm(message, opts) -> Promise<boolean>
     */
    function confirmBox(message, opts) {
        opts = opts || {};
        return new Promise(function (resolve) {
            try {
                const ui = build();
                ui.card.querySelector('.dlg-title-icon').textContent = ICONS.question;
                ui.card.querySelector('.dlg-title-text').textContent =
                    opts.title || (window.I18N ? window.I18N.t('dlg.confirmTitle') : '');
                ui.card.querySelector('.dlg-message').textContent = message || '';

                const actions = ui.card.querySelector('.dlg-actions');

                function done(val) {
                    ui.overlay.classList.remove('dlg-open');
                    setTimeout(function () { ui.overlay.remove(); }, 200);
                    resolve(val);
                }

                const cancel = document.createElement('button');
                cancel.className = 'dlg-btn dlg-btn-cancel';
                cancel.textContent = opts.cancelLabel || (window.t ? window.t('dlg.cancel') : 'Anuluj');
                cancel.addEventListener('click', function () { done(false); });

                const ok = document.createElement('button');
                ok.className = 'dlg-btn dlg-btn-ok' + (opts.danger ? ' dlg-danger' : '');
                ok.textContent = opts.confirmLabel || (window.t ? window.t('dlg.ok') : 'OK');
                ok.addEventListener('click', function () { done(true); });

                actions.appendChild(cancel);
                actions.appendChild(ok);

                ui.overlay.addEventListener('click', function (e) {
                    if (e.target === ui.overlay) done(false);
                });
                document.addEventListener('keydown', function esc(e) {
                    if (e.key === 'Escape') {
                        document.removeEventListener('keydown', esc);
                        done(false);
                    }
                });

                document.body.appendChild(ui.overlay);
                requestAnimationFrame(function () { ui.overlay.classList.add('dlg-open'); ok.focus(); });
            } catch (e) {
                resolve(window.confirm(message)); // awaryjnie
            }
        });
    }

    window.Dialogs = {
        alert: alertBox,
        confirm: confirmBox
    };
})();
