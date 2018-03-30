// Copyright (c) 2018, the ALMOsT project authors. Please see the
// AUTHORS file for details. All rights reserved. Use of this source code is
// governed by the MIT license that can be found in the LICENSE file.
/*jslint node: true, nomen: true*/
"use strict";

var _ = require('lodash');

function changeId(cell, newId) {
    var oldId = cell.get('id'),
        graph = cell.graph,
        cells,
        inboundLinks,
        outboundLinks,
        parent,
        embeds;

    if (oldId === newId) {
        return true;
    }

    if (!graph) {
        cell.set('id', newId);
        return true;
    }

    if (graph.getCell(newId)) {
        return false;
    }

    cells = graph.getCells();
    inboundLinks = graph.getConnectedLinks(cell, { inbound: true });
    outboundLinks = graph.getConnectedLinks(cell, { outbound: true });
    parent = graph.getCell(cell.get('parent'));
    embeds = cell.getEmbeddedCells();

    cell.set('id', newId, {silent: true});
    _.forEach(embeds, function (cell) {
        cell.set('parent', newId, {silent: true});
    });
    if (parent) {
        embeds = parent.get('embeds');
        embeds[embeds.indexOf(oldId)] = newId;
        parent.set('embeds', embeds, {silent: true});
    }
    _.forEach(inboundLinks, function (link) {
        link.prop('target/id', newId, {silent: true});
    });
    _.forEach(outboundLinks, function (link) {
        link.prop('source/id', newId, {silent: true});
    });
    graph.resetCells(cells);
    cell.set('id', oldId, {silent: true});
    cell.set('id', newId);

    return true;
}

exports.changeId = changeId;
