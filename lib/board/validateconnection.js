// Copyright (c) 2016, the ALMOsT project authors. Please see the
// AUTHORS file for details. All rights reserved. Use of this source code is
// governed by the MIT license that can be found in the LICENSE file.
/*jslint node: true */
"use strict";

var joint = require('joint');

function ignore() { return undefined; }

exports.validateConnection = function (cellViewS, magnetS, cellViewT, magnetT, end, linkView) {
    ignore(magnetS, magnetT);
    if (cellViewS === cellViewT) { return false; }
    if (linkView.model.validateConnection) {
        return linkView.model.validateConnection(cellViewS, magnetS, cellViewT, magnetT, end, linkView);
    }
    if (end === 'source') {
        return -1 !== linkView.model.validSources.indexOf(cellViewS.model.get('type'));
    }
    return -1 !== linkView.model.validTargets.indexOf(cellViewT.model.get('type'));
};
