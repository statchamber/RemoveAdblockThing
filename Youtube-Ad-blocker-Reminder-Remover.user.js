// ==UserScript==
// @name         Remove Adblock Thing
// @namespace    http://tampermonkey.net/
// @version      5.6.1
// @description  Removes Adblock Thing
// @author       JoelMatic
// @match        https://www.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @updateURL    https://github.com/TheRealJoelmatic/RemoveAdblockThing/raw/main/Youtube-Ad-blocker-Reminder-Remover.user.js
// @downloadURL  https://github.com/TheRealJoelmatic/RemoveAdblockThing/raw/main/Youtube-Ad-blocker-Reminder-Remover.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Config
    const config = {
        adblocker: true,
        removePopup: false,
        updateCheck: true,
        debugMessages: true,
        fixTimestamps: true,
        updateModal: {
            enable: true,
            timer: 5000,
        }
    };

    // Variables
    let currentUrl = window.location.href;
    let isVideoPlayerModified = false;
    let hasIgnoredUpdate = false;

    // Setup
    log("Script started");

    function initialize() {
        if (config.adblocker) removeAds();
        if (config.removePopup) popupRemover();
        if (config.updateCheck) checkForUpdate();
        if (config.fixTimestamps) timestampFix();
    }

    // Ensure the script runs even if the page is not fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    function popupRemover() {
        const popupRemoverInterval = setInterval(() => {
            const modalOverlay = document.querySelector("tp-yt-iron-overlay-backdrop");
            const popup = document.querySelector(".style-scope ytd-enforcement-message-view-model");
            const popupButton = document.getElementById("dismiss-button");
            const video = document.querySelector('video');

            document.body.style.setProperty('overflow-y', 'auto', 'important');

            if (modalOverlay) {
                modalOverlay.removeAttribute("opened");
                modalOverlay.remove();
            }

            if (popup) {
                log("Popup detected, removing...");
                if (popupButton) popupButton.click();
                popup.remove();
                if (video) video.play();
                setTimeout(() => {
                    if (video && video.paused) video.play();
                }, 500);
                log("Popup removed");
            }

            if (video && video.paused) {
                video.play();
            }
        }, 1000);

        // Ensure the interval is cleared when the page is unloaded
        window.addEventListener('beforeunload', () => clearInterval(popupRemoverInterval));
    }

    function removeAds() {
        log("removeAds()");

        const adRemoverInterval = setInterval(() => {
            if (window.location.href !== currentUrl) {
                currentUrl = window.location.href;
                isVideoPlayerModified = false;
                clearAllPlayers();
                removePageAds();
            }

            if (window.location.href.includes("shorts")) {
                log("Youtube shorts detected, ignoring...");
                return;
            }

            if (isVideoPlayerModified) {
                removeAllDuplicateVideos();
                return;
            }

            log("Video replacement started!");

            const video = document.querySelector('video');
            if (video) {
                video.volume = 0;
                video.pause();
                video.remove();
            }

            if (!clearAllPlayers()) {
                return;
            }

            let errorScreen = document.querySelector("#error-screen");
            if (errorScreen) {
                errorScreen.remove();
            }

            const videoID = getVideoID();
            if (!videoID) {
                log("YouTube video URL not found.", "error");
                return;
            }

            log("Video ID: " + videoID);

            createNewVideoFrame(videoID);

            isVideoPlayerModified = true;
        }, 500);

        removePageAds();

        // Ensure the interval is cleared when the page is unloaded
        window.addEventListener('beforeunload', () => clearInterval(adRemoverInterval));
    }

    function getVideoID() {
        const url = new URL(window.location.href);
        const urlParams = new URLSearchParams(url.search);

        if (urlParams.has('v')) {
            return urlParams.get('v');
        } else {
            const pathSegments = url.pathname.split('/');
            const liveIndex = pathSegments.indexOf('live');
            if (liveIndex !== -1 && liveIndex + 1 < pathSegments.length) {
                return pathSegments[liveIndex + 1];
            }
        }

        return null;
    }

    function createNewVideoFrame(videoID, videoPlayerElement) {
        const startOfUrl = "https://www.youtube-nocookie.com/embed/";
        const endOfUrl = "?autoplay=1&modestbranding=1&rel=0";
        const finalUrl = startOfUrl + videoID + endOfUrl;

        const iframe = document.createElement('iframe');
        iframe.setAttribute('src', finalUrl);
        iframe.setAttribute('frameborder', '0');
        iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
        iframe.setAttribute('allowfullscreen', true);
        iframe.style.cssText = 'width: 100%; height: 100%; position: absolute; top: 0; left: 0; z-index: 9999; pointer-events: all;';
        const videoPlayerElements = document.querySelectorAll('.html5-video-player');
        videoPlayerElements.forEach(videoPlayerElement => {
            if (!videoPlayerElement.closest('.video-preview') && !videoPlayerElement.closest('#video-preview')) {
                videoPlayerElement.appendChild(iframe);
                log("New video frame created");
            } else {
                log("Video preview detected, ignoring...");
            }
        });
    }

    function removeAllDuplicateVideos() {
        const videos = document.querySelectorAll('video');

        videos.forEach(video => {
            if (video.src.includes('www.youtube.com')) {
                video.muted = true;
                video.pause();
                video.addEventListener('volumechange', function() {
                    if (!video.muted) {
                        video.muted = true;
                        video.pause();
                        log("Video unmuted detected and remuted");
                    }
                });
                video.addEventListener('play', function() {
                    video.pause();
                    log("Video play detected and repaused");
                });

                log("Duplicate video found and muted");
            }
        });
    }

    function clearAllPlayers() {
        const videoPlayerElements = document.querySelectorAll('.html5-video-player');

        if (videoPlayerElements.length === 0) {
            log("No elements with class 'html5-video-player' found.", "error");
            return false;
        }

        videoPlayerElements.forEach(videoPlayerElement => {
            const iframes = videoPlayerElement.querySelectorAll('iframe');
            iframes.forEach(iframe => {
                iframe.remove();
            });
        });

        log("Removed all current players!");
        return true;
    }

    function removePageAds() {
        const style = document.createElement('style');
        style.textContent = `
            ytd-action-companion-ad-renderer,
            ytd-display-ad-renderer,
            ytd-video-masthead-ad-advertiser-info-renderer,
            ytd-video-masthead-ad-primary-video-renderer,
            ytd-in-feed-ad-layout-renderer,
            ytd-ad-slot-renderer,
            yt-about-this-ad-renderer,
            yt-mealbar-promo-renderer,
            ytd-statement-banner-renderer,
            ytd-ad-slot-renderer,
            ytd-in-feed-ad-layout-renderer,
            ytd-banner-promo-renderer-background
            statement-banner-style-type-compact,
            .ytd-video-masthead-ad-v3-renderer,
            div#root.style-scope.ytd-display-ad-renderer.yt-simple-endpoint,
            div#sparkles-container.style-scope.ytd-promoted-sparkles-web-renderer,
            div#main-container.style-scope.ytd-promoted-video-renderer,
            div#player-ads.style-scope.ytd-watch-flexy,
            ad-slot-renderer,
            ytm-promoted-sparkles-web-renderer,
            masthead-ad,
            tp-yt-iron-overlay-backdrop,
            #masthead-ad {
                display: none !important;
            }
        `;

        document.head.appendChild(style);

        const sponsor = document.querySelectorAll("div#player-ads.style-scope.ytd-watch-flexy, div#panels.style-scope.ytd-watch-flexy");
        sponsor?.forEach((element) => {
            if (element.getAttribute("id") === "rendering-content") {
                element.childNodes?.forEach((childElement) => {
                    if (childElement?.data?.targetId && childElement?.data?.targetId !== "engagement-panel-macro-markers-description-chapters") {
                        element.style.display = 'none';
                    }
                });
            }
        });

        log("Removed page ads (✔️)");
    }

    function changeTimestamp(timestamp) {
        const videoPlayerElements = document.querySelectorAll('.html5-video-player');
        videoPlayerElements.forEach(videoPlayerElement => {
            const iframes = videoPlayerElement.querySelectorAll('iframe');
            iframes.forEach(iframe => {
                if (iframe.src.includes("&start=")) {
                    iframe.src = iframe.src.replace(/&start=\d+/, "&start=" + timestamp);
                } else {
                    iframe.src += "&start=" + timestamp;
                }
            });
        });
    }

    function timestampFix() {
        document.addEventListener('click', function(event) {
            const target = event.target;

            if (target.classList.contains('yt-core-attributed-string__link') && target.href.includes('&t=')) {
                event.preventDefault();
                const timestamp = target.href.split('&t=')[1].split('s')[0];
                log(`Timestamp link clicked: ${timestamp} seconds`);
                changeTimestamp(timestamp);
            }
        });
    }

    const observer = new MutationObserver((mutations) => {
        let isVideoAdded = mutations.some(mutation =>
            Array.from(mutation.addedNodes).some(node => node.tagName === 'VIDEO')
        );

        if (isVideoAdded) {
            log("New video detected, checking for duplicates.");
            if (window.location.href.includes("shorts")) {
                log("Youtube shorts detected, ignoring...");
                return;
            }
            removeAllDuplicateVideos();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    function checkForUpdate() {
        if ((window.top !== window.self && !window.location.href.includes("youtube.com")) || hasIgnoredUpdate) {
            return;
        }

        const scriptUrl = 'https://raw.githubusercontent.com/TheRealJoelmatic/RemoveAdblockThing/main/Youtube-Ad-blocker-Reminder-Remover.user.js';

        fetch(scriptUrl)
            .then(response => response.text())
            .then(data => {
                const match = data.match(/@version\s+(\d+\.\d+)/);
                if (!match) {
                    log("Unable to extract version from the GitHub script.", "error");
                    return;
                }

                const githubVersion = parseFloat(match[1]);
                const currentVersion = parseFloat(GM_info.script.version);

                if (githubVersion <= currentVersion) {
                    log(`You have the latest version of the script. ${githubVersion} : ${currentVersion}`);
                    return;
                }

                log(`A new version is available. Please update your script. ${githubVersion} : ${currentVersion}`);

                if (config.updateModal.enable) {
                    showUpdateModal(githubVersion, scriptUrl);
                } else {
                    showUpdateAlert(scriptUrl);
                }
            })
            .catch(error => {
                hasIgnoredUpdate = true;
                log("Error checking for updates:", "error", error);
            });
    }

    function showUpdateModal(githubVersion, scriptUrl) {
        if (parseFloat(localStorage.getItem('skipRemoveAdblockThingVersion')) === githubVersion) {
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
        document.head.appendChild(script);

        const style = document.createElement('style');
        style.textContent = '.swal2-container { z-index: 2400; }';
        document.head.appendChild(style);

        script.onload = function () {
            Swal.fire({
                position: "top-end",
                backdrop: false,
                title: 'Remove Adblock Thing: New version is available.',
                text: 'Do you want to update?',
                showCancelButton: true,
                showDenyButton: true,
                confirmButtonText: 'Update',
                denyButtonText: 'Skip',
                cancelButtonText: 'Close',
                timer: config.updateModal.timer ?? 5000,
                timerProgressBar: true,
                didOpen: (modal) => {
                    modal.onmouseenter = Swal.stopTimer;
                    modal.onmouseleave = Swal.resumeTimer;
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.replace(scriptUrl);
                } else if (result.isDenied) {
                    localStorage.setItem('skipRemoveAdblockThingVersion', githubVersion);
                }
            });
        };

        script.onerror = function () {
            showUpdateAlert(scriptUrl);
        };
    }

    function showUpdateAlert(scriptUrl) {
        var result = window.confirm("Remove Adblock Thing: A new version is available. Please update your script.");
        if (result) {
            window.location.replace(scriptUrl);
        }
    }

    function log(message, level = 'info', ...args) {
        if (!config.debugMessages) return;

        const prefix = '🔧 Remove Adblock Thing:';
        const fullMessage = `${prefix} ${message}`;

        switch (level) {
            case 'error':
                console.error(`❌ ${fullMessage}`, ...args);
                break;
            case 'warn':
                console.warn(`⚠️ ${fullMessage}`, ...args);
                break;
            case 'log':
                console.log(`✅ ${fullMessage}`, ...args);
                break;
            default:
                console.info(`ℹ️ ${fullMessage}`, ...args);
        }
    }
})();
