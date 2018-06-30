import _throttle from 'lodash-es/throttle';
import { select as d3_select } from 'd3-selection';
import { svgPointTransform } from './index';
import { services } from '../services';

import { uiNoteEditor } from '../ui';

export function svgNotes(projection, context, dispatch) {
    var throttledRedraw = _throttle(function () { dispatch.call('change'); }, 1000);
    var minZoom = 12;
    var layer = d3_select(null);
    var _notes;

    var noteEditor = uiNoteEditor(context);

    function init() {
        if (svgNotes.initialized) return;  // run once
        svgNotes.enabled = false;
        svgNotes.initialized = true;
    }

    function editOn() {
        layer.style('display', 'block');
    }


    function editOff() {
        layer.selectAll('.note').remove();
        layer.style('display', 'none');
    }

    function getService() {
        if (services.osm && !_notes) {
            _notes = services.osm;
            _notes.on('loadedNotes', throttledRedraw);
        } else if (!services.osm && _notes) {
            _notes = null;
        }

        return _notes;
    }

    function showLayer() {
        editOn();

        layer
            .style('opacity', 0)
            .transition()
            .duration(250)
            .style('opacity', 1)
            .on('end', function () { dispatch.call('change'); });
    }

    function hideLayer() {
        throttledRedraw.cancel();

        layer
            .transition()
            .duration(250)
            .style('opacity', 0)
            .on('end', editOff);
    }

    function click(d) {
        context.ui().sidebar.show(noteEditor, d);
    }

    function mouseover(d) {
        context.ui().sidebar.show(noteEditor, d);
    }

    function mouseout(d) {
        // TODO: check if the item was clicked. If so, it should remain on the sidebar.
        // TODO: handle multi-clicks. Otherwise, utilize behavior/select.js
        context.ui().sidebar.hide();
    }

    function update() {
        var service = getService();
        var data = (service ? service.notes(projection) : []);
        var transform = svgPointTransform(projection);
        var notes = layer.selectAll('.note')
            .data(data, function(d) { return d.key; });

        // exit
        notes.exit()
            .remove();

        var notesEnter = notes.enter()
            .append('use')
            .attr('class', function(d) { return 'note ' + d.id; })
            .attr('width', '24px')
            .attr('height', '24px')
            .attr('x', '-12px')
            .attr('y', '-12px')
            .attr('xlink:href', '#fas-comment-alt')
            .on('click', click)
            .on('mouseover', mouseover)
            .on('mouseout', mouseout);

        notes
            .merge(notesEnter)
            .attr('transform', transform);
    }

    function drawNotes(selection) {
        var enabled = svgNotes.enabled,
            service = getService();

        function dimensions() {
            return [window.innerWidth, window.innerHeight];
        }
        function done() {
            console.log('placeholder done within svg/notes.upload.done');
        }

        layer = selection.selectAll('.layer-notes')
            .data(service ? [0] : []);

        layer.exit()
            .remove();

        layer.enter()
            .append('g')
            .attr('class', 'layer-notes')
            .style('display', enabled ? 'block' : 'none')
            .merge(layer);

        if (enabled) {
            if (service && ~~context.map().zoom() >= minZoom) {
                editOn();
                update();
                service.loadNotes(projection, dimensions(), done);
            } else {
                editOff();
            }
        }
    }

    drawNotes.enabled = function(_) {
        if (!arguments.length) return svgNotes.enabled;
        svgNotes.enabled = _;
        if (svgNotes.enabled) {
            showLayer();
        } else {
            hideLayer();
        }
        dispatch.call('change');
        return this;
    };

    init();
    return drawNotes;
}