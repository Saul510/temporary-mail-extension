/* Global Variables */
var credentials = {};
var emailMsgs = {};
var activeMsg;
var timer;


function saveOptions(data) {
    /*
     * Saves email token info to chrome.storage & global variable(s)
     * Updates popup.html with email info.
     * Starts listening for incoming emails.
     *
     * params:
     *     data: Object { address: "emailAddress", secretKey: "secretKey" }
     */

    // console.log(`popup::saveOptions`)
    let toSave = {
        email: data.address,
        secret: data.secretKey,
        created: data.created
    };

    credentials = toSave;

    chrome.storage.sync.set(toSave, function() {
        restoreOptions();
    });

    setTimer(listenForEmails, 3000);

}

function clearOptions() {
    /*
     * Clears data stored in chrome.storage
     */

    // console.log(`popup::clearOptions`);

    var remove = [];

    chrome.storage.sync.get(function(items) {
        items.forEach((item) => {
            if (item == "email" || item == "secret") {
                remove.push(item);
            }
        })

        chrome.storage.sync.remove(remove, function(items) {
            chrome.storage.sync.get(function(items) {
                items.forEach((item) => {
                    // console.log("removed: " + index);
                })
            });
        });
    });
}

function restoreOptions() {
    /*
     * Checks to see if there is existing email credentials. If none found,
     * generates new, else displays existing.
     * Updates popup.html with email info.
     * Starts listening for incoming emails.
     */

    // console.log(`popup::restoreOptions`)

    chrome.storage.sync.get([
        'email',
        'secret',
        'created'
    ], function(items) {
        var expired = Math.round((new Date(items.created) - new Date()) / 1000);

        if (typeof items.email != "undefined" && typeof items.secret != "undefined" && expired < 21500) {
            document.getElementById('emailAddress').value = items.email;
            credentials = {
                email: items.email,
                secret: items.secret,
                created: items.created
            };
            listenForEmails();
        } else {
            getNewEmailAddress();
        }
    });

}

/*

	Toggle loading icon

*/

var buttonElements = {};

function toggleLoading(element) {

    if (element.attr('data-loading') == "1") {

        element.html(buttonElements[element]);
        element.attr('data-loading', 0);
        element.removeClass("noEvent");

    } else {

        buttonElements[element] = element.html();
        element.width(element.width());

        element.html('<i class="fa fa-circle-o-notch fa-spin"></i>');
        element.attr('data-loading', "1");
        element.addClass("noEvent");

    }

}

/*

	Notifications

*/

var notificationTimeout;

function notificationBox(message, color, icon, time) {

    if (color == "red") {

        $("#notificationBox").attr('class', 'redNotification');

    }

    if (color == "green") {

        $("#notificationBox").attr('class', 'greenNotification');

    }
	
	clearTimeout(notificationTimeout);
	$("#notificationBox").slideUp('fast');

    $("#notificationIcon").html('<i class="fa fa-' + icon + '"></i>');
    $("#notificationText").text(message);
    $("#notificationBox").slideDown('fast');

    notificationTimeout = setTimeout(function() {

        $("#notificationBox").slideUp('fast');

    }, time);


}

function getNewEmailAddress() {
    /*
     * Creates new email address
     */

    // console.log(`popup::getNewEmailAddress`);

    toggleLoading($("#changeEmail"));
    $("#emailMsgs").slideUp();
    $("#emailMsgs").html("");

    var data = {
        method: "GET",
        action: "requestEmailAccess&value=random"
    }

    postData(data).then(res => {

        console.log("here");
        console.log(res);

        $("#inboxAddress").attr('href', "https://temporarymail.com/#" + res.address);

        setTimeout(function() {

            $("#emailMsgs").slideDown();

            toggleLoading($("#changeEmail"));
            notificationBox("Your address has been changed!", "green", "check", 5000);

            res['created'] = new Date().getTime();
            console.log(res);
            saveOptions(res);

        }, 1000);

    }, (err) => {
        // console.log(err)
    })
}

function copyAddress() {
    /*
     * Implements copy for email addres.
     */

    notificationBox('Copied to clipboard', 'green', "clipboard", 3000);

    var emailInput = document.getElementById("emailAddress");
    var capitalizedAddress = emailInput.value;

    emailInput.value = capitalizedAddress.toLowerCase();
    emailInput.select();
    document.execCommand("copy");

    emailInput.value = capitalizedAddress;

    emailInput.setSelectionRange(0, 255);
}

function setTimer(func, time) {
    /*
     * Configures a timer for function given a function and time.
     *
     * params:
     *     func: function
     *     time: int
     */

    // console.log(`popup::setTimer: func=${func}, time=${time}`);

    if (typeof(timer) != "undefined") {
        clearInterval(timer);
    }

    timer = setInterval(func, time);
}

