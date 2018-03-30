// Copyright (c) 2018, the ALMOsT project authors. Please see the
// AUTHORS file for details. All rights reserved. Use of this source code is
// governed by the MIT license that can be found in the LICENSE file.
/*jslint node: true, nomen: true */
"use strict";

var _ = require('lodash'),
    hasEffect = require('./haseffect');

function compressSequences(history) {
    var optimized = [],
        last = null;
    _.forEachRight(history, function (current) {
        var id;
        if (current.delta) {
            if (last && last.model === current.model) {
                id = last.id || current.id;
                if (id) {
                    last.id = id;
                }
                last.delta = _.assign(last.delta, current.delta);
            } else {
                last = current;
                optimized.unshift(current);
            }
        } else {
            optimized.unshift(current);
        }
    });
    return optimized;
}

function removeUnnecessaryTail(history) {
    var remove = _.takeRightWhile(history, function (current) {
        if (current.delta) {
            if (current.id) {
                return false;
            }
            return !hasEffect(current);
        }
        return false;
    });
    return _.difference(history, remove);
}

var optimizeHistory = _.flow(
    _.flattenDeep,
    compressSequences,
    removeUnnecessaryTail
);

module.exports = optimizeHistory;
