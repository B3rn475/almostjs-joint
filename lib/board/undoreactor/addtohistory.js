// Copyright (c) 2018, the ALMOsT project authors. Please see the
// AUTHORS file for details. All rights reserved. Use of this source code is
// governed by the MIT license that can be found in the LICENSE file.
/*jslint node: true, nomen: true */
"use strict";

var _ = require('lodash'),
    hasEffect = require('./haseffect');

function shouldMergeHistory(last, entry, opt) {
    if (last === undefined || _.isArray(last)) {
        return false;
    }
    if (!opt.ui) {
        return false;
    }
    if (last.model !== entry.model) {
        return false;
    }
    if (!last.delta || !entry.delta) {
        return false;
    }
    return true;
}

function mergeHistory(last, entry) {
    last.delta = _.assign(entry.delta, last.delta);
    if (entry.id) {
        last.id = entry.id;
    }
}

function addToHistory(history, entry, opt) {
    var last = _.last(history);
    if (shouldMergeHistory(last, entry, opt)) {
        mergeHistory(last, entry);
        if (!hasEffect(last)) {
            history.pop();
        }
    } else {
        history.push(entry);
    }
}

module.exports = addToHistory;
