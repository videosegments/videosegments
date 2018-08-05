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

async function displayTutorial() {
    injectCSS('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css');

    if (document.body === null) {
        document.addEventListener('DOMContentLoaded', () => {
            displayTutorial()
        })
        return;
    }

    let content = await makeImport(browser.extension.getURL('tutorial/tutorial.html'));
    content.getElementById('vs-tutorial-close').addEventListener('click', () => {
        tutorial.remove();

        settings.tutorial = 1;
        saveSettings();
    });

    let tutorial = content.getElementById('vs-tutorial');
    document.body.appendChild(tutorial);
}