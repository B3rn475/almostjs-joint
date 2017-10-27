// Copyright (c) 2016, the ALMOsT project authors. Please see the
// AUTHORS file for details. All rights reserved. Use of this source code is
// governed by a MIT-style license that can be found in the LICENSE file.
/*jslint node: true */
"use strict";

var $ = require('jquery'),
    joint = require('joint'),
    atob = require('atob'),
    Uint8Array = require('Uint8Array'),
    Blob = require('Blob'),
    saveAs = require('FileSaver'),
    svg2png = require('save-svg-as-png');

function uriToBlob(uri) {
    var delimiter = 'base64,',
        index = uri.indexOf(delimiter),
        b64Data = uri.substr(index + delimiter.length),
        contentType = uri.substr(0, uri.indexOf(';')),
        sliceSize = 512,
        byteCharacters = atob(b64Data),
        byteArrays = [],
        offset,
        slice,
        byteNumbers,
        i,
        byteArray;

    for (offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        slice = byteCharacters.slice(offset, offset + sliceSize);

        byteNumbers = [];
        for (i = 0; i < slice.length; i += 1) {
            byteNumbers[i] = slice.charCodeAt(i);
        }

        byteArray = new Uint8Array(byteNumbers);

        byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, {type: contentType});
}

function Preview(options) {
    if (!(this instanceof Preview)) { return new Preview(options); }
    options = options || {};

    if (!options.model || typeof options.model !== 'object') { throw new Error('model option is Mandatory'); }
    if (!options.linkConnectionPoint || typeof options.linkConnectionPoint !== 'function') { throw new Error('linkConnectionPoint option is Mandatory'); }
    if (!options.el) { throw new Error('el option is Mandatory'); }
    if ($(options.el).length === 0) { throw new Error('invalid el option'); }

    var self = this,
        el = $($(options.el)[0]),
        model = options.model,
        lastScale = 1,
        linkConnectionPoint = options.linkConnectionPoint,
        paper = new joint.dia.Paper({
            el: el,
            width: el.width(),
            height: el.height(),
            model: model,
            linkConnectionPoint: linkConnectionPoint,
            interactive: false
        });

    self.setBBox = function (bbox) {
        // it is similar to paper.scaleContentToFit(); but i require to do it manually to change even the origin
        var width = el.width(),
            height = el.height(),
            scaleX = width / bbox.width,
            scaleY = height / bbox.height,
            scale = Math.min(scaleX, scaleY),
            ox = (width - bbox.width * scale) / 2 - bbox.x * scale,
            oy = (height - bbox.height * scale) / 2 - bbox.y * scale;

        lastScale = scale;
        paper.scale(scale, scale);
        paper.setOrigin(ox, oy);
    };

    self.download = function () {
        svg2png.svgAsPngUri(paper.svg, {scale: 3 / lastScale}, function (uri) {
            saveAs(uriToBlob(uri), "model.png");
        });
    };
}

exports.Preview = Preview;
