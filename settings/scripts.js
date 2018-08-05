/*
    VideoSegments. Extension to Cut YouTube Videos. 
    Copyright (C) 2017-2018  Alex Lys

    This file is part of VideoSegments.

    VideoSegments is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    VideoSegments is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with VideoSegments. If not, see <https://www.gnu.org/licenses/>.
*/

'use strict';

// cross browser support 
window.browser = window.browser || window.chrome;

// global variables for settings and console.log output 
let settings, log;

document.addEventListener('DOMContentLoaded', () => {
    translateNodes(document);
    hookTabs();

    getSettings().then((result) => {
        if (result.debug === true) {
            log = console.log.bind(console);
            log('settings loaded');
        } else {
            log = function () {};
        }

        settings = result;
        if (['settings', 'playback', 'acceleration', 'filters', 'community'].indexOf(result.lastTab) === -1) {
            settings.lastTab = 'settings';
        }

        changeTab(settings.lastTab);
        restoreSettings();
        hookActions();
        toggleMode();
    });

    // when user logs in 
    window.addEventListener('message', function (event) {
        checkAuth();
    });

    // little bit of jQuery 
    $('[data-toggle="tooltip"]').tooltip();

    setTimeout(() => {
        document.getElementById('login-page').src = 'https://db.videosegments.org/api/v3/login.php'
    }, 100);
    checkAuth();

    document.getElementById('get-current').addEventListener('click', () => {
        browser.tabs.query({
            active: true,
            currentWindow: true
        }, (tabs) => {
            browser.tabs.sendMessage(tabs[0].id, {
                getChannel: true
            });
        });
    });

    document.getElementById('apply-channel-filter').addEventListener('click', () => {
        let channelName = document.getElementById('channel-name').value;
        if (channelName.length < 1) {
            return;
        }

        let skipFrom = parseFloat(document.getElementById('skip-from').value);
        let skipTo = parseFloat(document.getElementById('skip-to').value);
        let skipLast = parseFloat(document.getElementById('skip-last').value);
        browser.storage.local.set({
            ['|c|' + document.getElementById('channel-name').value]: [skipFrom, skipTo, skipLast]
        });
    });

    document.getElementById('search-channel').addEventListener('click', () => {
        let channelName = document.getElementById('channel-name').value;
        if (channelName.length < 1) {
            return;
        }

        browser.storage.local.get({
            ['|c|' + document.getElementById('channel-name').value]: []
        }, (result) => {
            let filter = result['|c|' + document.getElementById('channel-name').value];
            if (filter.length > 0) {
                document.getElementById('skip-from').value = filter[0];
                document.getElementById('skip-to').value = filter[1];
                document.getElementById('skip-last').value = filter[2];
            } else {
                document.getElementById('skip-from').value = 0.0;
                document.getElementById('skip-to').value = 0.0;
                document.getElementById('skip-last').value = 0.0;
            }
        });
    });

    document.getElementById('delete-channel-filter').addEventListener('click', () => {
        let channelName = document.getElementById('channel-name').value;
        if (channelName.length < 1) {
            return;
        }

        browser.storage.local.remove(
            ['|c|' + document.getElementById('channel-name').value], () => {
                document.getElementById('skip-from').value = 0.0;
                document.getElementById('skip-to').value = 0.0;
                document.getElementById('skip-last').value = 0.0;
            }
        );
    });

    document.getElementById('review-queue').addEventListener('click', () => {
        window.open('https://db.videosegments.org/queue.php', '_blank');
    });

    let clicks = 0;
    document.getElementById('toggle-debug').addEventListener('click', () => {
        window.getSelection().removeAllRanges();
        clicks = clicks + 1;
        if ( clicks > 4 ) {
            settings.debug = !settings.debug;
            clicks = 0;

            if ( settings.debug ) {
                document.getElementById('toggle-debug').style.color = 'red';
            } 
            else {
                document.getElementById('toggle-debug').style.color = 'blue';
            }

            setTimeout(() => {
                document.getElementById('toggle-debug').style.color = 'black';
            }, 1000);
            saveSettings();
        }
    });
});

