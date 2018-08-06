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

class SmartCursor {
    constructor(editor, video, segmentsbar, parent, timestamps, index) {
        // save references
        this.editor = editor;
        this.video = video;
        this.segmentsbar = segmentsbar;
        this.parent = parent;
        this.timestamps = timestamps;
        this.index = index;

        // focus and blur
        this.parent.addEventListener('focus', this.onFocus.bind(this));
        this.parent.addEventListener('blur', this.onBlur.bind(this));

        // selection 
        this.parent.addEventListener('mouseup', this.onMouseUp.bind(this));

        // key press
        this.parent.addEventListener('keydown', this.onKeyDown.bind(this));
        this.parent.addEventListener('keyup', this.onKeyUp.bind(this));
    }

    onFocus() {
        let element = this.parent;
        if (element.readOnly) {
            return;
        }

        element.value = secondsToClockTime(this.timestamps[this.index], true);
        element.size = element.value.length + 1;

        element.setSelectionRange(element.value.length - 1, element.value.length);
    }

    onBlur() {
        let element = this.parent;

        element.value = secondsToClockTime(this.timestamps[this.index]);
        element.size = element.value.length + 1;
    }

    onMouseUp() {
        let element = this.parent;
        if (element.readOnly) {
            return;
        }

        // check if last two ms is 00 and remove last zero if true 
        if (element.value.indexOf('.') == element.value.length - 3 && element.value[element.value.length - 1] === '0') {
            element.value = element.value.slice(0, -1);
            element.size = element.value.length + 1;
        }

        let selectionStart, selectionEnd;
        // if selected outside of input
        if (element.selectionStart >= element.value.length) {
            selectionStart = element.selectionStart - 1;
            selectionEnd = element.selectionStart;
            // element.setSelectionRange(element.selectionStart-1, element.selectionStart);
        } else {
            // if this is digit 
            if (element.value[element.selectionStart] >= '0' && element.value[element.selectionStart] <= '9') {
                selectionStart = element.selectionStart;
                selectionEnd = element.selectionStart + 1;
                // element.setSelectionRange(element.selectionStart, element.selectionStart+1);
            }
            // if it's not digital
            else {
                selectionStart = element.selectionStart + 1;
                selectionEnd = element.selectionStart + 2;
                // element.setSelectionRange(element.selectionStart+1, element.selectionStart+2);
            }
        }

        window.getSelection().removeAllRanges();
        element.setSelectionRange(selectionStart, selectionEnd);
    }

