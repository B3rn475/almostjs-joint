// Copyright (c) 2018, the ALMOsT project authors. Please see the
// AUTHORS file for details. All rights reserved. Use of this source code is
// governed by the MIT license that can be found in the LICENSE file.
/*jslint node: true, nomen: true*/
"use strict";

var joint = require('joint');

function isFullyContained(element, parent) {
    if (parent.id === element.id) {
        return false;
    }
    var bbox = element.getBBox({useModelGeometry: true}),
        padding = parent.padding,
        pbbox = parent.getBBox({useModelGeometry: true}),
        pinternal = joint.g.rect(
            pbbox.x + padding.left,
            pbbox.y + padding.top,
            pbbox.width - padding.left - padding.right,
            pbbox.height - padding.top - padding.bottom
        );
    return pinternal.containsRect(bbox);
}

exports.isFullyContained = isFullyContained;
