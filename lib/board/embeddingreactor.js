// Copyright (c) 2016, the ALMOsT project authors. Please see the
// AUTHORS file for details. All rights reserved. Use of this source code is
// governed by a MIT-style license that can be found in the LICENSE file.
/*jslint node: true, nomen: true */
"use strict";

var _ = require('lodash'),
    $ = require('jquery'),
    joint = require('joint'),
    createResizeReactor = require('./resizereactor').ResizeReactor;

function isContainerOf(element) {
    var containers = element.containers || [];
    return function (element) {
        return -1 !== containers.indexOf(element.get('type'));
    };
}

function isEmbeddable(element) {
    function fullyContained(parent) {
        var bbox = element.getBBox({useModelGeometry: true}),
            padding = parent.padding,
            pbbox = parent.getBBox({useModelGeometry: true}),
            pinternal = joint.g.rect(
                pbbox.x + padding.left,
                pbbox.y + padding.top,
                pbbox.width - padding.left - padding.right,
                pbbox.height - padding.top - padding.bottom
            );
        return parent.id !== element.id && pinternal.containsRect(bbox);
    }

    if (element.fullyContained) {
        return fullyContained;
    }
    return function () { return true; };
}

function EmbeddingReactor(options) {
    if (!(this instanceof EmbeddingReactor)) { return new EmbeddingReactor(options); }
    options = options || {};

    if (!options.paper || typeof options.paper !== 'object' || !(options.paper instanceof joint.dia.Paper)) { throw new Error('paper option is mandatory'); }
    if (!options.model || typeof options.model !== 'object') { throw new Error('model option is mandatory'); }
    if (!options.undoReactor || typeof options.undoReactor !== 'object') { throw new Error('undoReactor option is mandatory'); }

    var paper = options.paper,
        model = options.model,
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

    function getParent(element, x, y) {
        _.noop(x, y);
        var elementsBelow = model.findModelsInArea(element.getBBox({useModelGeometry: true}));

        if (elementsBelow.length) {
            return _.chain(elementsBelow)
                .filter(isContainerOf(element))
                .filter(isEmbeddable(element))
                .sortBy(_.method('get', 'z'))
                .last()
                .value();
        }
    }

    paper.on('cell:pointerup', function (cellView, evt, x, y) {
        _.noop(evt, x, y);
        var element = cellView.model,
            newPosition = element.get('position'),
            oldparent,
            newparent;

        if (element.isLink()) { return; }

        if (newPosition.x === startPosition.x && newPosition.y === startPosition.y) { return; }

        function end() {
            undoReactor.stop();
        }

        function abort() {
            undoReactor.stop();
            undoReactor.undo(false);
        }

        function reparent() {
            _.each(
                model.getConnectedLinks(element, {deep: true}),
                function (link) { link.reparent(); }
            );
            undoReactor.stop();
        }

        newparent = getParent(element, x, y);
        if (!newparent && element.requireEmbedding) {
            abort();
            return;
        }

        oldparent = model.getCell(element.get('parent'));

        if (newparent) {
            if (oldparent) {
                if (oldparent.id !== newparent.id && element.get('fixedParent')) {
                    abort();
                } else {
                    oldparent.unembed(element, {reparenting: true});
                    newparent.embed(element);
                    reparent();
                }
            } else {
                newparent.embed(element);
                reparent();
            }
        } else {
            if (oldparent) {
                if (element.get('fixedParent')) {
                    abort();
                } else {
                    oldparent.unembed(element);
                    reparent();
                }
            } else {
                end();
            }
        }
    });

    model.on('add', function (cell) {
        if (cell.isLink()) { return cell.get('parent') || cell.reparent(); }
        var element = cell,
            position,
            parent;
        if (element.get('parent')) {
            parent = model.getCell(element.get('parent'));
            parent.unembed(element, {reparenting: true});
            parent.embed(element);
            return;
        }
        position = element.get('position');
        parent = getParent(element, position.x, position.y);
        if (parent) {
            parent.embed(element);
        } else {
            if (element.requireEmbedding) {
                _.defer(function () { element.remove(); });
            } else {
                element.set('parent');
            }
        }
    });
}

exports.EmbeddingReactor = EmbeddingReactor;
