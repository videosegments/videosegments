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

let lastPopup;

async function showWelcomePopup(observer) {
    // if (settings.debug === true) settings.tutorial.started = false;

    if (settings.tutorial.started !== false) {
        return;
    }

    injectCSS('https://use.fontawesome.com/releases/v5.2.0/css/all.css');

    let content = await makeImport(
        browser.extension.getURL("tutorial/welcome.html")
    );

    let popup = content.getElementsByClassName('vs-welcome')[0];
    document.body.appendChild(popup);

    let panel = document.getElementById('vs-dummy-editor');
    setDummyColorScheme(panel, '#fff', '#000', '#ddd', '#ccc');

    document.getElementById('vs-welcome-color-scheme-selector').addEventListener('change', function () {
        if (this.value === 'light') {
            setDummyColorScheme(panel, '#fff', '#000', '#ddd', '#ccc');
        } else if (this.value === 'dark') {
            setDummyColorScheme(panel, '#222', '#ddd', '#111', '#000');
        } else if (this.value === 'green') {
            setDummyColorScheme(panel, '#050', '#E1F9E1', '#050', '#161');
        } else if (this.value === 'blue') {
            setDummyColorScheme(panel, '#373276', '#D9D8EA', '#0C083B', '#827FB2');
        }
    });

    document.getElementById('vs-welcome-start').addEventListener('click', () => {
        settings.tutorial.started = true;
        if (document.getElementById('vs-welcome-tutorial-mode-full').checked === true) {
            settings.tutorial.move = false;
            settings.tutorial.gauge = false;
            settings.tutorial.opacity = false;
            settings.tutorial.minimize = false;
            settings.tutorial.close = false;
            settings.tutorial.startCut = false;
            settings.tutorial.origin = false;
            settings.tutorial.share = false;
        } else if (document.getElementById('vs-welcome-tutorial-mode-short').checked === true) {
            settings.tutorial.move = true;
            settings.tutorial.gauge = false;
            settings.tutorial.opacity = false;
            settings.tutorial.minimize = true;
            settings.tutorial.close = true;
            settings.tutorial.startCut = false;
            settings.tutorial.origin = true;
            settings.tutorial.share = false;
        } else if (document.getElementById('vs-welcome-tutorial-mode-skip').checked === true) {
            settings.tutorial.move = true;
            settings.tutorial.gauge = true;
            settings.tutorial.opacity = true;
            settings.tutorial.minimize = true;
            settings.tutorial.close = true;
            settings.tutorial.startCut = true;
            settings.tutorial.origin = true;
            settings.tutorial.share = true;
        }
        saveSettings();

        let colorSchemeSelect = document.getElementById('vs-welcome-color-scheme-selector');
        let colorScheme = colorSchemeSelect.options[colorSchemeSelect.selectedIndex].value;

        if (colorScheme === 'light') {
            updateSettings(observer, 'colorPanel', '#fff');
            updateSettings(observer, 'colorText', '#000');
            updateSettings(observer, 'colorButtons', '#ddd');
            updateSettings(observer, 'colorBorders', '#ccc');
        } else if (colorScheme === 'dark') {
            updateSettings(observer, 'colorPanel', '#222');
            updateSettings(observer, 'colorText', '#ddd');
            updateSettings(observer, 'colorButtons', '#111');
            updateSettings(observer, 'colorBorders', '#000');
        }
        updateSettings(observer, 'tutorial');

        popup.remove();
    });
}

function updateSettings(observer, prop, value) {
    observer.updateSettings(prop, value);
}

function setDummyColorScheme(panel, backgroundColor, textColor, buttonsColor, bordersColor) {
    panel.style.background = backgroundColor;
    panel.style.color = textColor;

    let entries = panel.getElementsByClassName('vs-editor-segment-entry-end-time');
    for (let entry of entries) {
        entry.style.background = backgroundColor;
        entry.style.color = textColor;
    }

    let buttons = panel.getElementsByTagName('button');
    for (let button of buttons) {
        button.style.borderColor = bordersColor;
        button.style.background = buttonsColor;
        button.style.color = textColor;
    }

    document.getElementById('vs-dummy-editor-buttons').style.borderBottom = '2px solid ' + bordersColor;
    document.getElementById('vs-dummy-editor-segments').style.borderBottom = '2px solid ' + bordersColor;

}

