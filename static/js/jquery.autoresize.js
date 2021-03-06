/** @license
 * AutoResize v1.1.1
 *  A jQuery Plugin that matches a textarea to the height of its text content
 *  http://azoffdesign.com/autoresize
 *
 * Intended for use with the latest jQuery
 *  http://code.jquery.com/jquery-latest.js
 *
 * Copyright 2011, Jonathan Azoff
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *  http://jquery.org/license
 *
 * For API documentation, see the README file
 *  https://github.com/azoff/AutoResize/blob/master/README.md
 *
 * Date: Sunday, September 25th 2011
 */

/*jslint onevar: true, strict: true */

/*global jQuery */

"use strict";

(function($, plugins, frame) { 
    var

    ALLOWED_NODES = 'textarea',

    EVENTS = 'keyup change paste input';

    function init(textarea) { 
	var
        target = $(textarea),
        value = target.val(),
        height = target.val('').height(),
        scroll = textarea.scrollHeight,
        offset = scroll > height ? (scroll - height) : 0;
        target.data('minHeight', 0);
        target.data('scrollOffset', 0);
        return target.val(value);
    }

    function resize() { 
        var target = $(this);
        var scrollOffset = 0;
        var minHeight = 0;
        //scrollTop = frame.scrollTop(),
        var scrollHeight = target.height(0).prop('scrollHeight');
        target.height(scrollHeight);
        //frame.scrollTop(scrollTop);

    }

    function apply() {
        init(this).bind(EVENTS, resize);
        resize.call(this)
    }
    function applyNow() {
        resize.call(this)
    }

    plugins.autoResize = function() {
        return this.filter(ALLOWED_NODES).each(apply);
    };
    plugins.resizeNow = function() {
        return this.filter(ALLOWED_NODES).each(applyNow);
    };

})(jQuery, jQuery.fn, jQuery(window));
