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

class Editor {
    constructor(player, segmentsbar, video, id, segmentation) {
        // if ( settings.showSegmentationTools === false ) {
        //     return;
        // }

        injectCSS('https://use.fontawesome.com/releases/v5.2.0/css/all.css');

        this.player = player;
        this.segmentsbar = segmentsbar;
        this.video = video;
        this.id = id;
        this.segmentation = segmentation;

        this.lastShareIteration = -1;
        this.iterations = 0;
        this.dragging = false;

        if (settings.showPanel === 'always' || (settings.showPanel === 'empty' && typeof this.segmentation === 'undefined')) {
            this.createEditor();
        }

        // sendCaptchaModal(this.checkCaptcha);
    }

    async createEditor() {
        let content = await makeImport(browser.extension.getURL('editor/editor.html'));
        this.panel = content.getElementById('vs-editor');
        document.body.appendChild(this.panel);
        log('editor created');

        this.originElement = document.getElementById('vs-editor-origin');

        this.fullscreen = false;
        document.addEventListener('webkitfullscreenchange', this.onFullscreen.bind(this));
        document.addEventListener('fullscreenchange', this.onFullscreen.bind(this));
        document.addEventListener('mozFullScreen', this.onFullscreen.bind(this));
        this.onFullscreen(document.webkitFullscreenElement || document.mozFullScreenElement || document.fullscreenElement || null);

        if (window.innerWidth < settings.editor.posX + this.panel.clientWidth) {
            this.panel.style.left = (window.innerWidth - (this.panel.clientWidth + 10)) + 'px';
        } else {
            this.panel.style.left = settings.editor.posX + 'px';
        }
        this.panel.style.top = settings.editor.posY + 'px';

        if (this.fullscreen) {
            this.panel.style.opacity = settings.segmentationToolsFullscreenOpacity / 100;
        } else {
            this.panel.style.opacity = settings.segmentationToolsOpacity / 100;
        }

        let opacitySlider = document.getElementById('vs-editor-opacity-slider');
        opacitySlider.value = settings.segmentationToolsOpacity / 100;

        if (settings.panelSize === 'maximized') {
            this.maximize();
        } else {
            this.minimize();
        }

        if (settings.mode === 'simplified') {
            document.getElementById('vs-editor-expert-buttons').style.display = 'none';
        } else {
            document.getElementById('vs-editor-simplified-buttons').style.display = 'none';
        }

        let entryTemplate = await makeImport(browser.extension.getURL('editor/entry.html'));
        this.segmentEntryTemplate = entryTemplate.getElementsByClassName('vs-editor-segment-entry')[0];
        this.segments = document.getElementById('vs-editor-segments');
        this.createSegmentsEntries();

        // prevent clicks to video player through panel 
        this.panel.addEventListener('click', (e) => {
            e.stopPropagation()
        });

        // hook active items 
        this.hookControls();
        this.hookButtons();
        this.hookActions();
        this.hookHotkeys();

        let origin = ((typeof this.segmentation.origin !== 'undefined') ? this.segmentation.origin : 'noSegmentation');
        this.setSegmentationOrigin(origin);

        if (origin === 'community') {
            document.getElementById('vs-editor-share').style.display = 'none';
        }
    }

    createSegmentsEntries() {
        if (!this.segmentation || !this.segmentation.timestamps || !this.segmentation.types) {
            document.getElementById('vs-editor-segments').style.display = 'none';
            document.getElementById('vs-editor-share').style.display = 'none';
            return;
        }

        for (let i = 0; i < this.segmentation.types.length; ++i) {
            // pass by reference to make smart cursor able to change timestamps 
            let entry = this.createSegmentEntry(i);
            this.segments.appendChild(entry);
        }
        log('entries created', this.segmentation);
    }

