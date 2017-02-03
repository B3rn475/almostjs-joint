// Copyright (c) 2016, the ALMOsT project authors. Please see the
// AUTHORS file for details. All rights reserved. Use of this source code is
// governed by a MIT-style license that can be found in the LICENSE file.
/*jslint node: true, nomen: true */
"use strict";

var $ = require('jquery'),
    joint = require('joint');

exports.ViewportOutline = joint.shapes.basic.Generic.extend({
    markup: require('./markup.svg'),

    defaults: joint.util.deepSupplement({
        type: 'map.ViewportOutline',
        size: {width: 1, height: 1},
        attrs: {
            '.almost-joint-viewport-bg-rect' : {'follow-scale': 'auto'},
            '.almost-joint-viewport-outer-rect': {
                'ref-x': 0,
                'ref-y': 0,
                'ref-width': 1,
                'ref-height': 1,
                ref: '.almost-joint-viewport-bg-rect'
            }
        }
    }, joint.shapes.basic.Generic.prototype.defaults)
});
