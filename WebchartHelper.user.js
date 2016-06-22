// ==UserScript==
// @name         Webchart Helper
// @namespace    https://github.com/sordidfellow/TamperMonkeyUserScripts/WebchartHelper.user.js
// @downloadURL  https://github.com/sordidfellow/TamperMonkeyUserScripts/raw/master/WebchartHelper.user.js
// @version      1.0
// @description  Verify environments match in all frames.  Adds environment name to "app bar".  Adds golden ticket status to app bar.
// @author       SordidFellow
// @match        https://webchartnow.com/*
// @grant        GM_notification
// @grant        GM_addStyle
// ==/UserScript==
/* jshint -W097 */
'use strict';

function myConsoleClass () {
    this.prefix = 'TamperMonkey::WebchartHelper: ';
}

myConsoleClass.prototype.log = function(t) {window.console.log(this.prefix + t);};
myConsoleClass.prototype.warn = function(t) {window.console.warn(this.prefix + t);};
myConsoleClass.prototype.error = function(t) {window.console.error(this.prefix + t);};

var con = new myConsoleClass();

var defaultEnvConfig = function () {
    // icon is a character from FontAwesome
    var c = {
        'name': 'Default Env - Not Setup',
        'icon': '\uf059',                  // default is question-circle
        'color': '#555555'                 // dark grey
    };
    c.setName = function(newName) {
        this.name = newName;
        return this;
    };
    c.setIcon = function(newIcon) {
        this.icon = newIcon;
        return this;
    };
    c.setColor = function(newColor) {
        this.color = newColor;
        return this;
    };
    return c;
};


var config = {
    'chevrondev': defaultEnvConfig().setName('Dev').setColor('#AAFFAA').setIcon('\uf126'),         // pastel green, code path
    'chevrondev2': defaultEnvConfig().setName('Conversion').setColor('#AAAAFF').setIcon('\uf071'), // pastel dark blue, exclamation-triangle
    'chevrontest': defaultEnvConfig(),
    'chevronqa': defaultEnvConfig().setName('QA').setColor('#FFAAFF').setIcon('\uf0a3'),           // purple? chartruse?, cogs
    'chevron': defaultEnvConfig().setName('Production').setColor('#FBE9EA').setIcon('\uf0f0')      // default color (light pink?)
};


function getEnvFromPath(path){
    // if not chevron env, return ""
    // else
    // return the contents between the first 2 slashes:  chevron, chevrondev, etc.
    if (!path || path.length === 0) {
        con.error("getEnvFromPath called with empty path!");
        return "";
    }
    if (path == "blank") {
        return "";
    }
    if (path[0] != '/') {
        con.warn("getEnvFromPath - path did not start with / ... " + path);
    }
    var p = path.split('/');
    if (!p) {
        con.warn("getEnvFromPath - path did not split right! ... " + path);
    }
    if (p.length > 2) {
        return p[1];
    } else {
        con.warn("getEnvFromPath - path did not contain enough /'s ... " + path);
    }
}

function getEnvFromLoc(l){
    return getEnvFromPath(l.pathname);
}

function Show(msg) {
    /*
    GM_notification(details, ondone), GM_notification(text, title, image, onclick)
    Shows a HTML5 Desktop notification and/or highlight the current tab.

    details can have the following attributes:
    text - the text of the notification (optional if highlight is set)
    title - the notificaton title (optional)
    image - the image (optional)
    highlight - a boolean flag whether to highlight the tab that sends the notfication (optional)
    timeout - the time after that the notification will be hidden (optional, 0 = disabled)
    ondone - called when the notification is closed (no matter if this was triggered by a timeout or a click) or the tab was highlighted (optional)
    onclick - called in case the user clicks the notification (optional)
    All parameters do exactly the same like their corresponding details property pendant.
    */
    GM_notification({'text':msg, 'title':'Environment mis-match detected!', 'highlight': true, 'timeout': 60});
    con.warn(msg);
    window.alert(msg);
}

var mainEnv = getEnvFromLoc(window.location);
con.log("Current Window/Frame: " + window.location + " | " + mainEnv);

// This loop doesn't catch anything, because frames change themselves later and we don't check our children again.
/*
for (var i=0; i < window.frames.length; ++i) {
    var frameEnv = getEnvFromLoc(frames[i].location);
    console.log('Child Frame ' + i + ': ' + window.frames[i].location + " | " + frameEnv);
    if (frameEnv && frameEnv != mainEnv) {
        Show("Main Window says " + mainEnv + " but frame is on env " + frameEnv + "\nMain: " + window.location + "\nFrame[" + i + "]: " +  + frames[i].location + "\nFrame Referrer: " +  + frames[i].document.referrer);
    }
}
*/