    createSegmentEntry(i) {
        let entry = this.segmentEntryTemplate.cloneNode(true);

        let startTimeInput = entry.getElementsByClassName('vs-editor-segment-entry-start-time')[0];
        startTimeInput.value = secondsToClockTime(this.segmentation.timestamps[i]);
        startTimeInput.size = startTimeInput.value.length + 1;

        let span = entry.getElementsByClassName('vs-editor-segment-entry-type-simplified')[0];
        let select = entry.getElementsByClassName('vs-editor-segment-entry-type')[0];

        if (settings.mode === 'simplified') {
            translateNodeText(span, this.segmentation.types[i]);
            select.style.display = 'none';
        } else {
            select.value = this.segmentation.types[i];
            select.addEventListener('change', this.onSegmentTypeChanged.bind(this));
            span.style.display = 'none';
        }

        let endTimeInput = entry.getElementsByClassName('vs-editor-segment-entry-end-time')[0];
        endTimeInput.value = secondsToClockTime(this.segmentation.timestamps[i + 1]);
        endTimeInput.size = endTimeInput.value.length + 1;
        endTimeInput.vsSmartCursor = new SmartCursor(this, this.video, this.segmentsbar, endTimeInput, this.segmentation.timestamps, i + 1);

        let removeButton = entry.getElementsByClassName('vs-editor-segment-entry-delete')[0];
        removeButton.addEventListener('click', this.removeSegment.bind(this));

        let rewindButton = entry.getElementsByClassName('vs-editor-segment-entry-rewind')[0];
        rewindButton.addEventListener('click', this.rewindSegment.bind(this));

        return entry;
    }

    updateEntryStartTime(endTime) {
        let entry = endTime.parentNode.parentNode;

        let nextEntry, index;
        for (index = 0; index < this.segments.childNodes.length; ++index) {
            if (this.segments.childNodes[index] === entry) {
                nextEntry = this.segments.childNodes[index + 1];
                break;
            }
        }

        if (typeof nextEntry !== 'undefined') {
            let startTime = nextEntry.getElementsByClassName('vs-editor-segment-entry-start-time')[0];
            startTime.value = secondsToClockTime(this.segmentation.timestamps[index + 1]);
        }
    }

    updateEntryEndTime(startTime) {
        let entry = startTime.parentNode.parentNode;

        let prevEntry, index;
        for (index = 0; index < this.segments.childNodes.length; ++index) {
            if (this.segments.childNodes[index] === entry) {
                prevEntry = this.segments.childNodes[index - 1];
                break;
            }
        }

        if (typeof prevEntry !== 'undefined') {
            let endTime = prevEntry.getElementsByClassName('vs-editor-segment-entry-end-time')[0];
            endTime.value = secondsToClockTime(this.segmentation.timestamps[index]);
        }
    }

    removeSegment(e) {
        let caller = e.target || e.srcElement || window.event.target || window.event.srcElement;
        let parent = caller.parentNode;

        let i;
        for (i = 0; i < this.segments.childNodes.length; ++i) {
            if (this.segments.childNodes[i] === parent) {
                break;
            }
        }

        if (this.segmentation.timestamps.length === 2) {
            this.segmentation.timestamps.splice(0, 2);
            this.segmentation.types.splice(0, 1);
        } else {
            this.segmentation.timestamps.splice(i + 1, 1);
            this.segmentation.types.splice(i, 1);
        }

        if (this.segmentation.types[i] === this.segmentation.types[i - 1] && i > 0) {
            this.segmentsbar.removeSegment(this.segmentation.timestamps, this.video.duration, i);
            this.segmentation.timestamps.splice(i, 1);
            this.segmentation.types.splice(i - 1, 1);
            this.segments.childNodes[i].remove();

            this.segments.childNodes[i - 1].getElementsByClassName('vs-editor-segment-entry-end-time')[0].value = secondsToClockTime(this.segmentation.timestamps[i]);
            this.segmentsbar.updateWidth(this.segmentation.timestamps, i, roundFloat(this.video.duration), true);
        }

        if (i === 0 && this.segments.length > 1) {
            this.segments.childNodes[i + 1].getElementsByClassName('vs-editor-segment-entry-start-time')[0].value = secondsToClockTime(this.segmentation.timestamps[i - 1]);
        }
        this.segments.childNodes[i].remove();

        this.saveSegmentation();
        this.segmentsbar.removeSegment(this.segmentation.timestamps, this.video.duration, i);
    }

