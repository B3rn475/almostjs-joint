// Copyright (c) 2016, the ALMOsT project authors. Please see the
// AUTHORS file for details. All rights reserved. Use of this source code is
// governed by the MIT license that can be found in the LICENSE file.
/*jslint node: true, nomen: true*/
"use strict";

var _ = require('lodash');

function computeAncestors(id, lookup) {
    if (!id) { return _([]); }
    return computeAncestors(lookup[id].get('parent'), lookup).concat(id);
}

function sortCells(cells) {
    var lookup = _.zipObject(_.map(cells, function (cell) { return [cell.id, cell]; })),
        ancestors = _.zipObject(_.map(cells, function (cell) { return [cell.id, computeAncestors(cell.id, lookup).value()]; }));
    function compareRelatives(cell1, cell2) {
        var parent = lookup[cell1.get('parent')],
            embeds;
        if (parent) {
            embeds = parent.get('embeds');
            return embeds.indexOf(cell1.id) - embeds.indexOf(cell2.id);
        }
        return cell1.id < cell2.id ? -1 : 1;
    }
    return cells.sort(function (cell1, cell2) {
        if (cell1.isLink() !== cell2.isLink()) {
            return cell2.isLink() ? -1 : 1;
        }
        if (cell1.isLink()) {
            return cell1.id < cell2.id ? -1 : 1;
        }
        var ancestors1 = ancestors[cell1.id],
            ancestors2 = ancestors[cell2.id],
            commonUncestors;
        if (ancestors1.length < ancestors2.length) {
            return -1;
        }
        if (ancestors1.length > ancestors2.length) {
            return 1;
        }
        commonUncestors = _.intersection(ancestors1, ancestors2);
        ancestors1 = ancestors1.slice(commonUncestors.length);
        ancestors2 = ancestors2.slice(commonUncestors.length);
        if (ancestors1.length === 0) {
            return compareRelatives(cell1, cell2);
        }
        return compareRelatives(lookup[ancestors1[0]], lookup[ancestors2[0]]);
    });
}

exports.sortCells = sortCells;
