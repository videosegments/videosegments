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

function showTutorial() {
    let owner = document.getElementById("vs-editor");
    // tutorial(owner,
    //     document.getElementById("vs-editor-move"),
    //     "TutorialMove",
    //     'top',
    //     'move'
    // );
    tutorial(
        owner,
        document.getElementById("vs-editor-acceleration"),
        "TutorialAcceleration",
        'top',
        'gauge'
    );
    tutorial(
        owner,
        document.getElementById("vs-editor-opacity-slider"),
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
    // tutorial(
    //     owner,
    //     document.getElementById("vs-editor-close"),
    //     "TutorialClose",
    //     'top'
    // );

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

    // tutorial(
    //     owner,
    //     document.getElementById("vs-editor-origin"),
    //     "TutorialOrigin",
    //     'bottom',
    // );
    tutorial(
        owner,
        document.getElementById("vs-editor-share"),
        "TutorialShare",
        'bottom',
        'share'
    );

    // document.addEventListener('keydown', e => {
    //     log(e);
    //     if (e.key === ' ') {
    //         let element = document.elementFromPoint(e.clientX, e.clientY);
    //         if (element.classList.contains('vs-tutorial')) {
    //             log(element);
    //         }
    //         e.preventDefault();
    //     }
    // }, {
    //     capture: true
    // });
}

async function tutorial(owner, element, message, placement, section) {
    log(settings.tutorial);
    log(settings.tutorial[section]);
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
        flip: {
            behavior: ["bottom", "top", "left"]
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