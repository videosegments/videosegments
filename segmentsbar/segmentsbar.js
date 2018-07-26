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

class Segmentsbar {
	constructor(parent) {
		this.container = document.createElement('ul');
		this.container.id = 'vs-segmentsbar';
		this.bars = []

		if (settings.segmentsBarLocation === 'separated') {
			parent.insertAdjacentElement("afterEnd", this.container);
		} else {
			parent.insertAdjacentElement("afterBegin", this.container);
			if (settings.segmentsBarLocation === 'overlay') {
				this.container.classList.add('vs-segmentsbar-overlay');
			}
		}
	}

	set(timestamps, types, duration) {
		while (this.container.firstChild) {
			this.container.removeChild(this.container.firstChild);
		}

		if (!timestamps || !types) {
			return;
		}

		// to avoid rounding error resulting in width more than 100% 
		duration = Math.floor(duration * 100) / 100;
		let width;
		for (let i = 0; i < types.length; ++i) {
			width = (timestamps[i + 1] - timestamps[i]) / duration * 100;
			width = Math.floor(width * 100) / 100;

			let bar = this.createBar();
			bar.style.backgroundColor = settings.segments[types[i]].color;
			bar.style.width = width + '%';

			this.container.insertAdjacentElement('beforeEnd', bar);
			if (settings.segments[types[i]].skip === false) {
				if (settings.hidePlayingSegmentBars === true) {
					bar.style.opacity = 0.0;
				}
			}

			this.bars[i] = bar;
		}
	}

	createBar() {
		let bar = document.createElement('li');
		bar.classList.add('vs-segmentbar');
		bar.innerHTML = '&nbsp;';
		return bar;
	}

	updateWidth(timestamps, index, duration, updateNeighbor) {
		if (timestamps.length === 0) {
			return;
		} else if (timestamps.length === 2) {
			index = 1;
		}

		let width = (timestamps[index] - timestamps[index - 1]) / duration * 100;
		width = Math.floor(width * 100) / 100;
		this.bars[index - 1].style.width = width + '%';

		// TODO: remove this.bars[index] check (called from smart cursor when only 1 segment exists)
		if (updateNeighbor && this.bars[index]) {
			width = (timestamps[index + 1] - timestamps[index]) / duration * 100;
			width = Math.floor(width * 100) / 100;
			this.bars[index].style.width = width + '%';
		}
	}

	updateType(type, index) {
		this.bars[index].style.backgroundColor = settings.segments[type].color;
	}

	addSegment(timestamps, types, duration, index, left) {
		let bar = this.createBar();
		bar.style.backgroundColor = settings.segments[types[index]].color;
		if (settings.segments[types[index]].skip === false) {
			if (settings.hidePlayingSegmentBars === true) {
				bar.style.opacity = 0.0;
			}
		}

		this.bars.splice(index, 0, bar);

		if (types.length === 1) {
			this.container.appendChild(bar);
		} else {
			if (left) {
				this.container.childNodes[index].insertAdjacentElement('beforeBegin', bar);
			} else {
				this.container.childNodes[index - 1].insertAdjacentElement('afterEnd', bar);
			}
		}

		this.updateWidth(timestamps, (left ? index + 1 : index), duration, (timestamps.length === 2 ? false : true));
	}

	removeSegment(timestamps, duration, index) {
		this.bars[index].remove();
		this.bars.splice(index, 1);

		if (timestamps.length !== index + 1) {
			this.updateWidth(timestamps, index + 1, duration, false);
		}
	}

	updateOpacity(types) {
		let i;
		for (i = 0; i < this.bars.length; ++i) {
			if (settings.segments[types[i]].skip === false) {
				if (settings.hidePlayingSegmentBars === true) {
					this.bars[i].style.opacity = 0.0;
				} else {
					this.bars[i].style.opacity = 1.0;
				}
			}
		}
	}

	remove() {
		this.container.remove();
		this.container = undefined;
	}
}