    rewindSegment(e) {
        let caller = e.target || e.srcElement || window.event.target || window.event.srcElement;
        let parent = caller.parentNode;

        let i;
        for (i = 0; i < this.segments.childNodes.length; ++i) {
            if (this.segments.childNodes[i] === parent) {
                break;
            }
        }

        this.video.currentTime = this.segmentation.timestamps[i + 1] + 0.01;
    }

    hookControls() {
        this.showYouTubeControlsOnHover();
        this.hookMoveIcon();
        this.hookAccelerationIcon();
        this.hookOpacitySlider();
        this.hookMinimizeIcon();
        this.hookCloseIcon();
    }

    showYouTubeControlsOnHover() {
        let videoPlayerControls = document.getElementsByClassName('html5-video-player')[0];
        let mouseMoveEvent = document.createEvent("Events");
        mouseMoveEvent.initEvent("mousemove", false, false);

        let moveTimer = null;
        this.panel.addEventListener('mouseenter', () => {
            videoPlayerControls.dispatchEvent(mouseMoveEvent);
            moveTimer = setInterval(() => {
                videoPlayerControls.dispatchEvent(mouseMoveEvent);
            }, 1000);

            if (settings.panelSize === 'compact') {
                this.maximize();
            }
        });

        this.panel.addEventListener('mouseleave', () => {
            clearInterval(moveTimer);
            moveTimer = undefined;

            if (settings.panelSize === 'compact' && this.dragging === false) {
                this.minimize();
            }
        });
    }

    hookMoveIcon() {
        let icon = document.getElementById('vs-editor-move');
        let self = this;

        icon.addEventListener('mousedown', startDrag);

        function startDrag(e) {
            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', endDrag);

            self.panel.classList.add('vs-editor-opaque');
            self.dragging = true;
        }

        function drag(e) {
            // https://stackoverflow.com/a/3464890
            let doc = document.documentElement;
            let top = (window.pageYOffset || doc.scrollTop) - (doc.clientTop || 0);

            self.panel.style.left = (e.clientX - 12 - parseInt(getStyle(self.panel, 'margin-left').slice(0, -2)) * 2) + 'px';
            self.panel.style.top = (top + e.clientY - 7) + 'px';

            window.getSelection().removeAllRanges();
            self.updatePosition();
        }

        function endDrag() {
            document.removeEventListener('mousemove', drag);
            document.removeEventListener('mouseup', endDrag);

            if (self.fullscreen) {
                settings.editor.fullscreenPosX = parseInt(self.panel.style.left.slice(0, -2));
                settings.editor.fullscreenPosY = parseInt(self.panel.style.top.slice(0, -2));
            } else {
                settings.editor.posX = parseInt(self.panel.style.left.slice(0, -2));
                settings.editor.posY = parseInt(self.panel.style.top.slice(0, -2));
            }

            self.panel.classList.remove('vs-editor-opaque');
            self.dragging = false;

            saveSettings();
        }
    }

    hookAccelerationIcon() {
        let icon = document.getElementById('vs-editor-acceleration');
        icon.addEventListener('wheel', event => {
            if (event.deltaY < 0.0) {
                this.changePlaybackRate(1);
            }
            else if (event.deltaY > 0.0) {
                this.changePlaybackRate(-1);

            }
            event.preventDefault();
        });

        icon.addEventListener('click', () => {
            if (this.video.playbackRate !== settings.primaryGaugeSpeed / 100) {
                this.video.playbackRate = settings.primaryGaugeSpeed / 100;
            }
            else {
                this.video.playbackRate = settings.secondaryGaugeSpeed / 100;
            }
        });
    }

    changePlaybackRate(sign) {
        let newPlaybackRate = this.video.playbackRate + sign * settings.gaugeSpeedStep / 100;
        // chrome will throw error if playback rate > 16.0
        if (newPlaybackRate > 16.0) {
            newPlaybackRate = 16.0;
        }
        else if (newPlaybackRate < 0.0) {
            newPlaybackRate = 0.0;
        }
        this.video.playbackRate = newPlaybackRate;
    }

