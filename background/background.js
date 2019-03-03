/*
    VideoSegments. Extension to Cut YouTube Videos. 
    Copyright (C) 2017-2019  Alex Lys

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

let timer;

window.browser = window.browser || window.chrome;

function getSettings() {
    let settings = {
        displayPending: false,
        timeSaved: 0,
    }

    return new Promise(resolve => {
        // request settings 
        browser.storage.local.get({
            settings
        }, (result) => {
            // backward compatibility 
            settings = Object.assign({}, settings, result.settings);
            // return promise 
            resolve(settings);
        });
    });
}

getSettings().then(settings => {
    browser.browserAction.setBadgeBackgroundColor({
        color: "#00ABFF"
    });

    if (settings.displayPending === true) {
        updatePendingRequestCount();
        timer = setInterval(() => {
            updatePendingRequestCount();
        }, 60000);
    }
});

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

async function updatePendingRequestCount() {
    let response = await xhr_get('https://db.videosegments.org/api/v3/review.php?requests');
    if (typeof response.requests !== 'undefined') {
        browser.browserAction.setBadgeText({
            text: response.requests
        });
    } else {
        browser.browserAction.setBadgeText({
            text: ''
        });

        if (typeof timer !== 'undefined') {
            clearInterval(timer);
            timer = undefined;
        }
    }
}

browser.runtime.onMessage.addListener(message => {
    if (typeof message.displayPending !== 'undefined') {
        if (message.displayPending) {
            if (typeof timer === 'undefined') {
                updatePendingRequestCount();
                timer = setInterval(() => {
                    updatePendingRequestCount();
                }, 60000);
            } else {
                timer.toggle();
            }
        } else {
            browser.browserAction.setBadgeText({
                text: ''
            });

            if (typeof timer !== 'undefined') {
                clearInterval(timer);
                timer = undefined;
            }
        }
    }
});