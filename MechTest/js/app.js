(function (window) {
    "use strict";

    let promptState = null,
        gamePlay_template = null,
        home_template = null,
        pwa_template = null,
        login_template = null,
        app_container = document.querySelector('.app-container');

    async function initialize() {
        // Initialize other functionalities

        await loadTemplates();
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
                        // loadApplicationAssets();
                        loadHomePage();
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

                        //loadApplicationAssets();
                        loadHomePage();

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

            checkAuthentication();

        }
    }

    function checkAuthentication() {

        //check if user is authenticated, localstorage.getItem("token") !== null

        if (localStorage.getItem("token") !== null) {

            //load the game
            loadHomePage();

        } else {

            //load the login page
            loadLogin();

        }

    }

    function bindHomePageEvents() {

        let mainAppBar = document.querySelector('.appbar-main');

        mainAppBar.addEventListener('click', function (event) {

            let target = event.target.closest('.btn-appbar');

            if (target) {
                let panelId = target.getAttribute('target-panelid');
                let transformValue = target.getAttribute('transform');

                if (panelId && transformValue !== null) {
                    let panelContainer = document.querySelector('.xex-container');

                    if (panelContainer) {
                        // Update the transform value to scroll the desired panel into view
                        panelContainer.style.transform = `translateX(${transformValue}%)`;

                        // Optional: Add smooth scrolling behavior by modifying the transition (if needed)
                        panelContainer.style.transition = 'transform 0.5s ease-out';
                    }
                }
            }

        });

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
            // Parse the incoming message from the service worker
            const message = event.data;  // Assuming the message is already a JavaScript object, not JSON string

            switch (message.action) {
                case 'updateAvailable':
                    // Handle the update notification
                    handleUpdateAvailable(message);
                    break;

                case 'offline':
                    // Handle offline status
                    updateOnlineStatus({ onLine: false });
                    break;

                case 'online':
                    // Handle online status
                    updateOnlineStatus({ onLine: true });
                    break;

                default:
                    console.warn('Unhandled message action from service worker:', message.action);
                    break;
            }
        } catch (error) {
            console.error('Error handling message from service worker', event, error);
        }
    }

    function handleUpdateAvailable(message) {
        // Notify the user that an update is available
        const userConfirmed = confirm('A new version of the game is available. Do you want to reload the page to update?');

        if (userConfirmed) {
            // Reload the page to get the new version
            window.location.reload();
        }
    }

    function updateOnlineStatus({ onLine }) {
        if (onLine) {
            console.log('The application is online.');
            // You could update the UI to reflect online status if needed
        } else {
            console.log('The application is offline.');
            // You could update the UI to reflect offline status if needed
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

        insertTemplate(pwa_template);

        //document.getElementById('installPrompt').classList.add('visible');

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

        insertTemplate(gamePlay_template);

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

                try {

                    const unityInstance = await createUnityInstance(canvas, config, (progress) => {
                        progressBarFull.style.width = 100 * progress + "%";
                    });

                    loadingBar.style.display = "none";
                    document.getElementById('loading-cover').style.display = 'none';

                } catch (error) {
                    alert(error.message);
                }

            } catch (error) {
                //alert(error.message);
            }
        };

        document.body.appendChild(script);

    }

    function loadHomePage() {

        insertTemplate(home_template);

        bindHomePageEvents();

        document.querySelector('.xex-background').style.display = 'block';

    }

    function loadLogin() {

        insertTemplate(login_template);

        bindLoginEvents();

    }

    function bindLoginEvents() {

    }

    async function loadTemplate(url) {

        let response = await fetch(url);

        if (response.ok) {
            return await response.text();

        }

    }

    async function loadTemplates() {

        gamePlay_template = await loadTemplate('src/templates/game-play.html');
        home_template = await loadTemplate('src/templates/home-panels.html');
        pwa_template = await loadTemplate('src/templates/pwa-install.html');
        login_template = await loadTemplate('src/templates/login.html');

    }

    function insertTemplate(template) {

        app_container.innerHTML = template;

    }

})(this);