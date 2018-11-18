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

"use strict";

let poppers = [];
let hovering = false;

async function playTutorial(section, element) {
    if (settings.tutorial.finished !== false) {
        return;
    }

    if (section === 'tutorial_open_close_panel') {
        let obj = await displayPopper(element, 'TutorialOpenClosePanel', 'top');
        element.addEventListener('click', () => {
            deletePopper(obj);

            settings.tutorial.section = "";
            settings.tutorial.finished = true;
            saveSettings();
        });
    } else {
        settings.tutorial.section = "";
        settings.tutorial.finished = true;
        saveSettings();
    }
}

async function showInfo() {
    let obj;
    hovering = true;

    let move = document.getElementById('vs-editor-move');
    obj = await displayPopper(move, 'TutorialMove', 'left', 'vs-info');
    poppers.push(obj);

    let acceleration = document.getElementById('vs-editor-acceleration');
    obj = await displayPopper(acceleration, 'TutorialAcceleration', 'top', 'vs-info');
    poppers.push(obj);

    let opacity = document.getElementById('vs-editor-opacity');
    obj = await displayPopper(opacity, 'TutorialOpacitySlider', 'bottom', 'vs-info-large');
    poppers.push(obj);

    let minimize = document.getElementById('vs-editor-minimize');
    obj = await displayPopper(minimize, 'TutorialMinimize', 'top', 'vs-info');
    poppers.push(obj);

    let info = document.getElementById('vs-editor-info');
    obj = await displayPopper(info, 'TutorialInfo', 'right', 'vs-info');
    poppers.push(obj);

    let etc = document.getElementById('vs-editor');
    obj = await displayPopper(etc, 'TutorialEtc', 'bottom', 'vs-info-large');
    poppers.push(obj);

    let cut = document.getElementById('vs-cut-video-button');
    obj = await displayPopper(cut, 'TutorialOpenClosePanel', 'top');
    poppers.push(obj);
}

function hideInfo() {
    hovering = false;
    for (let pop of poppers) {
        deletePopper(pop);
    }
    poppers = [];
}

async function displayPopper(element, text, placement = 'top', classname = 'vs-tutorial') {
    if (typeof displayPopper.content === 'undefined') {
        displayPopper.content = await makeImport(
            browser.extension.getURL("tutorial/tutorial.html")
        );
    }

    if (classname !== 'vs-tutorial' && hovering === false) {
        return null;
    }

    let popup = displayPopper.content.getElementsByClassName(classname)[0].cloneNode(true);
    translateNodeText(popup.getElementsByClassName(classname + '-message')[0], text);

    let pop = new Popper(element, popup, {
        placement: placement,
        modifiers: {
            flip: {
                enabled: false
            },
            preventOverflow: {
                enabled: false
            },
            // suppress warning "`preventOverflow` modifier is required by `hide` modifier in order to work, be sure to include it before `hide`!"
            hide: {
                enabled: false
            }
        }
    });

    document.body.appendChild(popup);

    document.getElementById("vs-editor").addEventListener("mousedown", startDrag);
    document.addEventListener("mousemove", drag);
    document.addEventListener("mouseup", endDrag);

    function startDrag() {
        document.addEventListener("mousemove", drag);
        document.addEventListener("mouseup", endDrag);
    }

    function drag() {
        pop.update();
    }

    function endDrag() {
        document.removeEventListener("mousemove", drag);
        document.removeEventListener("mouseup", endDrag);
    }

    return {
        popup: popup,
        pop: pop
    };
}

function hidePopper(obj) {
    obj.popup.style.visibility = 'hidden';
}

function showPopper(obj) {
    obj.popup.style.visibility = 'visible';
}

function deletePopper(obj) {
    if (obj !== null) {
        obj.popup.remove();
        obj.pop.destroy();
    }
}