    hookOpacitySlider() {
        let input = document.getElementById('vs-editor-opacity-slider');
        input.setAttribute('step', '0.05');
        input.setAttribute('min', '0');
        input.setAttribute('max', '1');

        let self = this;
        input.addEventListener('change', function () {
            self.panel.style.opacity = this.value;
            self.panel.classList.add('vs-editor-allow-hover');

            if (self.fullscreen) {
                settings.segmentationToolsFullscreenOpacity = this.value * 100.0;
            } else {
                settings.segmentationToolsOpacity = this.value * 100.0;
            }
            saveSettings();
        });

        input.addEventListener('input', function () {
            self.panel.style.opacity = this.value;
            if (self.panel.classList.contains('vs-editor-allow-hover')) {
                self.panel.classList.remove('vs-editor-allow-hover');
            }
        });
    }

    hookMinimizeIcon() {
        let icon = document.getElementById('vs-editor-minimize');
        icon.addEventListener('click', () => {
            if (settings.panelSize === 'maximized') {
                settings.panelSize = 'minimized';
                this.minimize();
            } else {
                settings.panelSize = 'maximized';
                this.maximize();
            }

            saveSettings();
        });
    }

    minimize() {
        this.panel.classList.remove('vs-editor-maximized');
        this.panel.classList.add('vs-editor-minimized');

        document.getElementById('vs-editor-minimize').classList.remove('fa-window-minimize');
        document.getElementById('vs-editor-minimize').classList.add('fa-window-maximize');

        document.getElementById('vs-editor-buttons').style.display = 'none';
        // document.getElementById('vs-editor-segments').style.display = 'none';
        document.getElementById('vs-editor-actions').style.display = 'none';

        document.getElementById('vs-editor-segments').style.width = '1px';
        document.getElementById('vs-editor-segments').style.height = '1px';
        document.getElementById('vs-editor-segments').style.padding = '0px';

        document.getElementById('vs-editor-opacity').style.display = 'none';
        document.getElementById('vs-editor-close').style.display = 'none';
        document.getElementById('vs-editor-acceleration').style.display = 'none';
        document.getElementById('vs-editor-segments').style.borderBottom = '0px';

        document.getElementById('vs-editor-move').style.paddingRight = '0px';
        document.getElementById('vs-editor-close').style.paddingLeft = '0px';
    }

    maximize() {
        this.panel.classList.remove('vs-editor-minimized');
        this.panel.classList.add('vs-editor-maximized');

        document.getElementById('vs-editor-minimize').classList.remove('fa-window-maximize');
        document.getElementById('vs-editor-minimize').classList.add('fa-window-minimize');

        document.getElementById('vs-editor-buttons').style.display = 'block';
        // document.getElementById('vs-editor-segments').style.display = 'block';
        document.getElementById('vs-editor-actions').style.display = 'flex';

        document.getElementById('vs-editor-segments').style.width = 'auto';
        document.getElementById('vs-editor-segments').style.height = 'auto';
        document.getElementById('vs-editor-segments').style.padding = '3px 0px';
        document.getElementById('vs-editor-segments').style.borderBottom = '2px solid #ddd';

        document.getElementById('vs-editor-opacity').style.display = 'inline';
        document.getElementById('vs-editor-close').style.display = 'inline';
        document.getElementById('vs-editor-acceleration').style.display = 'inline';

        document.getElementById('vs-editor-move').style.paddingRight = '8px';
        document.getElementById('vs-editor-close').style.paddingLeft = '8px';
    }

    hookCloseIcon() {
        let icon = document.getElementById('vs-editor-close');
        icon.addEventListener('click', () => {
            settings.showPanel = 'never';
            this.panel.remove();
            this.panel = undefined;
            saveSettings();

            sendSmallModal('3', 'OpenUsingSettings');
        })
    }