browser.runtime.onMessage.addListener((message) => {
    if (typeof message.gotChannel !== 'undefined') {
        document.getElementById('channel-name').value = message.gotChannel;
        browser.storage.local.get({
            ['|c|' + document.getElementById('channel-name').value]: []
        }, (result) => {
            let filter = result['|c|' + document.getElementById('channel-name').value];
            if (filter.length > 0) {
                document.getElementById('skip-from').value = filter[0];
                document.getElementById('skip-to').value = filter[1];
                document.getElementById('skip-last').value = filter[2];
            }
        });
    }
});

function hookTabs() {
    document.getElementById('tab-settings').addEventListener('click', function () {
        changeTab(this.id.slice(4))
    });
    document.getElementById('tab-playback').addEventListener('click', function () {
        changeTab(this.id.slice(4))
    });
    document.getElementById('tab-acceleration').addEventListener('click', function () {
        changeTab(this.id.slice(4))
    });
    document.getElementById('tab-filters').addEventListener('click', function () {
        changeTab(this.id.slice(4))
    });
    document.getElementById('tab-community').addEventListener('click', function () {
        changeTab(this.id.slice(4))
    });
}

function changeTab(tabName) {
    let lastActiveTab = document.getElementsByClassName('active')[0];
    if (typeof lastActiveTab !== 'undefined') {
        lastActiveTab.classList.remove('active');

        let lastActiveContent = document.getElementById(lastActiveTab.id.slice(4));
        if (typeof lastActiveContent !== 'undefined') {
            lastActiveContent.style.display = 'none';
        }
    }

    let newActiveTab = document.getElementById('tab-' + tabName);
    newActiveTab.classList.add('active');

    let newActveContent = document.getElementById(tabName);
    newActveContent.style.display = 'block';

    settings.lastTab = tabName;
    saveSettings();
}

function translateNodes(target) {
    let nodes = target.getElementsByClassName('translate-me');
    for (let node of nodes) {
        // node.classList.remove('translate-me');
        translateNode(node);
    }
}

function translateNode(node) {
    translateNodeText(node, node.innerHTML);
}

function translateNodeText(node, text) {
    while (node.firstChild) {
        node.removeChild(node.firstChild);
    }

    let textNode = document.createTextNode(translateText(text));
    node.appendChild(textNode);
}

function translateText(text) {
    return browser.i18n.getMessage(text);
}

function toggleMode() {
    let nodesToHide, nodesToShow;
    if (settings.mode === 'simplified') {
        nodesToShow = document.getElementsByClassName('simplified-mode');
        nodesToHide = document.getElementsByClassName('expert-mode');
    } else {
        nodesToShow = document.getElementsByClassName('expert-mode');
        nodesToHide = document.getElementsByClassName('simplified-mode');
    }

    for (let node of nodesToShow) {
        node.style.display = 'table'
    }
    for (let node of nodesToHide) {
        node.style.display = 'none';
    }
}