function listenForEmails() {
    /*
     * Checks & handles emails
     */

    // console.log(`popup::listenForEmails`);

    if (!('secret' in credentials)) {
        return false;
    }

    var data = {
        action: `checkInbox&value=${credentials.secret}`,
        // action: `checkInbox&value=MmbaqlOE66iSq9IcBFDAVeKjEyideKee`, // for testing
        method: "GET"
    }


    var newEmail = 0;

    postData(data).then(res => {

        chrome.browserAction.setBadgeText({
            text: Object.keys(res).length.toString()
        });

        Object.keys(res).forEach((msg, idx) => {
            if (!(msg in emailMsgs)) {
                renderEmailMsg(res[msg]);
                newEmail = 1;
            }
        });

        if (newEmail == 1) {

            notificationBox('You have received mail!', 'green', "envelope", 3000);

        }

        emailMsgs = res;

        // console.log(res)
    }, (err) => {
        // console.log(err)
    })
}


function renderEmailMsg(msg) {
    /*
     * Renders out an email to popup.html
     *
     * params:
     *     msg: Object
     *         attachments: []
     *         date: "1618003920"           string epoch
     *         from: "email@sender.com"     string email
     *         id: "fjkslaf"                string hash
     *         name: null                   unknonw
     *         sourceHash: null             unknown
     *         subject: "subjectstuff"      string
     *         to: "email address"          string receiver email
     */

    var currentTime = timeSince(msg.date);

    $("#emailMsgs").prepend(`
        <div class="row mt-1 pb-2 emailMeta openEmail" id="${msg.id}" style="box-shadow: 0 0.25rem .25rem rgba(0,0,0,.045) !important;padding: 10px;font-size:12px;border-bottom: 1px solid #dbdbdb;font-weight: 300;">
            <div class="col-4 messageTime"><span class="timeCount" data-timestamp="${msg.date}">${currentTime}</span></div>
            <div class="col-4 messageFrom">${msg.from}</div>
            <div class="col-4 messageSubject">${msg.subject}</div>
        </div>
    `);

}

function viewEmail(id, close) {
    /*
     * TODO: implement displaying email msg
     */
    var url = `https://temporarymail.com/view/?i=${id}&width=200`;
    var frame = document.getElementById("msgFrame");



    if (close) {
        var closeBtn = document.getElementById('closeEmail');
        closeBtn.setAttribute("style", "display: none !imporant");
        frame.setAttribute("src", "");

        $("#emailPage").fadeOut(function() {

            $("#panelPage").fadeIn();

        });

    } else {

        var closeBtn = document.getElementById('closeEmail');
        closeBtn.setAttribute("style", "display: block !imporant");
        frame.setAttribute("src", url);

        $("#panelPage").fadeOut(function() {

            $("#emailPage").fadeIn();

        });

    }

}


/* Get exact date from timestamp */
function timestampToDate(timestamp) {

    var dateObject = new Date(timestamp * 1000);

    var year = dateObject.getFullYear();
    var month = dateObject.getMonth() + 1;
    var day = dateObject.getDate();
    var locale = navigator.language;

    if (!locale) {

        locale = "en-US";

    }

    if (month < 10) {

        month = "0" + month;

    }

    if (day < 10) {

        day = "0" + day;

    }

    var localTime = dateObject.toLocaleTimeString(locale);

    return year + "-" + month + "-" + day + " " + localTime;

}

function convertTimestampsToAgo() {

    $(".timeCount").each(function() {

        var timestamp = $(this).attr("data-timestamp");

        $(this).html(timeSince(timestamp));

    });

}

/* Timestamp to 'ago' (e.g "Just Now" or "2 days ago" */
function timeSince(date) {

    var plural = '';
    var seconds = Math.floor(((new Date().getTime() / 1000) - date));

    if (seconds < 20) {

        return "Just now";

    }

    var interval = Math.floor(seconds / 31536000);

    if (interval >= 1) {

        if (interval > 1) {

            plural = "s";

        }

        return interval + " year" + plural + " ago";

    }

    interval = Math.floor(seconds / 2592000);

    if (interval >= 1) {

        if (interval > 1) {

            plural = "s";

        }

        return interval + " month" + plural + " ago";

    }

    interval = Math.floor(seconds / 86400);

    if (interval >= 1) {

        if (interval > 1) {

            plural = "s";

        }

        return interval + " day" + plural + " ago";

    }

    interval = Math.floor(seconds / 3600);

    if (interval >= 1) {

        if (interval > 1) {

            plural = "s";

        }

        return interval + " hour" + plural + " ago";

    }

    interval = Math.floor(seconds / 60);

    if (interval >= 1) {

        if (interval > 1) {

            plural = "s";

        }

        return interval + " minute" + plural + " ago";

    }

    return Math.floor(seconds) + " second" + plural + " ago";

}

convertTimestampsToAgo();

setInterval(function() {

    convertTimestampsToAgo();

}, 5000);



$("body").on('click', ".openEmail", function() {

    var emailId = $(this).attr("id");

    viewEmail(emailId, false);

});

/* Event Listners */
document.getElementById('changeEmail').addEventListener('click', getNewEmailAddress);
document.getElementById('copyAddress').addEventListener('click', copyAddress);
document.getElementById('closeEmail').addEventListener('click', function() {
    viewEmail(0, true);
});

document.addEventListener('DOMContentLoaded', function() {
    // clearOptions();
    restoreOptions();
    setTimer(listenForEmails, 8000);
});