    hookButtons() {
        let buttons = document.getElementsByClassName('vs-editor-buttons-left');
        for (let button of buttons) {
            button.addEventListener('click', this.onLeftButtonClick.bind(this));
        }

        buttons = document.getElementsByClassName('vs-editor-buttons-right');
        for (let button of buttons) {
            button.addEventListener('click', this.onRightButtonClick.bind(this));
        }

        let button = document.getElementById('vs-editor-segment-pl');
        button.addEventListener('click', () => {
            this.addSegment(roundFloat(this.video.currentTime, 1e1), 'sk', true);
            this.addSegment(roundFloat(this.video.currentTime, 1e1), 'pl', false);
            this.saveSegmentation();
        });

        button = document.getElementById('vs-editor-segment-sk');
        button.addEventListener('click', () => {
            this.addSegment(roundFloat(this.video.currentTime, 1e1), 'pl', true);
            this.addSegment(roundFloat(this.video.currentTime, 1e1), 'sk', false);
            this.saveSegmentation();
        });
    }

    onLeftButtonClick(e) {
        let caller = e.target || e.srcElement || window.event.target || window.event.srcElement;
        this.addSegment(roundFloat(this.video.currentTime, 1e1), caller.id.substring(18), true);
        this.saveSegmentation();
    }

    onRightButtonClick(e) {
        let caller = e.target || e.srcElement || window.event.target || window.event.srcElement;
        this.addSegment(roundFloat(this.video.currentTime, 1e1), caller.id.substring(22), false);
        this.saveSegmentation();
    }

    addSegment(timestamp, type, left) {
        // log(timestamp, type, left);

        // clear focus 
        document.activeElement.blur();

        let entry;
        if (typeof this.segmentation.timestamps !== 'undefined' && this.segmentation.timestamps.length > 0) {
            let index = this.segmentation.timestamps.findIndex((element) => {
                return element > timestamp;
            });

            let tempIndex = index;
            if (index !== -1) {
                if (this.segmentation.types[index - 1] === type) {
                    if (left === true) {
                        index = index + 1;
                    } else {
                        index = index - 1;
                    }
                }
            } else {
                if (left === true) {
                    index = this.segmentation.types.length + 1;
                } else {
                    index = this.segmentation.types.length - 1;
                }
            }

            // log(left === true, this.segmentation.types[index-2], type, index)

            if (left === true && this.segmentation.types[index - 2] === type) {
                let endTimeInput = document.getElementsByClassName('vs-editor-segment-entry-end-time')[index - 2];
                this.segmentation.timestamps[index - 1] = timestamp;
                endTimeInput.value = secondsToClockTime(timestamp);
                endTimeInput.size = endTimeInput.value.length + 1;
                setTimeout(() => {
                    endTimeInput.focus();
                }, 100);

                this.segmentsbar.updateWidth(this.segmentation.timestamps, index - 1, roundFloat(this.video.duration), true);
                this.updateEntryStartTime(endTimeInput);
            } else if (left === false && this.segmentation.types[index] === type) {
                let endTimeInput = document.getElementsByClassName('vs-editor-segment-entry-end-time')[index - 1];
                this.segmentation.timestamps[index] = timestamp;
                endTimeInput.value = secondsToClockTime(timestamp);
                endTimeInput.size = endTimeInput.value.length + 1;
                setTimeout(() => {
                    endTimeInput.focus();
                }, 100);

                this.segmentsbar.updateWidth(this.segmentation.timestamps, index, roundFloat(this.video.duration), true);
                this.updateEntryStartTime(endTimeInput);
                this.updateEntryEndTime(endTimeInput);
            } else {
                index = tempIndex;
                // log(index);

                // insert index can't be less then 1 (because first timestamp is always 0.0)
                let outsideOfArray = false;
                if (index < 1) {
                    index = this.segmentation.timestamps.length;
                    outsideOfArray = true;

                    if (left === false) {
                        timestamp = roundFloat(this.video.duration);
                    }
                }

                this.segmentation.timestamps.splice(index, 0, timestamp);
                index = (left ? index - 1 : index);
                this.segmentation.types.splice(index, 0, type);
                entry = this.createSegmentEntry((outsideOfArray && left === false) ? index - 1 : index);
                // log(this.segmentation.types, index);

                if (left) {
                    setTimeout(() => {
                        entry.getElementsByClassName('vs-editor-segment-entry-end-time')[0].focus();
                    }, 100);
                } else {
                    setTimeout(() => {
                        this.segments.getElementsByClassName('vs-editor-segment-entry-end-time')[index - 1].focus();
                    }, 100);
                }

                if (left) {
                    if (outsideOfArray) {
                        this.segments.childNodes[index - 1].insertAdjacentElement('afterEnd', entry);
                        left = false;
                    } else {
                        this.segments.childNodes[index].insertAdjacentElement('beforeBegin', entry);
                    }
                } else {
                    if (outsideOfArray) {
                        index--;
                    }
                    this.segments.childNodes[index - 1].insertAdjacentElement('afterEnd', entry);
                    this.updateEntryEndTime(entry.getElementsByClassName('vs-editor-segment-entry-end-time')[0]);
                }

                this.segmentsbar.addSegment(this.segmentation.timestamps, this.segmentation.types, this.video.duration, index, left);
                this.updateEntryStartTime(entry.getElementsByClassName('vs-editor-segment-entry-end-time')[0]);
            }
        } else {
            this.segmentation.timestamps = (left ? [0, timestamp] : [0, roundFloat(this.video.duration)]);
            this.segmentation.types = [type];

            entry = this.createSegmentEntry(0);
            this.segments.appendChild(entry);
            this.segmentsbar.addSegment(this.segmentation.timestamps, this.segmentation.types, this.video.duration, 0, left);
            this.updateEntryStartTime(entry.getElementsByClassName('vs-editor-segment-entry-end-time')[0]);
            this.updateEntryEndTime(entry.getElementsByClassName('vs-editor-segment-entry-end-time')[0]);
            setTimeout(() => {
                entry.getElementsByClassName('vs-editor-segment-entry-end-time')[0].focus();
            }, 100);
        }
    }

