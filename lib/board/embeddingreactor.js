// Copyright (c) 2016, the ALMOsT project authors. Please see the
// AUTHORS file for details. All rights reserved. Use of this source code is
// governed by the MIT license that can be found in the LICENSE file.
/*jslint node: true, nomen: true */
"use strict";

var _ = require('lodash'),
    $ = require('jquery'),
    joint = require('joint'),
    createResizeReactor = require('./resizereactor').ResizeReactor;

function EmbeddingReactor(options) {
    if (!(this instanceof EmbeddingReactor)) { return new EmbeddingReactor(options); }
    options = options || {};

    if (!options.paper || typeof options.paper !== 'object' || !(options.paper instanceof joint.dia.Paper)) { throw new Error('paper option is mandatory'); }
    if (!options.model || typeof options.model !== 'object') { throw new Error('model option is mandatory'); }
    if (!options.isValidParent || typeof options.isValidParent !== 'function') { throw new Error('isValidParent option is mandatory'); }
    if (!options.undoReactor || typeof options.undoReactor !== 'object') { throw new Error('undoReactor option is mandatory'); }

    var paper = options.paper,
        model = options.model,
        isValidParent = options.isValidParent,
        undoReactor = options.undoReactor,
        startPosition;

    paper.on('cell:pointerdown', function (cellView, evt, x, y) {
        _.noop(evt, x, y);
        var element = cellView.model;

        if (element.isLink()) { return; }

        startPosition = element.position();
        undoReactor.start();

        element.toFront({deep: true});

        model.startBatch('to-front');
        _.invoke(model.getLinks(), 'toFront');
        model.stopBatch('to-front');
    });

    function getParent(cellView) {
        var element = cellView.model,
            elementsBelow = model.findModelsInArea(element.getBBox({useModelGeometry: true}));

        if (elementsBelow.length) {
            return _.chain(elementsBelow)
                .map(function (parent) {
                    return paper.findViewByModel(parent);
                })
                .filter(function (parentCellView) {
                    return isValidParent(cellView, parentCellView);
                })
                .sortBy(_.method('get', 'z'))
                .last()
                .value();
        }
    }

    paper.on('cell:pointerup', function (cellView, evt, x, y) {
        _.noop(evt, x, y);
        var element = cellView.model,
            newPosition,
            oldparent,
            newparent;

        if (element.isLink()) { return; }

        newPosition = element.position();
        
        function end() {
            undoReactor.stop();
        }

        function abort() {
            if (undoReactor.stop()) {
                model.startBatch('to-back');
                undoReactor.undo(false);
                model.stopBatch('to-back');
            }
        }

        if (newPosition.x === startPosition.x && newPosition.y === startPosition.y) {
            abort();
            return;
        }

        function reparent() {
            _.each(
                model.getConnectedLinks(element, {deep: true}),
                function (link) { link.reparent(); }
            );
            undoReactor.stop();
        }

        newparent = getParent(cellView);
        newparent = newparent && newparent.model;
        if (!newparent && !isValidParent(cellView, undefined)) {
            abort();
            return;
        }

        oldparent = model.getCell(element.get('parent'));

        if (newparent) {
            if (oldparent) {
                oldparent.unembed(element, {reparenting: true});
                newparent.embed(element);
                reparent();
            } else {
                newparent.embed(element);
                reparent();
            }
        } else {
            if (oldparent) {
                oldparent.unembed(element);
                reparent();
            } else {
                end();
            }
        }
    });

    model.on('add', function (cell) {
        if (cell.isLink()) { return cell.get('parent') || cell.reparent(); }
        var element = cell,
            cellView = paper.findViewByModel(element),
            parent;
        if (element.get('parent')) {
            parent = model.getCell(element.get('parent'));
            parent.unembed(element, {reparenting: true});
            parent.embed(element);
            return;
        }
        parent = getParent(cellView);
        parent = parent && parent.model;
        if (parent) {
            parent.embed(element);
            parent.toFront({deep: true});
        } else {
            if (!isValidParent(cellView, undefined)) {
                _.defer(function () { element.remove(); });
            } else {
                element.set('parent');
            }
        }
    });
}

exports.EmbeddingReactor = EmbeddingReactor;
