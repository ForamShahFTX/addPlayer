// Constants
//------------------------
// Radians
var rad = Math.PI / 180;

// Vendor Prefixes
var vendorPrefix = (function()
{
    var prefix,
        prefixes = {
            webkit: 'Webkit',
            gecko: 'Moz',
            trident: 'ms',
            presto: 'O'
        };
    jQuery.each(prefixes, function(k, v)
    {
        if(new RegExp(k + '/', 'i').test(navigator.userAgent))
        {
            prefix = v;
            return false;
        }
    });
    return prefix;
}());

var FTXCanvasTransform =
{
    /**
     * Selectors Object
     *
     * @type {Object}
     */
    selectors:
    {
        controlContainer: jQuery('.ft-container'),
        controls        : jQuery('.ft-controls'),
        degreesHelper   : jQuery('.degrees-helper'),
        scalers :
        {
            all : jQuery('.ft-scaler'),
            tl  : jQuery('.ft-scaler-tl'),
            tr  : jQuery('.ft-scaler-tr'),
            br  : jQuery('.ft-scaler-br'),
            bl  : jQuery('.ft-scaler-bl'),
            tc  : jQuery('.ft-scaler-tc'),
            bc  : jQuery('.ft-scaler-bc'),
            ml  : jQuery('.ft-scaler-ml'),
            mr  : jQuery('.ft-scaler-mr'),
            mc  : jQuery('.ft-scaler-mc')
        },
        rotator     : jQuery('.ft-rotator'),
        snapGuides  :
        {
            snapX   : document.querySelector('.snapX'),
            snapY   : document.querySelector('.snapY')
        }
    },

    /**
     * Temp Data
     *
     * @type {Object}
     */
    data:
    {
        // Direction specs for drag move
        directionSpecs :
        {
            lastPosition    : {},
            direction       : null,
            lockedDirection : false
        },
        snapDistance                : 5,
        snapEnabled                 : false,
        groupEnabled                : true,
        transformAction             : '',
        isDragging                  : false,
        isRotating                  : false,
        isResizing                  : false,
        initialResizeOffsets        : {},
        initialLayerObjs            : {},
        initialContainerInfo        : {},
        allowedResizeHandles        : ['all'],
        currentResizeHandle         : null,
        clickedElement              : null,
        altKey                      : false,
        shiftKey                    : false,
        groupIdsArray               : [],
        clickDragScrollInterval     : null,
        scrollDistanceOnDrag        : 8,
        safeBoundryCheckDistance    : 5
    },

    /**
     * Initialize Function
     *
     */
    init: function()
    {
        this._setTransform = this._createStyleSetter('transform');

        // Begin mouse move direction detection
        this.initDocumentDirectionDetection();
    },

    /**
     * Init Document Direction Mouse Move Bindings
     *
     */
    initDocumentDirectionDetection: function()
    {
        document.body.addEventListener('mousemove', this.handleDocumentDirectionMouseMove, false);
    },

    /**
     * Unbind Document Direction Mouse Move Bindings
     *
     */
    unbindDocumentDirectionDetection: function()
    {
        document.body.removeEventListener('mousemove', this.handleDocumentDirectionMouseMove, false);
    },

    /**
     * Handle Document Direction Mouse Move
     *
     * @param event
     * @returns {Boolean}
     */
    handleDocumentDirectionMouseMove: function(event)
    {
        var context = FTXCanvasTransform;

        if(context.data.directionSpecs.lockedDirection)
        {
            return false;
        }

        // Check if any data is existing, if not create
        if(typeof(context.data.directionSpecs.lastPosition.x) != 'undefined')
        {
            // Get change in position for x, y
            var deltaX = context.data.directionSpecs.lastPosition.x - event.clientX,
                deltaY = context.data.directionSpecs.lastPosition.y - event.clientY;

            // Left
            if(Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 0)
            {
                context.data.directionSpecs.direction = 'left';
            }
            // Right
            else if(Math.abs(deltaX) > Math.abs(deltaY) && deltaX < 0)
            {
                context.data.directionSpecs.direction = 'right';
            }
            // Up
            else if(Math.abs(deltaY) > Math.abs(deltaX) && deltaY > 0)
            {
                context.data.directionSpecs.direction = 'up';
            }
            // Down
            else if(Math.abs(deltaY) > Math.abs(deltaX) && deltaY < 0)
            {
                context.data.directionSpecs.direction = 'down';
            }
        }

        // Store the last position
        context.data.directionSpecs.lastPosition = {
            x : event.clientX,
            y : event.clientY
        };
    },

    /**
     * Destroy Free Trans
     *
     * @param {HTMLElement|jQuery} element
     * @param removeData
     * @returns {*|Object}
     */
    destroy: function(element, removeData)
    {
        return this._destroy(element, removeData);
    },

    /**
     * Destroy Draggable
     *
     * @param {HTMLElement|jQuery} element
     */
    destroyDraggable: function(element)
    {
        jQuery(element).unbind('mousedown');
    },

    /**
     * Initialize Transforms on Element
     *
     * @param {HTMLElement|jQuery} element
     */
    initTransforms: function(element)
    {
        // Set default settings if not exists
        this.setDefaultSettingsIfNotExist(element);

        // Initialize drag bindings
        this.initDrag(element);

        // If element dimensions are not set, or position is incorrect
        // we will "reset" it's default settings to capture proper height/width and position
        if(!this.elementDimensionsSet(element))
        {
            this._setDefaultSettings(element);
        }

        // If the element is multiSelect, we will add/allow rotatable
        if(jQuery(element).hasClass('ft-controls'))
        {
            // Initialize Rotate Bindings
            this.initRotate(jQuery(element));

            // Initialize resize bindings
            this.initResize(jQuery(element));
        }
    },

    /**
     * Init Drag
     *
     * @param {HTMLElement} element
     */
    initDrag: function(element)
    {
        var context = this;

        element = jQuery(element);

        //noinspection JSUnresolvedFunction
        element.off('mousedown.freetrans').bind('mousedown.freetrans', context._ifLeft(context._noSelect(function(event)
        {
            context._initializeDrag(element, event);
        })));
    },

    /**
     * Initialize Drag (Binding)
     *
     * @param {HTMLElement} element
     * @param {Event} event
     */
    _initializeDrag: function(element, event)
    { 
        if(FTXCanvas.textEditing())
        {
            return false;
        }

        if(FTXCanvas.hasAnimation() && FTXAnimationPlayer.isMainTimelineActive())
        {
            return false;
        }

        var context = FTXCanvasTransform,
            layerId, layerObj, groupLayer;

        context.data.transformAction    = 'drag';
        context.data.clickedElement     = element;

        event.preventDefault();
        event.stopImmediatePropagation();

        layerId   = FTXCanvas.getLayerIdFromElement(element);
        layerObj  = FTXCanvas.getLayerById(layerId);

        if(layerObj.groupId)
        {
            groupLayer  = FTXCanvas.getGroupLayerById(layerObj.groupId);
            element     = groupLayer;

            context._setDefaultSettings(element, {});                                    
        }

        var selectedLayers      = FTXCanvas.getSelectedLayers(false, true),
            selectedLayerCount  = selectedLayers.length;

        // Mark the locked direction flag in case we hit shift and drag
        context.data.directionSpecs.lockedDirection = (event.shiftKey && typeof context.data.directionSpecs.direction != 'undefined') ? true : false;

        if(FTXCanvasGuides.isElementGuideSelected(element) && FTXCanvas.getSelectedLayerCount(true) > 0)
        {
            element = jQuery(context.selectors.controls);
        }

        var data = element.data('freetrans');

        if(data)
        {
            data.elements = [];
        }

        if(context.data.snapEnabled)
        {
            var slideLayers         = FTXCanvas.getLayerElements(true),
                guideElements       = FTXCanvasGuides.getAllGuides(),
                guideLayersLength   = guideElements.length;

            // Add Slide Layers to the data elements array
            for(var s = 0; s < slideLayers.length; s++)
            {
                var snapSlideEl      = slideLayers[s],
                    snapSlideElem    = jQuery(snapSlideEl);

                if(snapSlideElem != element[0])
                {
                    if(!element[0].classList.contains('ft-controls'))
                    {
                        data.elements.push({
                            item:   snapSlideEl,
                            width:  snapSlideElem.outerWidth(),
                            height: snapSlideElem.outerHeight(),
                            top:    parseInt(snapSlideEl.style.top),
                            left:   parseInt(snapSlideEl.style.left)
                        });
                    }
                    else if(!snapSlideEl.classList.contains('layer_selected'))
                    {
                        data.elements.push({
                            item:   snapSlideEl,
                            width:  snapSlideElem.outerWidth(),
                            height: snapSlideElem.outerHeight(),
                            top:    parseInt(snapSlideEl.style.top),
                            left:   parseInt(snapSlideEl.style.left)
                        });
                    }
                    
                }
            }
           

            // Add Guide Layers to the data elements array
            for(var g = 0; g < guideLayersLength; g++)
            {
                var snapGuideEl      = guideElements[g],
                    snapGuideElem    = jQuery(snapGuideEl);

                if(snapGuideEl != element[0])
                {
                    data.elements.push({
                        item:   snapGuideEl,
                        width:  snapGuideElem.outerWidth(),
                        height: snapGuideElem.outerHeight(),
                        top:    parseInt(snapGuideEl.style.top),
                        left:   parseInt(snapGuideEl.style.left)
                    });
                }
            }
        }

        data._p.prev.left = data.x;
        data._p.prev.top  = data.y;

        // If a layers are in selection (whether single or multiple)
        // ft-control is the {element} here
        // if(selectedLayerCount > 0 && currentElementId == selectedId)
        if(selectedLayerCount > 0)
        {
            // Set Previous Settings on Elements
            for(var i = 0; i < selectedLayerCount; i++)
            {
                var layer           = jQuery(selectedLayers[i]),
                    layerFreeTrans  = layer.data('freetrans');

                context.setElementSettings(layer, {
                    _p: {
                        prev: {
                            'left': layerFreeTrans.x,
                            'top':  layerFreeTrans.y
                        }
                    }
                });
            }

            // Gather History Information
            var selectedGuides  = FTXCanvasGuides.data.selectedGuides,
                layerObjs       = FTXCanvas.getLayersById(FTXCanvas.data.selectedLayers),
                guideObjs       = FTXCanvasGuides.getGuidesById(selectedGuides);                                        

            context.data.initialLayerObjs = layerObjs.concat(guideObjs);
        }
        // If layer is not in selection. Just drag with jQuery handler
        // (layer is {element} here)
        else
        {
            context.setElementSettings(element, {
                _p: {
                    prev: {
                        'left': data.x,
                        'top':  data.y
                    }
                }
            });

            if(FTXCanvasGuides.isElementGuide(element.get(0)))
            {
                var guideId         = FTXCanvasGuides.getGuideIdByElement(element),
                    guideObj        = FTXCanvasGuides.getGuideById(guideId);

                context.data.initialLayerObjs = FTXCanvas.recursiveMerge( {}, guideObj);
            }
            else
            {
                layerId     = FTXCanvas.getLayerIdFromElement(element);
                layerObj    = FTXCanvas.getLayerById(layerId);

                if(layerObj && layerObj.locked)
                {
                    return false;
                }

                if(FTXCanvas.isElementGroupedElement(layerId))
                {
                    
                    var groupItems      = FTXCanvas.getLayersFromGroup(layerId),
                        groupItemsCount = groupItems.length,
                        groupLayerId;
                                    
                    for(var l = 0; l < groupItemsCount; l++)
                    {
                        groupLayerId = FTXCanvas.getLayerIdFromElement(jQuery(groupItems[l]));

                        context.data.groupIdsArray.push(groupLayerId);
                    }

                    context.data.initialLayerObjs = FTXCanvas.getLayersById(context.data.groupIdsArray);
                }
                else
                {
                    context.data.initialLayerObjs = FTXCanvas.getLayerById(layerId);
                }
            }
        }

        // Set last point of element (x, y)
        //noinspection JSUnresolvedFunction
        element.data('lastPoint', Point(event.pageX, event.pageY));

        // Define drag handler
        var drag = context._noSelect(function(event)
        {
            data.scalex = 1;
            data.scaley = 1;

            context.doDrag(event, element, data);
            context.checkCanvasHorizontalScrollNeeded(event, element, data);

            if(FTXCanvasGuides.isElementGuide(element.get(0)) || (FTXCanvas.getSelectedLayerCount(false, true) > 0 && FTXCanvasGuides.isElementGuide(context.data.clickedElement.get(0))))
            {
                FTXCanvasGuides.data.isGuideDragging = true;
            }

            if(FTXCanvas.hasClassesOrId(element, ['.ft-controls', '.slide_layer', '.group']) && (!FTXCanvas.isWindows()))
            {
                context.data.isDragging = true;
            }
        });

        // Define drop handler
        var up = function(event)
        {
            context.selectors.snapGuides.snapX.style.display = 'none';
            context.selectors.snapGuides.snapY.style.display = 'none';

            jQuery(document).unbind('mousemove.freetrans', drag);
            jQuery(document).unbind('mouseup.freetrans', up);

            context.stopDrag(event, element, data);
            context.stopCheckCanvasHorizontalScrollIfNeeded();
        };

        // Define drag and drop event listeners
        jQuery(document).bind('mousemove.freetrans', drag);
        jQuery(document).bind('mouseup.freetrans', up);
    },

    /**
     * Do Drag (Moving)
     *
     * @param {Event} event
     * @param {HTMLElement} element
     * @param {Object|Array} data
     */
    doDrag: function(event, element, data)
    {
        var elem = jQuery(element).get(0);

        this.selectors.snapGuides.snapX.style.display = 'none';
        this.selectors.snapGuides.snapY.style.display = 'none';

        //noinspection JSUnresolvedFunction
        if(!element.get(0).classList.contains('.ft-controls') && element.get(0).dataset.layerFreeTrans != undefined)
        {
            data.angle = element.data('layerFreetrans').angle;
        }

        // Get last point of element
        var lastPoint = element.data('lastPoint');
        
        this.data.directionSpecs.lockedDirection = (event.shiftKey && typeof this.data.directionSpecs.direction != 'undefined') ? true : false;

        // Set both left/top of element if we're not locked in a given direction
        if(!this.data.directionSpecs.lockedDirection)
        {
            data.x += event.pageX - lastPoint.x;
            data.y += event.pageY - lastPoint.y;
        }
        else
        {
            // If we are locked, we check if we move in either axis, using up or down, left or right
            if(this.data.directionSpecs.direction == 'up' || this.data.directionSpecs.direction == 'down')
            {
                data.y += event.pageY - lastPoint.y;
            }
            // Conditions for left/right
            else if(this.data.directionSpecs.direction == 'left' || this.data.directionSpecs.direction == 'right')
            {
                data.x += event.pageX - lastPoint.x;
            }
            else
            {
                // If no direction matches found, we will use standard x, y with no restriction
                data.x += event.pageX - lastPoint.x;
                data.y += event.pageY - lastPoint.y;
            }
        }

        data.clientX = event.clientX;
        data.clientY = event.clientY;

        // Draw the change
        this._draw(element, data);

        // Set new lastPoint value to element data
        element.data('lastPoint', Point(event.pageX, event.pageY));
    },

    /**
     * If Element is At Boundary, Horizontal Scroll Needed
     *
     * @param {Event} event
     * @param {HTMLElement} element
     * @param {Object|Array} data
     */
    checkCanvasHorizontalScrollNeeded: function(event, element, data)
    {
        // Handle scroll when element drag
        clearInterval(this.data.clickDragScrollInterval);

        // Scroll Horizontal
        this.scrollCanvasHorizontallyOnDrag(event, element, data);
        this.continueScrollOnDrag(event, element, data);
    },

    /**
     * Scroll Canvas Horizontally On Drag
     *
     * @param {Event} event
     * @param {HTMLElement|jQuery} element
     * @param {Object|Array} data
     */
    scrollCanvasHorizontallyOnDrag: function(event, element, data)
    {
        // If shift key not pressed, cancel out
        if(!event.shiftKey) {return;}

        // Check if we are moving within proper window constraints
        if(event.pageX + this.data.safeBoundryCheckDistance > window.innerWidth)
        {
            FTXCanvas.selectors.layersOuterWrapper.scrollLeft += this.data.scrollDistanceOnDrag;
            data.x += this.data.scrollDistanceOnDrag;
            this._draw(element, data);
            FTXCanvas.updateScrollbars();
        }
        else if((event.pageX) <
            ((parseInt(getComputedStyle(FTXCanvas.selectors.linearAxis.vertical).width)) + (parseInt(getComputedStyle(FTXCanvas.selectors.canvasSidebar).width)))
            && 
            (FTXCanvas.selectors.layersOuterWrapper.scrollLeft - this.data.scrollDistanceOnDrag) > 0
            )  
        {
            FTXCanvas.selectors.layersOuterWrapper.scrollLeft -= this.data.scrollDistanceOnDrag;
            data.x -= this.data.scrollDistanceOnDrag;
            this._draw(element, data);
            FTXCanvas.updateScrollbars();
        }
    },

    /**
     * Continue Scroll on Drag
     *
     * @param {Event} event
     * @param {HTMLElement} element
     * @param {Object|Array} data
     */
    continueScrollOnDrag: function(event, element, data)
    {
        var context = this;

        context.data.clickDragScrollInterval = setInterval(function()
        {
            context.scrollCanvasHorizontallyOnDrag(event, element, data)
        }, 100)
    },

    /**
     * Clear Horizontal Scroll Interval
     *
     */
    stopCheckCanvasHorizontalScrollIfNeeded: function()
    {
        clearInterval(this.data.clickDragScrollInterval);
    },

    /**
     * Stop Drag
     *
     * @param {Event} event
     * @param {HTMLElement} element
     * @param {Object|Array} data
     */
    stopDrag: function(event, element, data)
    {
        var context     = this,
            controlData = element.data('freetrans');

        // Set snap parameters false
        this.data.snapHActive           = false;
        this.data.snapHActiveForElement = false;
        this.data.snapVActive           = false;
        this.data.snapVActiveForElement = false;
        this.data.snapYActive           = false;
        this.data.snapYActiveForElement = false;

        // Disable locked direction
        this.data.directionSpecs.lockedDirection = false;

        // Set the dimensions for scale to continue from, after resetting scale
        if(!FTXCanvasGuides.isElementGuide(element.get(0)) && typeof controlData._p !== 'undefined')
        {
            controlData._p.width  = controlData._p.cwid;
            controlData._p.height = controlData._p.chgt;
        }

        // If image is drag allow user to add image to grid.
        var gridLayer           = FTXCanvasGrid.getGridLayerObj(),
            selectedLayerType   = FTXCanvas.getSelectedLayerType(),
            selectedCount       = FTXCanvas.getSelectedLayerCount(false, true);        

        if(gridLayer && (selectedLayerType === "image" || element.get(0).classList.contains('slide_layer_type_image')))
        {            
            var gridItems           = gridLayer.grid.items,                                    
                isCollision         = false,
                gridItemElement, gridItemElementRect, selectedLayerId, selectedLayerObj, gridItemContent, layerIndexesBefore, layerIndexesAfter, gridBefore, gridAfter;

            gridBefore = [];
            gridBefore.push(FTXCanvas.recursiveMerge({}, gridLayer));

            if(selectedCount === 1 && element.get(0).classList.contains('ft-controls'))
            {
                selectedLayerId = FTXCanvas.getSelectedLayerId();
            }
            else 
            {
                selectedLayerId = FTXCanvas.getLayerIdFromElement(element);
            }                                    

            selectedLayerObj = FTXCanvas.getLayerById(selectedLayerId);
            
            gridBefore.push(selectedLayerObj);

            for(var g = 0; g < gridItems.length;g++)
            {
                gridItemElement     = document.getElementById('grid_item_' + gridItems[g].itemId);
                gridItemContent     = gridItemElement.querySelector('.content');
                gridItemElementRect = gridItemContent.getBoundingClientRect();

                if (event.clientX >= gridItemElementRect.left && event.clientX <= gridItemElementRect.right &&
                    event.clientY >= gridItemElementRect.top && event.clientY <= gridItemElementRect.bottom) {                        
                        isCollision = true;                                                
                        gridItems[g].image   = selectedLayerObj.image;
                }
            }
                         
            if(isCollision)
            {
                layerIndexesBefore  = FTXCanvas.setlayerIndexesBefore();
                FTXCanvas.deleteLayerById(selectedLayerId, false);
                FTXCanvas.layers[gridLayer.layerId] = gridLayer;
                FTXCanvas.updateLayerByState(FTXCanvas.layers[gridLayer.layerId]);

                layerIndexesAfter   = FTXCanvas.setlayerIndexesAfter();
                
                gridAfter = FTXCanvas.recursiveMerge({}, gridLayer);
                                
                FTXCanvas.addLayerStateToHistory(gridAfter, gridBefore, 'layer moved to grid', 'layer_grid', layerIndexesAfter, layerIndexesBefore);
                
                return;
            }
        }

        var guideId;
        
        // If we're also moving the layers, we'll need to grab our temporary left/top values
        // and update translation properties
        //noinspection JSUnresolvedFunction
        if(selectedCount > 0 && (FTXCanvasGuides.isElementGuideSelected(element) || element.get(0).classList.contains('ft-controls')))
        {
            var selectedElements    = FTXCanvas.getSelectedLayers(false, true),
                selectedLayerLength = selectedElements.length,
                hasMoved            = false,
                historyTitle        = 'Layer Moved';

            // Loop through each selected element
            for(var c = 0; c < selectedLayerLength; c++)
            {
                var layerEl         = selectedElements[c],
                    layer           = jQuery(layerEl),
                    layerId         = FTXCanvas.getLayerIdFromElement(layer),
                    layerObject     = FTXCanvas.getLayerById(layerId),
                    layerFreeTrans  = layer.data('freetrans');

                if(layerFreeTrans.x !== layerFreeTrans._p.prev.left || layerFreeTrans.y !== layerFreeTrans._p.prev.top)
                {
                    hasMoved = true;

                    historyTitle = layerObject.layerType + " Layer Moved";

                    if(FTXCanvasGuides.isElementGuide(layerEl))
                    {
                        guideId = FTXCanvasGuides.getGuideIdByElement(layer);

                        FTXCanvasGuides.updateGuide(guideId, {
                            x: parseInt(layerEl.style.left),
                            y: parseInt(layerEl.style.top)
                        });

                        FTXCanvasGuides.storeZoomState(guideId, {
                            x: parseInt(layerEl.style.left),
                            y: parseInt(layerEl.style.top)
                        });
                    }
                    else
                    {
                        FTXCanvas.updateLayer(layerId, 'check_mr', {
                            position: {
                                x: layerFreeTrans.x,
                                y: layerFreeTrans.y
                            }
                        }, false);

                        FTXCanvas.storeZoomState(layerId, {
                            x:      layerFreeTrans.x,
                            y:      layerFreeTrans.y
                        });

                        if(layerObject.layerType == 'group')
                        {
                            FTXCanvas.updatePositionOfGroupLayers(layerId);
                        }
                    }
                }
            }

            if(hasMoved)
            {
                var selectedGuides  = FTXCanvasGuides.data.selectedGuides,
                    layerObjs       = FTXCanvas.getLayersById(FTXCanvas.data.selectedLayers),
                    guideObjs       = FTXCanvasGuides.getGuidesById(selectedGuides);

                    if(selectedLayerLength > 1)
                    {
                        historyTitle    = "Multiple Layers Moved"    
                    }

                FTXCanvas.addLayerStateToHistory(layerObjs.concat(guideObjs), context.data.initialLayerObjs, historyTitle, 'update');
            }
        }
        else
        {
            var elementSettings = element.data('freetrans');
            
            if(typeof elementSettings._p != 'undefined' && (elementSettings.x != elementSettings._p.prev.left || elementSettings.y != elementSettings._p.prev.top))
            {
                if(FTXCanvasGuides.isElementGuide(element.get(0)))
                {
                    guideId = FTXCanvasGuides.getGuideIdByElement(element);

                    FTXCanvasGuides.updateGuide(guideId, {
                        x: parseInt(element.css('left')),
                        y: parseInt(element.css('top'))
                    });

                    FTXCanvasGuides.storeZoomState(guideId, {
                        x: parseInt(element.css('left')),
                        y: parseInt(element.css('top'))
                    });
                    
                    FTXCanvas.addLayerStateToHistory(FTXCanvasGuides.getGuideById(guideId), context.data.initialLayerObjs, 'Guide Moved', 'update');
                }
                else
                {
                    var selectedElementId       = FTXCanvas.getLayerIdFromElement(element),
                        selectedElementObject   = FTXCanvas.getLayerById(selectedElementId);

                    FTXCanvas.updateLayer(selectedElementId, selectedElementObject.layerType + " Layer Moved" , {
                        position: {
                            x: elementSettings.x,
                            y: elementSettings.y
                        }
                    });

                    if(selectedElementObject.layerType == 'group')
                    {
                        FTXCanvas.updatePositionOfGroupLayers(selectedElementId);
                    }

                    FTXCanvas.storeZoomState(selectedElementId, {
                        x: elementSettings.x,
                        y: elementSettings.y
                    });
                }
            }
        }

        //noinspection JSUnresolvedFunction
        if(hasMoved && element.get(0).classList.contains('ft-controls'))
        {
            // Set default position to layers
            FTXCanvas.setDefaultPositionToLayers();

            // Set Position to Layers Respect to Group
            FTXCanvas.setPositionToLayers(true);
        }

        // Clear controls if nothing is selected still
        if(FTXCanvas.getSelectedLayerCount() == 0)
        {
            this.clearControls();
        }
    },

    /**
     * Add Rotatable
     *
     * @param {HTMLElement} element
     */
    initRotate: function(element)
    {
        var context = this;            

        this.selectors.rotator.off('mousedown.freetrans').bind('mousedown.freetrans', context._ifLeft(context._noSelect(function(event)
        {
            var selectedLayerIds    = FTXCanvas.getSelectedLayersIds(true, true),
                selectedCount       = FTXCanvas.getSelectedLayerCount(true, true),
                initialControlAngle = context._getAngleFromElement(context.selectors.controls);

            context.data.initialLayerObjs = FTXCanvas.getLayersById(selectedLayerIds);
            
            if(selectedCount > 1)
            {
                FTXCanvas.wrapSelectedLayer();
            }

            // Mark transform action
            context.data.transformAction = 'rotation';

            event.stopPropagation();

            context.selectors.degreesHelper.show();
            context.selectors.scalers.mc.css({'visibility':'visible'});

            //noinspection JSUnresolvedFunction
            var data        = element.data('freetrans'),
                center      = context._getBounds(data._p.divs.controls).center,
                pressAng    = Math.atan2(event.pageY - center.y, event.pageX - center.x) * 180 / Math.PI,
                rot         = Number(data.angle),
                drag        = context._noSelect(function(event)
                {
                    var angle       = Math.atan2(event.pageY - center.y, event.pageX - center.x) * 180 / Math.PI,
                        degree      = rot + angle - pressAng;

                    if(event.shiftKey)
                    {
                        degree = (degree / 15 >> 0) * 15;
                    }

                    data.scalex = 1;
                    data.scaley = 1;

                    data.angle  = degree;
                    data._p.rad = degree * rad;
                    
                    data.initailControlAngle = initialControlAngle;
                    
                    context.data.isRotating = true;

                    // Draw the element now
                    context._draw(element, data);
                });

            var up = function(event)
            {
                context.selectors.degreesHelper.hide();

                jQuery(document).unbind('mousemove.freetrans', drag);
                jQuery(document).unbind('mouseup.freetrans', up);
                context.selectors.scalers.mc.css({'visibility':'hidden'});

                return context.stopRotate(event, element, data);
            };

            jQuery(document).bind('mousemove.freetrans', drag);
            jQuery(document).bind('mouseup.freetrans', up);
        })));
    },

    /**
     * Stop Rotate
     *
     * @param {Event} event
     * @param {HTMLElement} element
     * @param {Object|Array} data
     */
    stopRotate: function(event, element, data)
    {
        var selectedCount   = FTXCanvas.getSelectedLayerCount(true, true),
            controlData     = element.data('freetrans');
        
        if(selectedCount > 1)
        {
            FTXCanvas.unWrapSelectedLayer(data.initailControlAngle);

            var selectedLayerIds    = FTXCanvas.getSelectedLayersIds(true, true),
                postLayerObjs       = FTXCanvas.getLayersById(selectedLayerIds);
            
            FTXCanvas.addLayerStateToHistory(postLayerObjs, this.data.initialLayerObjs, 'Multiple Layers Rotate', 'rotate_multiple_layers');
        }
        else
        {
            var layerElement        = FTXCanvas.getSelectedLayers(true,true),
                selectedLayerId     = FTXCanvas.getLayerIdFromElement(layerElement),
                selectedLayerObj    = FTXCanvas.getLayerById(selectedLayerId);                

            if(selectedLayerId)
            {                
                FTXCanvas.updateLayer(selectedLayerId, selectedLayerObj.layerType + ' Layer Rotated', {
                    rotation: {
                        rad:    controlData._p.rad,
                        angle:  controlData.angle
                    }
                }, true);

                this.setElementSettings(layerElement, {
                    angle: controlData.angle,
                    _p: {
                        rad: controlData._p.rad
                    }
                });

                // Set the dimensions for scale to continue from, after resetting scale
                controlData._p.width  = controlData._p.cwid;
                controlData._p.height = controlData._p.chgt;                                
                
            }
        }
    },

    /**
     * Initialize Resize (Binding)
     *
     * @param {HTMLElement} element
     */
    initResize: function(element)
    {
        var context     = this,
            settings    = jQuery(element).data('freetrans'),
            sel         = element,
            scalerItems = this.selectors.scalers.all;

        scalerItems.bind('mousedown.freetrans', context._ifLeft(context._noSelect(function(evt)
        {
            var selectedLayers = FTXCanvas.getSelectedLayers(true, true);

            if(FTXImageCrop.data.isCropEnable)
            {
                return;
            }
            
            // Stop natural events
            evt.stopPropagation();

            // Set settings for resize to on, and set transform action
            context.data.isResizing         = true;
            context.data.initialLayerObjs   = FTXCanvas.getLayersById(FTXCanvas.data.selectedLayers);
            context.data.transformAction    = 'resize';

            // Initial Params
            var anchor, scaleMe, positionMe, doPosition, mp, doy, dox,
                data        = sel.data('freetrans'),
                scaleLimit  = settings.scaleLimit,
                handle      = jQuery(evt.target),
                wid         = settings._p.divs.controls.width(),
                hgt         = settings._p.divs.controls.height(),
                ratio       = wid/hgt,
                owid        = wid * 1 / data.scalex,
                ohgt        = hgt * 1 / data.scaley,

                // Get scalers (corners)
                tl = context.selectors.scalers.tl,
                tr = context.selectors.scalers.tr,
                tc = context.selectors.scalers.tc,
                bl = context.selectors.scalers.bl,
                br = context.selectors.scalers.br,
                bc = context.selectors.scalers.bc,
                ml = context.selectors.scalers.ml,
                mr = context.selectors.scalers.mr,
                mc = context.selectors.scalers.mc,

                // Define offsets
                tl_off  = tl.offset(),
                tr_off  = tr.offset(),
                br_off  = br.offset(),
                bl_off  = bl.offset(),
                c_off   = mc.offset(),
                refang  = Math.atan2(tr_off.top - tl_off.top, tr_off.left - tl_off.left),
                sin     = Math.sin(refang),
                cos     = Math.cos(refang);

            // Gather initial resize offsets relative to parent
            context.data.initialResizeOffsets = {
                tl: context.getResizeParentHandleOffset(tl),
                tr: context.getResizeParentHandleOffset(tr),
                tc: context.getResizeParentHandleOffset(tc),
                bl: context.getResizeParentHandleOffset(bl),
                br: context.getResizeParentHandleOffset(br),
                bc: context.getResizeParentHandleOffset(bc),
                ml: context.getResizeParentHandleOffset(ml),
                mr: context.getResizeParentHandleOffset(mr),
                mc: context.getResizeParentHandleOffset(mc)
            };

            // Set previous scale properties
            data._p.prev.scalex = data.scalex;
            data._p.prev.scaley = data.scaley;

            // Set current handle
            context.data.currentResizeHandle = handle;

            // Set initial container info
            //noinspection JSUnresolvedFunction
            context.data.initialContainerInfo = {
                width:  wid,
                height: hgt,
                offset: {
                    left:   element.offset().left,
                    top:    element.offset().top
                }
            };

            if(selectedLayers.length > 0)
            {
                for(var i = 0; i < selectedLayers.length; i++)
                {
                    var selectedLayer       = jQuery(selectedLayers[i]),
                        selectedLayerId     = FTXCanvas.getLayerIdFromElement(selectedLayer),
                        layerFreetrans      = selectedLayer.data('freetrans');

                    // Store settings pre-resize
                    var preResizeData = {
                        width       : layerFreetrans._p.width,
                        height      : layerFreetrans._p.height,
                        freeTrans   : layerFreetrans,
                        layerRatios :
                        {
                            width   : layerFreetrans._p.width / data._p.cwid,
                            height  : layerFreetrans._p.height / data._p.chgt,
                            left    : ((layerFreetrans.x - data.x) / data._p.cwid),
                            top     : ((layerFreetrans.y - data.y) / data._p.chgt),
                            right   : (data._p.cwid - ((layerFreetrans.x - data.x) + layerFreetrans._p.width)) / data._p.cwid,
                            bottom  : (data._p.chgt - ((layerFreetrans.y - data.y) + layerFreetrans._p.height)) / data._p.chgt
                        },
                        font:
                        {
                            fontSize : selectedLayers[i].style.fontSize
                        }
                    };

                    selectedLayer.data('preResize', preResizeData);
                    
                    if(FTXCanvas.isElementGroupedElement(selectedLayerId))
                    {
                        var groupItems      = FTXCanvas.getLayersFromGroup(selectedLayerId);
                        
                        if(groupItems && groupItems.length)
                        {
                            for(var j = 0; j < groupItems.length; j++)
                            {
                                var groupItem               = jQuery(groupItems[j]),
                                    groupItemFreetrans      = groupItem.data('freetrans');
        
                                var groupItemResizeData = {
                                    width:      groupItemFreetrans._p.width,
                                    height:     groupItemFreetrans._p.height,
                                    freeTrans:  groupItemFreetrans,
                                    layerRatios: {
                                        width:  groupItemFreetrans._p.width / data._p.cwid,
                                        height: groupItemFreetrans._p.height / data._p.chgt,
                                        left:   ((groupItemFreetrans.x - data.x) / data._p.cwid),
                                        top:    ((groupItemFreetrans.y - data.y) / data._p.chgt),
                                        right:  (data._p.cwid - ((groupItemFreetrans.x - data.x) + groupItemFreetrans._p.width)) / data._p.cwid,
                                        bottom: (data._p.chgt - ((groupItemFreetrans.y - data.y) + groupItemFreetrans._p.height)) / data._p.chgt
                                    },
                                    font: {
                                        fontSize: groupItems[j].style.fontSize
                                    }
                                };
            
                                groupItem.data('preResize', groupItemResizeData);
                            }
                        }                        
                    }
                }

            }

            // Function to change position
            doPosition = function(origOff, newOff)
            {
                data.x += origOff.left - newOff.left;
                data.y += origOff.top - newOff.top;

                context._draw(sel, data);
            };

            // If handle is bottom right, or middle right
            if(handle.is(br) || handle.is(mr))
            {
                anchor  = tl_off;
                doy     = handle.is(br);
                scaleMe = function(mp)
                {
                    mp.x -= anchor.left;
                    mp.y -= anchor.top;
                    mp = context._rotatePoint(mp, sin, cos);

                    data.scalex = (mp.x / owid) > scaleLimit ? (mp.x / owid) : scaleLimit;
                    if (doy) data.scaley = (mp.y / ohgt) > scaleLimit ? (mp.y / ohgt) : scaleLimit;
                };

                positionMe = function()
                {
                    doPosition(context.data.initialResizeOffsets.tl, context.getResizeParentHandleOffset(context.selectors.scalers.tl));
                };
            }
            // If handle is top left, or middle left
            else if(handle.is(tl) || handle.is(ml))
            {
                anchor  = br_off;
                doy     = handle.is(tl);
                scaleMe = function(mp)
                {
                    mp.x = anchor.left - mp.x;
                    mp.y = anchor.top - mp.y;
                    mp = context._rotatePoint(mp, sin, cos);

                    data.scalex = (mp.x / owid) > scaleLimit ? (mp.x / owid) : scaleLimit;
                    if (doy) data.scaley = (mp.y / ohgt) > scaleLimit ? (mp.y / ohgt) : scaleLimit;
                };

                positionMe = function()
                {
                    doPosition(context.data.initialResizeOffsets.br, context.getResizeParentHandleOffset(context.selectors.scalers.br));
                };
            }
            // If handle is top right, or top center
            else if(handle.is(tr) || handle.is(tc))
            {
                anchor  = bl_off;
                dox     = handle.is(tr);

                // Reverse angles
                sin = Math.sin(-refang);
                cos = Math.cos(-refang);

                scaleMe = function(mp)
                {
                    mp.x   -= anchor.left;
                    mp.y    = anchor.top - mp.y;
                    mp      = context._rotatePoint(mp, sin, cos);

                    if (dox) data.scalex = (mp.x / owid) > scaleLimit ? (mp.x / owid) : scaleLimit;
                    data.scaley = (mp.y / ohgt) > scaleLimit ? (mp.y / ohgt) : scaleLimit;
                };

                positionMe = function()
                {
                    doPosition(context.data.initialResizeOffsets.bl, context.getResizeParentHandleOffset(context.selectors.scalers.bl));
                };
            }
            // If handle is bottom left, or bottom center
            else if(handle.is(bl) || handle.is(bc))
            {
                anchor  = tr_off;
                dox     = handle.is(bl);

                // Reverse angles
                sin = Math.sin(-refang);
                cos = Math.cos(-refang);

                scaleMe = function(mp)
                {
                    mp.x    = anchor.left - mp.x;
                    mp.y   -= anchor.top;
                    mp      = context._rotatePoint(mp, sin, cos);

                    if (dox) data.scalex = (mp.x / owid) > scaleLimit ? (mp.x / owid) : scaleLimit;
                    data.scaley = (mp.y / ohgt) > scaleLimit ? (mp.y / ohgt) : scaleLimit;
                };

                positionMe = function()
                {
                    doPosition(context.data.initialResizeOffsets.tr, context.getResizeParentHandleOffset(context.selectors.scalers.tr));
                };
            }

            // Drag function
            var drag = context._noSelect(function(evt)
            {
                // If we require forced proportion, set shiftKey flag to true
                if(context.requireForcedProportion())
                {
                    evt.shiftKey  = true;
                }

                // If alt key is pressed, we'll resize from center out
                if(evt.altKey)
                {
                    context.data.altKey = true;
                    anchor = c_off;

                    if(handle.is(br) || handle.is(mr))
                    {
                        scaleMe = function(mp)
                        {
                            mp.x    = (mp.x - anchor.left) * 2;
                            mp.y    = (mp.y - anchor.top) * 2;
                            mp      = context._rotatePoint(mp, sin, cos);

                            data.scalex = (mp.x / owid) > scaleLimit ? (mp.x / owid) : scaleLimit;
                            if(doy) data.scaley = (mp.y / ohgt) > scaleLimit ? (mp.y / ohgt) : scaleLimit;
                        };
                    }
                    else if(handle.is(tl) || handle.is(ml))
                    {
                        scaleMe = function(mp)
                        {
                            mp.x    = (anchor.left - mp.x) * 2;
                            mp.y    = (anchor.top - mp.y) * 2;
                            mp      = context._rotatePoint(mp, sin, cos);

                            data.scalex = (mp.x / owid) > scaleLimit ? (mp.x / owid) : scaleLimit;
                            if(doy) data.scaley = (mp.y / ohgt) > scaleLimit ? (mp.y / ohgt) : scaleLimit;
                        };
                    }
                    else if(handle.is(tr) || handle.is(tc))
                    {
                        scaleMe = function(mp)
                        {
                            mp.x    = (mp.x - anchor.left) * 2;
                            mp.y    = (anchor.top - mp.y) * 2;
                            mp      = context._rotatePoint(mp, sin, cos);

                            if(dox) data.scalex = (mp.x / owid) > scaleLimit ? (mp.x / owid) : scaleLimit;
                            data.scaley = (mp.y / ohgt) > scaleLimit ? (mp.y / ohgt) : scaleLimit;
                        };
                    }
                    else if(handle.is(bl) || handle.is(bc))
                    {
                        scaleMe = function(mp)
                        {
                            mp.x    = (anchor.left - mp.x) * 2;
                            mp.y    = (mp.y - anchor.top) * 2;
                            mp      = context._rotatePoint(mp, sin, cos);

                            if(dox) data.scalex = (mp.x / owid) > scaleLimit ? (mp.x / owid) : scaleLimit;
                            data.scaley = (mp.y / ohgt) > scaleLimit ? (mp.y / ohgt) : scaleLimit;
                        };
                    }

                    positionMe = function()
                    {
                        doPosition(context.data.initialResizeOffsets.mc, context.getResizeParentHandleOffset(context.selectors.scalers.mc));
                    };
                }

                if(scaleMe)
                {
                    scaleMe(Point(evt.pageX, evt.pageY));

                    if(evt.shiftKey || settings.maintainAspectRatio)
                    {
                        context.data.shiftKey = true;

                        if(!handle.get(0).classList.contains('ft-scaler-center'))
                        {
                            data.scaley = ((owid * data.scalex) * (1 / ratio)) / ohgt;

                            if(handle.is(ml))
                            {
                                positionMe = function()
                                {
                                    doPosition(context.data.initialResizeOffsets.mr, context.getResizeParentHandleOffset(context.selectors.scalers.mr));
                                };
                            }
                            else if(handle.is(mr))
                            {
                                positionMe = function()
                                {
                                    doPosition(context.data.initialResizeOffsets.ml, context.getResizeParentHandleOffset(context.selectors.scalers.ml));
                                };
                            }
                        }
                        else
                        {
                            data.scalex = ((ohgt * data.scaley) * ratio) / owid;

                            if(handle.is(tc))
                            {
                                positionMe = function()
                                {
                                    doPosition(context.data.initialResizeOffsets.bc, context.getResizeParentHandleOffset(context.selectors.scalers.bc));
                                };
                            }
                            else
                            {
                                positionMe = function()
                                {
                                    doPosition(context.data.initialResizeOffsets.tc, context.getResizeParentHandleOffset(context.selectors.scalers.tc));
                                };
                            }
                        }
                    }

                    if(jQuery(element).get(0).classList.contains('ft-controls') || jQuery(element).get(0).classList.contains('slide_layer') )
                    {
                        FTXCanvas.data.isDragging = true;
                    }

                    data._p.cwid = data._p.width * data.scalex;
                    data._p.chgt = data._p.height * data.scaley;

                    context._draw(sel, data);

                    if(positionMe)
                    {
                        positionMe();
                    }
                }
            });

            var up = function(event)
            {
                jQuery(document).unbind('mousemove.freetrans', drag);
                jQuery(document).unbind('mouseup.freetrans', up);

                context.data.altKey     = false;
                context.data.shiftKey   = false;

                return context.stopResize(event, element, data);
            };

            jQuery(document).bind('mousemove.freetrans', drag);
            jQuery(document).bind('mouseup.freetrans', up);
        })));

        sel.css({'position':'absolute'});
    },

    /**
     * Get Resize Parent Handle Offset
     *
     * @param {HTMLElement|jQuery} handle
     * @returns {{left: *, top: *}}
     */
    getResizeParentHandleOffset: function(handle)
    {
        var controls            = this.selectors.controls,
            controlsPosition    = controls.position(),
            handlePosition      = handle.position();

        return {
            left    : controlsPosition.left + handlePosition.left,
            top     : controlsPosition.top + handlePosition.top
        };
    },

    /**
     * Stop Resize
     *
     * @param {Event} event
     * @param {HTMLElement|jQuery} element
     * @param {Object|Array} data
     */
    stopResize: function(event, element, data)
    {
        var context         = this,
            selectedElement = FTXCanvas.getSelectedLayerElement(),
            controls        = this.selectors.controls,
            controlData     = controls.data('freetrans'),
            elementLeft     = controlData.x,
            elementTop      = controlData.y,
            historyTitle    = "Layer Resized";

        FTXCanvas.setDefaultPositionToLayers();

        // If a single layer was resized, we will use it's left/top to store in controls
        if(FTXCanvas.getSelectedLayerCount(true, true) == 1 && selectedElement)
        {
            var selectedElementData = selectedElement.data();
                elementLeft         = selectedElementData.x;
                elementTop          = selectedElementData.y;
        }

        // Set control element settings based on previous resize
        this.setElementSettings(controls, {
            x:      elementLeft,
            y:      elementTop,
            scalex: 1,
            scaley: 1,
            _p: {
                width:  controlData._p.cwid,
                height: controlData._p.chgt
            }
        });

        // Update container from cover layers
        this.updateContainerFromCoverLayers();

        // If we're also moving the layers, we'll need to grab our temporary left/top values
        // and update translation properties
        if(FTXCanvas.getSelectedLayerCount(true, true) > 0)
        {
            var selectedElements = FTXCanvas.getSelectedLayers(true, true);

            // Loop through each selected element
            for(var c = 0; c < selectedElements.length; c++)
            {
                var layer               = jQuery(selectedElements[c]),
                    layerId             = FTXCanvas.getLayerIdFromElement(layer),
                    layerObj             = FTXCanvas.getLayerById(layerId),                    
                    layerFreeTrans      = layer.data('freetrans');

                if(layerObj)
                {
                    historyTitle = layerObj.layerType + " Layer Resized";
                }

                FTXCanvas.updateLayer(layerId, 'check_mr', {
                    layerTextOptions: {
                        fontSize: layer.get(0).style.fontSize
                    },
                    position: {
                        x: layerFreeTrans.x,
                        y: layerFreeTrans.y
                    },
                    dimensions: {
                        width:  layerFreeTrans._p.width,
                        height: layerFreeTrans._p.height
                    }
                }, false);

                FTXLayerToolbar.updateMediumEditor();

                // Store state for zoom to begin processing old values
                FTXCanvas.storeZoomState(layerId, {
                    x:          layerFreeTrans.x,
                    y:          layerFreeTrans.y,
                    width:      layerFreeTrans._p.width,
                    height:     layerFreeTrans._p.height,
                    fontSize:   parseFloat(layer.get(0).style.fontSize)
                });
                
                if(FTXCanvas.isElementGroupedElement(layerId))
                {                    
                    var groupId         = layerId,
                        groupItems      = FTXCanvas.getLayersFromGroup(groupId);

                    if(groupItems && groupItems.length)
                    {
                        for(var g = 0; g < groupItems.length; g++)
                        {
                            var groupItem          = jQuery(groupItems[g]),
                                itrmId             = FTXCanvas.getLayerIdFromElement(groupItem),
                                itemFreeTrans      = groupItem.data('freetrans');

                            FTXCanvas.updateLayer(itrmId, 'check_mr', {
                                layerTextOptions: {
                                    fontSize: groupItem.get(0).style.fontSize
                                },
                                position: {
                                    x: itemFreeTrans.x,
                                    y: itemFreeTrans.y
                                },
                                dimensions: {
                                    width:  itemFreeTrans._p.width,
                                    height: itemFreeTrans._p.height
                                }
                            }, false);

                            // Store state for zoom to begin processing old values
                            FTXCanvas.storeZoomState(itrmId, {
                                x:          itemFreeTrans.x,
                                y:          itemFreeTrans.y,
                                width:      itemFreeTrans._p.width,
                                height:     itemFreeTrans._p.height,
                                fontSize:   parseFloat(groupItem.get(0).style.fontSize)
                            });
                        }
                    }
                }
            }

            var postLayerObjs = FTXCanvas.getLayersById(FTXCanvas.data.selectedLayers);

            if(selectedElements.length > 1)
            {
                historyTitle = "Multiple Layer Resize";   
            }
            
            FTXCanvas.addLayerStateToHistory(postLayerObjs, context.data.initialLayerObjs, historyTitle, 'update');
        }

        // Set Position to Layers Respect to Group        
        FTXCanvas.setPositionToLayers(true);
        
        // Put condition to make collision method run correctly 
        if(!event.target.classList.contains('ft-controls'))        
        {
            this.data.isResizing = false;
        }        
    },

    /**
     * Require Forced Proportion
     *
     * @returns {Boolean}
     */
    requireForcedProportion: function()
    {
        return (FTXCanvas.currentSelection.selectedLayersCount > 1 && (FTXCanvas.selectedLayersHasType('text')
                || FTXCanvas.selectedLayersHasType('icon')
                || FTXCanvas.selectedLayersHasRotation()))
                || FTXCanvas.currentSelection.selectedLayerType === 'text'
                || FTXCanvas.currentSelection.selectedLayerType === 'icon'
                || FTXGradient.gradientNeedForcedProportion()
    },

    /**
     * Set Default Settings if Not Exists
     *
     * @param {HTMLElement|jQuery} element
     * @returns {*|Boolean}
     */
    setDefaultSettingsIfNotExist: function(element)
    {
        var options = {};

        if(!this.transformDataExists(element))
        {
            return this._setDefaultSettings(element, options);
        }

        return false;
    },

    /**
     * Transform Data Exists
     *
     * @param {HTMLElement|jQuery} element
     * @returns {Boolean}
     */
    transformDataExists: function(element)
    {
        var settings = element.data('freetrans');
        return settings !== undefined;
    },

    /**
     * Element Dimensions Set
     *
     * @param {HTMLElement|jQuery} element
     * @returns {Boolean}
     */
    elementDimensionsSet: function(element)
    {
        var settings = jQuery(element).data('freetrans');

        if(settings == undefined || settings.x == 0 || settings.y == 0)
        {
            return false;
        }

        if(settings._p.chgt == 0 || settings._p.cwid == 0)
        {
            return false;
        }

        return settings._p.width != 0 && settings._p.height != 0;
    },

    /**
     * Clear Controls
     *
     */
    clearControls: function()
    {
        var controls = this.selectors.controls;

        controls.removeAttr('style');
        controls.removeClass('no-pointer-events');
        controls.addClass('hide');
    },

    /**
     * If Left Callback
     *
     * @param {Function} callback
     * @returns {*|{Function}}
     * @private
     */
    _ifLeft: function(callback)
    {
        return function(event)
        {
            if(event.which === 1)
            {
                return callback(event);
            }
        };
    },

    /**
     * No Select Callback
     *
     * @param {Function} callback
     * @returns {*|Function}
     * @private
     */
    _noSelect: function(callback)
    {
        return function(event)
        {
            event.preventDefault();
            event.stopImmediatePropagation();
            return callback(event);
        }
    },

    /**
     * Destroy Free Transform
     *
     * @param {HTMLElement|jQuery} element
     * @param {Boolean|Optional} removeData
     * @returns {Object}
     * @private
     */
    _destroy: function(element, removeData)
    {
        element.unbind('.freetrans');

        if(!removeData && typeof removeData == 'undefined')
        {
            element.removeData('freetrans');
        }
    },

    /**
     * Toggle Snapping
     *
     * @returns {*}
     */
    toggleSnap: function()
    {
        if(this.isSnapEnabled())
        {
            return this.disableSnap();
        }

        return this.enableSnap();
    },

    /**
     * Enable Snapping
     *
     */
    enableSnap: function()
    {
        this.data.snapEnabled = true;
    },

    /**
     * Disable Snapping
     *
     */
    disableSnap: function()
    {
        this.data.snapEnabled = false;
    },

    /**
     * Is Snap Enabled
     *
     * @returns {Boolean}
     */
    isSnapEnabled: function()
    {
        return this.data.snapEnabled;
    },

    /**
     * Enable Grouping
     *
     */
    enableGroup: function()
    {
        this.data.groupEnabled = true;
    },

    /**
     * Disable Grouping
     *
     */
    disableGroup: function()
    {
        this.data.groupEnabled = false;

        FTXCanvas.unGroupLayers();
    },

    /**
     * Is Group Enabled
     *
     * @returns {Boolean}
     */
    isGroupEnabled: function()
    {
        return this.data.groupEnabled;
    },

    /**
     * Get Element Bounds
     *
     * @param {HTMLElement|jQuery} element
     * @returns {Object}
     * @private
     */
    _getBounds: function(element)
    {
        var bounds  = {},
            scalers = this.selectors.scalers.all;

        for(var s = 0; s < scalers.length; s++)
        {
            var handle          = jQuery(scalers[s]),
                offset          = handle.offset(),
                handleWidth     = handle.width() / 2,
                handleHeight    = handle.height() / 2;

            if(s == 0)
            {
                bounds.xmin = offset.left + handleWidth;
                bounds.xmax = offset.left + handleWidth;
                bounds.ymin = offset.top + handleHeight;
                bounds.ymax = offset.top + handleHeight;
            }
            else
            {
                bounds.xmin = Math.min(bounds.xmin, offset.left + handleWidth);
                bounds.xmax = Math.max(bounds.xmax, offset.left + handleWidth);
                bounds.ymin = Math.min(bounds.ymin, offset.top + handleHeight);
                bounds.ymax = Math.max(bounds.ymax, offset.top + handleHeight);
            }

            bounds.width    = bounds.xmax - bounds.xmin;
            bounds.height   = bounds.ymax - bounds.ymin;
            bounds.center   = Point(bounds.xmin + (bounds.width / 2), bounds.ymin + (bounds.height / 2));
        }

        return bounds;
    },

    /**
     * Create Style Setter
     *
     * @param {Object} properties
     * @returns {Function}
     * @private
     */
    _createStyleSetter: function(properties)
    {
        var prefixed;

        if(vendorPrefix)
        {
            prefixed = vendorPrefix + properties.substr(0, 1).toUpperCase() + properties.substr(1);

            // Its a closure
            return function (element, value)
            {
                element.style[prefixed] = element.style[properties] = value;
            };
        }

        return function(element, value)
        {
            element.style[properties] = value;
        };
    },

    /**
     * Set Default Settings
     *
     * @param {HTMLElement|jQuery} element
     * @param {Object} options
     * @public
     */
    _setDefaultSettings: function(element, options)
    {
        var layerId, layerObj,
            currentElement      = jQuery(element),
            elementBounds       = {
                width:  currentElement.width(),
                height: currentElement.height()
            },
            snapElements    = [],
            data            = currentElement.data('freetrans'),
            axis;

        if(FTXCanvasGuides.isElementGuide(element.get(0)))
        {
            layerId = FTXCanvasGuides.getGuideIdByElement(currentElement);
            axis    = FTXCanvasGuides.getGuideAxis(layerId);
        }
        else
        {
            layerId     = FTXCanvas.getLayerIdFromElement(currentElement);
            layerObj    = FTXCanvas.getLayerById(layerId);
        }

        var settings = {
            x:  (isNaN(parseInt(currentElement.css('left'))))?  0: parseInt(currentElement.css('left')),
            y:  (isNaN(parseInt(currentElement.css('top'))))? 0 : parseInt(currentElement.css('top')),
            layerId: layerId,
            scalex: 1,
            scaley: 1,
            angle: (options && options.angle) ? options.angle : 0,
            maintainAspectRatio: false,
            scaleLimit: 0.1,
            'rot-origin': '50% 50%',
            _p: {
                divs:       {},
                prev:       {
                    width:  elementBounds.width,
                    height: elementBounds.height,
                    left:   '',
                    top:    ''
                },
                width:      elementBounds.width,
                height:     elementBounds.height,
                rad:        (options && options.angle) ? options.angle * rad : 0,
                controls:   true,
                scale:      true,
                rotator:    true,
                dom:        currentElement[0]
            },
            _guide:{
                align: {}
            },
            elements:   snapElements,
            axis:       axis
        };

        if(layerId && typeof layerObj != 'undefined' && layerObj)
        {
            settings.angle  = layerObj.rotation.angle;
            settings._p.rad = layerObj.rotation.rad;
        }

        settings._p.divs.controls   = this.selectors.controls;
        settings._p.divs.rotator    = this.selectors.rotator;
        settings._p.cwid            = currentElement.width();
        settings._p.chgt            = currentElement.height();

        currentElement.data('freetrans', settings);

        if(typeof data != 'undefined')
        {
            currentElement.data('freetrans').elements = data.elements;
        }
    },

    /**
     * Set Element Settings
     *
     * @param {HTMLElement|jQuery} element
     * @param {Object} options
     * @public
     */
    setElementSettings: function(element, options)
    {
        var elementData     = FTXCanvas.recursiveMerge( {}, jQuery(element).data('freetrans')),
            updatedSettings = jQuery.extend(true, elementData, options);

        jQuery(element).data('freetrans', updatedSettings);
    },

    /**
     * Get Angle From Matrix
     *
     * @param matrix
     * @returns {number}
     * @private
     */
    _getAngleFromMatrix: function(matrix)
    {        
        var values = matrix.split('(')[1];
            values = values.split(')')[0];
            values = values.split(',');

        var sin = values[1];

        return Math.round(Math.asin(sin) * (180 / Math.PI));
    },
    
    /**
     * Get Angle From element
     *
     * @param {HTMLElement|jQuery} element
     * @returns {Number}
     * @private
     */
    _getAngleFromElement: function(element)
    {
        var matrix = element.css("-webkit-transform") ||
            element.css("-moz-transform")   ||
            element.css("-ms-transform")    ||
            element.css("-o-transform")     ||
            element.css("transform"),
            angle = 0;

        if(matrix !== 'none')
        {
            var values  = matrix.split('(')[1].split(')')[0].split(','),
                a       = values[0],
                b       = values[1];
                angle   = Math.round(Math.atan2(b, a) * (180/Math.PI));
        }
        
        return (angle < 0) ? angle += 360 : angle;
    },

    /**
     * Update Container from Layer
     *
     * @param {HTMLElement|jQuery} elementA
     * @returns {*}
     * @private
     */
    updateContainerFromLayer: function(elementA)
    {
        var controls    = this.selectors.controls,
            settings    = FTXCanvas.recursiveMerge( {}, elementA.data('freetrans'));

        var updatedCSS = {
            height:     settings._p.height,
            width:      settings._p.width,
            left:       settings.x,
            top:        settings.y,
            transform:  elementA.css('transform'),
            opacity:    1
        };

        var updatedSettings = {
            x:      settings.x,
            y:      settings.y,
            angle:  settings.angle,
            scalex: 1,
            scaley: 1,
            _p: {
                width:  settings._p.width,
                cwid:   settings._p.cwid,
                height: settings._p.height,
                chgt:   settings._p.chgt,
                //prev:   settings._p.prev,
                rad:    settings._p.rad
            }
        };

        this.setContainerOctant(settings.angle);

        this.setElementSettings(controls, updatedSettings);

        controls.css(updatedCSS);

        // Remove control hidden class
        controls.removeClass('hide');

        if(!this.elementDimensionsSet(controls))
        {
            this._setDefaultSettings(controls);
        }
    },

    /**
     * Update Container From Layer
     *
     */
    updateContainerFromCoverLayers: function()
    {
        var controls = this.selectors.controls;

        var updatedSettings = {
            scalex: 1,
            scaley: 1,
            angle:  0,
            x: parseInt(controls.css('left')),
            y: parseInt(controls.css('top')),
            _p: {
                width:  controls.width(),
                cwid:   controls.width(),
                height: controls.height(),
                chgt:   controls.height(),
                rad:    0,
                prev: {
                    width:  controls.width(),
                    height: controls.height()
                }
            }
        };

        // Remove control hidden class
        controls.removeClass('hide');

        this.setElementSettings(controls, updatedSettings);

        if(!this.elementDimensionsSet(controls))
        {
            this._setDefaultSettings(controls);
        }
    },

    /**
     * Toggle Control Set
     *
     */
    toggleControlSet: function()
    {
        var selectedType    = FTXCanvas.getSelectedLayerType(),
            rotator         = this.selectors.rotator.get(0);

        // Show only bottom right controls, if the multiple or text layer is selected
        if(FTXCanvas.getSelectedLayerCount(true, true) > 1)
        {
            if(FTXCanvas.selectedLayersHasType('text') || FTXCanvas.selectedLayersHasType('icon') || FTXCanvas.selectedLayersHasRotation())
            {
                // Remove Inactive Class
                this.selectors.scalers.tl.get(0).classList.remove('inactive');
                this.selectors.scalers.tr.get(0).classList.remove('inactive');
                this.selectors.scalers.br.get(0).classList.remove('inactive');
                this.selectors.scalers.bl.get(0).classList.remove('inactive');

                // Add inactive class
                this.selectors.scalers.tc.get(0).classList.add('inactive');
                this.selectors.scalers.ml.get(0).classList.add('inactive');
                this.selectors.scalers.mr.get(0).classList.add('inactive');
                this.selectors.scalers.bc.get(0).classList.add('inactive');

                this.data.allowedResizeHandles = ['tl', 'tr', 'br', 'bl'];
            }
            else
            {
                this.data.allowedResizeHandles = ['all'];
            }
            rotator.classList.add('inactive');
        } 
        // If group layer or text layer or icon layer
        else if((FTXCanvas.getSelectedLayerCount(true, true) == 1 && FTXCanvas.getSelectedGroupLayerCount() == 1) || (selectedType && (selectedType == 'text' || selectedType == 'icon')))
        {
            // Remove Inactive Class
            this.selectors.scalers.tl.get(0).classList.remove('inactive');
            this.selectors.scalers.tr.get(0).classList.remove('inactive');
            this.selectors.scalers.br.get(0).classList.remove('inactive');
            this.selectors.scalers.bl.get(0).classList.remove('inactive');

            // Add inactive class
            this.selectors.scalers.tc.get(0).classList.add('inactive');
            this.selectors.scalers.ml.get(0).classList.add('inactive');
            this.selectors.scalers.mr.get(0).classList.add('inactive');
            this.selectors.scalers.bc.get(0).classList.add('inactive');

            this.data.allowedResizeHandles = ['tl', 'tr', 'br', 'bl'];
            rotator.classList.remove('inactive');
        }
        else
        {
            // Remove Inactive Class
            this.selectors.scalers.tl.get(0).classList.remove('inactive');
            this.selectors.scalers.tr.get(0).classList.remove('inactive');
            this.selectors.scalers.br.get(0).classList.remove('inactive');
            this.selectors.scalers.bl.get(0).classList.remove('inactive');
            
            this.selectors.scalers.tc.get(0).classList.remove('inactive');
            this.selectors.scalers.ml.get(0).classList.remove('inactive');
            this.selectors.scalers.mr.get(0).classList.remove('inactive');
            this.selectors.scalers.bc.get(0).classList.remove('inactive');

            this.data.allowedResizeHandles = ['all'];
            
            rotator.classList.remove('inactive');
        }
    },

    /**
     * Gives a new point after rotate
     *
     * @param {Object} point
     * @param {Number} sin
     * @param {Number} cos
     * @returns {Object|Point} - Point Object
     * @private
     */
    _rotatePoint: function(point, sin, cos)
    {
        return Point(point.x * cos + point.y * sin, point.y * cos - point.x * sin);
    },

    /**
     * Get Rotation Point
     *
     * @param {HTMLElement|jQuery} selector
     * @returns {Point|Object} - Point object
     * @private
     */
    _getRotationPoint: function(selector)
    {
        var data    = selector.data('freetrans'),
            ror     = data['rot-origin'],
            point   = Point(0,0);

        if(!ror || ror == "50% 50%")
        {
            return point;
        }

        var arr = ror.split(' '), length = arr.length;

        if(!length)
        {
            return point;
        }

        var value        = parseInt(arr[0]),
            percentage   = arr[0].indexOf('%') > -1,
            dimension    = data._p.cwid;

        point.x = ((percentage) ? value/100*dimension : value) - dimension/2;

        if(length == 1)
        {
            //noinspection JSSuspiciousNameCombination
            point.y = point.x;
        }
        else
        {
            value       = arr[1];
            percentage  = value.indexOf('%') > -1;
            value       = parseInt(value);
            dimension   = data._p.chgt;
            point.y     = ((percentage) ? value/100*dimension : value) - dimension/2;
        }

        return point;
    },

    /**
     * Get properties from matrix. tx and ty are translated x, y distance
     *
     * @param {Object} matrix
     * @return {Object}
     */
    _getPropsFromMatrix: function(matrix)
    {
        return {
            tx  : Number(matrix.tx),
            ty  : Number(matrix.ty),
            rad : Math.atan2(Number(matrix.b), Number(matrix.a)),
            sx  : Math.sqrt(matrix.a*matrix.a+matrix.b*matrix.b),
            sy  : Math.sqrt(matrix.c*matrix.c+matrix.d*matrix.d)
        };
    },

    /**
     * Snap To Canvas Positions
     *
     * @param {HTMLElement|jQuery} sel
     * @param {Object} data
     * @private
     */
    _snapToCanvasPosition: function(sel, data)
    {
        var wid     = data._p.cwid,
            hgt     = data._p.chgt,
            x1      = data.x,
            x2      = x1 + wid,
            y1      = data.y,
            y2      = y1 + hgt,
            xc      = (x1 + x2) / 2,
            yc      = (y1 + y2) / 2,
            d       = this.data.snapDistance;

        // Canvas parameters
        var canvasLeft      = 0,
            canvasRight     = canvasLeft + parseInt(FTXCanvas.selectors.divLayers.style.width),
            canvasTop       = 0,
            canvasBottom    = parseInt(FTXCanvas.selectors.divLayers.style.height),
            canvasHCenter   = (canvasLeft + canvasRight) / 2,
            canvasVCenter   = (canvasTop + canvasBottom) / 2;

        // Canvas snap points
        var clss = Math.abs(canvasLeft - x1)  <= d,
            cls  = Math.abs(canvasLeft - x2)  <= d,
            crss = Math.abs(canvasRight - x2)  <= d,
            crs  = Math.abs(canvasRight - x1)  <= d,
            ctss = Math.abs(canvasTop - y1)  <= d,
            cts  = Math.abs(canvasTop - y2) <= d,
            cbss = Math.abs(canvasBottom - y2)  <= d,
            cbs  = Math.abs(canvasBottom - y1)  <= d,
            chs  = Math.abs(canvasHCenter - xc) <= d,
            cvs  = Math.abs(canvasVCenter - yc) <= d;

        // Set snap horizontal, vertical active to false
        this.data.snapHActive = false;
        this.data.snapYActive = false;

        if(typeof data.axis == 'undefined' || (typeof data.axis != 'undefined' && data.axis != 'vertical'))
        {
            // Canvas left side
            if(clss || cls)
            {
                this.data.snapHActive = true;

                if(clss)
                {
                    this.attachElementWithSnap(data._p.dom, "left", canvasLeft, data);
                }
                else if(cls)
                {
                    this.attachElementWithSnap(data._p.dom, "left", canvasLeft - wid, data);
                }

                this.selectors.snapGuides.snapX.style.left      = 0 + 'px';
                this.selectors.snapGuides.snapX.style.top       = 0 + 'px';
                this.selectors.snapGuides.snapX.style.display   = "block";
            }

            // Canvas right side
            if(crss || crs)
            {
                this.data.snapHActive = true;

                if(crss)
                {
                    this.attachElementWithSnap(data._p.dom, "left", canvasRight - wid, data);
                }
                else if(crs)
                {
                    this.attachElementWithSnap(data._p.dom, "left", canvasRight, data);
                }

                this.selectors.snapGuides.snapX.style.left      = canvasRight + 'px';;
                this.selectors.snapGuides.snapX.style.top       = 0 + 'px';
                this.selectors.snapGuides.snapX.style.display   = "block";
            }

            // Canvas horizontal center
            if(chs)
            {
                this.data.snapHActive = true;

                this.attachElementWithSnap(data._p.dom, "left", canvasHCenter - (wid / 2), data);

                this.selectors.snapGuides.snapX.style.left      = canvasHCenter + 'px';
                this.selectors.snapGuides.snapX.style.top       = 0 + 'px';
                this.selectors.snapGuides.snapX.style.display   = "block";
            }
        }

        if(typeof data.axis == 'undefined' || (typeof data.axis != 'undefined' && data.axis != 'horizontal'))
        {
            // Canvas top side
            if(ctss || cts)
            {
                this.data.snapYActive = true;

                if(ctss)
                {
                    this.attachElementWithSnap(data._p.dom, "top", canvasTop, data);
                }
                else if(cts)
                {
                    this.attachElementWithSnap(data._p.dom, "top", canvasTop - hgt, data);
                }

                this.selectors.snapGuides.snapY.style.left      = 0 + 'px';
                this.selectors.snapGuides.snapY.style.top       = 0 + 'px';
                this.selectors.snapGuides.snapY.style.display   = "block";
            }

            // Canvas bottom side
            if(cbss || cbs)
            {
                this.data.snapYActive = true;

                if(cbss)
                {
                    this.attachElementWithSnap(data._p.dom, "top", canvasBottom - hgt, data);
                }
                else if(cbs)
                {
                    this.attachElementWithSnap(data._p.dom, "top", canvasBottom, data);
                }

                this.selectors.snapGuides.snapY.style.left      = 0 + 'px';
                this.selectors.snapGuides.snapY.style.top       = canvasBottom + 'px';
                this.selectors.snapGuides.snapY.style.display   = "block";
            }

            // Canvas vertical center
            if(cvs)
            {
                this.data.snapYActive = true;

                this.attachElementWithSnap(data._p.dom, "top", canvasVCenter - (hgt / 2), data);

                this.selectors.snapGuides.snapY.style.left      = 0 + 'px';
                this.selectors.snapGuides.snapY.style.top       = canvasVCenter + 'px';
                this.selectors.snapGuides.snapY.style.display   = "block";
            }
        }
    },

    /**
     * Snap Guides to Element
     *
     * @param {HTMLElement|jQuery} sel
     * @param {Object} data
     * @private
     */
    _snapToElements: function(sel, data)
    {
        var elements    = data.elements,
            wid         = data._p.cwid,
            hgt         = data._p.chgt,
            x1          = data.x,
            x2          = x1 + wid,
            y1          = data.y,
            y2          = y1 + hgt,
            xc          = (x1 + x2) / 2,
            yc          = (y1 + y2) / 2,
            d           = this.data.snapDistance;

        this.data.snapHActiveForElement = false;
        this.data.snapYActiveForElement = false;

        for(var i = 0; i < elements.length;  i++)
        {
            // Element parameters
            var l   = elements[i].left,
                r   = l + elements[i].width,
                t   = elements[i].top,
                b   = t + elements[i].height,
                hc  = (l + r) / 2,
                vc  = (t + b) / 2;

            // Element snap points
            var lss = Math.abs(l - x1)  <= d,
                ls  = Math.abs(l - x2)  <= d,
                rss = Math.abs(r - x2)  <= d,
                rs  = Math.abs(r - x1)  <= d,
                tss = Math.abs(t - y1)  <= d,
                ts  = Math.abs(t - y2)  <= d,
                bss = Math.abs(b - y2)  <= d,
                bs  = Math.abs(b - y1)  <= d,
                hs  = Math.abs(hc - xc) <= d,
                vs  = Math.abs(vc - yc) <= d;

            if(typeof data.axis == 'undefined' || (typeof data.axis != 'undefined' && data.axis != 'vertical'))
            {
                // Left side
                if(lss || ls)
                {
                    this.data.snapHActiveForElement = true;

                    if(ls)
                    {
                        this.attachElementWithSnap(data._p.dom, "left", l - wid, data);
                    }
                    else if(lss)
                    {
                        this.attachElementWithSnap(data._p.dom, "left", l, data);
                    }

                    this.selectors.snapGuides.snapX.style.left      = l + 'px';
                    this.selectors.snapGuides.snapX.style.top       = 0 + 'px';
                    this.selectors.snapGuides.snapX.style.display   = "block";
                }

                // Right side
                if(rss || rs)
                {
                    this.data.snapHActiveForElement = true;

                    if(rs)
                    {
                        this.attachElementWithSnap(data._p.dom, "left", r, data);
                    }
                    else if(rss)
                    {
                        this.attachElementWithSnap(data._p.dom, "left", r - wid, data);
                    }

                    this.selectors.snapGuides.snapX.style.left      = r + 'px';
                    this.selectors.snapGuides.snapX.style.top       = 0 + 'px';
                    this.selectors.snapGuides.snapX.style.display   = "block";
                }

                // Element horizontal center
                if(hs)
                {
                    this.data.snapHActiveForElement = true;

                    this.attachElementWithSnap(data._p.dom, "left", hc - (wid / 2), data);

                    this.selectors.snapGuides.snapX.style.left      = hc + 'px';
                    this.selectors.snapGuides.snapX.style.top       = 0 + 'px';
                    this.selectors.snapGuides.snapX.style.display   = "block";
                }
            }

            if(typeof data.axis == 'undefined' || (typeof data.axis != 'undefined' && data.axis != 'horizontal'))
            {
                // Top side
                if(tss || ts)
                {
                    this.data.snapYActiveForElement = true;

                    if(tss)
                    {
                        this.attachElementWithSnap(data._p.dom, "top", t, data);
                    }
                    else if(ts)
                    {
                        this.attachElementWithSnap(data._p.dom, "top", t - hgt, data);
                    }

                    this.selectors.snapGuides.snapY.style.left      = 0 + 'px';
                    this.selectors.snapGuides.snapY.style.top       = t + 'px';
                    this.selectors.snapGuides.snapY.style.display   = "block";
                }

                // Bottom side
                if(bss || bs)
                {
                    this.data.snapYActiveForElement = true;

                    if(bss)
                    {
                        this.attachElementWithSnap(data._p.dom, "top", b - hgt, data);
                    }
                    else if(bs)
                    {
                        this.attachElementWithSnap(data._p.dom, "top", b, data);
                    }

                    this.selectors.snapGuides.snapY.style.left      = 0 + 'px';
                    this.selectors.snapGuides.snapY.style.top       = b + 'px';
                    this.selectors.snapGuides.snapY.style.display   = "block";
                }

                // Element vertical center
                if(vs)
                {
                    this.data.snapYActiveForElement = true;

                    this.attachElementWithSnap(data._p.dom, "top", vc - (hgt / 2), data);

                    this.selectors.snapGuides.snapY.style.left      = 0 + 'px';
                    this.selectors.snapGuides.snapY.style.top       = vc + 'px';
                    this.selectors.snapGuides.snapY.style.display   = "block";
                }
            }

            if(lss || ls || rss || rs || tss || ts || bss || bs || hs || vs)
            {
                return true;
            }
        }

        return false;
    },

    /**
     * Attach Element With Snap
     *
     * @param {HTMLElement|jQuery} element
     * @param {String} direction
     * @param {Number} value
     * @param {Object} data
     */
    attachElementWithSnap: function(element, direction, value, data)
    {
        var context     = this,
            startLeft   = parseInt(element.style.left),
            startTop    = parseInt(element.style.top);

        if(!FTXCanvasGuides.isElementGuide(element))
        {
            if(direction == "top")
            {
                element.style.top = Math.round(value) + 'px';

                if(!element.classList.contains('ft-controls'))
                {
                    this.setElementSettings(element, {
                        y: Math.round(value)
                    });
                }
            }

            if(direction == "left")
            {
                element.style.left = Math.round(value) + 'px';
                
                if(!element.classList.contains('ft-controls'))
                {
                    this.setElementSettings(element, {
                        x: Math.round(value)
                    });
                }
            }
        }

        if(element.classList.contains('ft-controls'))
        {
            var xDifference = Math.round(parseInt(element.style.left) - startLeft),
                yDifference = Math.round(parseInt(element.style.top) - startTop);

            if(FTXCanvas.getSelectedLayerCount(false, true) > 0)
            {
                var selectedLayers          = FTXCanvas.getSelectedLayers(false, true),
                    selectedLayerLength     = selectedLayers.length;

                if(selectedLayers && selectedLayerLength)
                {
                    for(var i = 0; i < selectedLayerLength; i++)
                    {
                        var selectedLayer           = jQuery(selectedLayers[i]),
                            selectedEl              = selectedLayer.get(0),
                            selectedElementData     = selectedLayer.data('freetrans');

                        if(direction == "left")
                        {
                            if(FTXCanvasGuides.isElementGuide(selectedEl) && selectedElementData.axis == "horizontal")
                            {
                                FTXCanvasGuides.setElementTransform(selectedLayer, {
                                    'left': selectedElementData.x + xDifference
                                });
                            }

                            if(!FTXCanvasGuides.isElementGuide(selectedEl))
                            {
                                selectedEl.style.left = selectedElementData.x + xDifference + 'px';
                            }

                            context.setElementSettings(selectedLayer, {
                                x: selectedElementData.x + xDifference
                            });
                        }

                        if(direction == "top")
                        {
                            if(FTXCanvasGuides.isElementGuide(selectedEl) && selectedElementData.axis == "vertical")
                            {
                                FTXCanvasGuides.setElementTransform(selectedLayer, {
                                    'top': selectedElementData.y + yDifference
                                });
                            }

                            if(!FTXCanvasGuides.isElementGuide(selectedEl))
                            {
                                selectedEl.style.top  = selectedElementData.y + yDifference + 'px';
                            }

                            context.setElementSettings(selectedLayer, {
                                y: selectedElementData.y + yDifference
                            });
                        }
                    }
                }
            }
        }
        else
        {
            if(direction == "top")
            {
                if(FTXCanvasGuides.isElementGuide(element))
                {
                    FTXCanvasGuides.setElementTransform(jQuery(element), {
                        'top': value
                    });

                    context.setElementSettings(jQuery(element), {
                        y: value
                    });
                }
                else
                {
                    // Shift element top position
                    if(!element.classList.contains('ft-controls'))
                    {
                        element.style.top = value + 'px';

                        this.setElementSettings(jQuery(element), {
                            y: value
                        });
                    }
                }
            }

            if(direction == "left")
            {
                if(FTXCanvasGuides.isElementGuide(element))
                {
                    FTXCanvasGuides.setElementTransform(jQuery(element), {
                        'left': value
                    });

                    context.setElementSettings(jQuery(element), {
                        l: value
                    });
                }
                else
                {
                    // Shift element left position
                    if(!element.classList.contains('ft-controls'))
                    {
                        element.style.left = value + 'px';

                        this.setElementSettings(jQuery(element), {
                            x: value
                        });
                    }
                }
            }
        }
    },

    /**
     * Draw Matrix Changes
     *
     * @param {HTMLElement|jQuery} sel
     * @param {Object} data
     * @private
     */
    _draw: function(sel, data)
    {
        if(!data || (sel.get(0).classList.contains('ft-controls') && FTXCanvas.getSelectedLayerCount() < 1))
        {
            return;
        }

        var element;

        if(this.data.transformAction == 'drag' && this.data.snapEnabled)
        {
            if(FTXCanvasGuides.getSelectedGuidesCount() <= 1)
            {
                // Snap To Canvas Position
                this._snapToCanvasPosition(sel, data);

                // Snap to Other Elements
                this._snapToElements(sel, data);
            }
        }

        // If controls is present (This may be absent in case of jQuery dragging)
        // Apply translations to controls
        if(data._p.controls && data._p.divs.controls.length)
        {
            element = data._p.divs.controls[0];
            this._applyTranslationsToControl(element, data);
        }

        // Apply translations to layers
        if(this.data.transformAction == 'drag')
        {
            this._applyTranslationsToLayers(data);
        }

        // Apply Rotation
        if(this.data.transformAction == 'rotation')
        {
            this._applyRotation(sel, element, data);
        }

        // Apply Scaling
        if(this.data.transformAction == 'resize')
        {
            this._applyScale(data);
        }
    },

    /**
     * Apply Translations to Controls
     *
     * @param {HTMLElement|jQuery} controls
     * @param {Object} data
     * @private
     */
    _applyTranslationsToControl: function(controls, data)
    {
        var domElement = data._p.dom;

        // Cancel out if the element passed isn't the controls element
        if(!domElement.classList.contains('ft-controls'))
        {
            return;
        }

        var element         = data._p.divs.controls[0],
            controlsTop     = data.y + data._p.height * (1 - data.scaley),
            controlsLeft    = data.x + data._p.width * (1 - data.scalex),
            context         = this;

        // Update left if we're not snapped into position
        if(!this.data.snapHActive && !this.data.snapHActiveForElement)
        {
           element.style.left = Math.round(controlsLeft) + 'px';
        }

        // Update top if we're not snapped into position
        if(!this.data.snapYActive && !this.data.snapYActiveForElement)
        {
            element.style.top = Math.round(controlsTop) + 'px';
        }

        // Update dimensions
        element.style.width     = Math.round(data._p.cwid) + 'px';
        element.style.height    = Math.round(data._p.chgt) + 'px';

        if(data._p.prev.angle != data.angle || data._p.prev.controls != data._p.controls)
        {
            if(data.angle < 0)
            {
                data.angle += 360;
            }

            if(parseInt(data.angle) > 360)
            {
                data.angle -= 360;
            }

            if(this.data.transformAction == 'rotation')
            {
                var degreeHelper    = context.selectors.degreesHelper.get(0),
                    transform       = "translate3d(0px, 0px, 0px) rotatez(" + (-data.angle) + "deg)";

                this.setContainerOctant(data.angle);

                degreeHelper.innerHTML = (parseInt(data.angle) + String.fromCharCode(176));

                this._setTransform(degreeHelper, transform);
            }
        }
    },

    /**
     * Apply Translations to Selected Layers
     *
     * @param {Object} data
     * @private
     */
    _applyTranslationsToLayers: function(data)
    {        
        var selectedElement     = FTXCanvas.getSelectedLayers(false, true),
            selectedLayers      = FTXCanvas.getSelectedLayers(false, true),
            selectedCount       = selectedLayers.length,
            context             = this,
            xDifference, yDifference, element, t, l;
        
        // Set element variable to DOM attribute of settings
        element = data._p.dom;                

        t = Math.round((data.y + data._p.height * (1 - data.scaley) / 2) >> 0);
        l = Math.round((data.x + data._p.width * (1 - data.scalex) / 2) >> 0);

        if(FTXCanvasGuides.isElementGuide(element) && !FTXCanvasGuides.isElementGuideSelected(element) && selectedCount > 0)
        {
            FTXCanvasGuides.deselectAllGuides();
        }

        // If multiple layers are selected
        if(selectedCount > 1 && (FTXCanvasGuides.isElementGuideSelected(element) || element.classList.contains('ft-controls')))
        {
            if(context.data.snapYActive || context.data.snapYActiveForElement || context.data.snapHActive || context.data.snapHActiveForElement)
            {
                t = Math.round((parseInt(element.style.top) + data._p.height * (1 - data.scaley) / 2) >> 0);
                l = Math.round((parseInt(element.style.left) + data._p.width * (1 - data.scalex) / 2) >> 0);
            }

            xDifference = Math.round((data._p.prev.left ? l - data._p.prev.left : l));
            yDifference = Math.round((data._p.prev.top ? t - data._p.prev.top : t));

            for(var i = 0; i <selectedLayers.length; i++)
            {
                var selectedLayer           = jQuery(selectedLayers[i]),
                    selectedEl              = selectedLayer.get(0),
                    selectedElementData     = selectedLayer.data('freetrans');

                if(FTXCanvasGuides.isElementGuide(selectedEl))
                {
                    if(!context.data.snapYActive && !context.data.snapYActiveForElement)
                    {
                        FTXCanvasGuides.setElementTransform(selectedLayer, {
                            'top':  selectedElementData.y + yDifference
                        });
                    }

                    if(!context.data.snapHActive && !context.data.snapHActiveForElement)
                    {
                        FTXCanvasGuides.setElementTransform(selectedLayer, {
                            'left': selectedElementData.x + xDifference
                        });
                    }
                }
                else
                {
                    if(!context.data.snapYActive && !context.data.snapYActiveForElement)
                    {
                        selectedEl.style.top = selectedElementData.y + yDifference + 'px';
                    }

                    if(!context.data.snapHActive && !context.data.snapHActiveForElement)
                    {
                        selectedEl.style.left = selectedElementData.x + xDifference + 'px';
                    }
                }

                if(!context.data.snapYActive && !context.data.snapYActiveForElement)
                {
                    context.setElementSettings(selectedLayer, {
                        y: selectedElementData.y + yDifference
                    });
                }

                if(!context.data.snapHActive && !context.data.snapHActiveForElement)
                {
                    context.setElementSettings(selectedLayer, {
                        x: selectedElementData.x + xDifference
                    });
                }
            }
        }
        // If nothing (in case of jQuery UI drag) or only 1 layer is selected
        else
        {
            context.selectors.controls.data('attachedLayers', selectedElement);
            
            // If image is drag allow user to add image to grid.
            var gridLayer           = FTXCanvasGrid.getGridLayerObj(),
                selectedLayerType   = FTXCanvas.getSelectedLayerType();

            if(gridLayer && (selectedLayerType == "image" || element.classList.contains('slide_layer_type_image')))
            {                    
                var gridItems           = gridLayer.grid.items,                    
                    imageLayerElement   = selectedElement,
                    isCollision         = false,
                    gridItemElement, gridItemElementRect, gridItemContent, SelectedLayerId, selectedLayerObj;

                if(selectedCount === 1 && element.classList.contains('ft-controls'))
                {
                    SelectedLayerId     = FTXCanvas.getSelectedLayerId();                    
                    imageLayerElement   = selectedElement.get(0);
                }
                else 
                {
                    SelectedLayerId     = FTXCanvas.getLayerIdFromElement(element);                    
                    imageLayerElement   = element;
                }
                
                selectedLayerObj    = FTXCanvas.getLayerById(SelectedLayerId);

                _.each(gridItems, function(gridItem)
                {
                    gridItemElement     = document.getElementById('grid_item_' + gridItem.itemId);
                    gridItemElementRect = gridItemElement.getBoundingClientRect();
                    gridItemContent     = gridItemElement.querySelector('.content');

                    if(data.clientX >= gridItemElementRect.left && data.clientX <= gridItemElementRect.right && data.clientY >= gridItemElementRect.top && data.clientY <= gridItemElementRect.bottom)
                    {
                        if(selectedLayerObj.image.imageType === 'dp-comp-image')
                        {
                            gridItemContent.innerHTML = '<img src="'+ selectedLayerObj.image.original +'">';
                        }
                        else
                        {
                            gridItemContent.innerHTML = '<img src="'+ selectedLayerObj.image.assetSource +'">';
                        }

                        isCollision = true;
                    }
                    else if(gridItem.hasOwnProperty('image') && gridItem.image)
                    {
                        if(gridItem.image.imageType === 'dp-comp-image')
                        {
                            gridItemContent.innerHTML = '<img src="'+ gridItem.image.original +'">';
                        }
                        else
                        {
                            gridItemContent.innerHTML = '<img src="'+ gridItem.image.assetSource +'">';
                        }
                    }
                    else
                    {
                        gridItemContent.innerHTML = '<div class="replacement"></div>';
                    }
                });

                if(isCollision)
                {
                    imageLayerElement.style.opacity = '0';
                    context.selectors.controls.get(0).style.opacity = '0';
                }
                else
                {
                    imageLayerElement.style.opacity = selectedLayerObj.opacity;
                    context.selectors.controls.get(0).style.opacity = '1';
                }
            }            

            var currentElement = jQuery(element);

            if(FTXCanvasGuides.isElementGuide(element))
            {
                if(!context.data.snapYActive && !context.data.snapYActiveForElement)
                {
                    FTXCanvasGuides.setElementTransform(jQuery(element), {
                        'top': t
                    });

                    context.setElementSettings(currentElement, {
                        y: t
                    });
                }

                if(!context.data.snapHActive && !context.data.snapHActiveForElement)
                {
                    FTXCanvasGuides.setElementTransform(currentElement, {
                        'left': l
                    });

                    context.setElementSettings(currentElement, {
                        x: l
                    });
                }
            }
            else
            {            
                // If there is a shift needed in top, shift elements accordingly
                if(t != data._p.prev.top)
                {
                    // Shift element top position
                    if(!element.classList.contains('ft-controls') && (!this.data.snapYActive && !this.data.snapYActiveForElement))
                    {
                        element.style.top = t + 'px';

                        context.setElementSettings(jQuery(element), {
                            y: t
                        });
                    }

                    // If we have a single layer, move top at the same rate as multiSelect
                    if(selectedCount == 1 && (!this.data.snapYActive && !this.data.snapYActiveForElement)  && element.classList.contains('ft-controls'))
                    {
                        selectedElement.get(0).style.top = t + 'px';

                        context.setElementSettings(selectedElement, {
                            y: t
                        });
                    }
                }

                // If there is a change needed in left, shift elements accordingly
                if(l != data._p.prev.left)
                {
                    // Shift element left position
                    if(!element.classList.contains('ft-controls') && (!this.data.snapHActive && !this.data.snapHActiveForElement))
                    {
                        element.style.left = l + 'px';

                        context.setElementSettings(jQuery(element), {
                            x: l
                        });
                    }

                    // If we have a single layer, move left at the same rate as multiSelect
                    if(selectedCount == 1 && (!this.data.snapHActive && !this.data.snapHActiveForElement) && element.classList.contains('ft-controls'))
                    {
                        selectedElement.get(0).style.left = l + 'px';

                        context.setElementSettings(selectedElement, {
                            x: l
                        });
                    }
                }
            }
        }

        // Store current left and right position in prev property of settings
        data._p.prev.top    = t;
        data._p.prev.left   = l;
    },

    /**
     * Apply Rotation
     *
     * If rotation is needed and the previous angles OR scales don't match
     * then generate a new matrix and create TRANSFORM property to apply.
     * (Rotation will only be applied for controls and single layer selected)
     *
     *  @param {HTMLElement|jQuery} sel
     *  @param {HTMLElement|jQuery} element (This will always be controls)
     *  @param data
     */
    _applyRotation: function(sel, element, data)
    {
        var selectedLayer          = FTXCanvas.getSelectedLayers(true, true),
            numberOfSelectedLayers = FTXCanvas.getSelectedLayerCount(true, true),
            selectedLayerElement, transform;

        // If angle has been changed
        if(data.angle != data._p.prev.angle || data.scalex != 1 || data.scaley != 1)
        {
            var matrix = Matrix();

            if(data.angle)
            {
                matrix = matrix.rotate(data._p.rad, this._getRotationPoint(sel));

                data._p.prev.angle = data.angle;
            }

            transform = this._matrixToCSS(matrix);
        }
        else if(data.angle == data._p.prev.angle)
        {
            var controlsSettings    = this.selectors.controls.data('freetrans');
                transform           = controlsSettings._p.prev.matrix;
        }
        else
        {
            transform = "matrix(1,0,0,1,0,0);";
        }
        
        // Set the matrix to prev property of controls settings
        data._p.prev.matrix = transform;

        // Apply this transformation to controls
        this._setTransform(element, transform);

        // Apply this transformation to selected layer
        if(numberOfSelectedLayers == 1 && selectedLayer)
        {
            selectedLayerElement = selectedLayer.get(0);

            this._setTransform(selectedLayerElement, transform);
        }
        else if(numberOfSelectedLayers > 1 && jQuery('#selectedWrapper').length > 0)
        {
            this._setTransform(jQuery('#selectedWrapper').get(0), transform);
        }
    },

    /**
     * Scale Selected Layers
     *
     * @param {Object}
     */
    _applyScale: function(data)
    {
        var context                 = this,
            numberOfSelectedLayers  = FTXCanvas.getSelectedLayerCount(true, true),
            selectedLayers          = FTXCanvas.getSelectedLayers(true, true),
            initialContainerInfo    = context.data.initialContainerInfo,
            currentHandle           = context.data.currentResizeHandle,
            layer, layerId, dimensions, layerFreetransData, widthDiff, heightDiff, initialTranslations;

        // If at least one layer is selected
        if(numberOfSelectedLayers > 0)
        {
            // If selected count is 1, we resize normally based on container
            if(numberOfSelectedLayers == 1)
            {
                layer = FTXCanvas.getSelectedLayers(true, true);

                // Build dimensions to apply to layer
                dimensions  = {
                    top:    data.y + data._p.height * (1 - data.scaley),
                    left:   data.x + data._p.width * (1 - data.scalex),
                    width:  data._p.cwid,
                    height: data._p.chgt,
                    scalex: data.scalex,
                    scaley: data.scaley,
                    _p:     data._p
                };

                // Apply scale to single layer
                this.applyScaleToLayer(layer, dimensions, data);
            }
            else
            {
                // Grab the total width and height differences in this transaction
                widthDiff  = (initialContainerInfo.width * data.scalex) - initialContainerInfo.width;
                heightDiff = (initialContainerInfo.height * data.scaley) - initialContainerInfo.height;

                for(var i = 0; i < selectedLayers.length; i++)
                {
                    var layerX, layerY;

                    layer               = jQuery(selectedLayers[i]);
                    layerId             = FTXCanvas.getLayerIdFromElement(layer);
                    layerFreetransData  = layer.data('freetrans');

                    var initialLayerInfo    = layer.data('preResize'),
                        initialRatio        = initialLayerInfo.layerRatios;
                        initialTranslations = initialLayerInfo.freeTrans;

                    var leftWidthRatio          = widthDiff * initialRatio.left,
                        topHeightRatio          = heightDiff * initialRatio.top,
                        rightWidthRatio         = widthDiff * (initialRatio.width + initialRatio.right),
                        bottomHeightRatio       = heightDiff * (initialRatio.height + initialRatio.bottom),
                        rightLeftWidthRatio     = (rightWidthRatio - leftWidthRatio) / 2,
                        bottomTopHeightRatio    = (bottomHeightRatio - topHeightRatio) / 2;

                    // If alt key is pressed, we use a special condition to calculate movement of layers
                    if(context.data.altKey)
                    {
                        layerX = initialTranslations.x - rightLeftWidthRatio;
                        layerY = initialTranslations.y - bottomTopHeightRatio;

                        if(currentHandle.is(context.selectors.scalers.tc))
                        {
                            if(context.data.shiftKey)
                            {
                                layerY = initialTranslations.y - bottomHeightRatio;
                            }
                        }
                        else if(currentHandle.is(context.selectors.scalers.mr))
                        {
                            if(context.data.shiftKey)
                            {
                                layerX = initialTranslations.x + leftWidthRatio;
                            }
                        }
                        else if(currentHandle.is(context.selectors.scalers.bc))
                        {
                            if(context.data.shiftKey)
                            {
                                layerY = initialTranslations.y + topHeightRatio;
                            }
                        }
                        else if(currentHandle.is(context.selectors.scalers.ml))
                        {
                            if(context.data.shiftKey)
                            {
                                layerX = initialTranslations.x - rightWidthRatio;
                            }
                        }
                    }
                    // If not using alt key, and handle is found
                    else if(currentHandle)
                    {
                        // Corner conditions
                        if(currentHandle.is(context.selectors.scalers.br))
                        {
                            layerX = initialTranslations.x + leftWidthRatio;
                            layerY = initialTranslations.y + topHeightRatio;
                        }
                        else if(currentHandle.is(context.selectors.scalers.bl))
                        {
                            layerX = initialTranslations.x - rightWidthRatio;
                            layerY = initialTranslations.y + topHeightRatio;
                        }
                        else if(currentHandle.is(context.selectors.scalers.tr))
                        {
                            layerX = initialTranslations.x + leftWidthRatio;
                            layerY = initialTranslations.y - bottomHeightRatio;
                        }
                        else if(currentHandle.is(context.selectors.scalers.tl))
                        {
                            layerX = initialTranslations.x - rightWidthRatio;
                            layerY = initialTranslations.y - bottomHeightRatio;
                        }

                        // Center conditions
                        else if(currentHandle.is(context.selectors.scalers.tc))
                        {
                            layerX = initialTranslations.x - rightWidthRatio;
                            layerY = initialTranslations.y - bottomHeightRatio;

                            if(context.data.shiftKey)
                            {
                                layerX = initialTranslations.x - rightLeftWidthRatio;
                            }
                        }
                        else if(currentHandle.is(context.selectors.scalers.mr))
                        {
                            layerX = initialTranslations.x + leftWidthRatio;
                            layerY = initialTranslations.y - bottomHeightRatio;

                            if(context.data.shiftKey)
                            {
                                layerY = initialTranslations.y - bottomTopHeightRatio;
                            }
                        }
                        else if(currentHandle.is(context.selectors.scalers.bc))
                        {
                            layerX = initialTranslations.x - rightWidthRatio;
                            layerY = initialTranslations.y + topHeightRatio;

                            if(context.data.shiftKey)
                            {
                                layerX = initialTranslations.x - rightLeftWidthRatio;
                            }
                        }
                        else if(currentHandle.is(context.selectors.scalers.ml))
                        {
                            layerX = initialTranslations.x - rightWidthRatio;
                            layerY = initialTranslations.y - bottomHeightRatio;

                            if(context.data.shiftKey)
                            {
                                layerY = initialTranslations.y - bottomTopHeightRatio;
                            }
                        }
                    }

                    // Calculate the width and height based on the boxes ratio to container
                    var layerWidth  = initialRatio.width * data._p.cwid,
                        layerHeight = initialRatio.height * data._p.chgt;

                    // Build dimensions to set on element
                    dimensions  = {
                        scalex: data.scalex,
                        scaley: data.scaley,
                        top:    layerY,
                        left:   layerX,
                        width:  layerWidth,
                        height: layerHeight,
                        _p:     {
                            prev: {
                                width:  layerFreetransData._p.width,
                                height: layerFreetransData._p.height
                            }
                        }
                    };

                    // Apply scale to layer
                    context.applyScaleToLayer(layer, dimensions, data);
                }
            }

            data._p.prev.width  = data._p.cwid;
            data._p.prev.height = data._p.chgt;
        }
    },

    /**
     * Apply scaling to a group elements
     *
     * @param {HTMLElement|jQuery} groupLayer
     * @param {Object} data
     * @param {Number} groupTop
     * @param {Number} groupLeft
     * @returns void
     */
    applyScaleToGroupItems: function(groupLayer, data, groupTop, groupLeft)
    {                
        var context                 = this,
            groupId                 = FTXCanvas.getGroupIdFromLayer(groupLayer),
            groupItems              = FTXCanvas.getLayersFromGroup(groupId),
            initialContainerInfo    = context.data.initialContainerInfo,
            currentHandle           = context.data.currentResizeHandle;

        if(groupItems && groupItems.length)
        {
            for(var i = 0; i < groupItems.length; i++)
            {                                            
                var groupItem               = jQuery(groupItems[i]),
                    itemFreetransData       = groupItem.data('freetrans'),
                    initialItemInfo         = groupItem.data('preResize'),
                    initialItemRatio        = initialItemInfo.layerRatios,
                    initialItemTranslations = initialItemInfo.freeTrans,
                    itemX, itemY;                                
                                                    
                if(currentHandle)
                {
                    itemX = initialItemTranslations.x * data.scalex;
                    itemY = initialItemTranslations.y * data.scaley;
                }

                // Calculate the width and height based on the boxes ratio to container
                var itemWidth  = initialItemRatio.width * data._p.cwid,
                    itemHeight = initialItemRatio.height * data._p.chgt;

                // Build dimensions to set on element
                var itemDimensions  = {
                    scalex: data.scalex,
                    scaley: data.scaley,
                    top:    itemY,
                    left:   itemX,
                    width:  itemWidth,
                    height: itemHeight,
                    _p:     {
                        prev: {
                            width:  itemFreetransData._p.width,
                            height: itemFreetransData._p.height
                        }
                    }
                };

                // Apply scale to layer
                context.applyScaleToLayer(groupItem, itemDimensions, data, false);

                context.setElementSettings(groupItem, {
                    x:      initialItemTranslations.x + groupLeft + ( itemX - initialItemTranslations.x),
                    y:      initialItemTranslations.y + groupTop + ( itemY - initialItemTranslations.y),
                    _p: {
                        width:  itemDimensions.width,
                        height: itemDimensions.height,
                        cwid:   itemDimensions.width,
                        chgt:   itemDimensions.height,
                        prev:   itemDimensions._p.prev
                    }
                });
            }
        }        
    },

    /**
     * Apply Scaling to a Particular Element
     *
     * @param {HTMLElement|jQuery} layer
     * @param {Object} dimensions
     * @param {Object} data
     * @param {Boolean|Optional} skipSettingsUpdate
     * @returns void
     */
    applyScaleToLayer: function(layer, dimensions, data, skipSettingsUpdate)
    {
        var top             = Math.round(dimensions.top),
            left            = Math.round(dimensions.left),
            width           = dimensions.width,
            height          = dimensions.height,
            layerId         = FTXCanvas.getLayerIdFromElement(layer),
            layerData       = FTXCanvas.getLayerById(layerId),
            layerType       = layerData.layerType,
            layerElement    = layer.get(0),
            context         = this;

        layerElement.style.top    = top + 'px';
        layerElement.style.left   = left + 'px';

        switch(layerType)
        {
            case 'text':

                context.scaleFont(layerElement, dimensions.scalex);

                break;

            case 'icon':

                context.scaleFont(layerElement, dimensions.scalex);

                break;

            case 'image':

                var imageEl = layerElement.getElementsByTagName('img');
                
                layerElement.style.width    = width + 'px';
                layerElement.style.height   = height + 'px';

                if(!imageEl.length)
                {
                    break;
                }
                
                if(layerData.image && layerData.image.dimensions && layerData.image.position)
                {
                    var widthDiff   = ((width - layerData.dimensions.width) / layerData.dimensions.width);
                    var heightDiff  = ((height - layerData.dimensions.height) / layerData.dimensions.height);

                    var newHeight   = layerData.image.dimensions.height + (layerData.image.dimensions.height * heightDiff),
                        newWidth    = layerData.image.dimensions.width + (layerData.image.dimensions.width * widthDiff),
                        newTop      = layerData.image.position.top + (layerData.image.position.top * heightDiff),
                        newLeft     = layerData.image.position.left + (layerData.image.position.left * widthDiff);

                    imageEl[0].style.width  = newWidth + 'px';
                    imageEl[0].style.height = newHeight + 'px';
                    imageEl[0].style.top    = newTop + 'px';
                    imageEl[0].style.left   = newLeft + 'px';
                }
                else
                {
                    imageEl[0].style.width  = width + 'px';
                    imageEl[0].style.height = height + 'px';
                }

                break;

            case 'shape':

                var svgEl = layerElement.getElementsByTagName('svg');

                if(svgEl.length)
                {
                    var svg = new SVG(svgEl[0]);

                    svg.width(width);
                    svg.height(height);
                }

                break;
            
            case 'group':
                
                if(layerElement)
                {                        
                    layerElement.style.width  = width + 'px';
                    layerElement.style.height = height + 'px';                        
                }

                context.applyScaleToGroupItems(layer, data, top, left);                

                break;
                
            case 'grid':
                
                if(layerElement)
                {
                    var gridRows = layerElement.querySelector('.rows');
                    gridRows.style.width  = width + 'px';
                    gridRows.style.height = height + 'px';                                            
                }
                break;
            
                case 'gradient':
                
                if(layerElement)
                {                    
                    var gradient = layerElement.querySelector('.gradient');

                    gradient.style.width  = width + 'px';
                    gradient.style.height = height + 'px';
                }
                break;
        }

        if(skipSettingsUpdate)
        {
            return;
        }

        this.setElementSettings(layer, {
            x:      left,
            y:      top,
            scalex: dimensions.scalex,
            scaley: dimensions.scalex,
            _p: {
                width:  dimensions.width,
                height: dimensions.height,
                cwid:   dimensions.width,
                chgt:   dimensions.height,
                prev:   dimensions._p.prev
            }
        });
    },

    /**
     * Convert Matrix Object to CSS
     *
     * @param {Object} matrix
     * @returns {String}
     * @private
     */
    _matrixToCSS: function(matrix)
    {
        if(String(matrix.a).length > 8) matrix.a = Number(matrix.a).toFixed(8);
        if(String(matrix.b).length > 8) matrix.b = Number(matrix.b).toFixed(8);
        if(String(matrix.c).length > 8) matrix.c = Number(matrix.c).toFixed(8);
        if(String(matrix.d).length > 8) matrix.d = Number(matrix.d).toFixed(8);
        if(String(matrix.tx).length > 8) matrix.tx = Number(matrix.tx).toFixed(8);
        if(String(matrix.ty).length > 8) matrix.ty = Number(matrix.ty).toFixed(8);

        return "matrix(" + matrix.a + "," + matrix.b + "," + matrix.c + "," + matrix.d + "," + matrix.tx + "," + matrix.ty + ")";
    },

    /**
     * Scale Font
     *
     * @param {HTMLElement|jQuery} element
     * @param {Number} scale
     * @returns {String}
     */
    scaleFont: function(element, scale)
    {
        var layer       = jQuery(element),
            layerData   = layer.data('preResize'),
            fontSize    = layerData.font.fontSize;

        var newSize = Math.round((parseFloat(fontSize) * scale)) + "%";

        element.style.fontSize = newSize;

        return newSize;
    },

    /**
     * Set Layer Rotation (Manual)
     *
     * @param {HTMLElement|jQuery} element
     * @param {Number} angle
     */
    setLayerRotation: function(element, angle)
    {
        var matrix      = Matrix(),
            radian      = angle * rad;

        this.setDefaultSettingsIfNotExist(element);

        this.setElementSettings(element, {
            angle: angle,
            _p: {
                rad: radian
            }
        });

        matrix = matrix.rotate(radian, this._getRotationPoint(element));

        var transform = this._matrixToCSS(matrix);

        if(transform)
        {
            this._setTransform(element.get(0), transform);
        }
    },

    /**
     * Set Container Octant
     *
     * @param {Number} angle
     */
    setContainerOctant: function(angle)
    {
        var controls    = this.selectors.controls,
            octant      = null;

        this.removeContainerOctant();

        if(angle >= 45 && angle < 90)
        {
            octant = 'octant1';
        }
        else if(angle >= 90 && angle < 135)
        {
            octant = 'octant2';
        }
        else if(angle >= 135 && angle < 180)
        {
            octant = 'octant3';
        }
        else if(angle >= 180 && angle < 225)
        {
            octant = 'octant4';
        }
        else if(angle >= 225 && angle < 270)
        {
            octant = 'octant5';
        }
        else if(angle >= 270 && angle < 315)
        {
            octant = 'octant6';
        }
        else if(angle >= 315 && angle < 360)
        {
            octant = 'octant7';
        }

        if(octant)
        {
            controls.addClass(octant);
        }
    },

    /**
     * Remove Container Octant
     *
     */
    removeContainerOctant: function()
    {
        this.selectors.controls.get(0).classList.remove('octant0', 'octant1', 'octant2', 'octant3', 'octant4', 'octant5', 'octant6', 'octant7', 'octant8');
    },

    /**
     * Get Element Rotation Angle
     *
     * @param {HTMLElement|jQuery} element
     * @returns {Number}
     */
    getElementRotationAngle: function(element)
    {
        var st = window.getComputedStyle(element, null),
            tr = st.getPropertyValue("-webkit-transform")   ||
                st.getPropertyValue("-moz-transform")       ||
                st.getPropertyValue("-ms-transform")        ||
                st.getPropertyValue("-o-transform")         ||
                st.getPropertyValue("transform")            ||
                "fail...";

        if(tr != 'none' && tr != 'fail...')
        {
            var values = tr.split('(')[1];
                values = values.split(')')[0];
                values = values.split(',');

            var a       = values[0],
                b       = values[1],
                scale   = Math.sqrt(a * a + b * b),
                sin     = b/scale;

            // Return angle
            return Math.round(Math.asin(sin) * (180 / Math.PI));
        }
    }
};