    onSegmentTypeChanged(e) {
        let caller = e.target || e.srcElement || window.event.target || window.event.srcElement;
        let parent = caller.parentNode;

        let i;
        for (i = 0; i < this.segments.childNodes.length; ++i) {
            if (this.segments.childNodes[i] === parent) {
                break;
            }
        }

        this.segmentation.types[i] = caller.value;
        this.segmentsbar.updateType(caller.value, i);

        if (i > 0 && this.segmentation.types[i] === this.segmentation.types[i - 1]) {
            this.removeSegment({
                target: this.segments.childNodes[i - 1].firstChild
            });
        } else if (i < this.segmentation.types.length - 1 && this.segmentation.types[i] === this.segmentation.types[i + 1]) {
            this.removeSegment({
                target: this.segments.childNodes[i].firstChild
            });
        } else {
            this.saveSegmentation();
        }
    }

    hookActions() {
        let share = document.getElementById('vs-editor-share');
        share.addEventListener('click', this.shareSegmentation.bind(this));
    }

    async shareSegmentation() {
        if (this.lastShareIteration === this.iterations) {
            if (settings.popupSize === 'big') {
                sendBigModal('1', 'noChangesInSegmentation');
            } else {
                sendSmallModal('1', 'noChangesInSegmentation');
            }
            return;
        }
        this.lastShareIteration = this.iterations;

        let segmentation = {
            id: this.id,
            timestamps: this.segmentation.timestamps.slice(1, -1),
            types: this.segmentation.types.slice()
        }

        if (settings.mode === 'simplified') {
            segmentation.types = convertSimplifiedSegmentation(segmentation.types);
        }

        let response = await xhr_post('https://db.videosegments.org/api/v3/set.php', segmentation);
        log(response);

        if (response.code === '3') {
            sendCaptchaModal(event => {
                this.checkCaptcha(event, segmentation)
            });
        } else {
            if (response.code === '0') {
                sendSmallModal(response.code, response.message);

                if (response.message === 'added' || response.message === 'updated' || response.message === 'accepted' || response.message === 'overriden') {
                    this.setSegmentationOrigin('official');
                }
                else if (response.message === 'sended') {

                }
            } else {
                if (settings.popupSize === 'big') {
                    sendBigModal(response.code, response.message);
                } else {
                    sendSmallModal(response.code, response.message);
                }
            }
        }
    }

