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
        changeTab('community');
    });

    // little bit of jQuery 
    $('[data-toggle="tooltip"]').tooltip();

    setTimeout(() => { document.getElementById('login-page').src = 'https://db.videosegments.org/api/v3/login.php' }, 0); 
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