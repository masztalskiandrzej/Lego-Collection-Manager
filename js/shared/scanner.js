/**
 * Scanner — skaner kodów QR i kreskowych przez kamerę (html5-qrcode z CDN).
 *
 * Użycie:
 *   Scanner.open({
 *       title: 'Skanowanie',                 // opcjonalny nagłówek
 *       onResult: (text, format) => {...},   // wywoływane raz po skanie
 *   });
 *
 * Biblioteka ładowana z CDN przy pierwszym użyciu. Kamera wymaga HTTPS
 * lub localhost (secure context). Bez zgody/błędu kamery — dialog z błędem.
 */
(function () {
    const CDN = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
    let libPromise = null;

    function loadLibrary() {
        if (libPromise) return libPromise;
        libPromise = new Promise(function (resolve, reject) {
            if (typeof window.Html5Qrcode !== 'undefined') { resolve(); return; }
            const script = document.createElement('script');
            script.src = CDN;
            script.onload = function () { resolve(); };
            script.onerror = function () {
                libPromise = null;
                reject(new Error('scanner-lib'));
            };
            document.head.appendChild(script);
        });
        return libPromise;
    }

    function injectStyle() {
        if (document.getElementById('scanner-style')) return;
        const css = [
            '.scanner-overlay{position:fixed;inset:0;background:rgba(5,10,20,.92);z-index:10100;',
            'display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px}',
            '.scanner-title{color:#fff;font-size:1.15rem;font-weight:700;margin-bottom:6px;text-align:center}',
            '.scanner-hint{color:#9fb0c8;font-size:.85rem;margin-bottom:18px;text-align:center;max-width:340px}',
            '.scanner-view{width:min(92vw,460px);border-radius:16px;overflow:hidden;',
            'border:2px solid rgba(255,213,0,.5);background:#000}',
            '.scanner-view video{width:100%;display:block}',
            '.scanner-close{margin-top:18px;background:rgba(255,255,255,.12);color:#fff;border:none;',
            'border-radius:10px;padding:10px 26px;font-size:.9rem;font-weight:600;cursor:pointer;',
            'font-family:inherit;transition:background .15s}',
            '.scanner-close:hover{background:rgba(255,255,255,.25)}'
        ].join('');
        const style = document.createElement('style');
        style.id = 'scanner-style';
        style.textContent = css;
        document.head.appendChild(style);
    }

    const Scanner = {
        /**
         * Otwórz skaner; wywoła onResult(text, format) po udanym skanie.
         */
        open: function (opts) {
            opts = opts || {};
            const t = window.I18N ? window.I18N.t.bind(window.I18N) : function (k) { return k; };

            if (!window.isSecureContext) {
                if (window.Dialogs) window.Dialogs.alert(t('scan.secureError'), { type: 'error' });
                return;
            }

            injectStyle();

            const overlay = document.createElement('div');
            overlay.className = 'scanner-overlay';
            overlay.innerHTML =
                '<div class="scanner-title">' + (opts.title || t('scan.title')) + '</div>' +
                '<div class="scanner-hint">' + t('scan.hint') + '</div>' +
                '<div class="scanner-view" id="scannerViewBox"></div>' +
                '<button type="button" class="scanner-close">' + t('scan.close') + '</button>';
            document.body.appendChild(overlay);

            let scannerInstance = null;
            let stopped = false;

            function cleanup() {
                if (stopped) return;
                stopped = true;
                if (scannerInstance) {
                    scannerInstance.stop().catch(function () {}).then(function () {
                        try { scannerInstance.clear(); } catch (e) {}
                        overlay.remove();
                    }).catch(function () { overlay.remove(); });
                } else {
                    overlay.remove();
                }
            }

            overlay.querySelector('.scanner-close').addEventListener('click', cleanup);
            overlay.addEventListener('click', function (e) {
                if (e.target === overlay) cleanup();
            });

            loadLibrary().then(function () {
                const formats = [
                    Html5QrcodeSupportedFormats.QR_CODE,
                    Html5QrcodeSupportedFormats.EAN_13,
                    Html5QrcodeSupportedFormats.EAN_8,
                    Html5QrcodeSupportedFormats.UPC_A,
                    Html5QrcodeSupportedFormats.UPC_E,
                    Html5QrcodeSupportedFormats.CODE_128,
                    Html5QrcodeSupportedFormats.CODE_39
                ];

                scannerInstance = new Html5Qrcode('scannerViewBox', {
                    formatsToSupport: formats,
                    verbose: false,
                    experimentalFeatures: { useBarCodeDetectorIfSupported: true }
                });

                scannerInstance.start(
                    { facingMode: 'environment' },
                    { fps: 10, qrbox: { width: 260, height: 170 } },
                    function (decodedText, decodedResult) {
                        const text = String(decodedText || '');
                        const format = decodedResult && decodedResult.result
                            ? decodedResult.result.format.formatName : '';
                        const cb = opts.onResult;
                        cleanup();
                        if (typeof cb === 'function') cb(text, format);
                    },
                    function () { /* błędy klatek — ignorujemy */ }
                ).catch(function (err) {
                    cleanup();
                    const msg = (err && String(err).indexOf('Permission') !== -1)
                        ? t('scan.cameraDenied')
                        : t('scan.cameraError');
                    if (window.Dialogs) window.Dialogs.alert(msg, { type: 'error' });
                });
            }).catch(function () {
                cleanup();
                if (window.Dialogs) window.Dialogs.alert(t('scan.libError'), { type: 'error' });
            });
        }
    };

    window.Scanner = Scanner;
})();