    async checkCaptcha(event, segmentation) {
        if (event.origin === 'https://db.videosegments.org') {
            segmentation.captcha = event.data;

            let response = await xhr_post('https://db.videosegments.org/api/v3/set.php', segmentation);
            sendSmallModal(response.code, response.message);
            log(response);
        }
    }

    onFullscreen(e) {
        if (e !== null && this.fullscreen === false) {
            this.fullscreen = true;

            if (settings.showEditorInFullscreen) {
                document.getElementsByClassName('html5-video-player')[0].appendChild(this.panel);

                setTimeout(() => {
                    this.panel.style.left = settings.editor.fullscreenPosX + 'px';
                    this.panel.style.top = settings.editor.fullscreenPosY + 'px';
                    document.getElementById('vs-editor-opacity-slider').value = roundFloat(settings.segmentationToolsFullscreenOpacity);
                }, 100);

                this.panel.style.opacity = settings.segmentationToolsFullscreenOpacity / 100.0;
            }
        } else {
            this.fullscreen = false;
            document.body.appendChild(this.panel);
            this.panel.style.left = settings.editor.posX + 'px';
            this.panel.style.top = settings.editor.posY + 'px';
            this.panel.style.opacity = settings.segmentationToolsOpacity / 100.0;
            document.getElementById('vs-editor-opacity-slider').value = roundFloat(settings.segmentationToolsOpacity);
        }

        this.updatePosition();
    }

    hookHotkeys() {
        document.addEventListener('keydown', e => {
            let combination = getPressedCombination(e);
            if (settings.hotkeys[combination]) {
                if (['BODY', 'DIV', 'BUTTON'].indexOf(document.activeElement.tagName) !== -1 || (document.activeElement.tagName === 'INPUT' && document.activeElement.classList.contains('vs-editor-segment-entry-time') === true)) {
                    document.getElementById(settings.hotkeys[combination]).click();
                    e.stopImmediatePropagation();
                    e.stopPropagation();
                    e.preventDefault();

                    let videoPlayerControls = document.getElementsByClassName('html5-video-player')[0];
                    let mouseMoveEvent = document.createEvent("Events");
                    mouseMoveEvent.initEvent("mousemove", false, false);
                    videoPlayerControls.dispatchEvent(mouseMoveEvent);
                    return false;
                }
            }
        }, {capture: true});

        document.getElementById('vs-editor-inc-gauge').addEventListener('click', () => {
            this.changePlaybackRate(1);
        });
        document.getElementById('vs-editor-dec-gauge').addEventListener('click', () => {
            this.changePlaybackRate(-1);
        });
    }

    updatePosition() {
        if (this.panel.offsetLeft < 0) {
            this.panel.style.left = '0px';
        } else if (window.innerWidth < this.panel.offsetLeft + this.panel.clientWidth) {
            this.panel.style.left = (window.innerWidth - (this.panel.clientWidth + 10)) + 'px';
        } else {
            this.panel.style.left = this.panel.offsetLeft + 'px';
        }
    }