    onKeyDown(event) {
        let element = this.parent;
        if (element.readOnly) {
            return;
        }

        let keepPrecision = false;
        let self = this;

        // arrow left 
        if (event.keyCode === 37) {
            // remove last zero if two digits after dot 
            if (element.value.indexOf('.') == element.value.length - 3 && element.value[element.value.length - 1] === '0') {
                element.value = element.value.slice(0, -1);
                element.size = element.value.length + 1;
            }

            if (element.selectionStart < 2) {
                element.setSelectionRange(0, 1);
                event.preventDefault();
                return;
            }

            if (element.value[element.selectionStart - 1] >= '0' && element.value[element.selectionStart - 1] <= '9') {
                element.setSelectionRange(element.selectionStart - 1, element.selectionStart);
            } else {
                element.setSelectionRange(element.selectionStart - 2, element.selectionStart - 1);
            }

            event.preventDefault();
            return;
        }
        // arrow right 
        else if (event.keyCode === 39) {
            if (element.selectionStart > element.value.length - 2) {
                // if only one digit after dot 
                if (element.value.indexOf('.') == element.value.length - 2) {
                    // add one zero
                    element.value = element.value + '0';
                    element.size = element.value.length + 1;
                    setTimeout(function () {
                        element.setSelectionRange(element.value.length - 1, element.value.length)
                    }, 0);
                    return;
                }

                element.setSelectionRange(element.value.length - 1, element.value.length);
                event.preventDefault();
                return;
            }

            if (element.value[element.selectionStart + 1] >= '0' && element.value[element.selectionStart + 1] <= '9') {
                element.setSelectionRange(element.selectionStart + 1, element.selectionStart + 2);
            } else {
                element.setSelectionRange(element.selectionStart + 2, element.selectionStart + 3);
            }

            event.preventDefault();
            return;
        }
        // arrow up
        else if (event.keyCode === 38) {
            // TODO: make it nested? 
            keepPrecision = (element.value.indexOf('.') == element.value.length - 2) ? false : true;
            // TODO: make this function return value 
            handleArrow(element.value, element.selectionStart, 1);
        }
        // arrow down 
        else if (event.keyCode === 40) {
            keepPrecision = (element.value.indexOf('.') == element.value.length - 2) ? false : true;
            handleArrow(element.value, element.selectionStart, -1);
        }
        // everything else 
        else {
            // block input of non-digit 
            // allow:                 1-0                                            numpad                                              f1-f12
            if (!(event.keyCode >= 48 && event.keyCode <= 57) && !(event.keyCode >= 96 && event.keyCode <= 105) && !(event.keyCode >= 112 && event.keyCode <= 123)) {
                event.preventDefault();
            }

            return;
        }

        this.video.currentTime = this.timestamps[this.index] + 0.01;
        this.segmentsbar.updateWidth(this.timestamps, this.index, roundFloat(this.video.duration), true);
        this.editor.updateEntryStartTime(this.parent);
        this.editor.saveSegmentation();

        let pos = element.selectionStart;
        element.value = secondsToClockTime(this.timestamps[this.index], true, keepPrecision);
        element.size = element.value.length + 1;

        setTimeout(function () {
            element.setSelectionRange(pos, pos + 1)
        }, 0);

        // change timestamp according to current digit 
        function handleArrow(text, cursorPosition, sign) {
            let interval = [1, 10, 100, 1000, 6000, 60000, 360000, 3600000, 36000000];
            //              10ms, 100ms, 1s,  10s,  1m,   10m,   1h,     10h,     100h

            // digit order number
            let multiplierPosition = (text.indexOf('.') == text.length - 2) ? 1 : 0;

            // from end to start
            for (let i = text.length; i > 0; --i) {
                if (i == cursorPosition) {
                    break;
                }

                if (text[i] >= '0' && text[i] <= '9') {
                    multiplierPosition++;
                }
            }

            self.timestamps[self.index] = roundFloat(((self.timestamps[self.index] * 100 + sign * interval[multiplierPosition]) / 100));
            if (self.timestamps[self.index] < 0.0) self.timestamps[self.index] = 0.0;
            else if (self.timestamps[self.index] > self.video.duration) self.timestamps[self.index] = roundFloat(self.video.duration);
        }
    }

    onKeyUp(event) {
        let element = this.parent;
        if (element.readOnly) {
            return;
        }

        // we interested only in digital input 
        if (!(event.keyCode >= 48 && event.keyCode <= 57) && !(event.keyCode >= 96 && event.keyCode <= 105)) {
            return;
        }

        this.timestamps[this.index] = this.clockTimeToSeconds(element.value);
        this.video.currentTime = this.timestamps[this.index] + 0.01;
        this.segmentsbar.updateWidth(this.timestamps, this.index, roundFloat(this.video.duration), true);
        this.editor.updateEntryStartTime(this.parent);
        this.editor.saveSegmentation();

        element.value = secondsToClockTime(this.timestamps[this.index], true);
        element.size = element.value.length + 1;
        setTimeout(function () {
            element.setSelectionRange(element.selectionStart - 1, element.selectionStart)
        }, 0);
    }

    clockTimeToSeconds(time) {
        let parts = time.split(':');
        let timestamp = 0;
        if (parts.length == 3) {
            timestamp += parseInt(parts[0]) * 3600;
            timestamp += parseInt(parts[1]) * 60;
        } else {
            timestamp += parseInt(parts[0]) * 60;
        }

        timestamp += roundFloat(parseFloat(parts[parts.length - 1]));
        return timestamp;
    }

    end() {
        this.editor = undefined;
        this.video = undefined;
        this.segmentsbar = undefined;
        this.parent = undefined;
        this.timestamps = undefined;
        this.index = undefined;
    }
}