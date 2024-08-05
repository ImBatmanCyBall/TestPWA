(function (window) {
    "use strict";

    let promptState = null;

    async function initialize() {
        // Initialize other functionalities
        bindEvents();
    }

    function bindEvents() {

        let $triggerInstall = document.querySelectorAll('.triggerInstall');

        //bind click event handler to all $triggerInstall elements
        $triggerInstall.forEach(trigger => trigger.addEventListener('click', function () {

            if (promptState && promptState.beforeInstallPrompt) {
                promptState.beforeInstallPrompt.prompt();
                promptState.beforeInstallPrompt.userChoice.then(function (choiceResult) {
                    if (choiceResult.outcome === 'accepted') {
                        console.log('User accepted the A2HS prompt');
                        session.added = true;
                        updateSession();
                        loadApplicationAssets();
                    } else {
                        console.log('User dismissed the A2HS prompt');
                        showRetryPrompt();
                    }
                    promptState.beforeInstallPrompt = null;
                });
            }
        }));

    }

    function showRetryPrompt() {

        let $btnInstall = document.getElementById('.btn-install');

        $btnInstall.forEach($btn => {

            $btn.classList.remove('visible');

        });

        document.querySelector('.btn-retry').classList.add('visible');

    }

    function a2hsCheck() {

        try {

            if (window.addToHomescreen) {

                addToHomescreen({
                    logging: true,
                    customCriteria: function () { return true; }, // Always passes
                    autostart: true,
                    maxDisplayCount: 0, // No limit to the number of times the message can be shown
                    displayPace: 1, // Show every 1 minute
                    minSessions: 0, // Show regardless of the number of sessions
                    onInit: function (_instance) {
                        // Reset the session.shown flag for development
                        _instance.clearDisplayCount();
                    },
                    onShow: function (pForm, session, _instance) {
                        console.log(pForm);

                        //alert("onShow");

                        canPrompt(pForm);
                    },
                    onCanInstall: function (pForm, session, _instance) {
                        console.log("can prompt: ", pForm);

                        //alert("onCanInstall");

                        canPrompt(pForm);
                    },
                    onInstalled: function (pForm, session, _instance) {
                        console.log("installed: ", pForm);

                        //alert("onCanIonInstallednstall");

                        loadApplicationAssets();

                    },
                    onBeforeInstallPrompt: function (platform) {
                        console.log("native prompt: ", platform);
                        platform.beforeInstallPrompt.preventDefault(); // Prevent the mini-infobar from appearing
                        promptState = platform;

                        document.querySelector(".beforeinstallprompt-instructions").classList.add('visible');

                        //alert("beforeInstallPrompt");
                        checkA2HSPrompt();
                    }
                });

            }

        } catch (error) {

            //alert("A2HS error: ", JSON.stringify(error, null, 2));

        }

    }

    function canPrompt(platform) {

        promptState = platform;

        //alert("canPrompt");

        checkA2HSPrompt();

    }

    function checkA2HSPrompt() {

        //alert('promptsState: \r\n' + JSON.stringify(promptState, null, 2));

        if (promptState && (promptState.beforeInstallPrompt || !promptState.isInstalled || !promptState.isStandalone)) {

            console.log("App needs to be installed");
            // Show custom installation instructions
            showInstallInstructions();
        } else {
            // If not able to show install prompt, proceed to load application assets
            loadApplicationAssets();
        }
    }

    // Service worker registration
    const SERVICE_WORKER_URL = 'sw.js';
    const BADGING_SYNC_TAG = 'badging';
    const CONTENT_SYNC_TAG = 'content-sync';
    const SYNC_MIN_INTERVAL = 60 * 60 * 1000;

    let serviceWorker;

    async function registerServiceWorker() {
        try {
            if (!('serviceWorker' in navigator)) {
                return;
            }

            const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL);

            if (registration.active) {
                postMessage('precache-update');
            }

            await handleServiceWorkerStateChange(registration);

            a2hsCheck();

            if ('periodicSync' in registration) {
                await handlePeriodicSync(registration);
            }

            console.log(`ServiceWorker registration successful with scope: ${registration.scope}`);
        } catch (error) {
            console.error(`ServiceWorker registration failed: ${error}`);
        }

        navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    async function handleServiceWorkerStateChange(registration) {
        serviceWorker = registration.active;

        if (serviceWorker) {
            serviceWorker.addEventListener('statechange', function (e) {
                if (e.target.state === 'activated') {
                    postMessage('precache-update state change');
                }
            });
        }
    }

    async function handlePeriodicSync(registration) {
        const status = await navigator.permissions.query({ name: 'periodic-background-sync' });

        console.log(`periodic-background-sync, status.state: ${status.state}`);

        if (status.state !== 'granted') {
            return;
        }

        const tags = await registration.periodicSync.getTags();

        await handlePeriodicSyncTag(registration, tags, BADGING_SYNC_TAG);
        await handlePeriodicSyncTag(registration, tags, CONTENT_SYNC_TAG);
    }

    async function handlePeriodicSyncTag(registration, tags, tag) {
        if (tags.includes(tag)) {
            return;
        }

        try {
            await registration.periodicSync.register(tag, { minInterval: SYNC_MIN_INTERVAL });
        } catch (error) {
            console.info(`${tag} error: ${error}`);
        }
    }

    function handleServiceWorkerMessage(event) {
        try {
            const message = JSON.parse(event.data);
            const isRefresh = message.type === 'refresh';
            const isAsset = message.url.includes('asset');
            const lastETag = localStorage.currentETag;
            const isNew = lastETag !== message.eTag;

            if (isRefresh && isAsset && isNew) {
                if (lastETag) {
                    notice.hidden = false;
                    localStorage.currentETag = message.eTag;
                }

                switch (message.type) {
                    case 'offline':
                        updateOnlineStatus({ onLine: false });
                        break;
                    case 'online':
                        updateOnlineStatus({ onLine: true });
                        break;
                    default:
                        break;
                }
            }
        } catch (error) {
            console.error('Error parsing message from service worker', event, error);
        }
    }

    function postMessage(msg) {
        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage(msg);
        }
    }

    if (document.readyState === "complete") {
        initialize();
    } else {
        document.addEventListener("readystatechange", function (event) {
            if (event.target.readyState === "complete") {
                initialize();
            }
        });
    }

    registerServiceWorker();

    function showInstallInstructions() {

        document.getElementById('loading-cover').style.display = 'none';
        document.getElementById('installPrompt').classList.add('visible');

        const instructions = document.querySelectorAll('.install-instructions');
        instructions.forEach(inst => inst.classList.remove('visible'));

        if (promptState.isiPhone) {
            document.getElementById('install-iPhone').classList.add('visible');
        } else if (promptState.isiPad) {
            document.getElementById('install-iPad').classList.add('visible');
        } else if (promptState.isAndroid) {
            document.getElementById('install-Android').classList.add('visible');
        } else if (promptState.isWindows) {
            document.getElementById('install-Windows').classList.add('visible');

            if (promptState.isEdge) {

                let instructions = document.querySelectorAll('.edge-icon-install');

                //loop over all the elements and add the class
                instructions.forEach(inst => inst.classList.add('visible'));

            } else if (promptState.isChrome) {

                let instructions = document.querySelectorAll('.chrome-icon-install');

                //loop over all the elements and add the class
                instructions.forEach(inst => inst.classList.add('visible'));

            }

        } else {
            document.getElementById('install-Other').classList.add('visible');
        }

    }

    function loadApplicationAssets() {

        //alert('loadApplicationAssets');

        document.getElementById('installPrompt').style.display = 'none';
      //  document.getElementById('loading-cover').style.display = 'none';
        document.getElementById('unity-container').style.display = 'block';

        loadGameAssets();

    }

    function loadGameAssets() {
        // Load game assets

        const canvas = document.querySelector("#unity-canvas");
        const loadingBar = document.querySelector("#unity-loading-bar");
        const warningBanner = document.querySelector("#unity-warning");
        const progressBarFull = document.querySelector("#unity-progress-bar-full");

        const buildUrl = "Build";
        const loaderUrl = buildUrl + "/MechTest.loader.js";
        const config = {
            dataUrl: buildUrl + "/MechTest.data",
            frameworkUrl: buildUrl + "/MechTest.framework.js",
            codeUrl: buildUrl + "/MechTest.wasm",
            streamingAssetsUrl: "StreamingAssets",
            companyName: "XEX",
            productName: "XEX-Game",
            productVersion: "0.1.4"
        };

        const script = document.createElement("script");
        script.src = loaderUrl;

        script.onload = async () => {

            try {

                // const module = await import('js/libs/thirdweb-unity-bridge.js');

                // const unityInstance = await createUnityInstance(canvas, config, (progress) => {
                //     spinner.style.display = "none";
                //     progressBarEmpty.style.display = "";
                //     progressBarFull.style.width = `${100 * progress}%`;
                // });

                // loadingCover.style.display = "none";

                createUnityInstance(canvas, config, (progress) => {
                    progressBarFull.style.width = 100 * progress + "%";
                }).then((unityInstance) => {
                    loadingBar.style.display = "none";
                }).catch((message) => {
                    alert(message);
                });

            } catch (error) {
                //alert(error.message);
            }
        };

        document.body.appendChild(script);

    }

})(this);