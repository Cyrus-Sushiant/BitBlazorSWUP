; (function () {
    log('starting...')

    var bitBlazorSwupScriptTag = document.currentScript;
    
    var debugAttribute = bitBlazorSwupScriptTag.attributes['debug'];
    var debug = debugAttribute && debugAttribute.value && debugAttribute.value.toLowerCase() === 'true';

    var swAttribute = bitBlazorSwupScriptTag.attributes['sw'];
    var sw = (swAttribute && swAttribute.value) || 'service-worker.js';

    var swupHandlerName = 'bitBlazorSwup';
    var progressHandlerAttribute = bitBlazorSwupScriptTag.attributes['handler'];
    if (progressHandlerAttribute && progressHandlerAttribute.value) {
        swupHandlerName = progressHandlerAttribute.value;
    }
    var swupHandler = window[swupHandlerName];
    if (!swupHandler || typeof swupHandler !== 'function') {
        warn(`progress handler (window.${swupHandlerName}) is not a function!`);
        swupHandler = undefined;
    }

    if (!('serviceWorker' in navigator)) {
        warn('no serviceWorker in navigator');
        return;
    }

    navigator.serviceWorker.register(sw).then(prepareRegistration);
    navigator.serviceWorker.addEventListener('message', handleSwMessage);
    navigator.serviceWorker.addEventListener('controllerchange', handleController);

    var reloadPage;
    function prepareRegistration(reg) {
        reloadPage = function () {
            if (navigator.serviceWorker.controller) {
                reg.waiting && reg.waiting.postMessage('SKIP_WAITING');
            } else {
                window.location.reload();
            }
        };

        if (reg.waiting) {
            if (reg.installing) {
                handle('installing', {});
            } else {
                handle('installed', { reload: () => reloadPage() });
            }
        }

        reg.addEventListener('updatefound', function (e) {
            log('update found', e);
            handle('update_found', e);
            if (!reg.installing) {
                warn('no registration.installing found!');
                return;
            }
            reg.installing.addEventListener('statechange', function (e) {
                log('state chnaged', e, 'eventPhase:', e.eventPhase, 'currentTarget.state:', e.currentTarget.state);
                handle('state_changed', e);

                if (!reg.waiting) return;

                if (navigator.serviceWorker.controller) {
                    log('update finished.');
                } else {
                    log('initialization finished.');
                }
            });
        });
    }


    function handleSwMessage(e) {
        const message = JSON.parse(e.data);
        const type = message.type;
        const data = message.data;

        if (type === 'installing') {
            handle('installing', data);
        }

        if (type === 'progress') {
            handle('progress', data);
        }

        if (type === 'installed') {
            handle('installed', { ...data, reload: () => reloadPage() });
        }

        if (type === 'activate') {
            handle('activate', data);
        }
    }


    var refreshing = false;
    function handleController(e) {
        log('controller changed.', e);
        handle('controller_changed', e);
        if (refreshing) {
            warn('app is already refreshing...');
            return;
        }
        refreshing = true;
        window.location.reload();
    }

    function handle() {
        swupHandler && swupHandler(...arguments);
    }

    function log() {
        _l('log', ...arguments);
    }

    function warn() {
        _l('warn', ...arguments);
    }

    function _l(fn, ...args) {
        debug && console[fn]('BlazorSWUP:', ...args);
    }

}());