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

function tryChannelFilter(channel, duration) {
    return new Promise(resolve => {
        if (typeof channel === 'undefined') {
            resolve({
                timestamps: undefined,
                types: undefined,
                origin: 'NoSegmentation'
            });
            return;
        }

        browser.storage.local.get({
            ['|c|' + channel]: []
        }, result => {
            let filter = result['|c|' + channel];
            if (filter.length < 3) {
                resolve({
                    timestamps: undefined,
                    types: undefined,
                    origin: 'NoSegmentation'
                });
                return;
            }

            let timestamps = [0.0];
            let types = [];

            if (filter[0] !== filter[1]) {
                if (filter[0] === 0.0) {
                    timestamps.push(filter[1]);
                    types.push('cs');
                } else {
                    timestamps.push(filter[0]);
                    timestamps.push(filter[1]);
                    types.push('c');
                    types.push('cs');
                }

                types.push('c');
                if (filter[2] !== 0.0) {
                    timestamps.push(duration - filter[2]);
                    types.push('cs');
                }
            } else if (filter[2] > 0.0) {
                timestamps.push(duration - filter[2]);
                types.push('c');
                types.push('cs');

                self.origin = 'filtered';
            }

            timestamps.push(duration);

            resolve({
                timestamps: timestamps,
                types: types,
                origin: 'Filtered'
            });
        });
    });
}