function showTutorial() {
    if (settings.tutorial.started !== true) {
        return;
    }

    let owner = document.getElementById("vs-editor");
    tutorial(owner,
        document.getElementById("vs-editor-move"),
        "TutorialMove",
        'top',
        'move'
    );
    tutorial(
        owner,
        document.getElementById("vs-editor-acceleration"),
        "TutorialAcceleration",
        'top',
        'gauge'
    );
    tutorial(
        owner,
        document.getElementById("vs-editor-opacity"),
        "TutorialOpacitySlider",
        'top',
        'opacity'
    );
    tutorial(
        owner,
        document.getElementById("vs-editor-minimize"),
        "TutorialMinimize",
        'top',
        'minimize'
    );
    tutorial(
        owner,
        document.getElementById("vs-editor-close"),
        "TutorialClose",
        'top',
        'close'
    );

    tutorial(
        owner,
        document.getElementById("vs-editor-segment-pl"),
        "TutorialCut",
        'top',
        'startCut'
    );
    tutorial(
        owner,
        document.getElementById("vs-editor-segment-sk"),
        "TutorialCut",
        'top',
        'startCut'
    );

    tutorial(
        owner,
        document.getElementById("vs-editor-origin"),
        "TutorialOrigin",
        'bottom',
        'origin'
    );
    tutorial(
        owner,
        document.getElementById("vs-editor-share"),
        "TutorialShare",
        'bottom',
        'share'
    );
}

async function tutorial(owner, element, message, placement, section) {
    if (settings.tutorial[section] !== false) {
        return;
    }

    let content = await makeImport(
        browser.extension.getURL("tutorial/tutorial.html")
    );
    let popup = content.getElementsByClassName("vs-tutorial")[0];
    translateNodeText(popup.getElementsByClassName('vs-tutorial-message')[0], message);

    let p = new Popper(element, popup, {
        placement: placement,
        modifiers: {
            flip: {
                behavior: ["bottom", "top"]
            }
        }
    });
    popup.style.visibility = 'hidden';
    document.body.appendChild(popup);

    let opacity = "1.0";
    popup.addEventListener("mouseover", function () {
        if (owner.style.opacity != "1.0") {
            opacity = owner.style.opacity;
        }
        owner.style.opacity = "1.0";
    });
    popup.addEventListener("mouseout", function () {
        owner.style.opacity = opacity;
    });

    owner.addEventListener("mousedown", startDrag);
    document.addEventListener("mousemove", drag);
    document.addEventListener("mouseup", endDrag);

    function startDrag() {
        document.addEventListener("mousemove", drag);
        document.addEventListener("mouseup", endDrag);
    }

    function drag() {
        p.update();
    }

    function endDrag() {
        document.removeEventListener("mousemove", drag);
        document.removeEventListener("mouseup", endDrag);
    }

    element.addEventListener('mouseover', () => {
        if (typeof lastPopup !== 'undefined') {
            lastPopup.style.visibility = 'hidden';
        }

        if (settings.tutorial[section] === false) {
            popup.style.visibility = 'visible';
            lastPopup = popup;
        }
    });

    popup.getElementsByClassName('vs-tutorial-close')[0].addEventListener('click', () => {
        lastPopup.style.visibility = 'hidden';
        settings.tutorial[section] = true;
        saveSettings();
    });

    // element.addEventListener('mouseout', () => {
    //     popup.style.visibility = 'hidden';
    // });
}

// document.addEventListener('DOMContentLoaded', function(){
//     var example3popper1inst = new Popper(example3reference1, example3popper1, {
//         placement: 'left',
//         modifiers: {
//             flip: {
//                 behavior: ['left', 'bottom', 'top'],
//             },
//             preventOverflow: {
//                 boundariesElement: example3reference1.parentNode,
//             },
//         }
//     });
//     interact('#example3reference1').draggable({
//         restrict: {
//             restriction: "parent",
//             endOnly: true,
//             elementRect: { top: 0, left: 0, bottom: 1, right: 1 }
//         },
//         onmove: dragMoveListener
//     });
//     var x = 0, y = 0;
//     function dragMoveListener (event) {
//         target = event.target,
//             // keep the dragged position in the data-x/data-y attributes
//             x += event.dx,
//             y += event.dy;

//         // translate the element
//         target.style.top = y + 'px';
//         target.style.left = x + 'px'

//         example3popper1inst.update();
//     }

// }, false);