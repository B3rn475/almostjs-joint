// Copyright (c) 2018, the ALMOsT project authors. Please see the
// AUTHORS file for details. All rights reserved. Use of this source code is
// governed by a MIT-style license that can be found in the LICENSE file.
/*jslint node: true, nomen: true */
"use strict";

var _ = require('lodash');

function hasEffect(entry) {
    if (!entry.delta || entry.id) {
        return true;
    }
    var result = _.every(entry.delta, function (value, key) {
        return !_.isEqual(value, entry.model.get(key));
    });
    return result;
}

module.exports = hasEffect;
