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

async function playTutorial(section) {
    if (settings.tutorial.finished !== false) {
        return;
    }

    settings.tutorial.section = "";
    settings.tutorial.finished = true;
    saveSettings();

    // let updateState = false;
    // if (settings.tutorial.section !== section) {
    //     updateState = true;
    // }
    // settings.tutorial.section = section;
    // if (updateState === true) {
    //     saveSettings();
    // }
    // log(section);

    // let panel = document.getElementById("vs-editor");
    // if (section === "tutorial_panel_hover") {
    //     let obj = await displayPopper(panel, "TutorialPanelHover");
    //     panel.addEventListener("mouseenter", onMouseEnter);

    //     function onMouseEnter() {
    //         panel.removeEventListener("mouseenter", onMouseEnter);
    //         deletePopper(obj);

    //         playTutorial("tutorial_panel_maximization");
    //     }
    // } else if (section === "tutorial_panel_maximization") {
    //     let icon = document.getElementById('vs-editor-minimize');
    //     let obj = await displayPopper(icon, "TutorialPanelMaximization", "bottom");
    //     icon.addEventListener('click', onClick);

    //     function onClick() {
    //         icon.removeEventListener('click', onClick);
    //         deletePopper(obj);

    //         panel.removeEventListener("mouseenter", onMouseEnter);
    //         panel.removeEventListener("mouseleave", onMouseLeave);

    //         playTutorial("tutorial_panel_transparency");
    //     }

    //     panel.addEventListener("mouseenter", onMouseEnter);
    //     panel.addEventListener("mouseleave", onMouseLeave);

    //     function onMouseEnter() {
    //         showPopper(obj);
    //     }

    //     function onMouseLeave() {
    //         hidePopper(obj);
    //     }
    // } else if (section === "tutorial_panel_transparency") {
    //     let slider = document.getElementById('vs-editor-opacity-slider');
    //     let obj = await displayPopper(slider, "TutorialPanelTransparency");
    //     slider.addEventListener("change", onChange);

    //     function onChange() {
    //         slider.removeEventListener("change", onChange);
    //         deletePopper(obj);

    //         panel.removeEventListener("mouseenter", onMouseEnter);
    //         panel.removeEventListener("mouseleave", onMouseLeave);

    //         playTutorial("tutorial_panel_movement");
    //     }

    //     panel.addEventListener("mouseenter", onMouseEnter);
    //     panel.addEventListener("mouseleave", onMouseLeave);

    //     function onMouseEnter() {
    //         showPopper(obj);
    //     }

    //     function onMouseLeave() {
    //         hidePopper(obj);
    //     }
    // } else if (section === "tutorial_panel_movement") {
    //     let icon = document.getElementById('vs-editor-move');
    //     let obj = await displayPopper(icon, "TutorialPanelMovement");
    //     icon.addEventListener('mousedown', startDrag);

    //     function startDrag() {
    //         icon.removeEventListener('mousedown', startDrag);
    //         document.addEventListener('mouseup', endDrag);
    //         deletePopper(obj);
    //     }

    //     function endDrag() {
    //         document.removeEventListener('mouseup', endDrag);

    //         panel.removeEventListener("mouseenter", onMouseEnter);
    //         panel.removeEventListener("mouseleave", onMouseLeave);

    //         playTutorial("tutorial_panel_end_cut");
    //     }

    //     panel.addEventListener("mouseenter", onMouseEnter);
    //     panel.addEventListener("mouseleave", onMouseLeave);

    //     function onMouseEnter() {
    //         showPopper(obj);
    //     }

    //     function onMouseLeave() {
    //         hidePopper(obj);
    //     }
    // } else if (section === "tutorial_panel_end_cut") {
    //     let icon = document.getElementById('vs-editor-segment-pl');
    //     let obj = await displayPopper(icon, "TutorialPanelEndCut", "bottom");
    //     icon.addEventListener('click', onClick);

    //     function onClick() {
    //         icon.removeEventListener('click', onClick);
    //         deletePopper(obj);

    //         panel.removeEventListener("mouseenter", onMouseEnter);
    //         panel.removeEventListener("mouseleave", onMouseLeave);

    //         playTutorial("tutorial_panel_smart_cursor");
    //     }

    //     panel.addEventListener("mouseenter", onMouseEnter);
    //     panel.addEventListener("mouseleave", onMouseLeave);

    //     function onMouseEnter() {
    //         showPopper(obj);
    //     }

    //     function onMouseLeave() {
    //         hidePopper(obj);
    //     }
    // } else if (section === "tutorial_panel_smart_cursor") {
    //     let obj = null;
    //     let timer = setInterval(async function () {
    //         if (document.activeElement.classList.contains("vs-editor-segment-entry-time") === true) {
    //             if (obj !== null) {
    //                 return;
    //             }

    //             let icon = document.activeElement;
    //             obj = await displayPopper(icon, "TutorialPanelSmartCursor", "bottom");

    //             icon.addEventListener('keyup', onKeyUp);

    //             function onKeyUp(event) {
    //                 if (event.keyCode === 38 || event.keyCode === 40) {
    //                     clearTimeout(timer);

    //                     icon.removeEventListener('keyup', onKeyUp);
    //                     deletePopper(obj);

    //                     panel.removeEventListener("mouseenter", onMouseEnter);
    //                     panel.removeEventListener("mouseleave", onMouseLeave);

    //                     playTutorial("tutorial_panel_share");
    //                 }
    //             };

    //             panel.addEventListener("mouseenter", onMouseEnter);
    //             panel.addEventListener("mouseleave", onMouseLeave);
    //         } else {
    //             if (obj !== null) {
    //                 panel.removeEventListener("mouseenter", onMouseEnter);
    //                 panel.removeEventListener("mouseleave", onMouseLeave);

    //                 deletePopper(obj);
    //                 obj = null;
    //             }
    //         }
    //     }, 100);

    //     function onMouseEnter() {
    //         showPopper(obj);
    //     }

    //     function onMouseLeave() {
    //         hidePopper(obj);
    //     }
    // } else if (section === "tutorial_panel_share") {
    //     let icon = document.getElementById('vs-editor-share');
    //     let obj = await displayPopper(icon, "TutorialPanelShare", "bottom");
    //     icon.addEventListener('click', onClick, {
    //         capture: true
    //     });

    //     function onClick(e) {
    //         icon.removeEventListener('click', onClick);
    //         deletePopper(obj);

    //         panel.removeEventListener("mouseenter", onMouseEnter);
    //         panel.removeEventListener("mouseleave", onMouseLeave);

    //         playTutorial("tutorial_panel_start_cut");
    //     }

    //     panel.addEventListener("mouseenter", onMouseEnter);
    //     panel.addEventListener("mouseleave", onMouseLeave);

    //     function onMouseEnter() {
    //         showPopper(obj);
    //     }

    //     function onMouseLeave() {
    //         hidePopper(obj);
    //     }
    // } else if (section === "tutorial_panel_start_cut") {
    //     let icon = document.getElementById('vs-editor-segment-sk');
    //     let obj = await displayPopper(icon, "TutorialPanelStartCut", "bottom");
    //     icon.addEventListener('click', onClick);

    //     function onClick() {
    //         icon.removeEventListener('click', onClick);
    //         deletePopper(obj);

    //         panel.removeEventListener("mouseenter", onMouseEnter);
    //         panel.removeEventListener("mouseleave", onMouseLeave);

    //         settings.tutorial.section = "";
    //         settings.tutorial.finished = true;
    //         saveSettings();
    //     }

    //     panel.addEventListener("mouseenter", onMouseEnter);
    //     panel.addEventListener("mouseleave", onMouseLeave);

    //     function onMouseEnter() {
    //         showPopper(obj);
    //     }

    //     function onMouseLeave() {
    //         hidePopper(obj);
    //     }
    // }
}

async function displayPopper(element, text, placement = "top") {
    let content = await makeImport(
        browser.extension.getURL("tutorial/tutorial.html")
    );
    let popup = content.getElementsByClassName("vs-tutorial")[1];
    translateNodeText(popup.getElementsByClassName('vs-tutorial-message')[0], text);

    let pop = new Popper(element, popup, {
        placement: placement,
        modifiers: {
            flip: {
                behavior: ["bottom", "top"]
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
    obj.popup.remove();
    obj.pop.destroy();
}