function restoreSettings() {
    connectSettingValue(document.getElementById('database-priority'), 'databasePriority');
    connectSettingValue(document.getElementById('show-panel-mode'), 'showPanel');
    connectSettingValue(document.getElementById('panel-size'), 'panelSize');
    connectSettingValue(document.getElementById('popup-size'), 'popupSize');
    connectSettingValue(document.getElementById('segmentsbar-location'), 'segmentsBarLocation');
    connectSettingValue(document.getElementById('panel-mode'), 'mode');
    connectSettingValue(document.getElementById('autopause-duration'), 'autoPauseDuration');
    connectSettingValue(document.getElementById('popup-duration'), 'popupDurationOnSend');
    connectSettingValue(document.getElementById('panel-opacity'), 'segmentationToolsOpacity');
    connectSettingValue(document.getElementById('panel-fullscreen-opacity'), 'segmentationToolsFullscreenOpacity');

    document.getElementById('panel-mode').addEventListener('click', () => {
        toggleMode();
    })

    let displayPending = document.getElementById('display-pending');
    displayPending.checked = settings.displayPending;
    displayPending.addEventListener('change', () => {
        settings.displayPending = displayPending.checked;
        saveSettings();

        browser.runtime.sendMessage({
            'displayPending': displayPending.checked
        });
    });

    let colorSegments = ['c', 'ac', 'i', 'a', 'cr', 'ia', 'cs', 'o', 's', 'pl', 'sk'];
    for (let color of colorSegments) {
        $('#color-' + color).spectrum({
            color: tinycolor(settings.segments[color].color).setAlpha(settings.segments[color].opacity),
            showInput: true,
            showAlpha: true,
            cancelText: 'cancel',
            chooseText: 'select',
            showInitial: true,
            preferredFormat: "hex3",
            clickoutFiresChange: false,
            showPalette: true,
            palette: [
                ["#00c853", "#00897b", "#e53935"],
                ["#3949ab", "#ffb300", "#757575"],
                ["#8e24aa", "#00acc1", "#6d4c41"]
            ],
            change: (newColor) => {
                settings.segments[color].color = newColor.toHexString();
                settings.segments[color].opacity = newColor.getAlpha();

                saveSettings();
                updateSettings('color', {
                    segment: color,
                    newColor: settings.segments[color].color,
                    opacity: settings.segments[color].opacity
                });
            }
        });
    }

    let actionSegments = ['c', 'ac', 'i', 'a', 'cr', 'ia', 'cs', 'o', 's'];
    for (let action of actionSegments) {
        let element = document.getElementById('action-' + action)
        element.value = (settings.segments[action].skip === true) ? '0' : '1';
        element.addEventListener('click', () => {
            settings.segments[action].skip = (element.value === '1') ? false : true;

            saveSettings();
            updateSettings('playback', {
                segment: action,
                skip: settings.segments[action].skip
            });
        });
    }

    let accelerationSegments = ['c', 'ac', 'i', 'a', 'cr', 'ia', 'cs', 'o', 's', 'pl', 'sk'];
    for (let acceleration of accelerationSegments) {
        let elementLength = document.getElementById('length-' + acceleration)
        elementLength.value = settings.segments[acceleration].duration;
        elementLength.addEventListener('change', () => {
            settings.segments[acceleration].duration = parseFloat(elementLength.value);

            saveSettings();
            updateSettings('accelerationDuration', {
                segment: acceleration,
                duration: settings.segments[acceleration].duration
            });
        });

        let elementSpeed = document.getElementById('speed-' + acceleration)
        elementSpeed.value = settings.segments[acceleration].speed * 100;
        elementSpeed.addEventListener('change', () => {
            settings.segments[acceleration].speed = parseFloat(elementSpeed.value) / 100;

            saveSettings();
            updateSettings('accelerationSpeed', {
                segment: acceleration,
                speed: settings.segments[acceleration].speed
            });
        });
    }
}

function connectSettingValue(element, prop) {
    element.value = settings[prop];
    element.addEventListener('change', () => {
        settings[prop] = element.value;

        saveSettings();
        updateSettings(prop, element.value);
    })
}

function updateSettings(prop, value) {
    browser.tabs.query({}, tabs => {
        for (let i = 0; i < tabs.length; ++i) {
            browser.tabs.sendMessage(tabs[i].id, {
                prop: prop,
                value: value
            });
        }
    });
}

function hookActions() {
    document.getElementById('reset-panel-position').addEventListener('click', () => {
        settings.editor.posX = 200;
        settings.editor.posY = 200;
        settings.editor.fullscreenPosX = 200;
        settings.editor.fullscreenPosY = 200;

        saveSettings();
        updateSettings('position', 200);
    })
}

function xhr_get(url) {
    let xhr = new XMLHttpRequest();
    xhr.open('GET', url);

    return new Promise((resolve, reject) => {
        xhr.onreadystatechange = () => {
            if (xhr.readyState == 4) {
                if (xhr.status == 200) {
                    resolve(JSON.parse(xhr.responseText));
                } else {
                    reject();
                }
            }
        }

        xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded");
        xhr.send();
    })
}

async function checkAuth() {
    let response = await xhr_get('https://db.videosegments.org/api/v3/status.php');
    if (response.authorized && response.moderator) {
        document.getElementById('reviewer-only').style.display = 'block';
        updatePendingRequestCount();
    }
}

async function updatePendingRequestCount() {
    let response = await xhr_get('https://db.videosegments.org/api/v3/review.php?requests');
    if (typeof response.requests !== 'undefined') {
        document.getElementById('pending-review-count').innerHTML = parseInt(response.requests);
        browser.runtime.sendMessage({
            'updateBadge': response.requests
        });
    }
}