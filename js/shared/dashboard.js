/**
 * Dashboard — przegląd statystyk kolekcji na stronie głównej.
 * Agreguje sets + minifigs po stronie klienta i renderuje:
 * karty KPI, podział po statusie, top motywy, rozkład lat.
 * Re-renderuje się przy zmianie języka (event 'languagechange').
 */
(function () {
    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function aggregate(items) {
        const stats = {
            total: items.length,
            status: { owned: 0, wishlist: 0, sold: 0 },
            statusValue: { owned: 0, wishlist: 0, sold: 0 },
            totalValue: 0,
            totalPieces: 0,
            marketValue: 0,
            pairedPP: 0,
            pairedMV: 0,
            themes: Object.create(null), // theme -> { count, value }
            years: Object.create(null)   // year  -> count
        };

        for (const it of items) {
            const val = parseFloat(it.pricePaid) || 0;
            stats.totalValue += val;
            stats.totalPieces += parseInt(it.pieceCount, 10) || 0;

            const mv = parseFloat(it.marketValue) || 0;
            if (mv > 0) {
                stats.marketValue += mv;
                if (val > 0) {
                    stats.pairedPP += val;
                    stats.pairedMV += mv;
                }
            }

            if (it.status && stats.status[it.status] !== undefined) {
                stats.status[it.status]++;
                stats.statusValue[it.status] += val;
            }

            if (it.theme) {
                const th = stats.themes[it.theme] || (stats.themes[it.theme] = { count: 0, value: 0 });
                th.count++;
                th.value += val;
            }
            if (it.year) {
                stats.years[it.year] = (stats.years[it.year] || 0) + 1;
            }
        }
        return stats;
    }

    const Dashboard = {
        async render() {
            const el = document.getElementById('dashboardSection');
            if (!el) return;
            if (!window.Auth || !window.Auth.getUserId()) {
                el.style.display = 'none';
                return;
            }
            try {
                const sets = window.createFirestoreStorage('setsCollection', () => window.Auth.getUserId());
                const figs = window.createFirestoreStorage('minifigsCollection', () => window.Auth.getUserId());
                const [setsItems, figItems] = await Promise.all([sets.getCollection(), figs.getCollection()]);
                this.renderInto(el, setsItems.concat(figItems));
                el.style.display = 'block';
            } catch (e) {
                el.style.display = 'none';
            }
        },

        renderInto(el, items) {
            const t = window.I18N ? window.I18N.t.bind(window.I18N) : function (k) { return k; };
            const s = aggregate(items);
            const money = function (v) { return '$' + (Math.round(v * 100) / 100).toFixed(2); };

            if (s.total === 0) {
                el.innerHTML =
                    '<h2 class="dash-title">' + esc(t('dash.title')) + '</h2>' +
                    '<p class="dash-empty">' + esc(t('dash.empty')) + '</p>';
                return;
            }

            // KPI
            const cards = [
                { v: s.total.toLocaleString(), l: t('dash.totalItems') },
                { v: money(s.totalValue), l: t('dash.totalValue') }
            ];
            if (s.marketValue > 0) {
                cards.push({ v: money(s.marketValue), l: t('dash.marketValue') });
            }
            cards.push(
                { v: s.totalPieces.toLocaleString(), l: t('dash.totalPieces') },
                { v: Object.keys(s.themes).length.toLocaleString(), l: t('dash.themesCount') }
            );

            let html = '<h2 class="dash-title">' + esc(t('dash.title')) + '</h2>';
            html += '<div class="dash-cards">' + cards.map(function (c) {
                return '<div class="dash-card">' +
                    '<div class="dash-card-value">' + esc(c.v) + '</div>' +
                    '<div class="dash-card-label">' + esc(c.l) + '</div>' +
                    '</div>';
            }).join('') + '</div>';

            // Podział po statusie
            const maxStatus = Math.max(s.status.owned, s.status.wishlist, s.status.sold, 1);
            html += '<div class="dash-block"><h3 class="dash-block-title">' + esc(t('dash.statusTitle')) + '</h3>';
            ['owned', 'wishlist', 'sold'].forEach(function (k) {
                const pct = Math.round((s.status[k] / maxStatus) * 100);
                html += '<div class="dash-row">' +
                    '<span class="dash-row-label">' + esc(t('status.' + k)) + '</span>' +
                    '<div class="dash-bar-track"><div class="dash-bar dash-bar-' + k + '" style="width:' + pct + '%"></div></div>' +
                    '<span class="dash-row-value">' + s.status[k].toLocaleString() + ' &middot; ' + money(s.statusValue[k]) + '</span>' +
                    '</div>';
            });
            html += '</div>';

            // Rynek vs cena zakupu
            if (s.pairedMV > 0) {
                const profit = s.pairedMV - s.pairedPP;
                const roiPct = s.pairedPP > 0 ? (profit / s.pairedPP) * 100 : 0;
                const maxCmp = Math.max(s.pairedMV, s.pairedPP, 1);
                const row = function (label, value, pct, cls) {
                    return '<div class="dash-row">' +
                        '<span class="dash-row-label">' + esc(label) + '</span>' +
                        '<div class="dash-bar-track"><div class="dash-bar ' + cls + '" style="width:' + Math.round(pct * 100) + '%"></div></div>' +
                        '<span class="dash-row-value">' + value + '</span>' +
                        '</div>';
                };
                html += '<div class="dash-block"><h3 class="dash-block-title">' + esc(t('dash.compareTitle')) + '</h3>';
                html += row(t('dash.purchaseSum'), money(s.pairedPP), s.pairedPP / maxCmp, 'dash-bar-theme');
                html += row(t('dash.marketSum'), money(s.pairedMV), s.pairedMV / maxCmp, 'dash-bar-owned');
                const profitCls = profit >= 0 ? 'roi-up' : 'roi-down';
                const profitSign = profit >= 0 ? '+' : '';
                html += '<div class="dash-row"><span class="dash-row-label">' + esc(t('dash.profit')) + '</span>' +
                    '<div class="dash-bar-track"></div>' +
                    '<span class="dash-row-value"><span class="roi-badge ' + profitCls + '">' + profitSign + money(profit) +
                    ' (' + profitSign + roiPct.toFixed(1) + '%)</span></span></div>';
                html += '</div>';
            }

            // Top motywy (5)
            const themes = Object.keys(s.themes).map(function (name) {
                return { name: name, count: s.themes[name].count, value: s.themes[name].value };
            }).sort(function (a, b) { return b.count - a.count; }).slice(0, 5);

            if (themes.length) {
                const maxT = themes[0].count;
                html += '<div class="dash-block"><h3 class="dash-block-title">' + esc(t('dash.topThemesTitle')) + '</h3>';
                themes.forEach(function (th) {
                    const pct = Math.round((th.count / maxT) * 100);
                    html += '<div class="dash-row">' +
                        '<span class="dash-row-label">' + esc(th.name) + '</span>' +
                        '<div class="dash-bar-track"><div class="dash-bar dash-bar-theme" style="width:' + pct + '%"></div></div>' +
                        '<span class="dash-row-value">' + th.count + ' &middot; ' + money(th.value) + '</span>' +
                        '</div>';
                });
                html += '</div>';
            }

            // Rozkład lat (ostatnie 12 lat z danymi)
            const years = Object.keys(s.years).map(Number).sort(function (a, b) { return a - b; });
            const yearsSlice = years.slice(-12);
            if (yearsSlice.length) {
                const maxY = Math.max.apply(null, yearsSlice.map(function (y) { return s.years[y]; }));
                html += '<div class="dash-block"><h3 class="dash-block-title">' + esc(t('dash.yearsTitle')) + '</h3>';
                yearsSlice.forEach(function (y) {
                    const pct = Math.round((s.years[y] / maxY) * 100);
                    html += '<div class="dash-row">' +
                        '<span class="dash-row-label">' + y + '</span>' +
                        '<div class="dash-bar-track"><div class="dash-bar dash-bar-year" style="width:' + pct + '%"></div></div>' +
                        '<span class="dash-row-value">' + s.years[y] + '</span>' +
                        '</div>';
                });
                html += '</div>';
            }

            el.innerHTML = html;
        }
    };

    window.Dashboard = Dashboard;

    // Teaser na dolnej krawędzi paneli -> płynny scroll do dashboardu
    function initTeaser() {
        const btn = document.getElementById('dashTeaser');
        if (!btn) return;
        btn.addEventListener('click', function () {
            const sec = document.getElementById('dashboardSection');
            if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTeaser);
    } else {
        initTeaser();
    }
})();
