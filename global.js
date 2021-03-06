// Copyright (c) 2016, the ALMOsT project authors. Please see the
// AUTHORS file for details. All rights reserved. Use of this source code is
// governed by the MIT license that can be found in the LICENSE file.
/*jslint node: true*/
"use strict";

var window = require('window');

if (!window.almost) {
    window.almost = {
        plugins: {}
    };
}
window.almost.plugins.joint = require('./');