    saveSegmentation() {
        let video_id = 'youtube-' + this.id;
        if (this.segmentation.types.length === 0) {
            // remove it from local database 
            browser.storage.local.remove([video_id], () => {
                this.setSegmentationOrigin('deleted');
            });

            document.getElementById('vs-editor-segments').style.display = 'none';
            document.getElementById('vs-editor-share').style.display = 'none';
        } else {
            // save locally
            let segmentation;
            if (settings.mode === 'simplified') {
                // break link between segments data and saved data 
                segmentation = {
                    timestamps: this.segmentation.timestamps.slice(),
                    types: convertSimplifiedSegmentation(this.segmentation.types)
                };
            } else {
                // break link between segments data and saved data
                segmentation = {
                    timestamps: this.segmentation.timestamps.slice(),
                    types: this.segmentation.types.slice()
                };  
            }

            segmentation.timestamps.shift(); // remove first 
            if (segmentation.timestamps[segmentation.timestamps.length - 1] !== this.video.duration) {
                // abstract segment to prevent segmentation extending  
                segmentation.timestamps.push(this.video.duration);
                segmentation.types.push('-');
            }
            segmentation.timestamps.pop(); // remove last 

            browser.storage.local.set({
                [video_id]: segmentation
            }, () => {
                this.updateIterationsCount();
            });

            document.getElementById('vs-editor-segments').style.display = 'block';
            document.getElementById('vs-editor-share').style.display = 'block';
        }

        this.iterations = this.iterations + 1;
        if (document.getElementById('vs-share-segmentation')) {
            document.getElementById('vs-share-segmentation').disabled = false;
        }
    }

    setSegmentationOrigin(origin) {
        translateNodeText(this.originElement, origin);
    }

    updateIterationsCount() {
        while (this.originElement.firstChild) {
            this.originElement.removeChild(this.originElement.firstChild);
        }

        let textNode = document.createTextNode(translateText('savedLocally') + ' (' + this.iterations + ')');
        this.originElement.appendChild(textNode);
    }

    updateSettings(prop, value) {
        if (prop === 'segmentationToolsOpacity') {
            settings[prop] = value;

            if (this.fullscreen !== true) {
                this.panel.style.opacity = value / 100.0;

                let opacitySlider = document.getElementById('vs-editor-opacity-slider');
                opacitySlider.value = value / 100;
            }
        } else if (prop === 'segmentationToolsFullscreenOpacity') {
            settings[prop] = value;

            if (this.fullscreen === true) {
                this.panel.style.opacity = value / 100.0;

                let opacitySlider = document.getElementById('vs-editor-opacity-slider');
                opacitySlider.value = value / 100;
            }
        } else if (prop === 'position') {
            settings.editor.posX = value;
            settings.editor.posY = value;
            settings.editor.fullscreenPosX = value;
            settings.editor.fullscreenPosY = value;

            this.panel.style.left = value + 'px';
            this.panel.style.top = value + 'px';
            this.updatePosition();
        } else if (prop === 'hotkeys') {
            settings.hotkeys = value;
        } else if (prop === 'showPanel') {
            settings[prop] = value;
            log(settings.showPanel === 'always', settings.showPanel);

            if (settings.showPanel === 'always' || (settings.showPanel === 'empty' && (typeof this.segmentation === 'undefined' || this.iterations !== 0))) {
                if (typeof this.panel === 'undefined') {
                    this.createEditor();
                }
            } else {
                if (typeof this.panel !== 'undefined') {
                    this.remove();
                }
            }

        } else if (prop === 'panelSize') {
            settings[prop] = value;

            if (value === 'maximized') {
                this.maximize();
            } else {
                this.minimize();
            }
        } else if (prop === 'mode') {
            settings[prop] = value.mode;
            this.segmentation = value.segmentation;

            if (settings.showPanel === 'always' || (settings.showPanel === 'empty' && (typeof this.segmentation === 'undefined' || this.iterations !== 0))) {
                if (typeof this.panel !== 'undefined') {
                    while (this.segments.firstChild) {
                        this.segments.firstChild.remove();
                    }
                    this.createSegmentsEntries();

                    if (settings.mode === 'simplified') {
                        document.getElementById('vs-editor-simplified-buttons').style.display = 'flex';
                        document.getElementById('vs-editor-expert-buttons').style.display = 'none';
                    } else {
                        document.getElementById('vs-editor-simplified-buttons').style.display = 'none';
                        document.getElementById('vs-editor-expert-buttons').style.display = 'flex';
                    }
                }
            }
        } else if (prop === 'popupSize') {
            settings[prop] = value;
        }
    }

    remove() {
        if (typeof this.panel !== 'undefined') {
            this.panel.remove();
            this.panel = undefined;
        }
    }
}