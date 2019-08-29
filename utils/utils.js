/*
VideoSegments. Extension to Cut YouTube Videos. 
Copyright (C) 2017-2019  Alex Lys

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

function makeImport(file) {
    isFirefox = true;
    if (isFirefox) {
        let xhr = new XMLHttpRequest();
        xhr.open("GET", file);

        return new Promise(resolve => {
            xhr.onreadystatechange = () => {
                if (xhr.readyState == 4) {
                    if (xhr.status == 200) {
                        let parser = new DOMParser();
                        let doc = parser.parseFromString(
                            xhr.responseText,
                            "text/html"
                        );
                        translateNodes(doc);
                        resolve(doc);
                    }
                }
            };

            xhr.setRequestHeader(
                "content-type",
                "application/x-www-form-urlencoded"
            );
            xhr.send();
        });
    } else {
        let link = document.createElement("link");
        link.rel = "import";
        link.href = file;

        return new Promise(resolve => {
            link.onload = () => {
                let content = link.import.cloneNode(true);
                translateNodes(content);
                link.remove();

                resolve(content);
            };

            document.head.appendChild(link);
        });
    }
}

function translateNodes(target) {
    let nodes = target.getElementsByClassName("vs-translate-me");
    for (let node of nodes) {
        translateNode(node);
    }
}

function translateNode(node) {
    translateNodeText(node, node.innerHTML);
}

function translateNodeText(node, text) {
    while (node.firstChild) {
        node.removeChild(node.firstChild);
    }

    let textNode = document.createTextNode(translateText(text));
    node.appendChild(textNode);
}

function translateText(text) {
    return browser.i18n.getMessage(text);
}

function injectCSS(url) {
    let link = document.createElement("link");
    link.href = url;
    link.type = "text/css";
    link.rel = "stylesheet";
    document.getElementsByTagName("head")[0].appendChild(link);
}

// https://stackoverflow.com/a/38063486
function injectCSSRule(rule) {
    var css = document.createElement("style");
    css.type = "text/css";
    if (css.styleSheet) css.styleSheet.cssText = rule;
    // Support for IE
    else css.appendChild(document.createTextNode(rule)); // Support for the rest
    document.getElementsByTagName("head")[0].appendChild(css);
}

function secondsToClockTime(timestamp, showMs = false, keepPrecision = false) {
    if (typeof timestamp === "undefined") {
        timestamp = 0.0;
    }

    let seconds = parseInt(timestamp) % 60;
    let ms = Math.round(timestamp * 1000);

    let hours = parseInt(ms / 3600000);
    ms -= hours * 3600000;

    let minutes = parseInt(ms / 60000);

    // https://stackoverflow.com/a/19700358
    hours = hours < 10 ? "0" + hours : hours;
    hours = hours != "00" ? hours + ":" : "";
    minutes = minutes < 10 ? "0" + minutes : minutes;
    seconds = seconds < 10 ? "0" + seconds : seconds;

    let time;
    if (showMs) {
        ms = ms.toString();

        if (ms[ms.length - 2] == "0" && !keepPrecision) {
            ms = ms[ms.length - 3];
        } else {
            ms = ms[ms.length - 3] + ms[ms.length - 2];
        }

        // TODO: remove this workaround
        if (isNaN(ms)) ms = "0";

        time = hours + minutes + ":" + seconds + "." + ms;
    } else {
        time = hours + minutes + ":" + seconds;
    }

    // log(time);
    return time;
}

function roundFloat(value, precision = 1e2) {
    return Math.round(value * precision) / precision;
}

// https://www.codingforums.com/javascript-programming/230503-how-get-margin-left-value.html
function getStyle(e, styleName) {
    let styleValue = "";
    if (document.defaultView && document.defaultView.getComputedStyle) {
        styleValue = document.defaultView
            .getComputedStyle(e, "")
            .getPropertyValue(styleName);
    } else if (e.currentStyle) {
        styleName = styleName.replace(/\-(\w)/g, function(strMatch, p1) {
            return p1.toUpperCase();
        });
        styleValue = e.currentStyle[styleName];
    }
    return styleValue;
}

function xhr_get(url) {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", url);

    return new Promise((resolve, reject) => {
        xhr.onreadystatechange = () => {
            if (xhr.readyState == 4) {
                if (xhr.status == 200) {
                    resolve(JSON.parse(xhr.responseText));
                } else {
                    reject();
                }
            }
        };

        xhr.setRequestHeader(
            "content-type",
            "application/x-www-form-urlencoded"
        );
        xhr.send();
    });
}

function xhr_post(url, data) {
    let xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    let post = "";
    for (let key in data) {
        post += key + "=" + data[key] + "&";
    }
    post = post.slice(0, -1);

    return new Promise((resolve, reject) => {
        xhr.onreadystatechange = () => {
            if (xhr.readyState == 4) {
                if (xhr.status == 200) {
					console.log(xhr.responseText);
                    resolve(JSON.parse(xhr.responseText));
                } else {
                    reject();
                }
            }
        };

        xhr.setRequestHeader(
            "content-type",
            "application/x-www-form-urlencoded"
        );
        xhr.send(post);
    });
}

function convertSimplifiedSegmentation(types) {
    if (typeof types !== "undefined") {
        // https://stackoverflow.com/a/5915891
        return types.map(function(item) {
            return item == "sk" ? "cs" : "c";
        });
    }

    return undefined;
}

// https://gomakethings.com/how-to-get-the-value-of-a-querystring-with-native-javascript/
function getQueryString(field) {
    let href = window.location.href;
    let reg = new RegExp("[?&]" + field + "=([^&#]*)", "i");
    let res = reg.exec(href);
    return res ? res[1] : null;
}

function getPressedCombination(e) {
    if (e.key === "Shift" || e.key === "Control" || e.key === "Alt") {
        return "";
    }

    if (e.key === "Backspace") {
        return "";
    }

    let shiftmod = e.shiftKey === true ? "SHIFT+" : "";
    let ctrlmod = e.ctrlKey === true ? "CTRL+" : "";
    let altmod = e.altKey === true ? "ALT+" : "";

    return ctrlmod + altmod + shiftmod + e.key.toUpperCase();
}

// https://stackoverflow.com/a/16941754
function removeParam(key, sourceURL) {
    var rtn = sourceURL.split("?")[0],
        param,
        params_arr = [],
        queryString =
            sourceURL.indexOf("?") !== -1 ? sourceURL.split("?")[1] : "";
    if (queryString !== "") {
        params_arr = queryString.split("&");
        for (var i = params_arr.length - 1; i >= 0; i -= 1) {
            param = params_arr[i].split("=")[0];
            if (param === key) {
                params_arr.splice(i, 1);
            }
        }
        rtn = rtn + "?" + params_arr.join("&");
    }
    return rtn;
}

// https://stackoverflow.com/a/22780569
function jsonp(url, callback) {
    var callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
    window[callbackName] = function(data) {
        delete window[callbackName];
        document.body.removeChild(script);
        callback(data);
    };

    var script = document.createElement('script');
    script.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'callback=' + callbackName;
    document.body.appendChild(script);
}
