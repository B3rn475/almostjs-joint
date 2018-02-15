// Copyright (c) 2016, the ALMOsT project authors. Please see the
// AUTHORS file for details. All rights reserved. Use of this source code is
// governed by a MIT-style license that can be found in the LICENSE file.
/*jslint node: true, nomen: true */
"use strict";

var _ = require('lodash'),
    $ = require('jquery'),
    joint = require('joint');

function normalizeDirection(direction) {
    if (2 === direction.length) { return {v: direction.substr(0, 1), h: direction.substr(-1)}; }
    switch (direction) {
    case 'n':
    case 's':
        return {v: direction};
    case 'w':
    case 'e':
        return {h: direction};
    }
}

function ResizeReactor(options) {
    if (!(this instanceof ResizeReactor)) { return new ResizeReactor(options); }
    options = options || {};

    if (!options.paper || typeof options.paper !== 'object' || !(options.paper instanceof joint.dia.Paper)) { throw new Error('paper option is mandatory'); }
    if (!options.view || typeof options.view !== 'object') { throw new Error('view option is mandatory'); }
    if (!options.model || typeof options.model !== 'object') { throw new Error('model option is mandatory'); }
    if (!options.el) { throw new Error('el option is mandatory'); }
    if ($(options.el).length === 0) { throw new Error('invalid el option'); }
    if (!options.direction) { throw new Error('direction option is mandatory'); }
    if (-1 === ['ne', 'e', 'se', 's', 'sw', 'w', 'nw', 'n'].indexOf(options.direction)) { throw new Error('invalid direction option'); }
    if (typeof options.gridSize !== 'number') { throw new Error('gridSize option is mandatory and has to be a number'); }
    if (options.gridSize < 0) { throw new Error('gridSize cannot be less than zero'); }
    if (!options.undoReactor || typeof options.undoReactor !== 'object') { throw new Error('undoReactor option is mandatory'); }

    var el = $($(options.el)[0]),
        paper = options.paper,
        model = options.model,
        gridSize = options.gridSize,
        element = options.view.model,
        undoReactor = options.undoReactor,
        direction = normalizeDirection(options.direction),
        minsize = (function () {
            var msize = element.minsize,
                padding,
                embeds = _.filter(element.getEmbeddedCells(), function (element) { return element.isContraint; }),
                bbox,
                embedsbbox,
                minwidth = msize.width,
                minheight = msize.height;
            if (embeds.length) {
                embedsbbox = model.getBBox(embeds, {useModelGeometry: true});
                bbox = element.getBBox({useModelGeometry: true});
                padding = element.padding;
                switch (direction.h) {
                case 'e':
                    minwidth = embedsbbox.corner().x - bbox.origin().x + padding.right;
                    break;
                case 'w':
                    minwidth = bbox.corner().x - embedsbbox.origin().x + padding.left;
                    break;
                }
                switch (direction.v) {
                case 's':
                    minheight = embedsbbox.corner().y - bbox.origin().y + padding.bottom;
                    break;
                case 'n':
                    minheight = bbox.corner().y - embedsbbox.origin().y + padding.top;
                    break;
                }
                return {width: Math.max(minwidth, msize.width), height: Math.max(minheight, msize.height)};
            }
            return msize;
        }()),
        mouseenter;

    undoReactor.start();

    function fixPoint(point, direction) {
        var x = point.x,
            y = point.y;
        switch (direction.h) {
        case 'e':
            x -= gridSize;
            break;
        case 'w':
            x += gridSize;
            break;
        }
        switch (direction.v) {
        case 's':
            y -= gridSize;
            break;
        case 'n':
            y += gridSize;
            break;
        }
        return joint.g.point(x, y);
    }

    function constrain(point) {
        var parent = element.get('parent'),
            bbox,
            padding;
        point = joint.g.point(joint.g.snapToGrid(point.x, gridSize), joint.g.snapToGrid(point.y, gridSize));
        if (parent) {
            parent = model.getCell(parent);
            bbox = parent.getBBox({useModelGeometry: true});
            padding = parent.padding;
            point = joint.g.point(
                Math.max(Math.min(point.x, bbox.corner().x - padding.right), bbox.x + padding.left),
                Math.max(Math.min(point.y, bbox.corner().y - padding.bottom), bbox.y + padding.top)
            );
        }
        return point;
    }

    function mousemove(e) {
        var client = constrain(fixPoint(paper.clientToLocalPoint({x: e.clientX, y: e.clientY}), direction)),
            position = element.get('position'),
            size = element.get('size'),
            width,
            height,
            px,
            py;
        switch (direction.h) {
        case 'e':
            width = Math.max(client.x - position.x, minsize.width);
            px = position.x;
            break;
        case 'w':
            width = Math.max(size.width - client.x + position.x, minsize.width);
            px = position.x + size.width - width;
            break;
        default:
            width = size.width;
            px = position.x;
        }
        switch (direction.v) {
        case 's':
            height = Math.max(client.y - position.y, minsize.height);
            py = position.y;
            break;
        case 'n':
            height = Math.max(size.height - client.y + position.y, minsize.height);
            py = position.y + size.height - height;
            break;
        default:
            height = size.height;
            py = position.y;
        }
        element.position(px, py);
        element.resize(width, height);
    }

    function mouseleave(e) {
        var point = joint.g.point(e.clientX, e.clientY),
            bbox = joint.g.rect(el.offset().left, el.offset().top, el.width(), el.height());
        point = bbox.pointNearestToPoint(point);
        e.clientX = point.x;
        e.clientY = point.y;
        return mousemove(e);
    }

    function terminate() {
        el.off('mouseup', terminate);
        el.off('mouseenter', mouseenter);
        el.off('mousemove', mousemove);
        el.off('mouseleave', mouseleave);
        el.removeClass('almost-joint-manipulating');
        el.removeClass('almost-joint-resizing-' + options.direction);
        undoReactor.stop();
    }

    mouseenter = function (e) {
        if (e.buttons === 0) {
            terminate();
        }
    };

    el.on('mouseup', terminate);
    el.on('mouseenter', mouseenter);
    el.on('mousemove', mousemove);
    el.on('mouseleave', mouseleave);

    el.addClass('almost-joint-manipulating');
    el.addClass('almost-joint-resizing-' + options.direction);
}

exports.ResizeReactor = ResizeReactor;
