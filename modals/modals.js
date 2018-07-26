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

async function sendSmallModal(code, message)
{
    let modal = await makeImport(browser.extension.getURL('modals/small.html'));
    modal = modal.getElementsByClassName('vs-small-modal')[0];

    let header = modal.getElementsByClassName('vs-small-modal-header')[0];
    let body = modal.getElementsByClassName('vs-small-modal-message')[0];

    if ( code === '0' ) {
        header.style.backgroundColor = '#0a0';
        header.innerHTML = 'success';
        body.innerHTML = message;
    }
    else if ( code === '1' ) {
        header.style.backgroundColor = '#c00';
        header.style.color = '#fff';
        header.innerHTML = 'failed';
        body.innerHTML = message;
    }
    else if ( code === '2' ) {
        header.style.backgroundColor = '#00a';
        header.style.color = '#fff';
        header.innerHTML = 'rejected';
        body.innerHTML = message;
    }
    
    setTimeout(() => modal.classList.add('vs-small-modal-animation'), 100);
    setTimeout(() => modal.classList.remove('vs-small-modal-animation'), settings.popupDurationOnSend * 1000 + 100);
    setTimeout(() => modal.remove(), settings.popupDurationOnSend * 1000 + 1100);

    document.body.appendChild(modal);
}

async function sendBigModal(code, message)
{
    let modal = await makeImport(browser.extension.getURL('modals/big.html'));
    modal = modal.getElementsByClassName('vs-big-modal')[0];

    let header = modal.getElementsByClassName('vs-big-modal-header')[0];
    let body = modal.getElementsByClassName('vs-big-modal-message')[0];

    if ( code === '0' ) {
        header.style.backgroundColor = '#0a0';
        header.innerHTML = 'success';
        body.innerHTML = message;
    }
    else if ( code === '1' ) {
        header.style.backgroundColor = '#c00';
        header.style.color = '#fff';
        header.innerHTML = 'failed';
        body.innerHTML = message;
    }
    else if ( code === '2' ) {
        header.style.backgroundColor = '#00a';
        header.style.color = '#fff';
        header.innerHTML = 'rejected';
        body.innerHTML = message;
    }
    else if ( code === '3' ) {
        header.style.backgroundColor = '#00a';
        header.style.color = '#fff';
        header.innerHTML = 'rejected';
        body.innerHTML = message;
    }
    
    modal.getElementsByClassName('vs-big-modal-close')[0].addEventListener('click', function() {
        modal.remove();
    });
    document.body.appendChild(modal);
}

async function sendCaptchaModal(messageContext)
{
    let modal = await makeImport(browser.extension.getURL('modals/captcha.html'));
    modal = modal.getElementsByClassName('vs-captcha-modal')[0];

    function messageContextInner(event) 
    {
        messageContext(event);
        if ( event.origin === 'https://db.videosegments.org' ) {
            window.removeEventListener('message', messageContextInner);
            window.removeEventListener('click', clickContext);
            modal.remove();
        }
    }

    function clickContext(event)
    {
        if ( event.target !== modal ) {
            window.removeEventListener('message', messageContextInner);
            window.removeEventListener('click', clickContext);
            modal.remove();
        }
    }

    window.addEventListener('message', messageContextInner);
    window.addEventListener('click', clickContext);
    
    document.body.appendChild(modal);
}