// check all ancestor windows for matching env
// build a nice object as we go for display in case we detect something
var frameStack = [];
var current = window;
var cEnv = getEnvFromLoc(current.location);
var pEnv = "";
frameStack.push({"Env":cEnv + " (THIS PAGE)", "Path":current.location.pathname, "Referrer":current.document.referrer});
var ancestor = 0;
while (current != current.parent && ++ancestor < 100) {
    pEnv = getEnvFromLoc(current.parent.location);
    frameStack.push({"Env":pEnv, "Path":current.parent.location.pathname, "Referrer":current.parent.document.referrer});
    con.log('Parent Frame ' + ancestor + ': ' + current.parent.location + " | " + pEnv);
    if (cEnv && pEnv && cEnv != pEnv) {
        Show("Env Mismatch detected! Ancestor #" + ancestor + " has env " + pEnv + " but it's child has env " + cEnv + "\nAncestor[" + ancestor + "]: " + current.parent.location + "\n" +
              "Descendant: " + current.location + "\n" +
              "Descendant Referrer: " + current.document.referrer + "\n" +
              "Ancestor Referrer: " + current.parent.document.referrer + "\n" +
              "Current Referrer: " + window.document.referrer);
        var last = frameStack.pop();
        var nextLast = frameStack.pop();
        last.Env = "--> " + last.Env + " <--";
        last.Path = "--> " + last.Path + " <--";
        nextLast.Env = "--> " + nextLast.Env + " <--";
        nextLast.Path = "--> " + nextLast.Path + " <--";
        nextLast.Referrer = "--> " + nextLast.Referrer + " <--"; // guilty referrer
        frameStack.push(nextLast);
        frameStack.push(last);
        con.table(frameStack);  // print the whole stack!

        var w = window;
        var sanity = 100;
        var newTitle = "ERROR: " + pEnv + " != " + cEnv;
        while (w.document.title != newTitle && --sanity > 0) {
            w.document.title = newTitle;
            w = w.parent;
        }
        break;
    }
    current = current.parent;
    cEnv = getEnvFromLoc(current.location);
}

// done with environment matching checks.  apply CSS overrides here
if (typeof(config[mainEnv]) != 'undefined') {
    var c = config[mainEnv];
    con.log("Using config for " + mainEnv + ": " + c.name + ', ' + c.color);
    GM_addStyle("#wc_applicationbar { background-color: " + c.color + " !important }; ");
    var appBar = document.getElementById('wc_applicationbar');
    if (appBar) {
        var newElem = document.createElement('div');
        newElem.setAttribute('style', 'float:left; margin-right: 10px; margin-left: 10px;');
        newElem.setAttribute('id', 'header_env_tampermonkey');
        // use fontawesome to specify icon
        newElem.innerHTML = '<span class="wc_info_label fa nolink" + title="Environment"> ' + c.icon + ' </span>&nbsp;' + c.name;
        var appBarInner = appBar.children[0];
        // insert before the last child, which is a css clearfix type element.
        appBarInner.insertBefore(newElem, appBarInner.children[3]);
        con.log ("Application bar adjusted to include environment info.");
    } else {
        con.warn ("This webchart frame does not have the application bar showing.");
    }
} else {
    con.warn ("Environment not in config list: " + mainEnv);
}



function detectGoldenTicket(session_id) {
    // check session storage to see if we already have a golden ticket
    if (!session_id) return;

    con.log("detectGoldenTicket: Session ID is " + session_id);
    var haveTicket = localStorage.getItem(window.session_id);
    if (haveTicket) {
        var ticketAge = (new Date()).getTime() - haveTicket;
        if (ticketAge < 1000*3600*24) { // 24 hour limit
            // have ticket.  compute age
            var ls = localStorage.getItem(session_id);
            var age = (new Date().getTime() - ls) / 1000;
            var ageH = Math.floor(age / 3600);
            var ageM = Math.floor((age % 3600) / 60);
            var ageS = Math.floor(age % 60);
            var ageStr = "";  // final str
            if (ageH > 0) ageStr += "" + ageH + "h ";
            if (ageH > 0 || ageM > 0) ageStr += "" + ageM + "m ";
            if (ageH > 0 || ageM > 0 || ageS > 0) ageStr = " " + ageStr + ageS + "s";

            // Add to bar
            var appBar = document.getElementById('wc_applicationbar');
            if (appBar) {
                var newElem = document.createElement('div');
                newElem.setAttribute('style', 'float:left; margin-right: 10px; margin-left: 10px;');
                newElem.setAttribute('id', 'header_env_tampermonkey_gt');
                // use fontawesome to specify icon
                newElem.innerHTML = '<span class="wc_info_label fa nolink" + title="Golden Ticket">\uf145</span>&nbsp;Golden Ticket active ' + ageStr;
                var appBarInner = appBar.children[0];
                // insert before the last child, which is a css clearfix type element.
                appBarInner.insertBefore(newElem, appBarInner.children[3]);
            } else {
                con.warn ("This webchart frame does not have the application bar showing.");
            }
        }
    }
}

detectGoldenTicket(window.session_id);
