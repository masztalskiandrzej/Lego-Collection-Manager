/**
 * Lightbox — klik na zdjęciu karty otwiera duży podgląd.
 *
 * Sam podpina delegację klików na #collectionGrid (.card-image img).
 * Zamykanie: Esc, klik gdziekolwiek, przycisk ✕. Strzałki ←/→ przechodzą
 * między zdjęciami widocznych kart.
 */
(function () {
    function injectStyle() {
        if (document.getElementById('lightbox-style')) return;
        const css = [
            '.lightbox-overlay{position:fixed;inset:0;background:rgba(0,0,0,.85);display:flex;',
            'align-items:center;justify-content:center;z-index:10001;opacity:0;',
            'transition:opacity .2s ease;cursor:zoom-out}',
            '.lightbox-overlay.lb-open{opacity:1}',
            '.lightbox-img{max-width:92vw;max-height:88vh;border-radius:12px;',
            'box-shadow:0 20px 60px rgba(0,0,0,.5);transform:scale(.95);',
            'transition:transform .2s ease;cursor:default;background:#111}',
            '.lightbox-overlay.lb-open .lightbox-img{transform:scale(1)}',
            '.lightbox-close{position:fixed;top:16px;right:20px;background:rgba(255,255,255,.12);',
            'color:#fff;border:none;font-size:1.6rem;width:44px;height:44px;border-radius:50%;',
            'cursor:pointer;line-height:1;transition:background .15s}',
            '.lightbox-close:hover{background:rgba(255,255,255,.25)}',
            '.lightbox-nav{position:fixed;top:50%;transform:translateY(-50%);background:rgba(255,255,255,.12);',
            'color:#fff;border:none;font-size:1.8rem;width:46px;height:46px;border-radius:50%;',
            'cursor:pointer;transition:background .15s}',
            '.lightbox-nav:hover{background:rgba(255,255,255,.25)}',
            '.lightbox-prev{left:16px}.lightbox-next{right:16px}',
            '.lightbox-counter{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);',
            'color:rgba(255,255,255,.75);font:600 .85rem system-ui,sans-serif;background:rgba(0,0,0,.4);',
            'padding:6px 14px;border-radius:20px}'
        ].join('');
        const style = document.createElement('style');
        style.id = 'lightbox-style';
        style.textContent = css;
        document.head.appendChild(style);
    }

    let images = [];
    let index = 0;
    let overlay = null;

    function currentSrc() {
        const img = images[index];
        if (!img) return '';
        // Użyj pełnego URL-a; base64 działa bez zmian
        return img.src;
    }

    function render() {
        if (!images.length) return;
        overlay.innerHTML = '';
        const img = document.createElement('img');
        img.className = 'lightbox-img';
        img.src = currentSrc();
        img.alt = '';
        img.addEventListener('click', function (e) { e.stopPropagation(); });
        overlay.appendChild(img);

        if (images.length > 1) {
            const prev = document.createElement('button');
            prev.className = 'lightbox-nav lightbox-prev';
            prev.innerHTML = '&lsaquo;';
            prev.addEventListener('click', function (e) { e.stopPropagation(); show(index - 1); });
            const next = document.createElement('button');
            next.className = 'lightbox-nav lightbox-next';
            next.innerHTML = '&rsaquo;';
            next.addEventListener('click', function (e) { e.stopPropagation(); show(index + 1); });
            const counter = document.createElement('div');
            counter.className = 'lightbox-counter';
            counter.textContent = (index + 1) + ' / ' + images.length;
            overlay.appendChild(prev);
            overlay.appendChild(next);
            overlay.appendChild(counter);
        }

        const close = document.createElement('button');
        close.className = 'lightbox-close';
        close.innerHTML = '&times;';
        close.addEventListener('click', function (e) { e.stopPropagation(); hide(); });
        overlay.appendChild(close);
    }

    function show(i) {
        index = (i + images.length) % images.length;
        render();
    }

    function hide() {
        if (!overlay) return;
        overlay.classList.remove('lb-open');
        setTimeout(function () { overlay.remove(); overlay = null; }, 200);
    }

    function open(startImg) {
        injectStyle();
        images = Array.from(document.querySelectorAll('#collectionGrid .card-image img'))
            .filter(function (img) { return img.src; });
        index = images.indexOf(startImg);
        if (index < 0) index = 0;
        if (!images.length) return;

        overlay = document.createElement('div');
        overlay.className = 'lightbox-overlay';
        overlay.addEventListener('click', hide);
        document.body.appendChild(overlay);
        requestAnimationFrame(function () { overlay.classList.add('lb-open'); });
        render();
    }

    document.addEventListener('keydown', function (e) {
        if (!overlay) return;
        if (e.key === 'Escape') hide();
        if (e.key === 'ArrowLeft') show(index - 1);
        if (e.key === 'ArrowRight') show(index + 1);
    });

    function init() {
        const grid = document.getElementById('collectionGrid');
        if (!grid) return;
        grid.addEventListener('click', function (e) {
            const img = e.target.closest('.card-image img');
            if (img) {
                e.preventDefault();
                open(img);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
