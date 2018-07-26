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

function makeImport(file)
{
    let link = document.createElement('link');
    link.rel = 'import';
    link.href = file;

    return new Promise(resolve => {
        link.onload = () => {
            let content = link.import.cloneNode(true);
            translateNodes(content);
            link.remove();

            resolve(content);
        }

        document.head.appendChild(link);
    })
}

function translateNodes(target)
{
    let nodes = target.getElementsByClassName('vs-translate-me');
    for ( let node of nodes ) {
        node.classList.remove('vs-translate-me');
        translateNode(node);
    }
}

function translateNode(node)
{
    translateNodeText(node, node.innerHTML);
}

function translateNodeText(node, text)
{
    while ( node.firstChild ) {
        node.removeChild(node.firstChild);
    } 

    let textNode = document.createTextNode(translateText(text));
    node.appendChild(textNode);
}

function translateText(text)
{
    return browser.i18n.getMessage(text);
}

function injectCSS(url)
{
    let link = document.createElement('link');
    link.href = url;
    link.type = 'text/css';
    link.rel = 'stylesheet';
    document.getElementsByTagName('head')[0].appendChild(link);
}

function secondsToClockTime(timestamp, showMs = false, keepPrecision = false)
{
    if ( typeof timestamp === 'undefined' ) {
        timestamp = 0.0;
    }
    
    let seconds = parseInt(timestamp) % 60;
    let ms = Math.round(timestamp * 1000);
    
    let hours = parseInt(ms / 3600000);
    ms -= hours * 3600000;
    
    let minutes = parseInt(ms / 60000);
    
    // https://stackoverflow.com/a/19700358
    hours = (hours < 10) ? "0" + hours : hours;
    hours = (hours != '00')?(hours+':'):''
    minutes = (minutes < 10) ? "0" + minutes : minutes;
    seconds = (seconds < 10) ? "0" + seconds : seconds;
    
    let time;
    if ( showMs ) {
        ms = ms.toString();
        
        if ( ms[ms.length-2] == '0' && !keepPrecision ) {
            ms = ms[ms.length-3];
        }
        else {
            ms = ms[ms.length-3] + ms[ms.length-2];
        }
        
        // TODO: remove this workaround 
        if ( isNaN(ms) ) ms = '0';
        
        time = hours + minutes + ':' + seconds + '.' + ms;
    }
    else {
        time = hours + minutes + ':' + seconds;
    }
    
    // log(time);
    return time;
}

function roundFloat(value, precision = 1e2)
{
    return (Math.round(value * precision) / precision);
}

// https://www.codingforums.com/javascript-programming/230503-how-get-margin-left-value.html
function getStyle(e, styleName) {
    let styleValue = "";
    if ( document.defaultView && document.defaultView.getComputedStyle ) {
        styleValue = document.defaultView.getComputedStyle(e, "").getPropertyValue(styleName);
    }
    else if ( e.currentStyle ) {
        styleName = styleName.replace(/\-(\w)/g, function (strMatch, p1) {
            return p1.toUpperCase();
        });
        styleValue = e.currentStyle[styleName];
    }
    return styleValue;
}

function xhr_post(url, data)
{
    let xhr = new XMLHttpRequest();
    xhr.open('POST', url);

    let post = '';
    for ( let key in data ) {
        post += key + '=' + data[key] + '&';
    }
    post = post.slice(0, -1);

    return new Promise((resolve, reject) => {
        xhr.onreadystatechange = () => {
            if ( xhr.readyState == 4 ) {
                if ( xhr.status == 200 ) {
                    resolve(JSON.parse(xhr.responseText));
                }
                else {
                    reject();
                }
            }
        }

        xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded");
        xhr.send(post);
    })
}

function convertSimplifiedSegmentation(types)
{
    // https://stackoverflow.com/a/5915891
    return types.map(function(item) { return item == 'sk' ? 'cs' : 'c'; });
}