/*  FTXCanvas Class - Prototype Based
 *  Justin Bevan
 *
 *--------------------------------------------------------------------------*/

var FTXCanvas =
{
    /**
     * Dom Utils
     *
     * @type {Null|DomUtils
     */
    domUtils: null,

    /**
     * Constructor
     *
     * @param params
     */
    init: function(params)
    {
        var context = this;

        this.domUtils = new DomUtils();

        if(typeof params !== 'undefined' && params !== false)
        {
            this.setParams(params);
        }

        this.setCanvasPadding(this.params.canvasOptions.canvasPadding);

        this.initiateFn();

        /* Bind Change Size Buttons (Temporary) */
        /*jQuery('.resolution').one('click', function(event)
        {
            context.setCanvasSize(jQuery(this).attr('data-width'), jQuery(this).attr('data-height'));
        });*/

        // Bind click event to close export modal
        this.selectors.export.closeExportSlide.on('click', function()
        {
            context.selectors.export.exportModal.modal('hide');
        });

        if(_.isEmpty(this.data.groupLayers))
        {
            this.data.groupLayers = _.filter(_.unique(_.pluck(FTXCanvas.layers, 'groupId')), function(obj)
            {
                return obj !== undefined && obj !== '';
            });
        }

        jQuery(window).load(function()
        {
            // Bind Canvas Post Render Events On Load
            context.bindCanvasPostRenderEvents();

            // Animate loader off screen
            context.hideMainLoader();

            if(moduleConfig['psdParsingMessage'] !== undefined && moduleConfig['psdParsingMessage'])
            {
                FTXCanvasImportFiles.showPsdParsingMessage(JSON.parse(moduleConfig['psdParsingMessage']));
            }

            // Clear all selection after page load
            FTXCanvas.clearAllSelection();

            // clearTimeout(FTXCanvas.data.actionTimer);

            if(typeof FTXCanvasAnimation !== 'undefined')
            {
                FTXLayerPanel.updateAllLayerSlidersByFactor(FTXCanvas.params.animationTimelineFactor);
            }

            jQuery(".addPerfectScrollBar ul").perfectScrollbar();

            toastr.options.preventDuplicates = true;
            toastr.options.preventOpenDuplicates = true;

            FTXCanvasMagicResize.init();
            FTXHistoryPanel.init();
            CanvasMagicResizeHandler.init();
            context.autoSaveInitialise();
            FTXRevisionModal.init();
            FTXImageCrop.init();

            context.autoSaveDesign();

            // Initial Layers on Load
            var guideObjs       = FTXCanvasGuides.getGuidesById(FTXCanvasGuides.getAllGuideIds()),
                layerObjs       = FTXCanvas.getLayersArray();

            context.data.initialLayers         = layerObjs.concat(guideObjs);
            context.data.initialCanvasOptions  = context.recursiveMerge({}, FTXCanvas.params.canvasOptions);

            jQuery('.modal').on('shown.bs.modal', function()
            {
                keyboardJS.pause();
            }).on('hidden.bs.modal', function()
            {
                keyboardJS.resume();
            });

            FTXGradient.init();
            FTXCanvasImportFiles.init();
        });

        FTXCanvasDropFiles.init();

        ExportCanvasDesign.init();

        FTXCanvasSidebarTexts.init();
    },

    /**
     * Bind Canvas Post Render Events
     *
     * @return {void}
     */
    bindCanvasPostRenderEvents: function()
    {
        var layerIds    = this.getAllLayerIds(),
            totalLayers = layerIds.length,
            groupIds    = [];

        for(var i = 0; i <= totalLayers; i++)
        {
            if(typeof layerIds[i] !== 'undefined')
            {
                var layerId     = layerIds[i],
                    layerObj    = this.getLayerById(layerId),
                    layerEl     = this.getLayerElementById(layerId);

                if(typeof layerObj.rotation !== 'object' || layerObj.rotation === "0deg" )
                {
                    layerObj.rotation = this.layerDefaults.rotation;
                }

                if(layerObj.layerType === 'group')
                {
                    groupIds.push(layerId);
                }

                if(layerEl)
                {
                    FTXCanvasTransform._setDefaultSettings(layerEl);

                    if(layerEl && layerObj.layerType !== 'group')
                    {
                        this.refreshEvents(layerId, false);
                    }
                }
            }
        }

        for(var j = 0; j < groupIds.length; j++)
        {
            this.refreshGroupLayer(groupIds[j]);
        }

        // Reset layer Index
        this.resetLayerszIndex();
    },

    /**
     * Parameters
     */
    params: {
        canvasOptions: {
            canvasBackground: '',
            canvasDimensions: {
                width:  600,
                height: 450
            },
            sizeId      : null,
            sizeName    : null,
            outerCanvasDimensions: {
                width:  '',
                height: ''
            },
            canvasPadding: {
                top:    2000,
                bottom: 2000,
                left:   2000,
                right:  2000
            },
            startFullscreen: false,
            closeOnDocumentClick: false,
            zoomFitOnLoad: true
        },
        historyOptions: {
            maxSize: 1500
        },
        animationTimelineFactor : 10,
        lockDimensions          : false,
    },

    /**
     * Layers
     */
    layers: {},

    /**
     * Advertisements
     */
    advertisements: {},

    /**
     * Design Type
     */
    designType: null,

    /**
     * Temp Data
     */
    data: {
        previewMode:            false,
        clonedCanvas:           false,
        mediaUrl:               typeof assetBaseUrl !== 'undefined' ? assetBaseUrl + '/images/media-items/' : null,
        designId:               null,
        accountId:              null,
        saveUrl:                null,
        saveCloseUrl:           null,
        saveAsNewUrl:           null,
        exportUrl:              null,
        downloadUrl:            null,
        ajaxAdvertisementsURL:  '',
        selectedLayers:         [],
        selectedGroupLayers:    [],
        initialW:               false,
        initialH:               false,
        isEditing:              false,
        isRotating:             false,
        isMouseDragging:        false,
        spaceBarDown:           false,
        arrowKeyTimeout:        null,
        arrowKeyPreviousState:  null,
        previewCanvas:          null,
        triggerLoadItems:       true,
        completedCategories:    [],
        loadedFromDesignId:     null,
        autoSaveInitialised:    false,
        window:
        {
            width:  jQuery(window).width(),
            height: jQuery(window).height()
        },
        layerHistory:
        {
            history:          [],
            initialStates:    [],
            currentIndex:     '',
            currentState:     null,
            lastDirection:    null
        },
        clipBoard: {
            entries: []
        },
        zoomPreferences: {
            canvasZoom: 1,
            imageZoom: .75,
            scrollOffsets: {
                left: 0,
                top:  0
            },
            zoomLayerStates: {}
        },
        mouseDrag: {
            scrollValues:       {},
            originalPagePos:    {}
        },
        libraryMedia:           {},
        lastEditedTextId:       '',
        batchAmount:            15,
        text:                   '',
        groupLayers:            [],
        mergeGroup:             false,
        previousSelectionState: false,
        layersInGroup:          {},
        selectedGroups:         {},
        maxStartAnimationTime:  '',
        maxEndAnimationTime:    '',
        oldFactor:              0,
        isLayerFactored:        false,
        zoomToFitInitialize:    false,
        zoomStatus:             false,
        assetSaveUrl:           null,
        cornerElements:         ['left-top', 'right-top', 'right-bottom', 'left-bottom' ],
        allowedSizes: {},
        needMagicResizeConfirm: true,
        delayInAutoSave:        300000,
        actionTimer:            null,
        initialLayers:          [],
        initialCanvasOptions:   {},
        minCanvasWidthHeight:   200,
        maxCanvasWidthHeight:   5000,
    },

    /**
     * Selectors
     */
    selectors: {
        document:               jQuery(document),
        accountSelect:          document.getElementById('accAjCreateSlide'),
        masterWrapper:          document.getElementById('canvas-master-container'),
        editWrapper:            document.getElementById('thelayer-editor-wrapper'),
        masterTimeWrapper:      document.getElementById('mastertimer-wrapper'),
        divLayers:              document.getElementById('divLayers'),
        controls:               document.getElementById('ft-controls'),
        layersOuterWrapper:     document.getElementById('divLayers-wrapper'),
        layersInnerWrapper:     document.getElementById('divbgholder'),
        layersWrapperAll:       jQuery('.layers-wrapper'),
        rightLayerWrapper:      jQuery('#master-rightcell .layers-wrapper'),
        leftLayerWrapper:       jQuery('#master-leftcell .layers-wrapper'),
        canvasPaddWrapper:      document.getElementById('canvas-padding'),
        slideTitle:             document.getElementById('slideTitle'),
        newCategory:            document.getElementById('category_id'),
        templatePublishCheckbox:document.getElementById('templatePublishCheckbox'),
        designerTags:           jQuery("#designer_tags"),
        formGlobalPreferences:  jQuery('#form-global-preferences'),
        canvasSidebar:          document.getElementById('canvas-sidebar'),
        linearAxis: {
            horizontal:             document.getElementById('hor-css-linear'),
            horizontalLine:         document.getElementById('horlinie'),
            horizontalLineText:     document.getElementById('horlinetext'),
            horizontalText:         jQuery('#hor-css-linear .linear-texts'),
            horizontalOffset:       document.querySelector('.horizontal-helplines-offsetcontainer'),
            horizontalHelpLines:    jQuery('.horizontal-helplines-offsetcontainer .helplines'),
            vertical:               document.getElementById('ver-css-linear'),
            verticalLine:           document.getElementById('verlinie'),
            verticalLineText:       document.getElementById('verlinetext'),
            verticalText:           jQuery('#ver-css-linear .linear-texts'),
            verticalOffset:         document.querySelector('.vertical-helplines-offsetcontainer'),
            verticalHelpLines:      jQuery('.vertical-helplines-offsetcontainer .helplines')
        },
        loaders:
        {
            center: jQuery(".loading-center")
        },
        ghostSelect:    document.getElementById('ghost-select'),
        buttons: {
            fullScreen:             document.getElementById('fullscreen-toggle'),
            preview:                document.getElementById('render-preview'),
            save:                   document.getElementById('save-design'),
            saveClose:              document.getElementById('save-close-design'),
            saveNewDesign:          document.getElementById('save-new-design'),
            autoSaveToggle:         document.getElementById('autoSaveToggle'),
            export:                 document.getElementById('export-design'),
            import:                 document.getElementById('import-design'),
            close:                  document.getElementById('close-design'),
            redo:                   document.getElementById('redo'),
            undo:                   document.getElementById('undo'),
            zoomIn:                 document.getElementById('zoomIn'),
            zoomOut:                document.getElementById('zoomOut'),
            resetZoom:              document.getElementById('resetZoom'),
            snapToggle:             document.getElementById('toggleSnap'),
            downloadButton:         document.getElementById('download-button'),
            saveDropdownButton:     document.getElementById('save-dropdown-button'),
            downloadType:           document.querySelectorAll('.download-type-link'),
            savePreferences:        document.getElementById('save-preferences'),
            userPreferenceToggle:   jQuery('.toggleUserPreference'),
            clipCanvas:             document.getElementById('clip-canvas'),
            centerInWindow:         document.getElementById('window-in-center'),
            revisionsButton:        document.getElementById('saved-revisions'),
        },
        snapGuides: {
            snapX: jQuery('#guide-h'),
            snapY: jQuery('#guide-v')
        },
        keyboardPanel: {
            kbdToggle:  document.getElementById('kbd-toggle'),
            kbdClose:   jQuery('#kdb-close'),
            kbdPanel:   jQuery('#kbd-panel'),
            kdbScroll:  jQuery('#keyscroll')
        },
        optionsPanel: {
            optClose:   jQuery('#opt-close'),
            optPanel:   jQuery('#opt-panel')
        },
        zoomOptions: {
            zoomList:       jQuery('#zoomDropUp'),
            zoomSetters:    jQuery('.zoom-setter')
        },
        export: {
            exportModal:                jQuery('#exportSlideModal'),
            exportModalOption:          jQuery('#exportSlideModalOptions'),
            slideBox:                   jQuery('#main-export-slide-grid'),
            saveExport:                 jQuery('#save-export'),
            createSlide:                jQuery('#create-slide'),
            closeExportSlide:           jQuery('.action-close'),
            accountId:                  jQuery('#account_id'),
            title:                      jQuery('#title'),
            errorAccountId:             jQuery('.error_account_id'),
            errUpdateSlideAccountId:    jQuery('.update_slide_error_account_id'),
            errorTitle:                 jQuery('.error_title')
        },
        zoomAmt:        jQuery('#zoomAmt'),
        groupedIcon:    jQuery('#grouped-icon')
    },

    /**
     * Layer Defaults
     */
    layerDefaults:
    {
        layerId:    '',
        groupId:    '',
        alias:      '',
        layerType:  '',
        visible:    true,
        locked:     false,
        position: {
            x:  null,
            y:  null
        },
        dimensions: {
            height: '',
            width:  ''
        },
        animation: {
            animationIn:                '',
            animationOut:               '',
            animationOutEnabled:        0,
            animationTimingStart:       '',
            animationTimingEnd:         '',
            animationSpeedIn:           '',
            animationSpeedOut:          '',
            animationEasingIn:          '',
            animationEasingOut:         '',
            animationEasingContinuous:  '',
            animationContinuous:        '',
            animationContinuousSpeed:   ''
        },
        beforeGroupAnimationConfig: {},
        opacity:                1,
        blendMode:              'normal',
        layerFlip:              '',
        layerIndex:             1,
        beforeGroupLayerIndex:  '',
        layerScaleX:    '',
        layerScaleY:    '',
        svgParams: {
            content:      '',
            colorOptions: {}
        },
        layerText: '',
        layerName: '',
        layerTextOptions: {
            // fontFamily:     '',
            fontSize:       '100%',
            fontWeight:     '400',
            lineHeight:     '100%',
            letterSpacing:  '0em',
            textEffect:     'none'
        },
        image: {
            imageType:  '',
            galleryRel: '',
            imageSize: '',
            base64:     ''
        },
        rotation: {
            rad:    0,
            angle:  0
        },
        toolbar: ''
    },

    /**
     * Current Selection
     */
    currentSelection:
    {
        selectedLayersCount:    null,
        selectedLayersIds:      [],
        layersInitialInfo:      null,
        selectedLayerId:        null,
        selectedLayerType:      null,
        initialLayerObjs:       {}
    },

    /**
     * User Preferences
     */
    userPreferences: {},

    /**
     * Global Instances
     */
    FTXToolbar: null,

    /**
     * Set Params
     *
     * @param params
     */
    setParams: function(params)
    {
        this.params = jQuery.extend(true, this.params, {
            canvasOptions:
            {
                canvasBackground    : params.canvasOptions.canvasBackground,
                canvasDimensions    : params.canvasOptions.canvasDimensions,
                sizeId              : params.canvasOptions.sizeId,
                sizeName            : params.canvasOptions.sizeName,
            },
            animationTimelineFactor: params.animationTimelineFactor
        });
    },

    /**
     * Set Preview Mode
     *
     * @param mode
     */
    setPreviewMode: function(mode)
    {
        this.data.previewMode = mode;
    },

    /**
     * Is Preview Mode
     *
     * @returns {Boolean}
     */
    isPreview: function()
    {
        return this.data.previewMode;
    },

    /**
     * Set Design ID
     *
     * @param id
     */
    setDesign: function(id)
    {
        this.data.designId = id;
    },

    /**
     * Set Account ID
     *
     * @param id
     */
    setAccountId: function(id)
    {
        this.data.accountId              = id;
        this.data.completedCategories    = [];
        this.data.triggerLoadItems       = true;
        this.advertisements              = [];

        jQuery('#export-slide-grid').html('');
    },

    /**
     * Set Save Path
     *
     * @param url
     */
    setSaveUrl: function(url)
    {
        this.data.saveUrl = url;
    },

    /**
     * Set Save Close Path
     *
     * @param url
     */
    setSaveCloseUrl: function(url)
    {
        this.data.saveCloseUrl = url;
    },

    /**
     * Set Save As New URL
     *
     * @param url
     */
    setNewDesignUrl: function(url)
    {
        this.data.saveAsNewUrl = url;
    },

    /**
     * Set Save Export URL
     *
     * @param url
     */
    setSlideExportUrl: function(url)
    {
        this.data.exportUrl = url;
    },

    /**
     * Set Download URL
     *
     * @param url
     */
    setDownloadUrl: function(url)
    {
        this.data.downloadUrl = url;
    },

    /**
     * Set Load Slides Url
     *
     * @param url
     */
    setLoadSlidesUrl: function(url)
    {
        this.data.ajaxAdvertisementsURL = url;
    },

    /**
     * Set Background Class
     *
     * @param bgClass
     * @param history
     */
    setBackgroundClass: function(bgClass, history)
    {
        if(!this.selectors.divLayers)
        {
            return false;
        }

        var currentClassList    = this.selectors.divLayers.classList,
            oldBackground       = '';

        for(var i = 0; i < currentClassList.length; i++)
        {
            if(currentClassList[i] !== 'divLayers')
            {
                oldBackground += currentClassList[i];
                oldBackground += ' ';
            }
        }

        this.selectors.divLayers.className          = 'divLayers ' + bgClass;
        this.params.canvasOptions.canvasBackground  = bgClass;

        if(typeof history === 'undefined' || history)
        {
            var currentObj = {
                    type:   'background',
                    class:  bgClass
                },
                previousObj = {
                    type: 'background',
                    class: oldBackground
                };

            this.addLayerStateToHistory(currentObj, previousObj, 'Design Backgroud changed', 'background');
        }
    },

    /**
     * Set Advertisements
     *
     * @param advertisements
     */
    setAdvertisements: function(advertisements)
    {
        this.advertisements = advertisements;
    },

    /**
     * Set Asset Save URL
     *
     * @param url
     */
    setAssetSaveUrl: function(url)
    {
        this.data.assetSaveUrl = url;
    },

    /**
     * Set Canvas Size
     *
     * @param width
     * @param height
     */
    setCanvasSize: function(width, height)
    {
        var innerWrapper    = this.selectors.layersInnerWrapper,
            divLayers       = this.selectors.divLayers;

        if(!innerWrapper || !divLayers)
        {
            return false;
        }

        innerWrapper.style.width    = parseInt(width) + 'px';
        innerWrapper.style.height   = parseInt(height) + 'px';

        divLayers.style.width    = parseInt(width) + 'px';
        divLayers.style.height   = parseInt(height) + 'px';

        this.updateScrollbars();
        this.shiftRulers();

        this.params.canvasOptions.canvasDimensions = {
            width:  width,
            height: height
        }
    },

    /**
     * Show Main Loader
     *
     */
    showMainLoader: function()
    {
        this.selectors.loaders.center.fadeIn("slow");
    },

    /**
     * Show Main Loader
     *
     */
    hideMainLoader: function()
    {
        this.selectors.loaders.center.fadeOut("slow");
    },

    /**
     * Initialize Rulers
     *
     */
    initiateRulers: function()
    {
         for(var h = -2000; h < 3000; h = h + 100)
         {
             this.selectors.linearAxis.horizontalText.append('<li><span class="ruler-increment" data-inc-default="'+h+'">'+h+'</span></li>');
         }

         for(var v = -2000 ; v < 3000; v = v + 100)
         {
             this.selectors.linearAxis.verticalText.append('<li><span class="ruler-increment" data-inc-default="'+v+'">'+v+'</span></li>');
         }

         this.shiftRulers();
         this.initializeRulerMovement();
         FTXCanvasGuides.addGuideBindings();
    },

    /**
     * Shift Rulers to Left of Canvas
     *
     */
    shiftRulers: function()
    {
        var divLayersOffset     = this.getElementOffset(this.selectors.divLayers),
            editWrapperOffset   = this.getElementOffset(this.selectors.editWrapper),
            left                = parseInt(divLayersOffset.left, 0) - parseInt(editWrapperOffset.left, 0),
            top                 = parseInt(divLayersOffset.top, 0) - parseInt(editWrapperOffset.top, 0) - 30;

        this.selectors.linearAxis.horizontal.style.backgroundPosition = (left) + "px 50%";

        this.selectors.linearAxis.horizontalText.css({
            left: (left - 1995) + "px"
        });

        this.selectors.linearAxis.horizontalOffset.style.left = left + 'px';

        this.selectors.linearAxis.vertical.style.backgroundPosition = "100px " + top +"px";

        this.selectors.linearAxis.verticalText.css({
            top: (top - 2000) + "px"
        });

        this.selectors.linearAxis.verticalOffset.style.top = (top + 30) + "px";

        this.selectors.linearAxis.horizontalHelpLines.css({
            left: "-15px"}
        ).width(this.selectors.editWrapper.outerWidth - 35);

        this.selectors.linearAxis.verticalHelpLines.css({
            top: "-15px"}).height(this.selectors.editWrapper.outerHeight - 41 );
    },

    /**
     * Initialize Ruler Movement
     *
     */
    initializeRulerMovement: function()
    {
        var context = this;

        jQuery(document).on('ps-scroll-x ps-scroll-y', function ()
        {
            context.shiftRulers();
        });

        // Body mousemove, set ruler values
        this.selectors.editWrapper.onmousemove = function(event)
        {
            var editWrapper         = this,
                divLayers           = context.selectors.divLayers,
                editWrapperOffset   = context.getElementOffset(editWrapper),
                divLayersOffset     = context.getElementOffset(divLayers),
                mx                  = event.pageX - editWrapperOffset.left,
                my                  = event.pageY - editWrapperOffset.top,
                left                = parseInt(divLayersOffset.left, 0) - parseInt(editWrapperOffset.left, 0),
                top                 = parseInt(divLayersOffset.top, 0) - parseInt(editWrapperOffset.top, 0),
                zoomVal             = context.getZoomValue();

            context.selectors.linearAxis.verticalLine.style.left = mx + "px";
            context.selectors.linearAxis.horizontalLine.style.top = my + "px";

            context.selectors.linearAxis.verticalLineText.innerHTML     = (Math.round((mx - left) / zoomVal));
            context.selectors.linearAxis.horizontalLineText.innerHTML   = (Math.round((my - top) / zoomVal));

            context.selectors.linearAxis.horizontalOffset.dataset.x = event.pageX - context.getElementOffset(context.selectors.linearAxis.horizontalOffset).left;
            context.selectors.linearAxis.verticalOffset.dataset.y   = my;
        };
    },

    /**
     * Initialize Toolbar Bindings
     *
     */
    initializeToolbarBindings: function()
    {
        var context = this;

        this.selectors.buttons.fullScreen.onclick = function()
        {
            context.toggleFullScreen();
        };

        this.selectors.buttons.clipCanvas.onclick = function()
        {
            context.toggleClipCanvas();
        };

        this.selectors.buttons.preview.onclick = function()
        {
            context.renderPreview();
        };

        this.selectors.buttons.centerInWindow.onclick = function()
        {
            context.resetCanvas();
        };

        this.selectors.document.on('webkitfullscreenchange mozfullscreenchange fullscreenchange', function(e)
        {
            context.fullScreenChangeEvents();
        });

        this.selectors.buttons.save.onclick = function(event)
        {
            jQuery(context.selectors.buttons.saveDropdownButton).dropdown('toggle');
            context.saveDesign();
        };

        this.selectors.buttons.saveClose.onclick = function(event)
        {
            jQuery(context.selectors.buttons.saveDropdownButton).dropdown('toggle');
            context.saveCloseDesign();
        };

        this.selectors.buttons.saveNewDesign.onclick = function(event)
        {
            jQuery(context.selectors.buttons.saveDropdownButton).dropdown('toggle');
            context.saveNewDesign();
        };

        this.selectors.buttons.autoSaveToggle.onclick = function(event)
        {
            if(this.classList.contains('active'))
            {
                this.classList.remove('active');
                Cookies.set('autoSaveEnable', 0);
                clearInterval(FTXCanvas.data.actionTimer);
            }
            else
            {
                this.classList.add('active');
                Cookies.set('autoSaveEnable', 1);
                context.autoSaveDesign();
            }
        };

        if(this.selectors.buttons.export != null)
        {
            this.selectors.buttons.export.onclick = function(event)
            {
                var dpCompOrCartItem = FTXStockPhotosCart.getCompOrCartListInDesign();

                if(dpCompOrCartItem && dpCompOrCartItem.constructor == Array && dpCompOrCartItem.length > 0)
                {
                    return swal({
                        title               : "Alert",
                        text                : "There are some premium elements in your Cart.",
                        type                : "warning",
                        showCancelButton    : true,
                        confirmButtonColor  : "#DD6B55",
                        cancelButtonColor   : "#337ab7",
                        cancelButtonIcon    : "fas fa-lock",
                        confirmButtonText   : "<i class='fal fa-times'></i> Discard Cart Items ",
                        cancelButtonText    : '<span class="close-prompt-cart-count fa-stack fa-2x " data-count="'+ dpCompOrCartItem.length +'"> <i class="fa fa-shopping-cart fa-stack-1x" ></i></span> Open Cart '
                    }).then(function()
                    {
                        FTXStockPhotosCart.clearFullCart(true);
                        ExportCanvasDesign.openExportModal();
                    }).catch(function()
                    {
                        FTXStockPhotosCart.openCartPrompt('cart');
                    });
                }

                ExportCanvasDesign.openExportModal();
            };
        }

        if(this.selectors.buttons.import != null)
        {
            this.selectors.buttons.import.onclick = function(event)
            {
                FTXCanvasImportFiles.openImportModal();
            }
        }

        if(this.selectors.buttons.close != null)
        {
            this.selectors.buttons.close.onclick = function(event)
            {
                var dpCompOrCartItem    = FTXStockPhotosCart.getCompOrCartListInDesign(),
                    clientOS            = FTXCanvasUtils.data.clientOS,
                    clientIsMacOS       = clientOS == 'MacOS';

                if(dpCompOrCartItem && dpCompOrCartItem.constructor === Array && dpCompOrCartItem.length > 0)
                {
                    return swal({
                        title               : "Alert",
                        text                : "There are some premium elements in your Cart.",
                        type                : "warning",
                        showCancelButton    : true,
                        confirmButtonColor  : "#DD6B55",
                        cancelButtonColor   : "#337ab7",
                        cancelButtonIcon    : "fas fa-lock",
                        confirmButtonText   : "<i class='fal fa-times'></i> Discard Cart Items ",
                        cancelButtonText    : '<span class="close-prompt-cart-count fa-stack fa-2x " data-count="'+ dpCompOrCartItem.length +'"> <i class="fa fa-shopping-cart fa-stack-1x" ></i></span> Open Cart '
                    }).then(function()
                    {
                        window.open(context.data.saveCloseUrl, (event[clientIsMacOS ? 'metaKey' : 'ctrlKey']) ? '_blank': '_self');
                    }).catch(function()
                    {
                        FTXStockPhotosCart.openCartPrompt('cart');
                    });
                }

                window.open(context.data.saveCloseUrl, (event[clientIsMacOS ? 'metaKey' : 'ctrlKey']) ? '_blank': '_self');
            };
        }

        var downloadTypes = this.selectors.buttons.downloadType;

        for(var i = 0; i < downloadTypes.length; i++)
        {
            downloadTypes[i].addEventListener("click", function()
            {
                context.downloadImage(this);
            });
        }

        $.fn.slideFadeToggle  = function(speed, easing, callback)
        {
            return this.animate({opacity: 'toggle', height: 'toggle'}, speed, easing, callback);
        };

        this.selectors.keyboardPanel.kbdToggle.onclick = function(event)
        {
            jQuery(context.selectors.keyboardPanel.kbdPanel).slideFadeToggle(200);
        };

        this.selectors.keyboardPanel.kbdClose.click(function()
        {
            context.selectors.keyboardPanel.kbdPanel.slideFadeToggle(200);
        });

        this.selectors.optionsPanel.optClose.click(function()
        {
            context.selectors.optionsPanel.optPanel.slideFadeToggle(200);
        });

        this.selectors.buttons.snapToggle.onchange = function(event)
        {
            FTXCanvasTransform.toggleSnap();
        };

        this.selectors.buttons.userPreferenceToggle.change(function()
        {
            FTXCanvasUserPrefs.selectors.settingsPanel.fadeSlideToggle(200);
        });

        this.selectors.keyboardPanel.kdbScroll.perfectScrollbar({
            suppressScrollX: true
        });
    },

    /**
     * Set Canvas Padding
     *
     */
    setCanvasPadding: function(padding)
    {
        var context = this;

        if(!this.selectors.canvasPaddWrapper)
        {
            return false;
        }

        this.selectors.canvasPaddWrapper.style.padding =  padding.top + 'px ' + padding.right + 'px ' + padding.bottom + 'px ' + padding.left + 'px';
        this.updateScrollbars();

        setTimeout(function()
        {
            if(context.params.canvasOptions.zoomFitOnLoad)
            {
                context.data.zoomToFitInitialize = true;
                context.zoomToFit();
            }

            context.centerCanvasScroll('center');
            context.resizeEvents();
        }, 0);
    },

    /**
     * Page Load Events
     *
     */
    initiateFn: function()
    {
        var context             = this,
            canvasDimensions    = this.params.canvasOptions.canvasDimensions;

        this.setBackgroundClass(this.params.canvasOptions.canvasBackground, false);

        if(canvasDimensions.width !== undefined && canvasDimensions.height !== undefined)
        {
            this.setCanvasSize(canvasDimensions.width, canvasDimensions.height);
        }

        // Instantiate perfect scrollbar on the main canvas wrapper
        jQuery(this.selectors.layersOuterWrapper).perfectScrollbar({
            handlers: ['wheel', 'drag-scrollbar', 'touch'],
            useKeyboard: false
        });

        FTXCanvasTransform._setDefaultSettings(jQuery(this.selectors.controls));

        // Run resizeEvents on load
        this.resizeEvents();

        // Bind window resize events
        jQuery(window).resize(function()
        {
            context.resetCanvas();
        });

        this.makeLayerWrappersScrollable();
        this.addKeydownEvents();
        this.addActionEvents();
        this.addContextMenus();
        this.addMediumEditorInstances();

        // Remove guide action event
        FTXCanvasGuides.initButtonActions();

        // Ghost selection box
        this.outerWrapperFunctions();

        this.addCollisionClickFunctions();

        if(this.params.canvasOptions.startFullscreen)
        {
            this.toggleFullScreen();
        }

        var wrapWidth = this.selectors.editWrapper.outerWidth - 2;

        this.selectors.layersWrapperAll.css({maxWidth: wrapWidth - 222});

        if(this.selectors.masterTimeWrapper)
        {
            this.selectors.masterTimeWrapper.style.maxWidth = wrapWidth + 'px';
        }

        this.initiateRulers();
        this.initializeToolbarBindings();

        /* Bind Change Size Buttons (Temporary) */
        jQuery('.resolution').one('click', function(event)
        {
            context.setCanvasSize(jQuery(this).attr('data-width'), jQuery(this).attr('data-height'));
        });

        // Prevent dropdown menus from closing on click
        this.lockDropdownMenus();

        //this.triggerPageLock();

        document.onselectionchange = function()
        {
            var selectedlayerType = context.getSelectedLayerType();

            if(context.textEditing() && selectedlayerType == 'text')
            {
                var fontColorExtension          = FTXLayerToolbar.getInstanceByType('text').getExtension('colorPicker'),
                    fontFamilyExtension         = FTXLayerToolbar.getInstanceByType('text').getExtension('fontFamily'),
                    fontFamilyVariantExtension  = FTXLayerToolbar.getInstanceByType('text').getExtension('fontFamilyVariant');

                fontColorExtension.updateEditorOnSelectionChange();
                fontFamilyExtension.updateEditorOnSelectionChange();
                fontFamilyVariantExtension.updateEditorOnSelectionChange();
            }
        };

        document.designMode = "off";
    },

    /**
     * Lock Dropdown Menus
     *
     */
    lockDropdownMenus: function()
    {
        var dropDownMenus   = document.querySelectorAll('.dropdown-menu'),
            dropDownLengh   = dropDownMenus.length;

        if(dropDownLengh)
        {
            for(var i = 0; i < dropDownLengh; i++)
            {
                dropDownMenus[i].onclick = function (event)
                {
                    event.stopPropagation();
                };
            }
        }
    },

    /**
     * Initialize Outer Wrapper Functions
     *
     */
    outerWrapperFunctions: function()
    {
        var context             = this,
            ghostTargetEnabled  = false,
            position;

        this.selectors.layersOuterWrapper.onmousedown = function(event)
        {
            if(context.hasAnimation() && FTXAnimationPlayer.isMainTimelineActive())
            {
                return false;
            }

            position = {
                x: event.pageX,
                y: event.pageY
            };

            if(context.data.isMouseDragging || context.data.spaceBarDown)
            {
                return false;
            }

            // If option to close sidebar on document click is enabled, close when we click off sidebar
            if(context.params.canvasOptions.closeOnDocumentClick)
            {
                FTXCanvasSidebar.collapseSidebarPanel();

                if(FTXCanvasUserPrefs.selectors.settingsPanel.is(':visible'))
                {
                    FTXCanvasUserPrefs.selectors.settingsPanel.fadeSlideToggle(200);
                }
            }

            if(event.which === 1)
            {
                if(context.hasClassesOrId(jQuery(event.target), ['#divLayers-wrapper', '#canvas-padding', '#divLayers']))
                {
                    /*if( context.hasAnimation() && FTXAnimationPlayer.data.timeline
                        && FTXAnimationPlayer.data.timeline.isActive()  )
                    {
                        return false;
                    }*/
                    ghostTargetEnabled = true;
                    context.deselectAllLayers();
                    FTXCanvasGuides.deselectAllGuides();
                    context.closeAllDropdownToggles();
                }
                else
                {
                    ghostTargetEnabled = false;
                }

                var ghostSelect = context.selectors.ghostSelect;

                if(ghostTargetEnabled)
                {
                    var outerWrapper    = context.selectors.layersOuterWrapper,
                        outerBounds     = outerWrapper.getBoundingClientRect();

                    context.data.initialW = (event.pageX - outerBounds.left);
                    context.data.initialH = (event.pageY - outerBounds.top);

                    ghostSelect.classList.add("ghost-active");

                    ghostSelect.style.left  = (context.data.initialW + outerWrapper.scrollLeft) + 'px';
                    ghostSelect.style.top   = (context.data.initialH + outerWrapper.scrollTop) + 'px';

                    if(context.getSelectedLayerCount() > 0)
                    {
                        document.documentElement.removeEventListener('mousemove', context.startGhostBox, false);
                        document.documentElement.removeEventListener('mouseup', context.stopGhostBox, false);
                        jQuery(document).css({"background":"transparent"});
                    }
                    else
                    {
                        document.documentElement.addEventListener('mousemove', context.startGhostBox, false);
                        document.documentElement.addEventListener('mouseup', context.stopGhostBox, false);
                    }
                }
                else
                {
                    ghostSelect.classList.remove("ghost-active");
                }
            }

            if(event.which === 3)
            {
                jQuery.contextMenu({
                    selector: '#divLayers-wrapper, #canvas-padding, #divLayers',
                    events:
                    {
                        show: function (options)
                        {

                        }
                    },
                    build: function($triggerElement, e)
                    {
                        return {
                            items:
                            {
                                "Add Text Here":
                                {
                                    name:       'Add Text Here',
                                    className:  'customIcon addText',
                                    callback: function(e)
                                    {
                                        context.addTextLayerAtPosition(position)
                                    }
                                },
                                "Add Horizontal Guide Here":
                                {
                                    name:       'Add Horizontal Guide Here',
                                    className:  'customIcon horizontalGuide',
                                    callback: function(e)
                                    {
                                        FTXCanvasGuides.addGuideAtPosition('vertical')
                                    }
                                },
                                "Add Vertical Guide Here":
                                {
                                    name:       'Add Vertical Guide Here',
                                    className:  'customIcon verticalGuide',
                                    callback: function(e)
                                    {
                                        FTXCanvasGuides.addGuideAtPosition('horizontal')
                                    }
                                },
                                "Reset Zoom (100%)":
                                {
                                    name:       'Reset Zoom (100%)',
                                    className:  'customIcon resetZoom',
                                    callback: function(e)
                                    {
                                        context.setZoom(1, 'center');
                                    }
                                },
                                "Zoom In":
                                {
                                    name:       'Zoom In',
                                    className:  'customIcon zoomIn',
                                    callback: function(e)
                                    {
                                        context.zoomIn();
                                    }
                                },
                                "Zoom Out":
                                {
                                    name:       'Zoom Out',
                                    className:  'customIcon zoomOut',
                                    callback: function(e)
                                    {
                                        context.zoomOut();
                                    }
                                }
                            }
                        }
                    }
                });
            }
        };
    },

    /**
     * Close all Dropdown Toggle Buttons
     *
     * @return {*}
     */
    closeAllDropdownToggles: function()
    {
        var dropdownToggles = document.querySelectorAll('[data-toggle="dropdown"]'),
            element;

        if(dropdownToggles instanceof NodeList)
        {
            for(var i = 0; i < dropdownToggles.length; i++)
            {
                element = dropdownToggles[i].parentNode || dropdownToggles[i];
                element.classList.remove('open');
            }
        }
    },

    /**
     * Handle Mouse Drag Functions
     *
     * @param event
     */
    handleMouseDragFunctions: function(event)
    {
        var outerWrapper    = this.selectors.layersOuterWrapper,
            innerWrapper    = this.selectors.layersInnerWrapper,
            context         = this;

        context.data.spaceBarDown = true;

        outerWrapper.classList.add('hand-cursor');
        innerWrapper.classList.add('no-pointer-events');

        outerWrapper.addEventListener('mousedown', context.onMouseDragMouseDown, false);
    },

    /**
     * On Mouse Drag mousedown Event
     *
     * @param event
     */
    onMouseDragMouseDown: function(event)
    {
        var context         = FTXCanvas,
            outerWrapper    = context.selectors.layersOuterWrapper;

        context.data.isMouseDragging    = false;
        context.data.spaceBarDown       = true;

        context.data.mouseDrag.originalPagePos = {
            x: event.pageX,
            y: event.pageY
        };

        context.data.mouseDrag.scrollValues = {
            left: outerWrapper.scrollLeft,
            top:  outerWrapper.scrollTop
        };

        document.documentElement.addEventListener('mousemove', context.onMouseDragMouseMove, false);
        document.documentElement.addEventListener('mouseup', context.onMouseDragMouseUp, false);
    },

    /**
     * On Mouse Drag mousemove Event
     *
     * @param event
     */
    onMouseDragMouseMove: function(event)
    {
        var context         = FTXCanvas,
            outerWrapper    = context.selectors.layersOuterWrapper,
            originalPagePos = context.data.mouseDrag.originalPagePos,
            scrollValues    = context.data.mouseDrag.scrollValues;

        context.data.isMouseDragging = true;

        var pageDiff = {
                left:   event.pageX - originalPagePos.x,
                top:    event.pageY - originalPagePos.y
            },
            newScroll = {
                left:   scrollValues.left - pageDiff.left,
                top:    scrollValues.top - pageDiff.top
            };

        outerWrapper.scrollLeft   = newScroll.left;
        outerWrapper.scrollTop    = newScroll.top;
        context.shiftRulers();
    },

    /**
     * On Mouse Drag Mouseup Event
     *
     * @param event
     */
    onMouseDragMouseUp: function(event)
    {
        var context         = FTXCanvas,
            outerWrapper    = context.selectors.layersOuterWrapper,
            innerWrapper    = context.selectors.layersInnerWrapper;

        context.data.isMouseDragging = false;

        document.documentElement.removeEventListener('mousemove', context.onMouseDragMouseMove, false);

        if(!context.data.spaceBarDown)
        {
            outerWrapper.classList.remove('hand-cursor');
            innerWrapper.classList.remove('no-pointer-events');

            outerWrapper.removeEventListener('mousedown', context.onMouseDragMouseDown, false);

            context.data.spaceBarDown = false;
            context.outerWrapperFunctions();
        }
    },

    /**
     * Handle Mouse Drag Release
     *
     * @param event
     */
    handleMouseDragRelease: function(event)
    {
        var outerWrapper    = this.selectors.layersOuterWrapper,
            innerWrapper    = this.selectors.layersInnerWrapper;

        this.data.spaceBarDown = false;

        outerWrapper.removeEventListener('mousedown', this.onMouseDragMouseDown, false);

        if(!this.data.isMouseDragging)
        {
            outerWrapper.classList.remove('hand-cursor');
            innerWrapper.classList.remove('no-pointer-events');
        }

        this.outerWrapperFunctions();
    },

    /**
     * Initialize Collision Click Functions
     *
     */
    addCollisionClickFunctions: function()
    {
        var context     = this,
            controls    = context.selectors.controls,
            controlsEl  = controls;

        FTXCanvasTransform.initTransforms(jQuery(controls));

        setTimeout(function()
        {
            controlsEl.onclick = function(event)
            {
                if(context.singleLayerTextSelected())
                {
                    return false;
                }

                context.runCollisionClickFunction(event);
            }

        }, 100);

        controlsEl.ondblclick = function(event)
        {
            var layerId     = context.getSelectedLayerId(),
                layerObj    = context.getLayerById(layerId),
                layer       = context.getLayerElementById(layerId),
                layerEl     = layer;

            context.instantiateToolbar();

            // If text layer already selected then add editing mode and destroy the drag
            if(layerObj.layerType === 'text')
            {
                FTXCanvasTransform.destroyDraggable(layer);

                controlsEl.classList.add('editingMode');
                controlsEl.classList.add('no-pointer-events');

                layerEl.get(0).classList.add('editing-active');

                FTXEditorToolbar.highlightSelectedElement();
            }

            if(layerObj.layerType === 'gradient')
            {
                FTXGradient.openGradientEditor(layerId);
            }

            if(layerObj.layerType === "image" )
            {
                FTXImageCrop.enableCrop();
            }
        }
    },

    /**
     * Run Collision Click Function
     *
     * @param event
     * @returns {Boolean}
     */
    runCollisionClickFunction: function(event)
    {
        console.info("collision click");

        var clientOS        = FTXCanvasUtils.data.clientOS,
            clientIsMacOS   = clientOS == 'MacOS';

        if(FTXCanvasTransform.data.isDragging)
        {
            FTXCanvasTransform.data.isDragging = false;
            event.preventDefault();
            event.stopPropagation();
            return false;
        }

        if(FTXImageCrop.data.isCroping)
        {
            FTXImageCrop.data.isCroping = false;
            event.preventDefault();
            event.stopPropagation();
            return false;
        }

        if(FTXCanvasTransform.data.isRotating)
        {
            FTXCanvasTransform.data.isRotating = false;
            event.preventDefault();
            event.stopPropagation();
            return false;
        }

        if(FTXCanvasTransform.data.isResizing)
        {
            FTXCanvasTransform.data.isResizing = false;
            event.preventDefault();
            event.stopPropagation();
            return false;
        }

        if(this.hasClassesOrId(event.target, ['.ft-scaler', '.ft-rotator']))
        {
            return false;
        }

        FTXLayerToolbar.getInstance().hideCurrentToolbar();

        var collisionClickLayer = [],
            layerElements       = this.getLayerElements(),
            layerLength         = layerElements.length;

        for(var i = 0; i < layerLength; i++)
        {
            var layerEl         = layerElements[i],
                layer           = jQuery(layerEl),
                elementBound    = layerEl.getBoundingClientRect();

            if(event.pageX >= elementBound.left && event.pageX <= elementBound.right && event.pageY >= elementBound.top && event.pageY <= elementBound.bottom)
            {
                collisionClickLayer.push(layer);
            }
        }

        var topElementID    = this.getTopPositionLayer(collisionClickLayer, event.altKey),
            topElement      = this.getLayerElementById(topElementID);

        if(this.isElementGroupedElement(topElementID))
        {
            var layer = this.getGroupLayerById(topElementID);

            if(layer)
            {
                if(event.shiftKey || event[clientIsMacOS ? 'metaKey' : 'ctrlKey'])
                {
                    this.selectGroupFromLayer(layer);
                }
                else
                {
                    this.deselectAllLayers();
                    FTXLayerToolbar.getInstance().hideCurrentToolbar();
                    this.selectGroupFromLayer(layer);
                }
            }
        }

        if(topElement && topElement.get(0).classList.contains('layer_selected'))
        {
            if(event.shiftKey || event[clientIsMacOS ? 'metaKey' : 'ctrlKey'])
            {
                if(this.isElementGroupedElement(topElementID))
                {
                    var layer   = this.getLayerElementById(topElementID),
                        groupId = this.getGroupIdFromLayer(layer);

                    topElement = this.getGroupLayerById(groupId);
                }

                this.deselectLayerByElement(topElement);
            }
            else
            {
                this.deselectAllLayers();
                FTXCanvasGuides.deselectAllGuides();
                FTXLayerToolbar.getInstance().hideCurrentToolbar();

                if(this.isElementGroupedElement(topElementID))
                {
                    var layer       = this.getLayerElementById(topElementID),
                        groupId     = this.getGroupIdFromLayer(layer),
                        groupLayer  = this.getGroupLayerById(groupId);

                    this.selectGroupFromLayer(groupLayer);
                }
                else
                {
                    this.addLayerToSelection(topElementID, false);
                }
            }
        }
        else if(topElement && !event.shiftKey && !event[clientIsMacOS ? 'metaKey' : 'ctrlKey'])
        {
            this.deselectAllLayers();
            FTXCanvasGuides.deselectAllGuides();
            this.addLayerToSelection(topElementID, false);
        }
        else if(event.shiftKey || event[clientIsMacOS ? 'metaKey' : 'ctrlKey'])
        {
            this.addLayerToSelection(topElementID, event.shiftKey || event[clientIsMacOS ? 'metaKey' : 'ctrlKey']);
        }

        if(FTXCanvas.getSelectedLayerCount() === 1)
        {
            FTXLayerToolbar.getInstance().showCurrentToolbar();

            var layerId = this.getSelectedLayerId(),
                layer   = this.getLayerElementById(layerId);

            FTXCanvasTransform.updateContainerFromLayer(layer);
        }
        else if(FTXCanvas.getSelectedLayerCount() > 1 )
        {
            var layers       = this.getSelectedLayers();

            FTXLayerToolbar.getInstanceByType('multiLayer').getEditor().addElements(layers);
            FTXLayerToolbar.getInstance().showCurrentToolbar();
        }

        var selectAllButton = FTXLayerPanel.selectors.layerSelectAll;

        if(selectAllButton)
        {
            if(this.allLayersSelected())
            {
                selectAllButton.classList.add('all-selected');
            }
            else
            {
                selectAllButton.classList.remove('all-selected');
            }
        }

        this.updateCurrentSelection();
    },

    /**
     * Get Top Position Layer
     *
     * @param layers
     * @param altKey
     */
    getTopPositionLayer: function(layers, altKey)
    {
        var topLayerId      = 0;

        var sortedLayers = layers.sort(function(a, b)
        {
            var vA = a.css('zIndex');
            var vB = b.css('zIndex');

            return parseInt(vB) - parseInt(vA);
        });

        if(altKey && sortedLayers[1] !== undefined)
        {
            topLayerId = this.getLayerIdFromElement(sortedLayers[1]);
        }
        else if(altKey && sortedLayers[0] !== undefined)
        {
            topLayerId = this.getLayerIdFromElement(sortedLayers[0]);
        }
        else if(!altKey && sortedLayers[0] !== undefined)
        {
            topLayerId = this.getLayerIdFromElement(sortedLayers[0]);
        }

        return topLayerId;
    },

    /**
     * Get Highest Layer Index
     *
     * @returns {*}
     */
    getHighestLayerIndex: function()
    {
        var layersObjs          = this.layers,
            sortableLayers      = _.sortBy(layersObjs, 'layerIndex'),
            sortableLayerLength = sortableLayers.length;

        if(!sortableLayerLength)
        {
            return 100;
        }

        var highestLayerObj     = sortableLayers[sortableLayerLength - 1],
            highestLayerIndex   = highestLayerObj.layerIndex + 100;

        return highestLayerIndex !== undefined ? highestLayerIndex : false;
    },

    /**
     * Get Lowest Layer Index
     *
     * @returns {*}
     */
    getLowestLayerIndex: function()
    {
        var layers = this.getLayerElements();

        var sortedLayers = layers.sort(function(a, b)
        {
            var vA = jQuery(a).css('zIndex');
            var vB = jQuery(b).css('zIndex');

            return parseInt(vA) - parseInt(vB);
        });

        var lowestLayer = sortedLayers[0];

        return lowestLayer !== undefined ? jQuery(lowestLayer).css('zIndex') : false;
    },

    /**
     * Toggle Clip canvas
     *
     */
    toggleClipCanvas: function()
    {
        var canvas = this.selectors.layersInnerWrapper;

        if(canvas.classList.contains('overflow-hidden'))
        {
            canvas.classList.remove('overflow-hidden');

            this.selectors.buttons.clipCanvas.classList.remove('text-success');
            this.selectors.buttons.clipCanvas.classList.add('text-danger');
        }
        else
        {
            canvas.classList.add('overflow-hidden');

            this.selectors.buttons.clipCanvas.classList.remove('text-danger');
            this.selectors.buttons.clipCanvas.classList.add('text-success');
        }


    },

    /**
     * Toggle Full-Screen
     *
     */
    toggleFullScreen: function()
    {
        var fsElement   = document.body,
            context     = this;

        if(!document.mozFullScreen && !document.webkitIsFullScreen)
        {
            if(fsElement.mozRequestFullScreen)
            {
                fsElement.mozRequestFullScreen();
            }
            else
            {
                fsElement.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
            }

            this.selectors.buttons.fullScreen.classList.remove('text-danger');
            this.selectors.buttons.fullScreen.classList.add('text-success');
            this.selectors.buttons.fullScreen.innerHTML = '<span class="glyphicon glyphicon-fullscreen"><span>';
        }
        else
        {
            this.setPreviewMode(false);

            if(this.hasAnimation())
            {
                FTXAnimationPlayer.data.playAnimFullScreen = false;
            }

            if(document.mozCancelFullScreen)
            {
                document.mozCancelFullScreen();
            }
            else
            {
                document.webkitCancelFullScreen();
            }
        }
    },

    /**
     * Full-Screen Change Events
     *
     */
    fullScreenChangeEvents: function()
    {
        var state = document.fullScreen || document.mozFullScreen || document.webkitIsFullScreen;

        if(!state)
        {
            this.removeClonedCanvas();

            this.selectors.buttons.fullScreen.classList.remove('text-success');
            this.selectors.buttons.fullScreen.classList.add('text-danger');
            this.selectors.buttons.fullScreen.innerHTML = '<span class="glyphicon glyphicon-fullscreen"><span>';
        }
    },

    /**
     * Undo/Redo event Initialize
     *
     */
    addActionEvents: function()
    {
        var context = this;

        this.selectors.buttons.redo.onclick = function()
        {
            context.restoreToNextState();
        };

        this.selectors.buttons.undo.onclick = function()
        {
            context.restoreToLastState();
        };

        this.selectors.buttons.zoomIn.onclick = function()
        {
            context.zoomIn();
        };

        this.selectors.buttons.zoomOut.onclick = function()
        {
            context.zoomOut();
        };

        this.selectors.buttons.resetZoom.onclick = function()
        {
            context.setZoom(1, 'center');
        };

        this.selectors.zoomOptions.zoomSetters.on('click', function()
        {
            var zoomValue = this.dataset.zoom;

            if(zoomValue === 'fit')
            {
                context.zoomToFit();
            }
            else
            {
                var ratioZoom = zoomValue / 100;
                context.setZoom(ratioZoom, 'focus');
            }
        });

        this.selectors.buttons.revisionsButton.onclick = function()
        {
            var params  = {design_id: FTXCanvasSidebar.data.design.id};
            // FTXCanvas.runRequest(FTXCanvasSidebar.data.sidebarRevisionsLoadUrl, 'GET', params, true, function(response, responseText)
            // {
            //     if(responseText && responseText.status)
            //     {
                    FTXRevisionModal.initRevisionModal(params);
            //     }
            // });

        };
    },

    /**
     * Add Context Menus
     *
     */
    addContextMenus: function()
    {
        var context = this;
        jQuery.contextMenu({
            selector: '.ft-controls',
            events:
            {
                show: function (options)
                {
                    if(context.getSelectedLayerCount(true) > 1)
                    {
                        // return false;
                    }
                }
            },
            build: function($triggerElement, e){
                if($triggerElement.hasClass('multipleSelection'))
                {
                    return {
                        items:
                        {
                            // Title - Layer Position
                            "LayerPosition":
                            {
                                name:       'Layer Position',
                                className:  'contextTitle'
                            },
                            // Move forward
                            "MoveForward":
                            {
                                name:       'Move Forward',
                                className:  'customIcon contextForward',
                                callback: function()
                                {
                                    var element = context.getSelectedLayerElement();

                                    if(!element)
                                    {
                                        var groupId = context.getSelectedGroupId();

                                        element = context.getGroupLayerById(groupId);
                                    }

                                    otherOptionExtension.incrementalIndexChange(element, 'forward');
                                }
                            },
                            // Move Backward
                            "MoveBackward": {
                                name:       'Move Backward',
                                className:  'customIcon contextBackward',
                                callback: function()
                                {
                                    var element = context.getSelectedLayerElement();

                                    if(!element)
                                    {
                                        var groupId = context.getSelectedGroupId();

                                        element = context.getGroupLayerById(groupId);
                                    }

                                    otherOptionExtension.incrementalIndexChange(element, 'backward');
                                }
                            },
                            // Bring to Front
                            "BringFront": {
                                name:       'Bring to Front',
                                className:  'customIcon contextFront',
                                callback: function()
                                {
                                    var element = context.getSelectedLayerElement();

                                    if(!element)
                                    {
                                        var groupId = context.getSelectedGroupId();

                                        element = context.getGroupLayerById(groupId);
                                    }

                                    otherOptionExtension.layerIndexToFront(element);
                                }
                            },
                            // Send to Back
                            "SendBack": {
                                name:       'Send to Back',
                                className:  'customIcon contextBack',
                                callback: function()
                                {
                                    var element = context.getSelectedLayerElement();

                                    if(!element)
                                    {
                                        var groupId = context.getSelectedGroupId();

                                        element = context.getGroupLayerById(groupId);
                                    }

                                    otherOptionExtension.layerIndexToBack(element);
                                }
                            },

                            // Title - Layer Actions
                            "LayerActions":
                            {
                                name:       'Layer Actions',
                                className:  'contextTitle'
                            },

                            // Duplicate Layer
                            "duplicateSelectedLayers":
                            {
                                name: 'Duplicate Layer',
                                icon: 'copy',
                                callback: function()
                                {
                                    FTXCanvas.duplicateSelectedLayers();
                                }
                            },
                            // Duplicate Layer in Front
                            "duplicateSelectedLayersFront":
                            {
                                name: 'Duplicate in Front',
                                icon: 'copy',
                                callback: function()
                                {
                                    FTXCanvas.duplicateSelectedLayers(true);
                                }
                            },
                            // Delete Layer
                            "DeleteLayer":
                            {
                                name: 'Delete Layer',
                                icon: 'delete',
                                callback: function()
                                {
                                    FTXCanvas.deleteSelectedLayers();
                                }
                            },
                            // Lock Layer
                            "LockLayer":
                            {
                                name:       'Lock Layer',
                                className:  'customIcon contextLock',
                                callback: function()
                                {
                                    var layerId         = context.getSelectedLayerId(),
                                        layerElement    = context.getLayerElementById(layerId);

                                    if(!layerId)
                                    {
                                        layerId         = context.getSelectedGroupId();
                                        layerElement    = context.getGroupLayerById(layerId);
                                    }

                                    FTXLayerPanel.triggerActionOnLockClick(layerElement);
                                }
                            },
                        }
                    }
                }
                else
                {
                    return {
                        items:
                        {
                            /*// Title - Group Functions
                            "GroupFunctions":
                            {
                                name:       'Group Functions',
                                className:  'contextTitle'
                            },
                            // Move forward
                            "GroupLayers":
                            {
                                name:       'Group Layers',
                                className:  'customIcon contextForward',
                                callback: function()
                                {
                                    context.groupSelectedLayers();
                                }
                            },
                            // Ungroup Layers
                            "UnGroupLayers": {
                                name:       'Ungroup Layers',
                                className:  'customIcon contextBackward',
                                callback: function()
                                {
                                    context.unGroupSelectedLayers();
                                },
                                disabled: function(key, opt)
                                {
                                    var selectedLayers = FTXCanvas.data.selectedLayers;

                                    if(selectedLayers && selectedLayers.length > 0)
                                    {
                                        for(var d = 0; d < selectedLayers.length; d++)
                                        {
                                            return !FTXCanvas.getLayerElementById(selectedLayers[d]).hasClass('groupedElement');
                                        }
                                    }
                                }
                            },*/
                            // Title - Layer Actions
                            "LayerActions":
                            {
                                name:       'Layer Actions',
                                className:  'contextTitle'
                            },
                            // Bring to Front
                            "BringFront": {
                                name:       'Bring to Front',
                                className:  'customIcon contextFront',
                                callback: function()
                                {
                                    var elements = context.getSelectedLayers(true, true);

                                    if(!elements)
                                    {
                                        var groupId = context.getSelectedGroupId();

                                        elements = context.getGroupLayerById(groupId);
                                    }

                                    otherOptionExtension.layerIndexToFront(elements);
                                }
                            },
                            // Send to Back
                            "SendBack": {
                                name:       'Send to Back',
                                className:  'customIcon contextBack',
                                callback: function()
                                {
                                    var elements = context.getSelectedLayers(true, true);

                                    if(!elements)
                                    {
                                        var groupId = context.getSelectedGroupId();

                                        elements = context.getGroupLayerById(groupId);
                                    }

                                    otherOptionExtension.layerIndexToBack(elements);
                                }
                            },

                            // Duplicate Layer
                            "duplicateSelectedLayers":
                            {
                                name: 'Duplicate Layers',
                                icon: 'copy',
                                callback: function()
                                {
                                    FTXCanvas.duplicateSelectedLayers();
                                }
                            },
                            // Duplicate Layer in Front
                            "duplicateSelectedLayerssFront":
                            {
                                name: 'Duplicate in Front',
                                icon: 'copy',
                                callback: function()
                                {
                                    FTXCanvas.duplicateSelectedLayers(true);
                                }
                            },
                            // Delete Layer
                            "DeleteLayers":
                            {
                                name: 'Delete Layers',
                                icon: 'delete',
                                callback: function()
                                {
                                    FTXCanvas.deleteSelectedLayers();
                                }
                            },
                            // Lock Layer
                            "LockLayers":
                            {
                                name:       'Lock Layers',
                                className:  'customIcon contextLock',
                                callback: function()
                                {
                                    return FTXCanvas.lockSelectedLayers();
                                }
                            },
                        }
                    }
                }
            }
        });
    },

    addMediumEditorInstances: function()
    {
        FTXLayerToolbar.init();
    },

    /**
     * Initialize KeyDown event
     *
     */
    addKeydownEvents: function()
    {
        var context         = this,
            clientOS        = FTXCanvasUtils.data.clientOS,
            clientIsMacOS   = clientOS == 'MacOS',
            controlKey      = clientIsMacOS ? 'command' : 'ctrl';

        this.addDocumentKeyUpEvents();

        // Bind Arrow Movements
        keyboardJS.bind(['left', 'right', 'up', 'down'], function(event)
        {
            if(event[clientIsMacOS ? 'metaKey' : 'ctrlKey'])
            {
                var selectedElements = context.getSelectedLayers(true, true),
                    type = 'forward';

                // down key
                if(event.which === 40)
                {
                    type = 'backward';
                }

                return otherOptionExtension.incrementalIndexChange(selectedElements, type);
            }

            if(!context.textEditing() && !context.targetIsInput(event) && !context.targetIsSelect(event) && !context.targetIsSelectBoxIt(event))
            {
                return context.handleKeydownMovement(event);
            }

            // If we're in a font size box,
            if(event.target.classList.contains('inputFontSize'))
            {
                if(event.which === 38)
                {
                    return FTXLayerToolbar.getInstanceByType('text').getExtension('fontSize').updateFontIncrement(event, "increment");
                }

                if(event.which === 40)
                {
                    return FTXLayerToolbar.getInstanceByType('text').getExtension('fontSize').updateFontIncrement(event, "decrement");
                }
            }
        });

        // tab binding when text in editing mode
        keyboardJS.bind('tab',function(event)
        {
            if(FTXCanvas.textEditing() || FTXCanvas.getSelectedElementsCount() > 0 )
            {
                event.preventDefault();
            }
        });

        // Bind esc key
        keyboardJS.bind('esc', function(event)
        {
            if(context.textEditing())
            {
                context.removeTextEditingMode();
            }
        });

        // Bind Delete Key
        keyboardJS.bind(['delete', 'backspace'], function(event)
        {
            if(!context.textEditing() && !context.targetIsTextInput(event))
            {
                if(context.getSelectedLayerCount() > 0)
                {
                    context.deleteSelectedItems();
                }
                else
                {
                    return;
                }

            }

            if(event.which === 8)
            {
                if(!context.hasClassesOrId(event.target, ['.innerslide_layer']) && event.target.nodeName.toLowerCase() !== 'textarea' && event.target.nodeName.toLowerCase() !== 'input')
                {
                    event.preventDefault();
                    return;
                }
            }

            if(context.textEditing() || context.targetIsTextInput(event))
            {
                return true;
            }

            event.preventDefault();
        });

        // Bind Undo/Redo
        keyboardJS.on('z', context.handleHistoryKeyDown());

        // Bind Clipboard Copy
        keyboardJS.bind(controlKey + ' + c', function(event)
        {
            console.log('Copy Event Called');
            if(!context.textEditing())
            {
                if(!context.targetIsInput(event))
                {
                    event.preventDefault();
                    event.stopPropagation();

                    return context.setClipboardEntries();
                }
            }

            return false;
        });

        // Bind Clipboard Paste (Shift)
        // keyboardJS.bind(['ctrl > v'], function(event)
        // {
        //     if(!context.textEditing())
        //     {
        //         if(!context.targetIsInput(event))
        //         {
        //             context.data.clipBoard.entries = JSON.parse(localStorage.getItem('clipBoardEntries'));
        //             return context.pasteClipboardEntries();
        //         }
        //     }
        //     else
        //     {
        //         var selectedLayer = FTXCanvas.getSelectedLayerElement();
        //         context.dispatchSyncLayer(selectedLayer);
        //     }
        //     return false;
        // });

        if(this.isSafari())
        {
            console.log('Safari Detected');

            // Bind Clipboard Paste (Safari)
            keyboardJS.bind(controlKey + ' + v', function(event)
            {
                console.log('Safari Paste Event Called');

                if(!context.textEditing())
                {
                    if(!context.targetIsInput(event))
                    {
                        return context.pasteClipboardEntries();
                    }
                }

                return false;
            });
        }
        else
        {
            console.log('Safari NOT Detected');

            // Bind Clipboard Paste (Shift)
            window.addEventListener("paste", function(thePasteEvent)
            {
                console.log('Paste Event Called');

                var items = thePasteEvent.clipboardData.items;

                for(var i = 0; i < items.length; i++)
                {
                    if((items[i].kind == 'string') && (items[i].type.match('^text/plain')))
                    {
                        // This item is the target node
                        items[i].getAsString(function(string)
                        {
                            if(context.IsJsonString(string))
                            {
                                var copiedObject = JSON.parse(string);

                                if(copiedObject.layers)
                                {
                                    if(!context.textEditing())
                                    {
                                        context.data.clipBoard.entries = copiedObject.layers;
                                        return context.pasteClipboardEntries();
                                    }
                                    else
                                    {
                                        var selectedLayer = FTXCanvas.getSelectedLayerElement();
                                        context.dispatchSyncLayer(selectedLayer);
                                    }
                                }
                            }
                        });
                    }
                    else if((items[i].kind == 'string') && (items[i].type.match('^text/html')))
                    {
                        // Paste data item is HTML
                    }
                    else if((items[i].kind == 'string') &&  (items[i].type.match('^text/uri-list')))
                    {
                        // Paste data item is URI
                    }
                    else if((items[i].kind == 'file') &&  (items[i].type.match('^image/')))
                    {
                        // Paste data item is an image file
                        var file = items[i].getAsFile();

                        var formData = new FormData();

                        formData.append('account_id', FTXCanvas.data.accountId);
                        formData.append('user_folder_id', 0);
                        formData.append('photo', file);

                        FTXCanvas.runRequest(FTXCanvasDropFiles.data.photosUploadUrl, 'POST', formData, false, function(response, responseText) {

                            var layerDefaults   = jQuery.extend(true, {}, FTXCanvas.layerDefaults),
                                layerObj;

                            layerObj = jQuery.extend(true, layerDefaults, {
                                "layerType": "image",
                                "position": {
                                    "x": 0,
                                    "y": 0
                                },
                                "image": {
                                    "imageType": "upload",
                                    "galleryRel": responseText.id
                                }
                            });

                            FTXCanvasDropFiles.getImageNaturalDimension(file).then(function(dimensions)
                            {
                                layerObj.dimensions = dimensions;
                                FTXCanvas.addLayerWithZoomState(layerObj, false, false, true);
                            });

                        }, { processData: false, contentType: false });

                    }
                }
            }, false);
        }

        // Bind Grouping
        keyboardJS.bind([controlKey + ' > g'], function(event)
        {
            event.preventDefault();

            /*
            if(!FTXCanvasTransform.isGroupEnabled())
            {
                return false;
            }*/

            if(context.getSelectedLayerCount() > 1)
            {
                if(context.allSelectedElementsGrouped() && context.getSelectedGroupLayerCount() === 1)
                {
                    if(event.shiftKey)
                    {
                        return context.unGroupSelectedLayers();
                    }

                    return false;
                }
                context.selectors.groupedIcon.removeClass('hide');

                // if(event.shiftKey)
                // {
                //     return context.unGroupSelectedLayers();
                // }
                if(!event.shiftKey)
                {
                    return context.groupSelectedLayers();
                }
            }

            return false;
        });

        // Bind keyboard paste in front
        keyboardJS.bind([controlKey + ' > f'], function(event)
        {
            event.preventDefault();

            if(!context.textEditing())
            {
                if(!context.targetIsInput(event))
                {
                    var selectedLayersId = context.data.selectedLayers;

                    context.data.clipBoard.entries = context.getLayersById(selectedLayersId);

                    return context.pasteClipboardEntries(true);
                }
            }
            else
            {
                var selectedLayer = FTXCanvas.getSelectedLayerElement();
                FTXCanvas.dispatchSyncLayer(selectedLayer);
            }

            return false;
        });

        // Bind Select/Deselect all Event
        keyboardJS.on(controlKey + ' > a', context.handleSelectionKeyDown());

        // Fix issue with type ahead in Firefox
        this.selectors.document.keypress(function(event)
        {
            if(!context.textEditing() && !context.targetIsInput(event) && !context.targetIsSelect(event) && !context.targetIsSelectBoxIt(event))
            {
                if(event.which !== 0)
                {
                    event.preventDefault();
                    return false;
                }
            }
        });

        // Bind Zoom Keys
        this.selectors.document.keydown(function(event)
        {
            if(event[clientIsMacOS ? 'metaKey' : 'ctrlKey'])
            {
                if(event.which.toString() === '61' || event.which.toString() === '107' || event.which.toString() === '187')
                {
                    event.preventDefault();
                    context.zoomIn();
                }
                else if(event.which.toString() === '173' || event.which.toString() === '109' || event.which.toString() === '189')
                {
                    event.preventDefault();
                    context.zoomOut();
                }
                else if(event.which.toString() === '48' || event.which.toString() === '96')
                {
                    event.preventDefault();
                    context.zoomDefault();
                }
                else if(event.which.toString() === '103' || event.which.toString() === '55')
                {
                    event.preventDefault();
                    context.centerCanvasScroll('center');
                    context.resizeEvents();
                }
            }
        });

        // Save Design
        keyboardJS.bind([controlKey + ' > s'], function(event)
        {
            context.saveDesign();
            event.preventDefault();
        });

        // Override Full-Screen
        keyboardJS.bind('f11', function(event)
        {
            context.toggleFullScreen();
            event.preventDefault();
        });

        // Bind Spacebar + Grab-Drag functionality
        keyboardJS.bind('space', function(event)
            {
                if(!context.textEditing() && !context.targetIsInput(event))
                {
                    document.activeElement.blur();
                    event.preventRepeat();
                    return context.handleMouseDragFunctions(event);
                }
            },
            function(event)
            {
                if(!context.textEditing() && !context.targetIsInput(event))
                {
                    document.activeElement.blur();
                    return context.handleMouseDragRelease(event);
                }
            });

        // Prevent browser scrolling zoom effect
        jQuery(window).bind('mousewheel DOMMouseScroll', function (event)
        {
            if(FTXCanvasTransform.data.isResizing)
            {
                event.preventDefault();
                return false;
            }

            if(event[clientIsMacOS ? 'metaKey' : 'ctrlKey'] === true)
            {
                event.preventDefault();
            }

            if(context.isPreview())
            {
                return true;
            }
        });
    },

    /**
     * Wrap Selected Layers
     *
     */
    wrapSelectedLayer: function()
    {
        var selectedLayers      = this.getSelectedLayers(true, true),
            groupLayerBound     = this.getCoverLayerBounds(selectedLayers),
            selectedLayersCount = selectedLayers.length,
            controlAngle        = FTXCanvasTransform._getAngleFromElement(jQuery(this.selectors.controls));

        if(controlAngle > 0 )
        {
            for(var i = 0; i < selectedLayersCount; i++)
            {
                var layerElement    = selectedLayers[i],
                    layer           = jQuery(layerElement),
                    layerId         = this.getLayerIdFromElement(layer),
                    layerObj        = this.getLayerById(layerId),
                    LayersCount     = FTXCanvas.getTotalLayersCount(),
                    stateObj;

                    stateObj            = this.recursiveMerge({},layerObj);
                    stateObj.position   = stateObj.originalPosition;
                    stateObj.rotation   = stateObj.originalRotation;

                this.updateWrapLayerByState(stateObj);
            }

            groupLayerBound     = this.getCoverLayerBounds(selectedLayers);
        }

        var newSelectedLayer = document.createElement('div');

            newSelectedLayer.id                = 'selectedWrapper';
            newSelectedLayer.className         = 'selected_wrapper';
            newSelectedLayer.style.left        = groupLayerBound.left + "px";
            newSelectedLayer.style.top         = groupLayerBound.top + "px";
            newSelectedLayer.style.width       = groupLayerBound.width + "px";
            newSelectedLayer.style.height      = groupLayerBound.height + "px";
            newSelectedLayer.style.position    = "absolute";
            newSelectedLayer.style.opacity     = '1';
            newSelectedLayer.style.zIndex      =  101 + this.getTotalLayersCount();
            FTXCanvasTransform.setLayerRotation(jQuery(newSelectedLayer), controlAngle);

            for(var i = 0; i < selectedLayersCount; i++)
            {
                var layerElement    = selectedLayers[i],
                    layer           = jQuery(layerElement);

                layerElement.style.left = parseInt(layerElement.style.left, 10) - parseInt(newSelectedLayer.style.left, 10) + 'px';
                layerElement.style.top  = parseInt(layerElement.style.top, 10) - parseInt(newSelectedLayer.style.top, 10) + 'px';
            }

            selectedLayers.wrapAll(newSelectedLayer);
    },

    /**
     * Un Wrap Selected Layers
     *
     */
    unWrapSelectedLayer: function(initailControlAngle)
    {
        var selectedLayers      = this.getSelectedLayers(true, true),
            selectedLayerCount  = selectedLayers.length,
            groupLayer          = jQuery('#selectedWrapper'),
            grpAngle            = FTXCanvasTransform._getAngleFromElement(groupLayer);

        for(var i = 0; i < selectedLayerCount; i++)
        {
            var layer           = jQuery(selectedLayers[i]),
                layerElement    = layer.get(0),
                layerId         = this.getLayerIdFromElement(layer),
                layerObj        = this.getLayerById(layerId),
                finalRotation   = {
                    rad: 0,
                    angle: 0,
                };

            var updatedPosition = {
                x: parseInt(layerElement.style.left, 10) + parseInt(groupLayer.get(0).style.left, 10),
                y: parseInt(layerElement.style.top, 10) + parseInt(groupLayer.get(0).style.top, 10)
            };

            if(grpAngle > 0)
            {
                updatedPosition = {
                    x: parseInt(layer.position().left) + parseInt(groupLayer.position().left) + parseInt((layerElement.getBoundingClientRect().width - layer.width()) / 2),
                    y: parseInt(layer.position().top) + parseInt(groupLayer.position().top) + parseInt((layerElement.getBoundingClientRect().height - layer.height()) / 2)
                }

                finalRotation.angle = grpAngle;
            }

            if(layerObj.rotation && layerObj.rotation.angle)
            {
                finalRotation.angle += layerObj.rotation.angle;
            }

            updateLayerObj = {
                position: updatedPosition,
                rotation: finalRotation
            };

            if( (!layerObj.hasOwnProperty('originalPosition')) || initailControlAngle === 0 )
            {
                updateLayerObj.originalPosition = layerObj.position;
                updateLayerObj.originalRotation = layerObj.rotation;
            }

            this.updateLayer(layerId, "update", updateLayerObj, false);

            this.updateWrapLayerByState(layerObj);
        }

        selectedLayers.unwrap();

        this.resetLayerszIndex();
    },

    /**
     * Update wraped layers by state
     *
     * @param originalObj
     */
    updateWrapLayerByState: function(originalObj)
    {
        var cloneOriginal   = this.recursiveMerge({}, originalObj),
            layerId         = originalObj.layerId,
            layer           = this.getLayerElementById(layerId);

        if(!layer)
        {
            layer = this.getGroupLayerById(layerId);
        }

        this.layers[layerId] = cloneOriginal;

        var cloneToRefactor = this.recursiveMerge({}, originalObj),
            refactoredObj   = this.refactorLayerObjByZoom(cloneToRefactor, 'multiply'),
            rotation        = (refactoredObj.rotation) ? refactoredObj.rotation : this.layerDefaults.rotation;

        FTXCanvasTransform.setElementSettings(layer, {
            y:     refactoredObj.position.y,
            x:     refactoredObj.position.x,
            angle: rotation.angle,
            _p: {
                rad: rotation.rad
            }
        });

        this.setElementTransform(layer, {
            'left': refactoredObj.position.x,
            'top':  refactoredObj.position.y,
            'rotation': rotation.angle
        });

        this.storeZoomState(layerId, {
            x:          refactoredObj.position.x,
            y:          refactoredObj.position.y,
            width:      refactoredObj.dimensions.width,
            height:     refactoredObj.dimensions.height,
            fontSize:   parseInt(refactoredObj.layerTextOptions.fontSize)
        });
    },
    /**
     * Group Selected Layers
     *
     * @param historyObjs
     * @param layers
     * @param history
     * @param copyPaste
     * @param retainSelection
     * @param isRecreatingGroup
     */
    groupSelectedLayers: function(historyObjs, layers, history, copyPaste, retainSelection, isRecreatingGroup)
    {
        var selectedLayers              = this.getSelectedLayers(true),
            selectedGroupLayers         = this.getSelectedGroupsIds(),
            selectedLayersIds           = jQuery.extend(true, [], this.data.selectedLayers),
            selectedLayersCount         = selectedLayers.length,
            groupId                     = this.generateIdentifier(),
            layerDefaults               = jQuery.extend(true, {}, this.layerDefaults),
            layerIndexes                = {},
            mergeWithLayers             = false,
            groupLayer, groupLayerBound, layerId, layer, objLayer, mergeWithLayer, groupBefore, groupAfter, layerIndexesBefore, layerIndexesAfter, stateObj;

        this.data.selectedGroups = {};

        // if(this.getSelectedGroupLayerCount() > 1)
        // {
        //     this.setDefaultPositionToLayers();
        // }

        // if this function call from history
        if(historyObjs)
        {
            if(historyObjs.layers)
            {
                var hlayers = historyObjs.layers;

                for(var h = 0; h < hlayers.length; h++)
                {
                    var lId         = hlayers[h].layerId,
                        lPosition   = hlayers[h].position,
                        lRotation   = hlayers[h].rotation,
                        lObj        = this.getLayerById(lId),
                        stateObj;

                        if(lObj)
                        {
                            stateObj            = this.recursiveMerge({}, lObj);
                            stateObj.position   = lPosition;
                            stateObj.rotation   = lRotation;

                            this.updateLayerByState(stateObj);
                        }
                }
            }

            groupId = historyObjs.groupId;

            if(!layers)
            {
                layers = this.data.layersInGroup[groupId];
            }

            if(layers)
            {
                var layerIdsCount       = layers.length,
                    layersInHistoryObj  = [];

                selectedLayersIds = [];

                for(var l = 0; l < layerIdsCount; l++)
                {
                    layerId = layers[l];
                    layer   = this.getLayerElementById(layerId);

                    if(layer)
                    {
                        layersInHistoryObj.push(layer.get(0));
                        selectedLayersIds.push(layerId);
                    }
                }

                selectedLayers      = layersInHistoryObj;
                selectedLayersCount = selectedLayers.length;
                groupLayer          = this.getGroupLayerById(groupId);

                if(groupLayer)
                {
                    this.selectGroupFromLayer(groupLayer);
                }
            }
        }

        var selectedLayerObjs = this.getLayersById(selectedLayersIds);

        groupLayerBound = this.getCoverLayerBounds(selectedLayers);

        if(!this.selectedHasGroup() || this.getSelectedGroupLayerCount() > 0)
        {
            layerIndexesBefore  = this.setlayerIndexesBefore();

            // if there were two group selected then we remove all group and make new one
            if(this.getSelectedGroupLayerCount() > 0)
            {
                groupBefore = this.setGroupHistoryObject();

                this.data.mergeGroup = true;

                this.data.selectedGroups = selectedLayersIds;

                this.unGroupSelectedLayers(FTXCanvas.getLayersFromGroups(), false);

                // Update selected layers element after ungrouping group for group merge
                selectedLayers  = this.getLayerElements(this.data.selectedLayers);
                groupLayerBound = this.getCoverLayerBounds(selectedLayers);
            }
            else
            {
                this.data.selectedGroups = selectedLayersIds;

                layers = FTXCanvas.layers;

                for(var id in layers)
                {
                    if(layers.hasOwnProperty(id))
                    {
                        layerIndexes[id] = layers[id].layerIndex;
                    }
                }

                groupBefore = this.setGroupHistoryObject();
            }

            var newGroupLayer = document.createElement('div');

            newGroupLayer.id            = 'group_' + groupId;
            newGroupLayer.className     = 'group groupLayer_selected';
            newGroupLayer.style.left    = groupLayerBound.left + "px";
            newGroupLayer.style.top     = groupLayerBound.top + "px";
            newGroupLayer.style.width   = groupLayerBound.width + "px";
            newGroupLayer.style.height  = groupLayerBound.height + "px";
            newGroupLayer.style.opacity = '1';

            newGroupLayer.setAttribute('data-layer-id', layerId);

            objLayer = jQuery.extend(true, layerDefaults, {
                layerId:    groupId,
                groupId:    groupId,
                layerIds:   this.data.selectedGroups,
                layerType:  'group',
                opacity:     1,
                position: {
                    x: groupLayerBound.left,
                    y: groupLayerBound.top
                },
                dimensions: {
                    height: groupLayerBound.height,
                    width:  groupLayerBound.width
                },
                locked:     false,
                layerTextOptions: {
                    // fontFamily:     '',
                    fontSize:       '',
                    fontWeight:     '',
                    letterSpacing:  '',
                    lineHeight:     '',
                    textEffect:     ''
                }
            });

            this.data.groupLayers.push(groupId);

            _.each(this.data.cornerElements, function(val)
            {
                var corner = document.createElement('div');

                corner.className = val + ' corner';
                newGroupLayer.appendChild(corner);
            });

            this.selectors.divLayers.appendChild(newGroupLayer);

            this.storeZoomStateByLayerObj(objLayer);

            var groupLayerObj  = this.recursiveMerge({}, objLayer),
                refactoredObj  = this.refactorLayerObjByZoom(groupLayerObj, 'divide');

            this.layers[groupId] = refactoredObj;

            if(!historyObjs)
            {
                this.data.layersInGroup[groupId] = [];
            }

            this.addLayerClickActions(groupId);

            //FTXEditorToolbar.hideMediumActiveToolbars();
            FTXLayerToolbar.getInstance().hideCurrentToolbar();

            if(typeof retainSelection === "undefined")
            {
                setTimeout(function()
                {
                    FTXLayerToolbar.getInstance().showCurrentToolbar();
                },500);
            }
        }
        else
        {
            groupLayer      = this.selectedHasGroup();
            groupId         = this.getLayerIdFromElement(groupLayer);
            objLayer        = this.getLayerById(groupId);

            layerIndexesBefore  = this.setlayerIndexesBefore();
            groupBefore         = this.setGroupHistoryObject();

            this.updateLayer(groupId, 'update', {
                layerIds:   selectedLayersIds,
                dimensions: {
                    height: groupLayerBound.height,
                    width:  groupLayerBound.width
                },
                position: {
                    x: groupLayerBound.left,
                    y: groupLayerBound.top
                },
            }, false);

            mergeWithLayers = true;
        }

        for(var i = 0; i < selectedLayersCount; i++)
        {
            var layerElement    = selectedLayers[i];
                layer           = jQuery(layerElement);
                layerId         = this.getLayerIdFromElement(layer);

            var layerObj        = this.getLayerById(layerId),
                layerAnimation  = layerObj.animation;

            if(!layerElement.classList.contains('group_layer'))
            {
                var updatedLayer = this.addLayerToGroup(layerId, groupId);

                this.appendLayerIntoGroup(updatedLayer, layerId, (historyObjs) ? historyObjs.groupId : false);

                updatedLayer = this.getLayerElementById(layerId);

                FTXCanvasTransform.initTransforms(updatedLayer);

                if(this.data.mergeGroup === true)
                {
                    this.data.layersInGroup[groupId] = _.without(this.data.layersInGroup[groupId], layerId);
                    this.data.layersInGroup[groupId].push(layerId);
                }
                else
                {
                    this.data.layersInGroup[groupId] = _.without(this.data.layersInGroup[groupId], layerId);
                    this.data.layersInGroup[groupId].push(layerId);
                }

                this.resetAnimationSettingsFromLayer(layerId, layerAnimation);
            }
            else
            {
                layerElement.classList.add('layer_selected');

                this.data.selectedLayers = _.without(this.data.selectedLayers, layerId);
                this.data.selectedLayers.push(layerId);
            }
        }

        // Update current selection meta data
        this.updateCurrentSelection();

        newGroupLayer = this.getGroupLayerById(groupId);

        FTXCanvasTransform.initTransforms(newGroupLayer);

        this.setDefaultPositionToLayers();

        this.setPositionToLayers(true);

        this.coverLayerPosition(true);

        FTXCanvasTransform.updateContainerFromCoverLayers();

        var updatedGroupLayer = this.getHighestLayerIndexInGroup(groupId);

        if(copyPaste)
        {
            updatedGroupLayer = (this.getHighestLayerIndex() + 1) - 100;
        }

        this.data.selectedGroupLayers.push(groupId);

        // if(!historyObjsGroupId){
        if(!isRecreatingGroup)
        {
            this.updateLayer(groupId, 'update', {
                layerIndex: updatedGroupLayer
            }, false);

            //if group merge is between group and layer then no need to add new group layer into panel
            if(!mergeWithLayers)
            {
                FTXLayerPanel.addGroupToPanel(this.getLayerById(groupId));
            }

            FTXLayerPanel.moveLayerInGroupPanel(groupId);

            FTXLayerPanel.updateLayerInfo(true);

            newGroupLayer.get(0).style.zIndex  = updatedGroupLayer + 100;

            this.resetGroupLayerszIndex(groupId, 'group');
        }

        if(historyObjs && historyObjs.rotation)
        {
            this.updateLayer(groupId, 'update', {
                rotation: historyObjs.rotation
            }, false);

            this.setElementTransform(newGroupLayer, {
                'rotation': historyObjs.rotation.angle
            }, false);

            this.setElementTransform(FTXCanvasTransform.selectors.controls, {
                'rotation': historyObjs.rotation.angle
            }, false);

        }

        this.groupElementHover();

        if(!isRecreatingGroup)
        {
            this.resetLayerszIndex();
        }

        if(typeof FTXCanvasAnimation !== 'undefined')
        {
            FTXLayerPanel.updateSingleLayerSlidersByFactor(groupId, FTXCanvas.params.animationTimelineFactor);
        }

        layerIndexesAfter   = this.setlayerIndexesAfter();
        groupAfter          = this.setGroupHistoryObject(groupId);

        if(typeof history === 'undefined' || history)
        {
            this.addLayerStateToHistory(groupAfter, groupBefore, 'Layers Grouped', 'group', layerIndexesAfter, layerIndexesBefore);
        }

        this.data.mergeGroup = false;
    },

    /**
     * Setup Group History Object
     *
     * @param selectedId
     */
    setGroupHistoryObject: function(selectedId)
    {
        var selectedElements    = selectedId,
            groupArray          = [],
            selectedLayerCount;

        if(selectedId === '' || selectedId === undefined)
        {
            selectedElements = this.getSelectedElementIds();
        }

        if(selectedElements instanceof Array)
        {
            selectedLayerCount = selectedElements.length;

            for(var i = 0; i < selectedLayerCount; i++)
            {
                var layerId     = selectedElements[i],
                    layerObj    = this.getLayerById(layerId),
                    historyObj  = {};

                if(layerObj.layerType === 'group')
                {
                    historyObj = jQuery.extend(true, {}, {
                        'groupId':      layerId,
                        'layerIndex':   layerObj.layerIndex,
                        'rotation':     layerObj.rotation,
                        'position':     layerObj.position,
                        'layers':       []
                    });

                    var elements        = layerObj.layerIds,
                        elementsCount   = elements.length;

                    for(var layerId in elements)
                    {
                        var elementId     = elements[layerId];

                        if(typeof elementId === 'object')
                        {
                            elementObj    = this.getLayerById(layerId);

                            var sampleObj = jQuery.extend(true, {}, {
                                'groupId':      layerId,
                                'layers':       elementId
                            });
                        }
                        else
                        {
                            elementObj    = this.getLayerById(elementId);

                            var sampleObj = jQuery.extend(true, {}, {
                                'layerId':      elementId,
                                'layerIndex':   elementObj.beforeGroupLayerIndex,
                                'position':   elementObj.position,
                                'rotation':   elementObj.rotation,
                            });
                        }

                        historyObj['layers'].push(sampleObj);
                    }
                }
                else
                {
                    historyObj = jQuery.extend(true, {}, {
                        'layerId':      layerId,
                        'layerIndex':   layerObj.layerIndex,
                        'position':     layerObj.position,
                        'rotation':     layerObj.rotation,
                    });
                }

                groupArray.push(historyObj);
            }
        }
        else
        {
            var layerId     = selectedElements,
                layerObj    = this.getLayerById(layerId),
                historyObj  = {};

            if(layerObj.layerType === 'group')
            {
                historyObj = jQuery.extend(true, {}, {
                    'groupId':      layerId,
                    'layerIndex':   layerObj.layerIndex,
                    'layers':       []
                });

                var elements        = layerObj.layerIds,
                    elementsCount   = elements.length;

                for(var layerId in elements)
                {
                    var elementId     = elements[layerId],
                        elementObj    = this.getLayerById(elementId);
                    if(typeof elementId === 'object')
                    {
                        for(var indentifier in elementId)
                        {
                            var layerId     = elementId[indentifier],
                                layerObj    = this.getLayerById(layerId);

                            var tempObj = jQuery.extend(true, {}, {
                                    'layerId':      layerId,
                                    'layerIndex':   layerObj.beforeGroupLayerIndex,
                                    'position':     layerObj.position,
                                    'rotation':     layerObj.rotation,
                                });

                            historyObj['layers'].push(tempObj);
                        }
                    }
                    else
                    {
                        var sampleObj = jQuery.extend(true, {}, {
                            'layerId':      elementId,
                            'layerIndex':   elementObj.beforeGroupLayerIndex,
                            'position':   elementObj.position,
                            'rotation':   elementObj.rotation,
                        });

                        historyObj['layers'].push(sampleObj);
                    }
                }
            }
            else
            {
                historyObj = jQuery.extend(true, {}, {
                    'layerId':      layerId,
                    'layerIndex':   layerObj.layerIndex,
                    'position':     layerObj.position,
                    'rotation':     layerObj.rotation,
                });
            }

            groupArray.push(historyObj);
        }

        return groupArray;
    },

    /**
     * Refresh Events by Group ID
     *
     * @param groupId
     */
    refreshGroupLayer: function(groupId)
    {
        var groupObj    = this.getLayerById(groupId),
            groupLayer  = this.getGroupLayerById(groupId);

        FTXLayerPanel.addGroupToPanel(groupObj);

        FTXLayerPanel.moveLayerInGroupPanel(groupId, true);

        this.setHideStatusFromObj(groupObj, false);

        this.addLayerClickActions(groupId);

        FTXLayerToolbar.getInstanceByType('group').getEditor().addElements(groupLayer);

        FTXCanvasTransform.initTransforms(groupLayer);

        this.groupElementHover();
    },

    /**
     * Get Highest Layer index in Group
     *
     * @param groupId
     */
    getHighestLayerIndexInGroup: function(groupId)
    {
        var layers                  = this.getLayersFromGroup(groupId),
            layerIds                = this.getlayersIdFromLayersElement(layers),
            layersObjs              = this.getLayersById(layerIds),
            sortableLayers          = _.sortBy(layersObjs, 'layerIndex'),
            sortableLayersLength    = sortableLayers.length;

        if(sortableLayersLength > 0)
        {
            return sortableLayers[sortableLayersLength-1].layerIndex;
        }

        return false;
    },

    /**
     * Reset Group Layers zIndex
     *
     * @param groupId
     * @param action
     */
    resetGroupLayerszIndex: function(groupId, action)
    {
        var layers                  = this.getLayersFromGroup(groupId),
            groupObj                = this.getLayerById(groupId),
            layerIds                = this.getlayersIdFromLayersElement(layers),
            layersObjs              = this.getLayersById(layerIds),
            sortableLayers          = _.sortBy(layersObjs, 'layerIndex'),
            sortableLayersLength    = sortableLayers.length,
            layer, layerElement, updatedIndex, i, layerObj, layerId,layerIndex,layerAnimation;

        switch(action)
        {
            case 'group':

                for(i = sortableLayersLength; i > 0; i--)
                {
                    layerObj        = sortableLayers[i-1];
                    layerId         = layerObj.layerId;
                    layerIndex      = layerObj.layerIndex;
                    layer           = this.getLayerElementById(layerId);
                    layerElement    = layer.get(0);
                    updatedIndex    = i;

                    if(layerIndex === '' && layerObj.beforeGroupLayerIndex !== '')
                    {
                        layerIndex = layerObj.beforeGroupLayerIndex;

                        this.updateLayer(layerId, "group", {
                            layerIndex      :               '',
                            groupLayerIndex :               updatedIndex,
                            beforeGroupLayerIndex :         layerIndex
                        }, false);
                    }
                    else
                    {
                        this.updateLayer(layerId, "group", {
                            layerIndex      :               '',
                            groupLayerIndex :               updatedIndex,
                            beforeGroupLayerIndex :         layerIndex
                        }, false);
                    }

                    layerElement.style.zIndex = updatedIndex + 100;
                }

                break;

            /*
            Functionality removed, Temp commented this code if required in future
            case 'ungroup':

                updatedIndex = groupObj.layerIndex;

                for(i = 0; i < sortableLayersLength; i++)
                {
                    layerObj        = sortableLayers[i];
                    layerId         = layerObj.layerId;
                    layerIndex      = layerObj.beforeGroupLayerIndex;
                    layerAnimation  = layerObj.beforeGroupAnimationConfig;
                    layer           = this.getLayerElementById(layerId);
                    layerElement    = layer.get(0);

                    this.updateLayer(layerId, "group", {
                        layerIndex      : layerIndex,
                        groupLayerIndex : '',
                        animation       : layerAnimation
                    }, false);

                    layerElement.style.zIndex = layerIndex + 100;
                }
                break;*/
        }
    },

    /**
     * Reset Layers zIndex
     *
     */
    resetLayerszIndex: function()
    {
        var layers                  = FTXCanvas.layers,
            sortableLayers          = _.sortBy(layers, 'layerIndex'),
            sortableLayersLength    = sortableLayers.length,
            updatedIndex            = 1;

        for(var i = 0; i < sortableLayersLength; i++)
        {
            var layerObj    = sortableLayers[i],
                layerId     = layerObj.layerId,
                layer       = this.getLayerElementById(layerId);

            if(!layer)
            {
                layer = this.getGroupLayerById(layerId);
            }

            if(layer && (layerObj.groupId === "" || layerObj.groupId === undefined || layerObj.layerType === 'group'))
            {
                var layerElement = layer.get(0);

                this.updateLayer(layerId, "group", {
                    layerIndex : updatedIndex
                }, false);

                layerElement.style.zIndex = updatedIndex + 100;

                updatedIndex++;
            }
        }

        setTimeout(function()
        {
            FTXLayerPanel.updateLayerListFromLayers();
        }, 100)
    },

    /**
     * Set Layer Indexes After
     *
     */
    setlayerIndexesAfter: function()
    {
        return this.setlayerIndexesBefore();
    },

    /**
     * Set Layer Indexes before
     *
     */
    setlayerIndexesBefore: function()
    {
        var layersIndexesBefore = [];

        for(var identifier in this.layers)
        {
            if(this.layers.hasOwnProperty(identifier))
            {
                var elementObj = this.layers[identifier],
                    Obj;

                if(elementObj.groupId === "" )
                {
                    Obj = {
                        layerId :   elementObj.layerId,
                        index :     elementObj.layerIndex
                    }

                    layersIndexesBefore.push(Obj);
                }
                else if(elementObj.layerType === "group" && elementObj.groupId !== "")
                {
                    Obj = {
                        groupId :       elementObj.layerId,
                        index :         elementObj.layerIndex,
                        layerIndexs:    {}
                    }

                    for(var indentifier in elementObj.layerIds)
                    {
                        var layerId     = elementObj.layerIds[indentifier],
                            layerObj    = this.getLayerById(layerId),
                            index       = layerObj.beforeGroupLayerIndex;

                        if(typeof layerId === 'object')
                        {
                            var layerIdsArray = layerId,
                                layerIdsCount = layerIdsArray.length;

                            for(var h = 0; h < layerIdsCount; h++)
                            {
                                var layerId     = layerIdsArray[h],
                                    layerObj    = this.getLayerById(layerId),
                                    index       = layerObj.beforeGroupLayerIndex;

                                Obj.layerIndexs[layerId] = index;
                            }
                        }
                        else
                        {
                            Obj.layerIndexs[layerId] = index;
                        }
                    }

                    layersIndexesBefore.push(Obj);
                }
            }
        }

        return layersIndexesBefore;
    },

    /**
     * UnGroup Selected Layers
     *
     * @param groupItems
     * @param history
     */
    unGroupSelectedLayers: function(groupItems, history)
    {
        var selectedLayers      = this.getSelectedLayers(true),
            selectedLayersIds   = this.data.selectedLayers,
            selectedLayersObjs  = this.sortLayerObjsByProperty(this.getLayersById(selectedLayersIds),'beforeGroupLayerIndex', 'asc'),
            selectedGroupsIds   = [],
            layerIds            = [],
            context             = this,
            selectedLayerCount, layerIndexesBefore, layerIndexesAfter, groupBefore, groupAfter;

        if(groupItems)
        {
            selectedLayers = groupItems;
        }

        selectedLayerCount = selectedLayers.length;

        if(typeof history === 'undefined' || history)
        {
            layerIndexesBefore  = this.setlayerIndexesBefore();
            groupBefore         = this.setGroupHistoryObject();
        }

        for(var i = 0; i < selectedLayerCount; i++)
        {
            var layer           = jQuery(selectedLayers[i]),
                layerElement    = layer.get(0),
                layerId         = this.getLayerIdFromElement(layer),
                layerObj        = this.getLayerById(layerId),
                layerPanel      = FTXLayerPanel.getLayerPanelElement(layerId),
                groupId         = layerObj.groupId,
                groupLayer      = this.getGroupLayerById(layerObj.groupId),
                groupObj        = this.getLayerById(layerObj.groupId),
                groupOpacity    = groupLayer.get(0).style.opacity,
                layerOpacity    = (layerElement.style.opacity !== '') ? layerElement.style.opacity : 1,
                layerIndex      = layerObj.beforeGroupLayerIndex,
                layerAnimation  = layerObj.beforeGroupAnimationConfig,
                grpRotation     = this.layerDefaults.rotation;

            selectedGroupsIds = _.without(selectedGroupsIds, groupId);
            selectedGroupsIds.push(groupId);

            layerIds.push(layerId);

            layerOpacity = (layerOpacity * groupOpacity);
            layerElement.style.zIndex = layerIndex + 100;

            grpRotation = this.recursiveMerge({}, groupObj.rotation);

            var updatedPosition = {
                x: parseInt(layerElement.style.left, 10) + parseInt(groupLayer.get(0).style.left, 10),
                y: parseInt(layerElement.style.top, 10) + parseInt(groupLayer.get(0).style.top, 10)
            };

            if(grpRotation && grpRotation.angle)
            {
                updatedPosition = {
                    x: parseInt(layer.position().left) + parseInt(groupLayer.position().left) + parseInt((layerElement.getBoundingClientRect().width - layer.width()) / 2),
                    y: parseInt(layer.position().top) + parseInt(groupLayer.position().top) + parseInt((layerElement.getBoundingClientRect().height - layer.height()) / 2)
                }
            }
            if(layerObj.rotation && layerObj.rotation.angle)
            {
                grpRotation.angle += layerObj.rotation.angle;
            }

            this.updateLayer(layerId, "unGroup", {
                groupId :       '',
                layerIndex :    layerIndex,
                opacity :       layerOpacity,
                position:       updatedPosition,
                animation:      layerAnimation,
                rotation:       grpRotation,
            }, false);

            layerElement.className          = 'slide_layer slide_layer_type_' + layerObj.layerType;

            // layer.remove();
            layerPanel.remove();

            FTXLayerPanel.data.layerNames = _.without(FTXLayerPanel.data.layerNames, layerObj.layerName);

            this.refreshEvents(layerId, false);

            this.updateLayerByState(layerObj);

            // this.addLayerWithZoomState(layerObj, false, false, false, true);
        }

        for(var i = 0; i< selectedGroupsIds.length ; i++)
        {
            var sGroupId     = selectedGroupsIds[i],
                groupLayer   = this.getGroupLayerById(sGroupId);

                groupLayer.find('> .corner').remove();
                groupLayer.find('> .slide_layer').unwrap();
        }

        if(typeof history === 'undefined' || history)
        {
            layerIndexesAfter  = this.setlayerIndexesAfter();
            groupAfter         = this.setGroupHistoryObject(layerIds);
        }

        if(typeof history === 'undefined' || history)
        {
            this.addLayerStateToHistory(groupAfter, groupBefore, 'Layers Un Grouped', 'ungroup', layerIndexesAfter, layerIndexesBefore);
        }

        this.deleteSelectedGroupLayer(selectedGroupsIds);

        delete this.layers[groupId];

        this.resetLayerszIndex();
    },

    /**
     * Get Selected Groups with Layers
     *
     */
    getSelectedGroupIdsWithLayers: function()
    {
        var groups          = this.getSelectedGroups(),
            groupsCount     = groups.length;

        for(var i = 0; i < groupsCount; i++)
        {
            var groupElement      = groups[i],
                groupId           = this.getLayerIdFromElement(groupElement),
                layersIds         = this.getLayerIdsFromGroup(groupId);

            this.data.selectedGroups[groupId] = layersIds;

        }
        return this.data.selectedGroups;
    },

    /**
     * Remove Layers from group
     *
     * @param layers
     * @param groupId
     */
    removeLayersFromGroup: function(layers, groupId)
    {
        console.error("Remove this function at last");
        var layersCount = layers.length,
            groupLayer;

        // remove layer from group
        for(var i = 0; i < layersCount; i++)
        {
            var layerId         = layers[i],
                layer           = this.getLayerElementById(layerId),
                layerElement    = layer.get(0),
                layerObj        = this.getLayerById(layerId),
                layerPanel      = FTXLayerPanel.getLayerPanelElement(layerId);

            groupLayer      = this.getGroupLayerById(groupId);

            this.updateLayer(layerId, "unGroup", {
                groupId : '',
                position: {
                    x: parseInt(layerElement.style.left, 10) + parseInt(groupLayer.get(0).style.left, 10),
                    y:  parseInt(layerElement.style.top, 10) + parseInt(groupLayer.get(0).style.top, 10)
                }
            }, false);

            layer.remove();
            layerPanel.remove();

            FTXLayerPanel.data.layerNames = _.without(FTXLayerPanel.data.layerNames, layerObj.layerName);

            this.data.layersInGroup[groupId] = _.without(this.data.layersInGroup[groupId], layerId);

            this.addLayerWithZoomState(layerObj, false, false, false, true);
        }

        groupLayer      = this.getGroupLayerById(groupId);

        var groupLayerEl    = groupLayer.get(0),
            groupItems      = this.getLayersFromGroup(groupId),
            groupItemsCount = groupItems.length;

        // make group selected
        this.makeGroupSelectedById(groupId);

        this.coverLayerPosition();

        FTXCanvasTransform.updateContainerFromCoverLayers();
    },

    /**
     * Make group Selected
     *
     * @param groupId
     */
    makeGroupSelectedById: function(groupId)
    {
        console.error("Remove this function at last");
        var layers      = this.getLayersFromGroup(groupId),
            layersCount = layers.length,
            groupLayer  = this.getGroupLayerById(groupId);

        groupLayer.get(0).classList.add('groupLayer_selected');

        // remove layer from group
        for(var i = 0; i < layersCount; i++)
        {
            var layerEl = layers[i],
                layer   = jQuery(layerEl),
                layerId = this.getLayerIdFromElement(layer);

            layer.addClass('group_layer multiSelectLayers layer_selected');

            this.data.selectedLayers = _.without(this.data.selectedLayers, layerId);
            this.data.selectedLayers.push(layerId);
        }

        // Update current selection meta data
        this.updateCurrentSelection();
    },

    /**
     * UnGroup Layers From groupId
     *
     * @param groupId
     * @param history
     */
    unGroupSelectedLayersFromGroupId: function(groupId, history)
    {
        var groupItems = this.getLayersFromGroup(groupId);

        this.unGroupSelectedLayers(groupItems, history);
    },

    /**
     * UnGroup Layers
     *
     */
    unGroupLayers: function()
    {
        var groupItems = this.getLayersFromGroups();

        this.unGroupSelectedLayers(groupItems);
    },

    /**
     * Delete Selected Group Layer
     *
     * @param selectedGroupsIds
     */
    deleteSelectedGroupLayer: function(selectedGroupsIds)
    {
        if(selectedGroupsIds.length > 0)
        {
            for(var i = 0; i < selectedGroupsIds.length; i++)
            {
                this.deleteGroupById(selectedGroupsIds[i]);
            }
        }

        return true;
    },

    /**
     * Delete Group By ID
     *
     * @param groupId
     */
    deleteGroupById: function(groupId)
    {
        var groupLayer      = this.getGroupLayerById(groupId),
            groupLayerObj   = this.getLayerById(groupId),
            groupLayerPanel = FTXLayerPanel.getLayerPanelElement(groupId);

        FTXLayerPanel.data.layerNames   = _.without(FTXLayerPanel.data.layerNames, groupLayerObj.layerName);
        this.data.groupLayers           = _.without(this.data.groupLayers, groupId);

        groupLayerPanel.remove();

        if  (groupLayer)
        {
            groupLayer.remove();
        }
        delete this.layers[groupId]
    },

    /**
     * Delete All Group Layer
     *
     */
    deleteAllGroupLayer: function()
    {
        var context         = this,
            groupIds        = this.data.groupLayers,
            groupIdsCount   = groupIds.length;

        if(groupIdsCount)
        {
            for(var i = 0; i < groupIdsCount; i++)
            {
                var groupId         = groupIds[i],
                    groupLayer      = context.getGroupLayerById(groupId);

                context.deleteSelectedGroupLayer(groupLayer);
            }
        }
    },

    /**
     * Add Layer To Group
     *
     * @param {String} layerId
     * @param groupId
     */
    addLayerToGroup: function(layerId, groupId)
    {
        var layer = this.getLayerElementById(layerId);

        //this.removeGroupFromLayer(layerId);

        this.updateLayer(layerId, "group", {
            groupId : groupId
        }, false);

        return layer;
    },

    /**
     * Get Layers From group
     *
     * @param groupId
     */
    getLayersFromGroup: function(groupId)
    {
        var groupLayer = this.getGroupLayerById(groupId);

        return (groupLayer && groupLayer !== undefined) ? groupLayer.find('.slide_layer') : false;
    },

    /**
     * Get Layer Ids From group
     *
     * @param groupId
     */
    getLayerIdsFromGroup: function(groupId)
    {
        var groupLayer  = this.getGroupLayerById(groupId),
            allLayers   = groupLayer ? groupLayer.find('.slide_layer') : [],
            layersCount = allLayers.length,
            layerIds    = [];

        for(var i = 0; i < layersCount; i++)
        {
            var layer   = jQuery(allLayers[i]),
                layerId = this.getLayerIdFromElement(layer);

                layerIds.push(layerId);
        }

        return _.isEmpty(layerIds) ? layerIds : false;
    },

    /**
     * Get Layers From groups
     *
     * @param selectedGroupLayers
     */
    getLayersFromGroups: function(selectedGroupLayers)
    {
        var groupItems = [], groupLayersCount;

        if(selectedGroupLayers)
        {
            var groupLayers         = selectedGroupLayers;
                groupLayersCount    = groupLayers.length;

            /* remove this code if not necessary
            if(this.getGroupLayerCount() == groupLayersCount || groupLayersCount == 1 )
            {
                groupItems = document.querySelectorAll('.group_layer');
            }
            else
            {*/
                for(var i = 0; i < groupLayersCount; i++)
                {
                    var groupLayerId    = this.getLayerIdFromElement(groupLayers[i]),
                        groupLayerObj   = this.getLayerById(groupLayerId),
                        groupItemsIds   = groupLayerObj.layerIds;

                    if(groupLayerId.length)
                    {
                        for(var j = 0; j < groupItemsIds.length; j++)
                        {
                            var groupItemLayer = this.getLayerElementById(groupItemsIds[j]);

                            if(groupItemLayer)
                            {
                                groupItems.push(groupItemLayer.get(0));
                            }
                        }
                    }
                }
            /*}*/
        }
        else
        {
            groupItems = document.querySelectorAll('.groupLayer_selected .slide_layer');
        }

        return groupItems;
    },

    /**
     * Get Group Element From Id
     *
     * @param groupId
     */
    getGroupLayerById: function(groupId)
    {
        var layer,
            element;

        if(this.hasAnimation() && FTXAnimationPlayer.data.playAnimFullScreen)
        {
            element = document.getElementById("canvas-preview");
            layer   = element ? element.querySelector("#group_" + groupId) : false;
        }
        else
        {
            layer = document.getElementById('group_' + groupId);
        }

        return layer ? jQuery(layer) : false;
    },

    /**
     * Append Element in Group
     *
     * @param layer
     * @param {String} layerId
     * @param historyObjsGroupId
     */
    appendLayerIntoGroup: function(layer, layerId, historyObjsGroupId)
    {
        var layerElement    = layer.get(0),
            layerObj        = this.getLayerById(layerId),
            groupId         = layerObj.groupId,
            groupLayer      = this.getGroupLayerById(groupId);

        layer.addClass('group_layer multiSelectLayers layer_selected');

        this.data.selectedLayers = _.without(this.data.selectedLayers, layerObj.layerId);
        this.data.selectedLayers.push(layerId);

        layerElement.style.left = parseInt(layerElement.style.left, 10) - parseInt(groupLayer.get(0).style.left, 10) + 'px';
        layerElement.style.top  = parseInt(layerElement.style.top, 10) - parseInt(groupLayer.get(0).style.top, 10) + 'px';

        /*this.updateLayer(layerId, "update", {
            position: {
                x:  parseInt(layerElement.style.left, 10),
                y:  parseInt(layerElement.style.top, 10)
            }
        }, false);*/

        jQuery('#group_'+groupId).append(layer.get(0).outerHTML);

        layer.remove();
    },

    /**
     * Group element hover
     *
     */
    groupElementHover: function()
    {
        jQuery('.group_layer').hover(
            function()
            {
                jQuery(this).parent('.group').addClass('hoverClass');
            },
             function()
            {
                jQuery(this).parent('.group').removeClass('hoverClass');
            }
        );
    },

    /**
     * remove groupId From Element
     *
     * @param {String} layerId
     */
    removeGroupFromLayer: function(layerId)
    {
        var layerObj    = this.getLayerById(layerId),
            layer       = this.getLayerElementById(layerId);

        if(layerObj.groupId !== 'undefined' && layerObj.groupId)
        {
            layer.get(0).classList.remove('group_layer');
            layerObj.groupId = '';

            this.updateLayer(layerId, "remove_group", layerObj, false);
        }
    },

    /**
     * check all Elements id Grouped
     *
     */
    allSelectedElementsGrouped: function()
    {
        var context         = this,
            layers          = context.getSelectedLayers(true),
            layersCount     = layers.length,
            groupElement    = true;

        for(var i = 0; i < layersCount; i++)
        {
            var element = layers[i];

            if(!element.classList.contains('group_layer'))
            {
                groupElement = false;
            }
        }

        return groupElement;
    },

    /**
     * Add all Group Elements
     *
     * @param groupLayer
     * @param onlyGroup
     */
    selectGroupFromLayer: function(groupLayer, onlyGroup)
    {
        var context         = this,
            groupId         = context.getLayerIdFromElement(groupLayer),
            groupItems      = context.getLayersFromGroup(groupId),
            groupLayerPanel = FTXLayerPanel.getLayerPanelElement(groupId),
            groupItemsCount = groupItems.length,
            groupLayerIds   = [];

        if(groupLayer && groupLayer.get(0).classList.contains('groupLayer_selected'))
        {
            return false;
        }

        context.selectors.groupedIcon.removeClass('hide');

        groupLayer.get(0).classList.add('groupLayer_selected');
        groupLayerPanel.get(0).classList.add('layer-panel-selected');

        context.data.selectedGroupLayers.push(groupId);

        if(this.hasAnimation() && this.getSelectedLayerCount(true, false) === 1)
        {
            FTXCanvasAnimation.updateAnimationSettingsFromLayer(groupId);
        }

        if(!onlyGroup)
        {
            for(var i = 0; i < groupItemsCount; i++)
            {
                var layerId = context.getLayerIdFromElement(groupItems[i]);

                groupItems[i].classList.add('multiSelectLayers');

                context.addLayerToSelection(layerId, true, true);

                groupLayerIds.push(layerId);
            }

            context.initializeMultiSelect(false);
        }

        return groupLayerIds;
    },

    /**
     * Check if Element is Grouped Element
     *
     * @param {String} layerId
     */
    isElementGroupedElement: function(layerId)
    {
        var layer = this.getLayerElementById(layerId);

        if(layer)
        {
            return layer.get(0).classList.contains('group_layer');
        }
        else
        {
            layer = this.getGroupLayerById(layerId);

            if(layer)
            {
                return layer.get(0).classList.contains('group');
            }

            return false;
        }
    },

    /**
     * Check if Selected Has Group Layer
     *
     * @returns {*}
     */
    selectedHasGroup: function()
    {
        var selectedLayers      = this.getSelectedLayers(true),
            selectedLayersCount = selectedLayers.length,
            layer               = false;

        if(selectedLayersCount > 0)
        {
            for(var i = 0; i < selectedLayersCount; i++)
            {
                var element = selectedLayers[i];

                if(element.classList.contains('group_layer'))
                {
                    layer = jQuery(element);
                    break;
                }
            }

            if(layer)
            {
                var layerId     = this.getLayerIdFromElement(layer),
                    layerObj    = this.getLayerById(layerId),
                    groupLayer  = this.getGroupLayerById(layerObj.groupId);

                if(groupLayer)
                {
                    return groupLayer;
                }
            }
        }

        return false;
    },

    /**
     * Check if Elements Has any Group elements
     *
     * @param layerObjs
     * @returns {*}
     */
    getArrayOfIdsFromObjects: function(layerObjs)
    {
        var groupId     = layerObjs.groupId,
            groupItems  = this.getLayersFromGroup(groupId);

        return groupItems;
    },

    /**
     * Check if Keyboard Allowed
     *
     * @param excludeGuides
     */
    selectAllLayers: function(excludeGuides)
    {
        if(this.hasAnimation() && FTXAnimationPlayer.isMainTimelineActive())
        {
            return false;
        }

        var context         = this,
            layerIds        = this.getAllLayerIds(),
            guideIds        = [],
            selectAllButton = FTXLayerPanel.selectors.layerSelectAll;

        this.deselectAllLayers();

        if(layerIds.length > 0)
        {
            _.each(layerIds, function(id)
            {
                var layerObj = context.getLayerById(id);

                if(layerObj.locked || !layerObj.visible)
                {
                    return false;
                }

                var groupLayer = context.getGroupLayerById(id)

                if(groupLayer)
                {
                    context.selectGroupFromLayer(groupLayer, true);
                }
                else
                {
                    context.addLayerToSelection(id, true, true);
                }

            });

            if(FTXCanvas.getSelectedLayerCount(false, true) > 0 )
            {
                // If selected layers at least 1 then will update info in layer pane
                selectAllButton.classList.add('all-selected');
                FTXLayerPanel.updateLayerInfo(true);

                // initialize multi select
                context.initializeMultiSelect(false);

                // hide current toolbar and show new
                FTXLayerToolbar.getInstance().hideCurrentToolbar();
                FTXLayerToolbar.getInstance().showCurrentToolbar();
            }

            if(FTXCanvas.getSelectedLayerCount() > 1 )
            {
                var layers       = this.getSelectedLayers();

                FTXLayerToolbar.getInstanceByType('multiLayer').getEditor().addElements(layers);
                FTXLayerToolbar.getInstance().showCurrentToolbar();
            }
         }

        if(typeof excludeGuides === 'undefined' || !excludeGuides)
        {
            FTXCanvasGuides.deselectAllGuides();

            guideIds = FTXCanvasGuides.getAllGuideIds();

            if(guideIds.length > 0)
            {
                _.each(guideIds, function(id)
                {
                    FTXCanvasGuides.addGuideToSelection(id, true);
                });
            }
        }
    },

    /**
     * Add Document KeyUp Events
     *
     */
    addDocumentKeyUpEvents: function()
    {
        var context = this;

        // If user agent is not firefox, we'll run a keyup event binding
        // to get the
        if(navigator.userAgent.indexOf("Firefox") !== -1 )
        {
            jQuery(document).keyup(function(e)
            {
                // If we're not text editing, return false
                if(context.getSelectedLayerCount() && !context.textEditing())
                {
                    return false;
                }

                var selectedLayer = FTXCanvas.getSelectedLayerElement();

                if(selectedLayer)
                {
                    var layerInner  = selectedLayer.get(0).querySelector('.innerslide_layer'),
                        textEditor  = layerInner,
                        color       = context.data.lastTextColor;

                    // Check whether there is a <p> tag within contenteditable block
                    var para = textEditor.getElementsByTagName("p");

                    // If color exists and is rgb() format, convert to HEX
                    if(color && color.indexOf("#") !== 0)
                    {
                        color = FTXCanvasUtils.RGBToHex(color);
                    }

                    // If no paragraphs are found, we'll replace the inner HTML with
                    // a <font> tag, wrapped with <p> including the color
                    if(para.length === 0)
                    {
                        var inner   = textEditor.innerHTML.replace(/^\s+|\s+$/g, ''),
                            str     = (inner === "") ? "&#8203;" : textEditor.innerHTML,
                            newText = "<p><font color='"+color+"'>" + str + "</font></p>";

                        textEditor.innerHTML = "";
                        document.execCommand('insertHTML', false, newText);
                    }
                    // If 1 paragraph exists
                    else if(para.length === 1)
                    {
                        var paragraph   = para[0],
                            fontTags    = paragraph.getElementsByTagName("font");

                        if(fontTags.length === 0)
                        {
                            var innerWrap = (color ? '<font color="'+ color +'"></font>' : '<font></font>');

                            jQuery(paragraph).wrapInner(innerWrap);

                            var addedFontTag    = paragraph.getElementsByTagName("font"),
                                range           = document.createRange(),
                                sel 		    = window.getSelection();

                            if(sel.rangeCount)
                            {
                                range.setStart(addedFontTag[0], 1);
                                range.setEnd(addedFontTag[0], 1);

                                range.collapse(true);

                                sel.removeAllRanges();
                                sel.addRange(range);
                            }
                        }
                    }
                }
            });
        }
    },

    /**
     * Single Layer Text is Selected
     *
     * @returns {null|boolean}
     */
    singleLayerTextSelected: function()
    {
        var currentSelection = this.currentSelection;

        return currentSelection.selectedLayersCount && currentSelection.selectedLayerType === 'text'
    },

    /**
     * Check if Keyboard Allowed
     *
     * @returns {Boolean}
     */
    textEditing: function()
    {
        var layer       = this.getSelectedLayerElement(),
            layerId     = this.getLayerIdFromElement(layer),
            layerObj    = this.getLayerById(layerId),
            toolbar     = FTXEditorToolbar.getCurrentToolbar(layerId);

        this.data.lastEditedTextId = layerId;

        return layerObj && layerObj.layerType === 'text' && this.hasClassesOrId(document.activeElement, ['.innerslide_layer']);
        //return typeof toolbar != 'undefined' && toolbar && toolbar.isDisplayed() && layerObj.layerType == "text";
    },

    /**
     * remove text editing mode
     *
     */
    removeTextEditingMode: function()
    {
        if(this.getSelectedLayerCount() === 1)
        {
            var layerId     = this.getSelectedLayerId(),
                layer       = this.getLayerElementById(layerId),
                layerObj    = this.getLayerById(layerId),
                controls    = FTXCanvasTransform.selectors.controls;

                if(layerObj.layerType === "text")
                {
                    controls.removeClass('editingMode');
                    controls.removeClass('no-pointer-events');
                    layer.removeClass('editing-active');

                    FTXCanvas.clearAllSelection();
                    FTXCanvasTransform.initTransforms(layer);
                    FTXLayerToolbar.updateMediumEditor();
                }
        }
    },

    /**
     * Detect Event Target Is Input
     *
     * @param event
     * @returns {Boolean}
     */
    targetIsInput: function(event)
    {
        if(event && event.target && event.target.tagName)
        {
            return event.target.tagName.toUpperCase() === 'INPUT' || event.target.tagName.toUpperCase() === 'TEXTAREA';
        }

        return false;
    },

    /**
     * Detect Event Target Is Text Input
     *
     * @param event
     * @returns {Boolean}
     */
    targetIsTextInput: function(event)
    {
        return event.target.type === 'text' || event.target.type === 'textarea';
    },

    /**
     * Detect Event Target Is Select
     *
     * @param event
     * @returns {Boolean}
     */
    targetIsSelect: function(event)
    {
        return event.target.tagName.toUpperCase() === 'SELECT';
    },

    /**
     * Detect Event Target Is Select Box It Extension
     *
     * @param event
     * @returns {Boolean}
     */
    targetIsSelectBoxIt: function(event)
    {
        return this.hasClassesOrId(event.target, ['.selectboxit']);
    },

    /**
     * Make Layer Wrappers Scrollable
     *
     */
    makeLayerWrappersScrollable: function()
    {
        this.selectors.rightLayerWrapper.perfectScrollbar({
            useBothWheelAxes: true,
            wheelPropagation: true,
            suppressScrollY:  true
        });

        this.selectors.leftLayerWrapper.perfectScrollbar({
            useBothWheelAxes: true,
            wheelPropagation: true,
            suppressScrollX:  true
        });
    },

    /**
     * Resize Events
     *
     * @param {Optional|Boolean} centerScroll
     * @todo Fix Sidebar height determination
     */
    resizeEvents: function(centerScroll)
    {
        this.shiftRulers();

        var editWrapper     = this.selectors.editWrapper,
            windWidth       = window.offsetWidth,
            windHeight      = window.offsetHeight,
            wrapWidth       = editWrapper.outerWidth - 2;

        centerScroll = centerScroll === undefined || centerScroll === true;

        var layersOuterWrapperHeight = jQuery(editWrapper).height();

        if(this.selectors.masterTimeWrapper)
        {
            this.selectors.masterTimeWrapper.style.maxWidth = wrapWidth + 'px';
        }

        this.params.canvasOptions.outerCanvasDimensions = {
            'width':    windWidth,
            'height':   layersOuterWrapperHeight - 40 + "px"
        };

        this.selectors.keyboardPanel.kbdPanel.css({
            'height': layersOuterWrapperHeight - 40 + "px"
        });

        this.updateScrollbars();
        FTXCanvasGuides.resizeGuides();
        FTXLayerPanel.resetPanelHeight();

        if(centerScroll === true)
        {
            this.centerCanvasScroll('center', true);
        }

        this.data.window = {
            width:  windWidth,
            height: windHeight
        };
    },

    /**
     * Reset Container Height
     */
    resetContainerHeight: function()
    {
        var outerWrapper    = this.selectors.layersOuterWrapper,
            editWrapper     = this.selectors.editWrapper,
            windWidth       = window.offsetWidth,
            windHeight      = window.offsetHeight,
            wrapWidth       = editWrapper.outerWidth - 2;

        var layersOuterWrapperHeight = jQuery(editWrapper).height();

        outerWrapper.style.width    = windWidth + 'px';
        outerWrapper.style.height   = layersOuterWrapperHeight - 40 + 'px';
    },

    /**
     * Update Scrollbars
     *
     */
    updateScrollbars: function()
    {
        jQuery(this.selectors.layersOuterWrapper).perfectScrollbar('update');
    },

    /**
     * Listen for Toolbar Updates for Text Layer
     *
     * @param event
     */
    syncLayerWithControlsListener: function(event)
    {
        var layer           = jQuery(event.target),
            controls        = FTXCanvas.selectors.controls,
            updatedWidth    = layer.width(),
            updatedHeight   = layer.height(),
            transform       = layer.css('transform'),
            rotation        = FTXCanvasTransform.getElementRotationAngle(layer.get(0));

        FTXCanvasTransform.setElementSettings(layer, {
            _p: {
                cwid:   updatedWidth,
                chgt:   updatedHeight,
                width:  updatedWidth,
                height: updatedHeight
            },
            angle: rotation
        });

        FTXCanvasTransform.setElementSettings(controls, {
            _p: {
                cwid:   updatedWidth,
                chgt:   updatedHeight,
                width:  updatedWidth,
                height: updatedHeight
            },
            angle:      rotation
            //x:          left,
        });

        jQuery(controls).css({
            width:      updatedWidth,
            height:     updatedHeight,
            transform:  transform
        });
    },

    /**
     * Add Layer
     *
     * @param layerObj
     * @param helperElement
     * @param setSelected
     * @param history
     */
    addLayer: function(layerObj, helperElement, setSelected, history)
    {
        var layerDefaults   = jQuery.extend(true, {}, this.layerDefaults),
            layerCount      = this.getLayerCountByElements(),
            layerId         = ((typeof layerObj.layerId !== 'undefined' && layerObj.layerId !== '') ? layerObj.layerId : this.generateIdentifier()),
            objLayer        = jQuery.extend(true, layerDefaults, layerObj),
            helper          = ((typeof helperElement !== 'undefined' && helperElement) ? helperElement : false),
            setSelection    = ((typeof setSelected !== 'undefined' || setSelected) ? setSelected : true),
            layerIndex      = layerCount + 1;

        // Check if layer has purchased stock photo
        // if(layerObj.layerType === 'image' && layerObj.image.imageType === 'dp-comp-image')
        // {
        //     FTXStockPhotos.checkIfCompImageIsPurchased(layerObj.image.galleryRel, layerObj.image.imageSize, layerId);
        // }

        // Check layer is null or not (delete this at last if no one un-comment)
        if(!layerObj.layerIndex)
        {
            // If layerIndex is null then check if groupLayerIndex is null or not
            if(layerObj.groupLayerIndex)
            {
                layerIndex = layerObj.groupLayerIndex;
            }
        }
        else
        {
            layerIndex = layerObj.layerIndex
        }

        if(this.getLayerElementById(layerId))
        {
            return false;
        }

        // Get inner layer contents
        var innerLayer = this.getLayerInnerContents(objLayer, helper, layerId);

        // Create layer wrapper, append the contents
        var newLayer                    = document.createElement('div');
            newLayer.id                 = 'slide_layer_' + layerId;
            newLayer.className          = 'slide_layer slide_layer_type_' + objLayer.layerType;
            newLayer.innerHTML          = innerLayer;
            newLayer.style.display      = 'block';
            newLayer.style.visibility   = 'hidden';

        if(objLayer.layerType == 'image' && objLayer.shape)
        {
            var shapeClipPath = window['loadedClipPathShapes'][objLayer.shape]['shapeClipPath'];
            
            newLayer.classList.add(shapeClipPath);
        }

        _.each(this.data.cornerElements, function(val,index)
        {
            var corner = document.createElement('div');

            corner.className = val + ' corner';
            newLayer.appendChild(corner);
        });

        // Append to divLayers element
        this.selectors.divLayers.appendChild(newLayer);

        // Set layer ID attribute on layer
        newLayer.setAttribute('data-layer-id', layerId);

        // Set styles after appending layer
        newLayer.style.display          = '';
        newLayer.style.visibility       = '';
        newLayer.style.position         = 'absolute';
        newLayer.style.bottom           = 'auto';
        newLayer.style.right            = 'auto';
        newLayer.style.zIndex           = 100 + layerIndex;
        newLayer.style.letterSpacing    = objLayer.layerTextOptions.letterSpacing;
        newLayer.style.lineHeight       = objLayer.layerTextOptions.lineHeight;
        newLayer.style.fontSize         = ((objLayer.layerTextOptions !== undefined && objLayer.layerTextOptions.fontSize !== undefined) ? objLayer.layerTextOptions.fontSize : '');
        newLayer.style.mixBlendMode     = (objLayer.blendMode !== undefined ? objLayer.blendMode : 'normal');

        /*if(objLayer.groupId != undefined && objLayer.groupId != '')
        {
            //newLayer.classList.add('groupedElement ' +  this.getGroupClassName(objLayer.groupId));
            // newLayer.addClass('groupedElement ' + this.getGroupClassName(objLayer.groupId));
        }*/

        // Get Outer layer outer
        var outerLayer  = newLayer.querySelector('.outerslide_layer');

        if(objLayer.layerFlip !== undefined && objLayer.layerFlip !== '')
        {
            outerLayer.classList.add(objLayer.layerFlip);
        }

        // Merge layer ID and index to layerObj
        objLayer = jQuery.extend(true, objLayer, {
            layerId:    layerId,
            layerIndex: layerIndex
        });

        FTXCanvasTransform._setDefaultSettings(jQuery(newLayer));

        objLayer = this.applyOnAddLayer(jQuery(newLayer), objLayer, helper);

        this.layers[layerId] = objLayer;

        this.refreshEvents(layerId, setSelection);

        // Add layer state to history including entire layerObj
        if(typeof history !== 'undefined' && history)
        {
            this.addLayerStateToHistory(objLayer, objLayer, objLayer.layerType + ' Layer Added', 'add');
        }

        if(this.data.mergeGroup)
        {
            newLayer.classList.add("layer_selected");
            this.data.selectedLayers.push(layerId);
        }

        setTimeout(function()
        {
            FTXLayerPanel.updateLayerListFromLayers();
            FTXLayerPanel.updateLayerInfo(false);
        }, 0);

        if(typeof FTXCanvasAnimation !== 'undefined')
        {
            FTXLayerPanel.updateSingleLayerSlidersByFactor(layerId, FTXCanvas.params.animationTimelineFactor);
        }

        return objLayer;
    },

    /**
     * Update Layer Info With Purchased Comp Image Data
     *
     * @param {String} layerId
     * @param {Number} uploadId
     */
    updateCompLayerWithUploadsData: function (layerId, uploadId)
    {
        var layer;

        if(layerId instanceof Array)
        {
            for(var l = 0; l < layerId.length; l++)
            {
                layer = this.getLayerById(layerId[l]);

                if(layer)
                {
                    layer.image.imageType   = 'upload';
                    layer.image.galleryRel  = uploadId;

                    delete layer.image.original;
                    delete layer.image.stockItem;

                    this.getLayerInnerContents(layer, null, layerId);
                }

            }
        }
        else
        {
            layer = this.getLayerById(layerId);

            if(layer)
            {
                layer.image.imageType   = 'upload';
                layer.image.galleryRel  = uploadId;

                delete layer.image.original;

                this.getLayerInnerContents(layer, null, layerId);
            }
        }
    },

    /**
     * Get Layer Inner Content
     *
     * @param objLayer
     * @param helper
     * @param {String} layerId
     * @returns {String}
     */
    getLayerInnerContents: function(objLayer, helper, layerId)
    {
        var context     = this,
            dimensions  = {
            'height':   ((objLayer.dimensions !== undefined && objLayer.dimensions.height !== '') ? objLayer.dimensions.height : false),
            'width':    ((objLayer.dimensions !== undefined && objLayer.dimensions.width !== '') ? objLayer.dimensions.width : false)
        }, mediaSource;

        var html =  '<div class="lock-layer-icon">';

        html += '<i class="fas fa-lock"></i>';

            html += '</div>';

            html += '<div class="outerslide_layer">';

        var mediaId,
            existingAssetUrl;

        switch(objLayer.layerType)
        {
            case 'text':

                html += '<div class="innerslide_layer tp-caption">';

                if(typeof objLayer.layerText !== 'undefined' || objLayer.layerText !== '')
                {
                    html += objLayer.layerText;
                }
                else
                {
                    html += '<p>' + objLayer.default + '</p>';
                }

                break;

            case 'icon':

                html += '<div class="innerslide_layer tp-icon">';
                html += objLayer.layerText;
                break;

            case 'image':

                html += '<div class="innerslide_layer tp-image">';

                var img         = jQuery('<img>'),
                    mediaType   = objLayer.image.imageType;

                mediaId             = objLayer.image.galleryRel;
                existingAssetUrl    = objLayer.image.assetSource;

                if(mediaId === 'dp-comp-image' || mediaType === 'dp-comp-image')
                {
                    img.attr('src', objLayer.image.original);

                    if(objLayer.image.hasOwnProperty('stockItem'))
                    {
                        // Add item to cart
                        var cartItem = objLayer.image.stockItem;

                        cartItem.layerId        = layerId;
                        cartItem.cartType       = 'comp';
                        cartItem.size           = objLayer.image.imageSize;
                        cartItem.folderId       = '';
                        cartItem.folderName     = '';

                        if(!cartItem.hasOwnProperty('is_purchased'))
                        {
                            FTXStockPhotosCart.addItemToCartArray(cartItem);
                        }
                        else if(!cartItem['is_purchased'].hasOwnProperty(objLayer.image.imageSize))
                        {
                            FTXStockPhotosCart.addItemToCartArray(cartItem);
                        }
                    }
                }
                else if(typeof existingAssetUrl !== 'undefined' && existingAssetUrl !== '')
                {
                    img.attr('src', existingAssetUrl);
                }
                else if(mediaId !== '')
                {
                    switch(mediaType)
                    {
                        case 'library':

                            mediaSource = FTXCanvasSidebar.getMediaSourceById(mediaId, 'image');
                            break;

                        case 'upload':

                            mediaSource = FTXCanvasUpload.getUploadSourceById(mediaId);
                            break;
                    }

                    img.attr('src', mediaSource);

                    var params = {
                        designId:   FTXCanvasSidebar.data.design.id,
                        section:    mediaType,
                        id:         mediaId,
                        type:       this.designType
                    };

                    this.runRequest(this.data.assetSaveUrl, 'POST', params, true, function(response, responseText)
                    {
                        if(responseText && responseText.status && responseText.assetUrl)
                        {
                            var checkInterval = setInterval(function()
                            {
                                var layerEl     = context.getLayerElementById(layerId),
                                    layerObj    = context.getLayerById(layerId);

                                if(layerEl)
                                {
                                    var layerImg = layerEl.find('img');

                                    clearInterval(checkInterval);

                                    if(layerImg)
                                    {
                                        layerImg.attr('src', responseText.assetUrl);
                                        layerObj.image = {
                                            imageType:      mediaType,
                                            assetId:        responseText.assetId,
                                            assetSource:    responseText.assetUrl
                                        };
                                    }
                                }
                            }, 10);
                        }
                        else if(!responseText.status && responseText.message)
                        {
                            swal('Clone failed', responseText.message, 'error');
                        }
                    });

                    /*
                    console.log("media type", mediaType);
                    switch(mediaType)
                    {
                        case 'library':

                            mediaItem = FTXCanvasSidebar.getMediaSourceById(mediaId, 'image');
                            break;

                        case 'upload':

                            console.log(mediaId);
                            mediaItem = FTXCanvasUpload.getUploadSourceById(mediaId);
                            console.log(mediaItem);
                            break;
                    }

                    // If image base64 is available otherwise get from media item
                    if(typeof objLayer.image.base64 != 'undefined' && objLayer.image.base64 != '')
                    {
                        img.attr('src', objLayer.image.base64);
                    }
                    else if(mediaItem)
                    {
                        img.attr('src', mediaItem);
                        img.attr('unique-base64-id', uniqueImgId);

                        console.log(uniqueImgId);

                        // Update the base64 src in image
                        img.get(0).onload = (function(context, layerId, uniqueImgId)
                        {
                            return function()
                            {
                                var image       = document.querySelector('img[unique-base64-id="'+uniqueImgId+'"]'),
                                    base64Src   = context.getBase64Image(this),
                                    objLayerImg = context.layers[layerId].image;
                                console.log('image', image);
                                console.log('layerId', layerId);
                                console.log("layers", jQuery.extend(true, {}, context.layers));

                                objLayerImg['base64'] = base64Src;

                                if(image)
                                {
                                    image.src = base64Src;
                                    image.removeAttribute('unique-base64-id');
                                }

                                this.onload = null;
                            }
                        }(context, layerId, uniqueImgId));

                        // Handle image error
                        img.get(0).onerror = (function(objLayer)
                        {
                            return function()
                            {
                                if(typeof objLayer.image.base64 != 'undefined' && objLayer.image.base64 != '')
                                {
                                    this.src = objLayer.image.base64;
                                }
                            }
                        }(objLayer));
                    }
                    */
                }

                // Update image dimensions
                if(objLayer.image && objLayer.image.dimensions && objLayer.image.position)
                {
                    img.css({
                        width   : objLayer.image.dimensions.width,
                        height  : objLayer.image.dimensions.height,
                        left    : objLayer.image.position.left,
                        top     : objLayer.image.position.top
                    });
                }
                else
                {
                    img.css({
                        width   : (dimensions.width && dimensions.width > 0) ? dimensions.width : '',
                        height  : (dimensions.height && dimensions.height > 0) ? dimensions.height : '',
                        left    : 0,
                        top     : 0
                    });
                }

                html += img.get(0).outerHTML;

                break;

            case 'shape':

                html += '<div class="innerslide_layer tp-shape">';

                mediaId = objLayer.image.galleryRel;

                if(typeof objLayer.svgParams.content !== 'undefined' && objLayer.svgParams.content !== '')
                {
                    var svgContent      = objLayer.svgParams.content,
                        svgContentEl    = jQuery(svgContent);

                    // Remove any previously stored style properties
                    svgContentEl.removeAttr('style');

                    // Set height and width
                    svgContentEl.get(0).setAttribute('width', (dimensions.width && dimensions.width > 0) ? dimensions.width : 200);
                    svgContentEl.get(0).setAttribute('height', (dimensions.height && dimensions.height > 0) ? dimensions.height : '');
                    svgContentEl.get(0).setAttribute('preserveAspectRatio', 'none');
                    html += svgContentEl.get(0).outerHTML;
                }
                else
                {
                    // If the SVG element is already loaded, we will grab from a local cached version
                    if(typeof this.data.libraryMedia[mediaId] !== 'undefined' && this.data.libraryMedia[mediaId] != null)
                    {
                        // Grab the asset from local cache
                        var storedAsset             = jQuery(this.data.libraryMedia[mediaId]),
                            storedSVG               = storedAsset.eq(0);

                        // If it's found, we set it's dimensions and grab the outerHTML
                        if(storedSVG)
                        {
                            var svgHtml;
                            // Remove any previously stored style properties
                            storedSVG.removeAttr('style');

                            // Set height and width
                            storedSVG.get(0).setAttribute('width', (dimensions.width && dimensions.width > 0) ? dimensions.width : 200);
                            storedSVG.get(0).setAttribute('height', (dimensions.height && dimensions.height > 0) ? dimensions.height : '');
                            storedSVG.get(0).setAttribute('preserveAspectRatio', 'none');

                            svgHtml = objLayer.svgParams.content = storedSVG.get(0).outerHTML;

                            html += svgHtml;
                        }
                    }
                    else
                    {
                        if(mediaId !== '')
                        {
                            mediaItem = FTXCanvasSidebar.getMediaSourceById(mediaId, 'svg');

                            console.log("media item SVG else", mediaItem);

                            if(mediaItem)
                            {
                                var xhr = new XMLHttpRequest();
                                xhr.open("GET", mediaItem, false);
                                xhr.overrideMimeType("image/svg+xml");
                                xhr.send("");

                                if(xhr.responseXML != null)
                                {
                                    var svgEl = xhr.responseXML.documentElement;

                                    // Set height and width
                                    svgEl.setAttribute('width', (dimensions.width && dimensions.width > 0) ? dimensions.width : 200);
                                    svgEl.setAttribute('height', (dimensions.height && dimensions.height > 0) ? dimensions.height : '');
                                    svgEl.setAttribute('preserveAspectRatio', 'none');

                                    // Grab html as string
                                    var svgHtml = new XMLSerializer().serializeToString(svgEl);

                                    this.data.libraryMedia[mediaId] = svgHtml;

                                    objLayer.svgParams.content = svgHtml;

                                    html += svgHtml;
                                }
                            }
                        }
                    }
                }

                break;

            case 'grid':

                html += '<div class="innerslide_layer tp-grid">';

                var gridRows = jQuery('<div id="rows" class="rows">');

                gridRows.css({
                    'width'         : (dimensions.width && dimensions.width > 0) ? dimensions.width : '',
                    'height'        : (dimensions.height && dimensions.height > 0) ? dimensions.height : '',
                    'borderWidth'   : (objLayer.grid && objLayer.grid.borderSpacing) ? objLayer.grid.borderSpacing + 'px': '0px',
                });

                gridRows.html(FTXCanvasGrid.getGridHtml(objLayer.grid.items, objLayer.grid.spacing, objLayer.grid.borderSpacing));

                html += gridRows.get(0).outerHTML;

                break;

            case 'gradient':

                html += '<div class="innerslide_layer tp-gradient">';

                var background  = objLayer.gradient,
                    shape       = window['loadedClipPathShapes'][objLayer.shape] ? window['loadedClipPathShapes'][objLayer.shape]['shapeClipPath'] : window['loadedClipPathShapes'][background.shape]['shapeClipPath'],
                    gradient    = jQuery('<div class="gradient '+ shape +'">');

                gradient.css({
                    'width'             : (dimensions.width && dimensions.width > 0) ? dimensions.width : '',
                    'height'            : (dimensions.height && dimensions.height > 0) ? dimensions.height : '',
                    'background'        : background.color,
                    'background-image'  : background.image
                });

                html += gradient.get(0).outerHTML;

                break;
        }

        html += '</div>';

        html += '</div>';

        return html;
    },

    /**
     * Apply Changes on Add Layer
     *
     * @param layer
     * @param layerObj
     * @param helper
     * @returns {*}
     */
    applyOnAddLayer: function(layer, layerObj, helper)
    {
        var context             = this,
            elemTopLeft         = this.getElementCanvasCenter(layer.width(), layer.height()),
            positionFromLeft    = this.setLayerPositionLeft(layerObj, helper, elemTopLeft),
            positionFromTop     = this.setLayerPositionTop(layerObj, helper, elemTopLeft),
            objLayer            = null,
            userPreferences     = FTXCanvasUserPrefs.userPreferences,
            layerOpacity        = (layerObj.opacity !== undefined ? (layerObj.opacity) : '1');

        var rotation = (layerObj.rotation.angle === undefined ? this.layerDefaults.rotation.angle : layerObj.rotation.angle);

        this.setElementTransform(layer, {
            'scaleX':   1,
            'scaleY':   1,
            'top':      positionFromTop,
            'left':     positionFromLeft,
            'rotation': rotation
        }, false);

        objLayer = jQuery.extend(true, layerObj, {
            position: {
                x: positionFromLeft,
                y: positionFromTop
            }
        });

        // Initialize freetrans data for new layers
        /*FTXCanvasTransform.setElementSettings(layer, {
            x: positionFromLeft,
            y: positionFromTop
        });*/

        switch(layerObj.layerType)
        {
            case 'text':

                layer.css({
                    'opacity': layerOpacity
                });

                var fonts = FTXCanvasUtils.findAttributeFromHtmlString(layerObj.layerText);

                _.each(fonts, function(font)
                {
                    FTXLayerToolbar.getInstanceByType('text').getExtension('fontFamily').loadFontOnElement(null, font, function()
                    {
                        updateLayerAfterFontload(layer, layerObj);
                        FTXCanvas.dispatchSyncLayer(layer);
                    });
                });

                // Set text effect on layer
                textEffectExtension.setTextEffect(layer, layerObj.layerTextOptions.textEffect);

                break;

            case 'image':

                layer.css({
                    'opacity': layerOpacity
                });

                if(helper && helper instanceof jQuery)
                {
                    layer.css({
                        width:  helper.width(),
                        height: helper.height()
                    });
                }
                else
                {
                    layer.css({
                        width   : layerObj.dimensions.width,
                        height  : layerObj.dimensions.height
                    });
                }

                break;

            case 'shape':

                layer.css({
                    'opacity': layerOpacity,
                    'display': 'block'
                });

                if(layerObj)
                {
                    colorpickerShapeExtension.updateLayerShapeColors(layerObj);
                }

                break;

            case 'icon':

                layer.css({
                    'line-height': '100%'
                });

                layer.css({
                    'opacity': layerOpacity
                });

                break;

            case 'grid':

                layer.css({
                    width   :  layerObj.dimensions.width,
                    height  : layerObj.dimensions.height
                });

                var gridContent = layer.find('.item .content'),
                    gridSpacing = (layerObj.grid && layerObj.grid.spacing)? layerObj.grid.spacing : '3px';

                gridContent.css({
                    left:   gridSpacing,
                    right:  gridSpacing,
                    top:    gridSpacing,
                    bottom: gridSpacing,
                });

                break;

            case 'gradient':

                layer.css({
                    width   :  layerObj.dimensions.width,
                    height  : layerObj.dimensions.height
                });

                break;
        }

        // Set timeout to force different paint for layer controls
        setTimeout(function()
        {
            if(context.getSelectedLayerCount(true) < 1)
            {
                FTXCanvas.dispatchSyncLayer(layer);
            }

            // Remove width and height from layer after control sync
            if(!layer.hasClass('slide_layer_type_image'))
            {
                layer.css({
                    'width' : '',
                    'height': ''
                });
            }
        }, 0);

        /**
         * Update Layer After Font Loaded
         *
         * @param layer
         */
        function updateLayerAfterFontload(layer)
        {
            var layerBounds = layer.get(0).getBoundingClientRect();

            if(typeof rotation !== 'undefined' && rotation !== "0deg")
            {
                layerBounds = {
                    width :   layer.width(),
                    height :  layer.height()
                };
            }

            objLayer = context.recursiveMerge(objLayer, {
                dimensions: {
                    width:  layerBounds.width,
                    height: layerBounds.height
                }
            });

            /*FTXCanvasTransform.setElementSettings(layer, {
                _p: {
                    cwid:    layerBounds.width,
                    chgt:    layerBounds.height,
                    width:   layerBounds.width,
                    height:  layerBounds.height
                }
            });*/

            if(FTXCanvas.getSelectedLayerCount() === 1)
            {
                FTXCanvasTransform.updateContainerFromLayer(layer);
            }

            context.storeZoomState(layerObj.layerId, {
                width:      layerBounds.width,
                height:     layerBounds.height
            });
        }

        // Store state for zoom to begin processing old values
        this.storeZoomState(layerObj.layerId, {
            x:          layerObj.position.x,
            y:          layerObj.position.y,
            width:      layerObj.dimensions.width,
            height:     layerObj.dimensions.height,
            fontSize:   parseFloat(layerObj.layerTextOptions.fontSize)
        });

        return objLayer ? objLayer : layerObj;
    },

    /**
     * Set Layer Position Left
     *
     * @param layerObj
     * @param helper
     * @param elemTopLeft
     * @returns {*}
     */
    setLayerPositionLeft: function(layerObj, helper, elemTopLeft)
    {
        var divLayers = this.getElementOffset(this.selectors.divLayers);

        // If position is undefined, or null, we will use the center position to place element x
        if(layerObj.position === undefined || layerObj.position.x === undefined || layerObj.position.x == null)
        {
            return elemTopLeft.left;
        }
        else
        {
            if(helper)
            {
                return layerObj.position.x - divLayers.left;
            }
            else
            {
                return layerObj.position.x;
            }
        }
    },

    /**
     * Set Layer Position Top
     *
     * @param layerObj
     * @param helper
     * @param elemTopLeft
     * @returns {*}
     */
    setLayerPositionTop: function(layerObj, helper, elemTopLeft)
    {
        var divLayers = this.getElementOffset(this.selectors.divLayers);

        // If position is undefined, or null, we will use the center position to place element y
        if(layerObj.position === undefined || layerObj.position.y === undefined || layerObj.position.y == null)
        {
            return elemTopLeft.top;
        }
        else
        {
            if(helper)
            {
                return layerObj.position.y - divLayers.top;
            }
            else
            {
                return layerObj.position.y;
            }
        }
    },

    /**
     * Add Layer With Zoom State
     *
     * @param layerObj
     * @param helper
     * @param setSelected
     * @param history
     * @param fromLayerObj
     */
    addLayerWithZoomState: function(layerObj, helper, setSelected, history, fromLayerObj)
    {
        var newLayer, newObj, clonedLayerObj, refactoredObj;

        if(fromLayerObj !== 'undefined' && fromLayerObj)
        {
            clonedLayerObj  = this.recursiveMerge({}, layerObj);
            refactoredObj   = this.refactorLayerObjByZoom(clonedLayerObj, 'multiply');
            newLayer        = this.addLayer(refactoredObj, helper, setSelected, false);
            newObj          = this.recursiveMerge({}, newLayer);

            this.storeZoomStateByLayerObj(refactoredObj);

            if(typeof newObj.layerId !== 'undefined')
            {
                this.layers[newObj.layerId] = layerObj;

                if(typeof history === 'undefined' || history)
                {
                    this.addLayerStateToHistory(clonedLayerObj, clonedLayerObj, newObj.layerType + ' Layer Added', 'add');
                }
            }
        }
        else
        {
            newLayer        = this.addLayer(layerObj, helper, setSelected, false);
            newObj          = this.recursiveMerge({}, newLayer);
            refactoredObj   = this.refactorLayerObjByZoom(newObj, 'divide');

            this.storeZoomStateByLayerObj(layerObj);

            FTXCanvasMagicResize.addReferenceDimensionsForNewLayer(refactoredObj);

            if(typeof newObj.layerId !== 'undefined')
            {
                this.layers[newObj.layerId] = refactoredObj;

                if(typeof history === 'undefined' || history)
                {
                    this.addLayerStateToHistory(refactoredObj, refactoredObj, newObj.layerType +' Layer Added', 'add');
                }
            }
        }

        setTimeout(function()
        {
            if(FTXCanvas.getSelectedLayerCount() > 0 && newObj.layerType === 'text')
            {
                FTXEditorToolbar.highlightSelectedElement();
            }
        }, 500);
    },

    /**
     * Add Multiple Layers
     *
     * @param layerObjs
     * @param useZoom
     * @returns {Boolean}
     */
    addLayers: function(layerObjs, useZoom)
    {
        if(layerObjs instanceof Array)
        {
            for(var l = 0; l < layerObjs.length; l++)
            {
                if(typeof useZoom !== 'undefined' && useZoom)
                {
                    this.addLayerWithZoomState(layerObjs[l], false, false, false, true);
                    FTXLayerPanel.data.layerNames.push(layerObjs[l].layerName);
                }
                else
                {
                    this.addLayer(layerObjs[l], false, false);
                    FTXLayerPanel.data.layerNames.push(layerObjs[l].layerName);
                    this.addLayerToInitialHistory(layerObjs[l], 'layer_add_' + layerObjs[l].layerType, 'add');
                }
            }
        }
        else if(layerObjs instanceof Object)
        {
            if(typeof useZoom !== 'undefined' && useZoom)
            {
                this.addLayerWithZoomState(layerObjs, false, false, false, true);
                FTXLayerPanel.data.layerNames.push(layerObjs.layerName);
            }
            else
            {
                this.addLayer(layerObjs, false, false);
                FTXLayerPanel.data.layerNames.push(layerObjs.layerName);
                this.addLayerToInitialHistory(layerObjs, 'layer_add_' + layerObjs.layerType, 'add');
            }
        }
        this.deselectAllLayers();
    },

    /**
     * Update Layer
     *
     * @param {String} layerId
     * @param type
     * @param layerObj
     * @param history
     */
    updateLayer: function(layerId, type, layerObj, history)
    {
        var objLayer            = this.getLayerById(layerId),
            newObj              = this.recursiveMerge({}, layerObj),
            oldObj              = this.recursiveMerge({}, objLayer),
            selectedLayer       = this.getSelectedLayerElement(),
            selectedLayerType   = this.getSelectedLayerType();

        if(!layerId || !objLayer)
        {
            return false;
        }

        if(selectedLayer && selectedLayerType === 'text' && type !== 'group')
        {
            selectedLayer.get(0).addEventListener('syncControlsWithLayer', function (event)
            {
                FTXCanvas.syncLayerWithControlsListener(event);
            }, false);
        }

        if(this.getZoomValue() !== 1)
        {
            layerObj = this.refactorFromZoomAmount(newObj, oldObj);
        }

        objLayer = this.recursiveMerge(objLayer, layerObj);

        if(layerObj.hasOwnProperty('layerTextOptions')
            || layerObj.hasOwnProperty('position')
            || layerObj.hasOwnProperty('rotation')
            || layerObj.hasOwnProperty('dimensions'))
        {
            FTXCanvasMagicResize.updatePositionDiffForChange(newObj, oldObj, objLayer);
        }

        if(layerObj.hasOwnProperty('dimensions') && type != "Image Cropped")
        {
            FTXImageCrop.updateUnCropImageSize(newObj, oldObj, objLayer);
        }

        // Add layer state to history including entire layerObj
        if(typeof history === 'undefined' || history)
        {
            this.addLayerStateToHistory(objLayer, oldObj, type, 'update');
        }

        this.layers[objLayer.layerId] = objLayer;
    },

    /**
     * Refactor From Zoom Amount
     *
     * @param newObj
     * @param oldObj
     * @returns {*}
     */
    refactorFromZoomAmount: function(newObj, oldObj)
    {
        var refactoredObject    = {},
            zoomState           = this.getZoomState(oldObj.layerId);

        if(!zoomState)
        {
            return oldObj;
        }

        if(typeof newObj.position !== 'undefined')
        {
            var newPosition = newObj.position;

            if(typeof newPosition.x !== 'undefined' || typeof newPosition.y !== 'undefined')
            {
                refactoredObject.position = {};
            }

            if(typeof newPosition.x !== 'undefined' && oldObj.position.x !== 'undefined')
            {
                refactoredObject.position.x = this.getRefactoredZoomValue(oldObj.position.x, zoomState.x, newPosition.x);
            }

            if(typeof newPosition.y !== 'undefined' && oldObj.position.y !== 'undefined')
            {
                refactoredObject.position.y = this.getRefactoredZoomValue(oldObj.position.y, zoomState.y, newPosition.y);
            }
        }

        if(typeof newObj.dimensions !== 'undefined')
        {
            var newDimensions = newObj.dimensions;

            if(typeof newDimensions.width !== 'undefined' || typeof newDimensions.height !== 'undefined')
            {
                refactoredObject.dimensions = {};
            }

            if(typeof newDimensions.width !== 'undefined' && oldObj.dimensions.width !== 'undefined')
            {
                refactoredObject.dimensions.width = this.getRefactoredZoomValue(oldObj.dimensions.width, zoomState.width, newDimensions.width);
            }

            if(typeof newDimensions.height !== 'undefined' && oldObj.dimensions.height !== 'undefined')
            {
                refactoredObject.dimensions.height = this.getRefactoredZoomValue(oldObj.dimensions.height, zoomState.height, newDimensions.height);
            }
        }

        if(typeof newObj.layerTextOptions !== 'undefined')
        {
            if(typeof newObj.layerTextOptions.fontSize !== 'undefined')
            {
                if(typeof refactoredObject.layerTextOptions === 'undefined')
                {
                    refactoredObject.layerTextOptions = {};
                }

                refactoredObject.layerTextOptions.fontSize = this.getRefactoredZoomValue(parseInt(oldObj.layerTextOptions.fontSize), parseInt(zoomState.fontSize), parseInt(newObj.layerTextOptions.fontSize)) + '%';
            }
        }
        return this.recursiveMerge(newObj, refactoredObject);
    },

    /**
     * Get Zoom Refactored Value using Old/New
     *
     * @param originalValue
     * @param oldValue
     * @param newValue
     * @returns {number}
     */
    getRefactoredZoomValue: function(originalValue, oldValue, newValue)
    {
        var difference      = newValue - (oldValue ? oldValue : 0),
            absDifference   = Math.abs(difference),
            zoomValue       = this.getZoomValue(),
            finalDifference;

            finalDifference = absDifference / zoomValue;

        return originalValue + (difference < 0 ? -finalDifference : finalDifference);
    },

    /**
     * Refactor Layer Obj by Zoom
     *
     * @param layerObj
     * @param type
     * @returns {*}
     */
    refactorLayerObjByZoom: function(layerObj, type)
    {
        var cloneObj        = jQuery.extend(true, {}, layerObj),
            zoomVal         = this.getZoomValue(),
            refactoredObj   = {},
            fontSize        = '';

        switch(type)
        {
            case 'multiply':

                if(Object.keys(cloneObj).length > 0)
                {
                    if(cloneObj.layerTextOptions)
                    {
                        fontSize = cloneObj.layerTextOptions.fontSize !== '' ? Math.round(parseInt(cloneObj.layerTextOptions.fontSize) * zoomVal) + '%' : ''
                    }

                    refactoredObj = {
                        layerTextOptions: {
                            fontSize: fontSize
                        },
                        position: {
                            x: Math.round(cloneObj.position.x * zoomVal),
                            y: Math.round(cloneObj.position.y * zoomVal)
                        },
                        dimensions: {
                            width: Math.round(cloneObj.dimensions.width * zoomVal),
                            height: Math.round(cloneObj.dimensions.height * zoomVal)
                        }
                    };

                    if(cloneObj.image && cloneObj.image.dimensions && cloneObj.image.position)
                    {
                        refactoredObj.image = {
                            dimensions: {
                                width:      Math.round(cloneObj.image.dimensions.width * zoomVal),
                                height:     Math.round(cloneObj.image.dimensions.height * zoomVal),
                            },
                            position: {
                                left:       Math.round(cloneObj.image.position.left * zoomVal),
                                top:        Math.round(cloneObj.image.position.top * zoomVal),
                            }
                        }
                    }
                }

                break;

            case 'divide':

                if(Object.keys(cloneObj).length > 0)
                {
                    if(cloneObj.layerTextOptions)
                    {
                        fontSize = cloneObj.layerTextOptions.fontSize !== '' ? Math.round(parseInt(cloneObj.layerTextOptions.fontSize) / zoomVal) + '%' : ''
                    }

                    refactoredObj = {
                        layerTextOptions: {
                            fontSize: fontSize
                        },
                        position: {
                            x: Math.round(cloneObj.position.x / zoomVal),
                            y: Math.round(cloneObj.position.y / zoomVal)
                        },
                        dimensions: {
                            width   : Math.round(cloneObj.dimensions.width / zoomVal),
                            height  : Math.round(cloneObj.dimensions.height / zoomVal)
                        }
                    };

                    if(cloneObj.image && cloneObj.image.dimensions && cloneObj.image.position)
                    {
                        refactoredObj.image = {
                            dimensions: {
                                width   : Math.round(cloneObj.image.dimensions.width / zoomVal),
                                height  : Math.round(cloneObj.image.dimensions.height / zoomVal),
                            },
                            position: {
                                left: Math.round(cloneObj.image.position.left / zoomVal),
                                top : Math.round(cloneObj.image.position.top / zoomVal),
                            }
                        }
                    }
                }

                break;
        }

        return this.recursiveMerge(layerObj, refactoredObj);
    },

    /**
     * Refactor Guide Obj by Zoom
     *
     * @param guideObj
     * @param type
     * @returns {*}
     */
    refactorGuideObjByZoom: function(guideObj, type)
    {
        var cloneObj        = jQuery.extend(true, {}, guideObj),
            zoomVal         = this.getZoomValue(),
            refactoredObj   = {};

        switch(type)
        {
            case 'multiply':

                refactoredObj = {
                    x: Math.round(cloneObj.x * zoomVal),
                    y: Math.round(cloneObj.y * zoomVal)
                }

                break;

            case 'divide':

                refactoredObj = {
                    x: Math.round(cloneObj.x / zoomVal),
                    y: Math.round(cloneObj.y / zoomVal)
                }

                break;
        }

        return this.recursiveMerge(guideObj, refactoredObj);
    },

    /**
     * Pre-Load Fonts
     *
     * @param fontArray
     */
    preloadFonts: function(fontArray)
    {
        if(fontArray && fontArray.length)
        {
            var fontArrayLength = fontArray.length;

            for(var i = 0; i < fontArrayLength; i++)
            {
                var fontToLoad = fontArray[i];

                var WebFontConfig = {
                    custom: {
                        families:   [fontToLoad['variant']],
                        urls:       [fontToLoad['fontUrl']]
                    }
                };

                WebFont.load(WebFontConfig);
            }
        }
    },

    /**
     * Get Factored Zoom Value
     *
     * @param value
     * @returns {number}
     */
    factorByZoom: function(value)
    {
        var zoomFactor = this.getZoomValue();
        return value * zoomFactor;
    },

    /**
     * Add Distance to Layer Object
     *
     * @param layerObj
     * @param left
     * @param top
     */
    addDistanceToLayerObject: function(layerObj, left, top)
    {
        if(layerObj !== undefined)
        {
            if(typeof left !== 'undefined' && this.isNumeric(left))
            {
                layerObj.position.x = layerObj.position.x + parseInt(left);

                if(layerObj._p)
                {
                    layerObj._p.position.x = layerObj._p.position.x + parseInt(left);
                }
            }

            if(typeof top !== 'undefined' && this.isNumeric(top))
            {
                layerObj.position.y = layerObj.position.y + parseInt(top);

                if(layerObj._p)
                {
                    layerObj._p.position.y = layerObj._p.position.y + parseInt(top);
                }
            }

        }

        return layerObj;
    },

    /**
     * Get Layers
     *
     * @returns {*}
     */
    getLayerElements: function(excludeGroupLayers)
    {
        var layerArray;

        if(typeof excludeGroupLayers !== 'undefined' || excludeGroupLayers)
        {
            layerArray = jQuery('.slide_layer:not(.group_layer), .group');
        }
        else
        {
            layerArray = jQuery('.slide_layer, .group');
        }

        return layerArray;
    },

    /**
     * Get Layers Objects
     *
     * @returns {*}
     */
    getLayersObjsWithOutGroup: function()
    {
        var layers          = this.layers;
            layersLength    = layers.length,
            layersObjs      = {};

        for(var identifier in layers)
        {
            var layerObj = layers[identifier];

            if(layerObj.layerType !== 'group')
            {
                layersObjs[layerObj.layerId] = layerObj;
            }
        }

        return layersObjs;
    },

    /**
     * Get Layers Objects
     *
     * @returns {*}
     */
    getLayersObjsWithOutGroupItems: function()
    {
        var layers          = this.layers;
            layersLength    = layers.length,
            layersObjs      = {};

        for(var identifier in layers)
        {
            var layerObj = layers[identifier];

            if(layerObj.layerType === 'group' || layerObj.groupId === '')
            {
                layersObjs[layerObj.layerId] = layerObj;
            }
        }

        return layersObjs;
    },


    /**
     * Get Layers Objects
     *
     * @returns {*}
     */
    getLayersObjsOnlyGroupItems: function()
    {
        var layers          = this.layers;
            layersLength    = layers.length,
            layersObjs      = {};

        for(var identifier in layers)
        {
            var layerObj = layers[identifier];

            if(layerObj.layerId !== layerObj.groupId && layerObj.groupId !== '')
            {
                layersObjs[layerObj.layerId] = layerObj;
            }
        }

        return layersObjs;
    },

    /**
     * Get Selected Layers (Optionally include guides)
     *
     * @param excludeGuides
     * @returns {*}
     */
    getSelectedLayers: function(excludeGuides, excludeGroupLayers)
    {
        if (excludeGuides && excludeGroupLayers)
        {
            return jQuery('.groupLayer_selected, .slide_layer.layer_selected:not(.group_layer)');
        }
        else if (excludeGuides && !excludeGroupLayers)
        {
            return jQuery(document.querySelectorAll('.slide_layer.layer_selected'));
        }
        else if (!excludeGuides && excludeGroupLayers)
        {
            return jQuery('.layer_selected:not(.group_layer),.groupLayer_selected, .slide_layer.layer_selected:not(.group_layer)');
        }
        else
        {
            return jQuery(document.querySelectorAll('.layer_selected'));
        }
    },

    /**
     * Get Selected Layers Ids (Optionally include guides)
     *
     * @param excludeGuides
     * @returns {*}
     */
    getSelectedLayersIds: function(excludeGuides, excludeGroupLayers)
    {
        return this.getlayersIdFromLayersElement(this.getSelectedLayers(excludeGuides, excludeGroupLayers));
    },

    /**
     * Get Selected Group Layers
     *
     */
    getSelectedGroups: function()
    {
        return jQuery(document.querySelectorAll('.groupLayer_selected'));
    },

     /**
     * Get Selected Group Ids
     *
     */
    getSelectedGroupsIds: function()
    {
        var groups      = this.getSelectedGroups(),
            groupCount  = groups.length,
            groupIds    = [];

        for(var g = 0; g < groupCount; g++)
        {
            var group   = jQuery(groups[g]),
                groupId = this.getLayerIdFromElement(group);

            groupIds.push(groupId);
        }

        return groupIds;
    },


    /**
     * Get Selected Group Layers
     *
     * @returns {*}
     */
    getSelectedGroupLayer: function()
    {
        var selectedLayer   = this.getSelectedLayers(true),
            layerId         = this.getLayerIdFromElement(selectedLayer[0]),
            layerObj        = this.getLayerById(layerId);

        return this.getGroupLayerById(layerObj.groupId);
    },

    /**
     * Selected Layers Has Type
     *
     * @param type
     * @returns {Boolean}
     */
    selectedLayersHasType: function(type)
    {
        if(typeof type !== 'undefined')
        {
            var selectedLayers = this.data.selectedLayers;

            if(selectedLayers && selectedLayers.length)
            {
                for(var s = 0; s < selectedLayers.length; s++)
                {
                    var layerObj = this.getLayerById(selectedLayers[s]);

                    if(layerObj && layerObj.layerType === type)
                    {
                        return true;
                    }
                }
            }
        }

        return false;
    },

    /**
     * Selected Layers Has Rotation
     *
     * @returns {Boolean}
     */
    selectedLayersHasRotation: function()
    {
        var selectedLayers = this.data.selectedLayers;

        if(selectedLayers && selectedLayers.length)
        {
            for(var s = 0; s < selectedLayers.length; s++)
            {
                var layer = this.getLayerElementById(selectedLayers[s]);

                if(layer)
                {
                    var data    = layer.data('freetrans'),
                        angle   = data.angle;

                    if(angle && angle !== 0)
                    {
                        return true;
                    }
                }
            }
        }

        return false;
    },

    /**
     * Get Layer Count By Elements
     *
     * @returns {*}
     */
    getLayerCountByElements: function()
    {
        return jQuery('.slide_layer:not(.group_layer), .group').length;
    },

    /**
     * Get Unlocked Layer Count
     *
     * @returns {number}
     */
    getUnlockedLayerCount: function()
    {
        return document.querySelectorAll('.slide_layer:not(.locked)').length;
    },

    /**
     * Get Visible Layer Count
     *
     * @returns {number}
     */
    getVisibleLayerCount: function()
    {
        var visibleLayerCount = document.querySelectorAll('.slide_layer:not(.layer-hidden)').length,
            visibleGroupCount = document.querySelectorAll('.group:not(.layer-hidden)').length;

        return visibleLayerCount + visibleGroupCount;
    },

    /**
     * Get Hide Layer Count
     *
     * @returns {number}
     */
    getHideLayerCount: function()
    {
        var hideLayerCount = jQuery('.slide_layer.layer-hidden').length,
            hideGroupCount = jQuery('.group.layer-hidden').length;

        return hideLayerCount + hideGroupCount;
    },

    /**
     * Get Selected Layer Count
     *
     * @returns {*}
     */
    getSelectedLayerCount: function(excludeGuides, includeGroups)
    {
        var context = this;

        function includeGroupCount()
        {
            var layerElements   = jQuery('.groupLayer_selected, .slide_layer.layer_selected:not(.group_layer)'),
                layerIds        = context.getlayersIdFromLayersElement(layerElements);

            return layerIds.length;
        }

        if(excludeGuides && includeGroups)
        {
            return includeGroupCount();
        }
        else if (excludeGuides && !includeGroups)
        {
            return this.data.selectedLayers.length;
        }
        else if (!excludeGuides && includeGroups)
        {
            return FTXCanvasGuides.data.selectedGuides.length + includeGroupCount();
        }
        else
        {
            return this.data.selectedLayers.length + FTXCanvasGuides.data.selectedGuides.length;
        }
    },

    /**
     * total layers count included group and excluded it's layers
     * return total
     */
    getTotalLayersCount: function()
    {
        var layerElements = jQuery('.group, .slide_layer:not(.group_layer)');

        return layerElements.length;
    },

    /**
     * Get group Count
     *
     * @returns {*}
     */
    getSelectedGroupLayerCount: function()
    {
        return document.querySelectorAll('.groupLayer_selected').length;
    },

    /**
     * Get group Count
     *
     * @returns {*}
     */
    getGroupLayerCount: function()
    {
        return document.querySelectorAll('.group').length;
    },

    /**
     * Get All element Count
     *
     * @returns {*}
     */
    getSelectedElementsCount: function()
    {
        return this.data.selectedLayers.length + document.querySelectorAll('.groupLayer_selected').length;
    },

    /**
     * Get groups layres
     *
     * @returns {*}
     */
    getGroupsLayers: function()
    {
        var groups      = [],
            groupsIds   = this.data.groupLayers,
            groupCount  = groupsIds.length;

        if(groupCount)
        {
            for(var i = 0; i < groupCount; i++)
            {
                var groupLayer = this.getGroupLayerById(groupsIds[i]);

                groups.push(groupLayer[0]);
            }
        }

        return groups !== undefined || typeof groups !== 'undefined' ? groups : false;
    },

    /**
     * Get Default Layer Text
     *
     * @returns {*}
     */
    getLayerDefaultText: function(event)
    {
        return jQuery(event).attr('data-default');
    },

    /**
     * Get Default Text Size
     *
     * @returns {*}
     */
    getLayerDefaultTextSize: function(event)
    {
        return jQuery(event).attr('data-size');
    },

    /**
     * Get Selected Layer
     *
     * @returns {*}
     */
    getSelectedLayerElement: function(layerOnly)
    {
        var selectedLayers = this.data.selectedLayers;

        if(selectedLayers.length === 1)
        {
            if(typeof layerOnly !== 'undefined' && layerOnly)
            {
                for(var i = 0; i < this.currentSelection.selectedLayers.length; i++)
                {
                    if(this.currentSelection.selectedLayers[i] && this.currentSelection.selectedLayers[i].classList.contains('slide_layer'))
                    {
                        return jQuery(this.currentSelection.selectedLayers[i]);
                    }
                }
            }

            else
            {
				if(typeof this.currentSelection.selectedLayers === 'undefined')
				{
					return false;
				}
                return jQuery(this.currentSelection.selectedLayers[0]);
            }
        }

        return false;
    },

    /**
     * Check if Element is layer by Finding ID
     *
     * @param {HTMLElement|jQuery} element
     * @returns {Boolean}
     */
    isElementLayer: function(element)
    {
        var layerId     = this.getLayerIdFromElement(element),
            layerObj    = this.getLayerById(layerId);

        return layerObj ? true : false;
    },

    /**
     * Get Selected Layer
     *
     * @returns {*}
     */
    getMultiSelectLayer: function()
    {
        var selected = jQuery(this.selectors.controls);

        if(selected.length === 1)
        {
            return selected;
        }

        return false;
    },

    /**
     * Get Selected Layer Type
     *
     * @returns {*}
     */
    getSelectedLayerType: function()
    {
        var layerId = this.getSelectedLayerId();

        if(layerId)
        {
            var layerObj = this.getLayerById(layerId);

            if(layerObj)
            {
                return layerObj.layerType;
            }
        }

        return null;
    },

    /**
     * Get Selected Layer Id
     *
     * @returns {*}
     */
    getSelectedLayerId: function()
    {
        var selectedLayers = this.data.selectedLayers;

        if(selectedLayers.length === 1)
        {
            return selectedLayers[0];
        }

        return false;
    },

    /**
     * Get Selected Elements group/layer Id
     *
     */
    getSelectedElementIds: function()
    {
        var selectedLayers      = this.data.selectedLayers,
            selectedLayerCount  = selectedLayers.length,
            selectedElements    = [];

        for(var i = 0; i < selectedLayerCount; i++)
        {
            var elementId   = selectedLayers[i],
                elementObj  = this.getLayerById(elementId);

            if(elementObj.groupId === '')
            {
                selectedElements.push(elementId);
            }
            else
            {
                if(jQuery.inArray(elementObj.groupId, selectedElements) < 0)
                {
                    selectedElements.push(elementObj.groupId);
                }
            }
        }

        return selectedElements;
    },

    /**
     * Get Selected Group Id
     *
     * @returns {*}
     */
    getSelectedGroupId: function()
    {
        var selectedGroups = this.getSelectedGroupsIds();

        if(selectedGroups.length === 1)
        {
            return selectedGroups[0];
        }

        return false;
    },

    /**
     * Get Layer Element by ID
     *
     * @param {String} layerId
     * @returns {*}
     */
    getLayerElementById: function(layerId)
    {
        var layer = document.getElementById('slide_layer_' + layerId);

        /*if(!layer)
        {
            layer = this.getGroupLayerById(layerId);
        }*/

        return layer ? jQuery(layer) : false;
    },

    /**
     * Get Clone Layer Element By ID
     *
     * @param {String} layerId
     * @returns {*}
     */
    getCloneLayerElementById: function(layerId)
    {
        var layer = document.querySelector('#canvas-preview .slide_layer[data-layer-id="'+layerId+'"]');

        return layer ? jQuery(layer) : false;
    },

    /**
     * Get Layer Object From Element
     *
     * @param {HTMLElement|jQuery} element
     * @returns {*}
     */
    getLayerObjFromElement: function(element)
    {
        var layerId = this.getLayerIdFromElement(element);
        return this.getLayerById(layerId);
    },

    /**
     * Get Layer ID from Element
     *
     * @param {HTMLElement|jQuery} element
     * @returns {*}
     */
    getLayerIdFromElement: function(element)
    {
        try
        {
            element = jQuery(element);

            if(element.get(0).classList.contains('slide_layer'))
            {
                return element.data('layerId');
            }

            if(element.get(0).classList.contains('group'))
            {
                return element.get(0).id.replace("group_", "");
            }

            if(element.get(0).classList.contains('helplines'))
            {
                return element.get(0).id.replace("guide_", "");
            }

            if(element.get(0).classList.contains('tp-caption'))
            {
                return element.parent().data('layerId');
            }
            else if(element.get(0).classList.contains('sortablelayers'))
            {
                return element.get(0).id.replace('layer_sort_', '');
            }
            else if(element.get(0).classList.contains('sub-sortable-layers'))
            {
                return element.get(0).id.replace('layer_sort_', '');
            }
        }
        catch(e)
        {
            return false;
        }
    },

    /**
     * Get Layers IDs from Layers Element
     *
     * @param {HTMLElement|jQuery} element
     * @returns {*}
     */
    getlayersIdFromLayersElement: function(layersElement)
    {
        var layersLength = layersElement.length,
            layerIds     = [];

        if(layersLength > 0)
        {
            for(var l = 0; l < layersLength; l++)
            {
                var layerId  = this.getLayerIdFromElement(layersElement[l]);

                layerIds.push(layerId);
            }

            return layerIds;
        }

        return false;
    },

    /**
     * Get Layer By ID
     *
     * @param {String} layerId
     * @returns {*}
     */
    getLayerById: function(layerId)
    {
        return this.layers[layerId] !== undefined ? this.layers[layerId] : false;
    },

    /**
     * Get Layer(s) By ID
     *
     * @param {String|Array|*} layerIds
     * @returns {*}
     */
    getLayersById: function(layerIds)
    {
        var layers = [],
            layerObj;

        if(layerIds instanceof Array)
        {
            for(var l = 0; l < layerIds.length; l++)
            {
                var layer = this.getLayerById(layerIds[l]) ||  FTXCanvasGuides.getGuideById(layerIds[l]);

                if(layer)
                {
                    layerObj = this.recursiveMerge({}, layer);
                    layers.push(layerObj);
                }
            }
        }
        else if(layerIds === String)
        {
            layerObj = this.getLayerById(layerIds) || FTXCanvasGuides.getGuideById(layerIds);
            layers.push(layerObj);
        }

        return layers;
    },

    /**
     * Get All Layer IDs
     *
     */
    getAllLayerIds: function()
    {
        var layers = [];

        for(var layerId in this.layers)
        {
            if(this.layers.hasOwnProperty(layerId))
            {
                layers.push(layerId);
            }
        }

        return layers;
    },

    /**
     * Get Layers By Group
     *
     * @param groupId
     * @returns {*}
     */
    getLayersByGroup: function(groupId)
    {
        return jQuery('.' + this.getGroupClassName(groupId));
    },

    /**
     * Get Group Class Name
     *
     * @param groupId
     * @returns {String}
     */
    getGroupClassName: function(groupId)
    {
      return 'group_' + groupId;
    },

    /**
     * Get Group Layer IDs
     *
     * @param groupId
     * @returns {Array}
     */
    getGroupLayerIds: function(groupId)
    {
        var layersInGroup   = _.where(FTXCanvas.layers, {groupId: groupId}),
            layers          = [];

        for(var i = 0; i < layersInGroup.length; i++)
        {
            if(typeof layersInGroup[i].layerId !== 'undefined')
            {
                layers.push(layersInGroup[i].layerId);
            }
        }

        return layers;
    },

    /**
     * Get Group ID From Layer
     *
     * @param layer
     * @returns {*}
     */
    getGroupIdFromLayer: function(layer)
    {
        var layerId     = this.getLayerIdFromElement(layer),
            layerObj    = this.getLayerById(layerId);

        if(layerObj.groupId !== '')
        {
            return layerObj.groupId;
        }

        return false;
    },

    /**
     * All Layers Selected
     *
     * @returns {Boolean}
     */
    allLayersSelected: function()
    {
        var layerLength         = _.where(this.getLayersObjsWithOutGroupItems(), {visible: true, locked: false}).length,
            // selectedLayerCount  = this.currentSelection.selectedLayersCount + this.getSelectedGroupLayerCount();
            selectedLayerCount  = this.getSelectedLayerCount(true, true)

        return selectedLayerCount !== 0 && selectedLayerCount === layerLength;
    },

    /**
     * All Layers Visible
     *
     * @returns {Boolean}
     */
    allLayersVisible: function()
    {
        var layerLength     = Object.keys(this.layers).length,
            visibleCount    = this.getVisibleLayerCount();

        return visibleCount === layerLength;
    },

    /**
     * All Layers Hide
     *
     * @returns {Boolean}
     */
    allLayersHide: function()
    {
        var layerLength  = Object.keys(this.layers).length,
            hideCount    = this.getHideLayerCount();

        return hideCount === layerLength;
    },

    /**
     * Check ALl group Layer hide
     *
     * @param groupId
     * @param action
     */
    allGroupLayersHideShow: function(groupId, action)
    {
        var groupLayer              = this.getGroupLayerById(groupId),
            layers                  = this.getLayersFromGroup(groupId),
            layerLength             = layers.length,
            showGroupLayerCount, hideGroupLayerCount;

        if(groupLayer)
        {
            switch(action)
            {
                case 'show':

                    showGroupLayerCount = groupLayer.find('.group_layer:not(.layer-hidden)').length;
                    return showGroupLayerCount === layerLength;

                    break;

                case 'hide':

                    hideGroupLayerCount = groupLayer.find('.group_layer.layer-hidden').length;
                    return hideGroupLayerCount === layerLength;

                    break;
            }
        }
    },

    /**
     * Refresh Events by Layer ID
     *
     * @param {String} layerId
     * @param setSelection
     */
    refreshEvents: function(layerId, setSelection)
    {
        var layer       = this.getLayerElementById(layerId),
            layerEl     = layer.get(0),
            layerObj    = this.getLayerById(layerId),
            controls    = FTXCanvasTransform.selectors.controls,
            context     = this,
            childEl;

        // If any layers are selected, deselect
        if(this.getSelectedLayerCount() > 0 && !this.data.mergeGroup)
        {
            this.deselectAllLayers();
        }

        FTXCanvasTransform.setDefaultSettingsIfNotExist(layer);

        FTXLayerPanel.addToLayerPanel(layerObj);
        this.addLayerDblClickActions(layerId);
        this.addLayerClickActions(layerId);
        this.setLockStatusFromObj(layerObj);
        this.setHideStatusFromObj(layerObj, false);

        this.addDraggable(layer);

        switch(layerObj.layerType)
        {
            case 'text':

                childEl = layerEl.querySelector('.tp-caption');

                FTXLayerToolbar.getInstanceByType('text').getEditor().addElements(childEl);

                if(this.isChrome())
                {
                    childEl.addEventListener('DOMNodeInserted', function(ev)
                    {
                        if(ev.target.style)
                        {
                            ev.target.style.fontSize        = '';
                            ev.target.style.letterSpacing   = '';
                            ev.target.style.lineHeight      = '';
                        }
                    });
                }

                break;

            case 'image':

                childEl = layerEl.querySelector('.tp-image');

                FTXLayerToolbar.getInstanceByType('image').getEditor().addElements(childEl);

                // childEl.focus();

                break;

            case 'grid':

                childEl = layerEl.querySelector('.tp-grid');

                FTXLayerToolbar.getInstanceByType('grid').getEditor().addElements(childEl);

                break;

            case 'gradient':

                childEl = layerEl.querySelector('.tp-gradient');

                FTXLayerToolbar.getInstanceByType('gradient').getEditor().addElements(childEl);

                break;

            case 'shape':

                childEl = layerEl.querySelector('.tp-shape');

                FTXLayerToolbar.getInstanceByType('shape').getEditor().addElements(childEl);

                childEl.focus();

                colorpickerShapeExtension.setLayerShapeColors(layerId, false);

                break;

            case 'icon':

                childEl = layer.find('.tp-icon').focus();

                FTXLayerToolbar.getInstanceByType('icon').getEditor().addElements(childEl);

                childEl.focus();

                break;
        }

        if(typeof setSelection === 'undefined' || setSelection)
        {
            this.addLayerToSelection(layerId, false);

            setTimeout(function()
            {
                FTXLayerToolbar.getInstance().showCurrentToolbar();
            }, 180);

            if(layerObj.layerType === 'text')
            {
                ///FTXCanvasTransform.destroy(layer, false);
                this.selectors.controls.className = this.selectors.controls.className + ' editingMode';
                controls.addClass('no-pointer-events');
            }
        }

        // Bind event to sync with controls
        layer.get(0).addEventListener('syncControlsWithLayer', function (event)
        {
            context.syncLayerWithControlsListener(event);
        }, false);

        FTXCanvas.dispatchSyncLayer(layer);
    },

    /**
     * Add Layer Click Actions
     *
     * @param {String} layerId
     */
    addLayerClickActions: function(layerId)
    {
        var context = this,
            layer   = context.getLayerElementById(layerId);

        if(!layer)
        {
            layer   = context.getGroupLayerById(layerId);
        }

        var pendingClick = 0;

        function clickTypeDetect(event)
        {
            if(pendingClick)
            {
                clearTimeout(pendingClick);
                pendingClick = 0;
            }

            console.log("--- CLICKED ---");

            if(FTXCanvasTransform.data.isDragging)
            {
                FTXCanvasTransform.data.isDragging = false;
                event.preventDefault();
                event.stopPropagation();
                console.log("is dragging true");
                return false;
            }

            if(FTXCanvasTransform.data.isResizing)
            {
                FTXCanvasTransform.data.isResizing = false;
                event.preventDefault();
                event.stopPropagation();

                return false;
            }

            switch(event.detail)
            {
                case 0:
                case 1:

                    if(context.hasAnimation() && FTXAnimationPlayer.isMainTimelineActive())
                    {
                        return false;
                    }

                    pendingClick = setTimeout(function()
                    {
                        return context.runLayerSingleClickActions(event, layerId);
                    }, 200);

                    break;

                case 2:

                    if(context.hasAnimation() && FTXAnimationPlayer.isMainTimelineActive())
                    {
                        return false;
                    }

                    return context.runLayerDoubleClickActions(event, layerId);

                    break;

                default:

                    break;
            }
        }

        layer.get(0).removeEventListener('click', clickTypeDetect, false);
        layer.get(0).addEventListener('click', clickTypeDetect, false);
    },

    /**
     * Add Layer Double Click Actions
     *
     * @param layerId
     */
    addLayerDblClickActions: function(layerId)
    {
        var context     = this,
            layerObj    = FTXCanvas.getLayerById(layerId),
            layer       = context.getLayerElementById(layerId);

        if(!layer)
        {
            return;
        }

        if(!(layerObj.layerType == 'image' || layerObj.layerType == 'gradient'))
        {
            return;
        }

        function dblClickTypeDetect(event)
        {
            event.preventDefault();
            event.stopPropagation();

            if(layerObj.layerType === 'image')
            {
                FTXImageCrop.enableCrop();
            }

            if(layerObj.layerType === 'gradient')
            {
                FTXGradient.openGradientEditor(layerId);
            }
        }

        layer.get(0).removeEventListener('dblclick', dblClickTypeDetect);
        layer.get(0).addEventListener('dblclick', dblClickTypeDetect);
    },

    /**
     * Run Layer Single Click Actions
     *
     * @param event
     * @param {String} layerId
     */
    runLayerSingleClickActions: function(event, layerId)
    {
        var layer           = this.getLayerElementById(layerId),
            controls        = FTXCanvasTransform.selectors.controls,
            controlsEl      = controls.get(0),
            layerObj        = this.getLayerById(layerId),
            selectAllButton = FTXLayerPanel.selectors.layerSelectAll,
            clientOS        = FTXCanvasUtils.data.clientOS,
            clientIsMacOS   = clientOS == 'MacOS';

        if(this.textEditing() && (layerId === this.data.lastEditedTextId))
        {
            if(!layer.hasClass('editing-active'))
            {
                FTXCanvasTransform.destroyDraggable(layer);

                controlsEl.classList.add('editingMode');
                controlsEl.classList.add('no-pointer-events');

                layer.get(0).classList.add('editing-active');
            }

            return false;
        }

        if(layerObj.locked)
        {
            return false;
        }

        if(this.isElementGroupedElement(layerId))
        {
            if(event.shiftKey || event[clientIsMacOS ? 'metaKey' : 'ctrlKey'])
            {
                FTXLayerToolbar.getInstance().hideCurrentToolbar();

                layer = this.getGroupLayerById(layerId);

                if(layer)
                {
                    this.selectGroupFromLayer(layer);
                }
            }
            else
            {
                this.deselectAllLayers();
                FTXCanvasGuides.deselectAllGuides();

                layer = this.getGroupLayerById(layerId);

                if(layer)
                {
                    this.selectGroupFromLayer(layer);
                }
            }
        }
        else
        {
            if(event.altKey)
            {
                this.runCollisionClickFunction(event);
                FTXCanvasTransform.setContainerOctant(layerObj.rotation.angle);
            }
            else
            {
                FTXCanvasGuides.deselectAllGuides();
                this.addLayerToSelection(layerId, event.shiftKey || event[clientIsMacOS ? 'metaKey' : 'ctrlKey']);
            }
        }


        controlsEl.classList.remove('no-pointer-events');
        controlsEl.classList.remove('editingMode');

        FTXLayerToolbar.getInstance().hideCurrentToolbar();

        if(layer)
        {
            FTXLayerToolbar.getInstance().showCurrentToolbar();
            FTXCanvasTransform.setContainerOctant(layerObj.rotation.angle);
        }

        if(FTXCanvas.getSelectedLayerCount(true, true) > 1 && this.getSelectedGroupLayerCount() === 0)
        {
            FTXLayerToolbar.getInstance().hideCurrentToolbar();

            var layers = this.getSelectedLayers(true, true);

            FTXLayerToolbar.getInstanceByType('multiLayer').getEditor().addElements(layers);
            FTXLayerToolbar.getInstance().showCurrentToolbar();

            FTXCanvasTransform.removeContainerOctant();
        }

        if(selectAllButton)
        {
            if(this.allLayersSelected())
            {
                selectAllButton.classList.add('all-selected');
            }
            else
            {
                selectAllButton.classList.remove('all-selected');
            }
        }
    },

    /**
     * Run Layer Double Click Actions
     *
     * @param event
     * @param {String} layerId
     */
    runLayerDoubleClickActions: function(event, layerId)
    {
        if(this.textEditing() && (layerId === this.data.lastEditedTextId))
        {
            return false;
        }

        var layer           = this.getLayerElementById(layerId),
            layerObj        = this.getLayerById(layerId),
            controls        = FTXCanvasTransform.selectors.controls,
            clientOS        = FTXCanvasUtils.data.clientOS,
            clientIsMacOS   = clientOS == 'MacOS';

        FTXCanvasGuides.deselectAllGuides();

        if(layerObj.layerType !== 'text')
        {
            return this.runLayerSingleClickActions(event, layerId);
        }

        if(layerObj.locked)
        {
            return false;
        }

        this.addLayerToSelection(layerId, event.shiftKey || event[clientIsMacOS ? 'metaKey' : 'ctrlKey']);

        if(layerObj.layerType === 'text')
        {
            FTXCanvasTransform.destroyDraggable(layer);
            FTXCanvas.selectors.controls.classList.add('editingMode');
            controls.addClass('no-pointer-events');
            layer.addClass('editing-active');

            FTXEditorToolbar.highlightSelectedElement();
        }
        else
        {
            controls.removeClass('no-pointer-events');
        }

        if(FTXCanvas.getSelectedLayerCount() === 1)
        {
            FTXLayerToolbar.getInstance().showCurrentToolbar();
            FTXCanvasTransform.setContainerOctant(layerObj.rotation.angle);
        }

        event.stopPropagation();
    },

    /**
     * Instantiate Toolbar
     *
     */
    instantiateToolbar: function()
    {
        FTXLayerToolbar.getInstance().showCurrentToolbar();
    },

    /**
     * Change Animation Settings From
     *
     */
    changeAnimationSettingsFrom: function()
    {
        if(this.hasAnimation())
        {
            if(this.getSelectedLayerCount(true,true) === 1)
            {
                var selectedLayerId     = (this.selectedHasGroup())? this.getSelectedGroupId() : this.getSelectedLayerId();

                if(selectedLayerId)
                {
                    FTXCanvasAnimation.updateAnimationSettingsFromLayer(selectedLayerId);
                }
            }
            else
            {
                FTXCanvasAnimation.resetFormElements();
            }
        }
    },

    /**
     * Add Layer to Selection
     *
     * @param {String} layerId
     * @param retainSelection
     * @param groupLayer
     * @returns {Boolean}
     */
    addLayerToSelection: function(layerId, retainSelection, groupLayer)
    {
        FTXLayerToolbar.getInstance().hideCurrentToolbar();

        var layer = this.getLayerElementById(layerId);

        // If there were groupLayer element then, we will return false
        if(!layer)
        {
            return false;
        }

        var layerEl         = layer.get(0),
            layerObj        = this.getLayerById(layerId),
            selectedCount   = this.getSelectedLayerCount();

        if(layerObj.locked || !layerObj.visible)
        {
            return false;
        }

        // If retain selection doesn't exist or is false, we will remove any previous selection
        if(selectedCount > 0 && typeof retainSelection === 'undefined' || !retainSelection)
        {
            // If the layer count is 1, and the layer already is selected, prevent the event from running
            if(layerEl.classList.contains('layer_selected') && selectedCount === 1)
            {
                return false;
            }

            // Deselect all other layers
            if(selectedCount > 0)
            {
                this.deselectAllLayers();
            }
        }
        else
        {
            // If the layer is already selected, we'll restart multiSelect and draggable
            if(layer && layerEl.classList.contains('layer_selected'))
            {
                layerEl.classList.remove('layer_selected');
                layerEl.classList.remove('multiSelectLayers');

                this.removeLayerIdFromSelected(layerId);
                this.initializeMultiSelect(layerId);
                this.updateCurrentSelection();

                return false;
            }
        }

        this.data.selectedLayers.push(layerId);

        // Append class layer_selected to newly selected layer
        layerEl.classList.add("layer_selected");

        // Set item selected state in layer panel
        FTXLayerPanel.setLayerListItemSelected(layerId, groupLayer);

        // Start multiSelect and add this layer
        if(!groupLayer && typeof groupLayer === 'undefined')
        {
            this.initializeMultiSelect(layerId);
        }

        // Update current selection meta data
        this.updateCurrentSelection();

        FTXLayerPanel.updateLayerInfo(true);

        this.changeAnimationSettingsFrom();
    },

    /**
     * Add Layer(s) to Selection
     *
     * @param {String} layerIds
     */
    addLayersToSelection: function(layerIds)
    {
        if(layerIds !== undefined && layerIds.length > 0)
        {
            for(var l = 0; l < layerIds.length; l++)
            {
                var layerId     = layerIds[l],
                    layerObj    = this.getLayerById(layerId),
                    groupLayer;

                if(layerObj.layerType !== 'group' && (layerObj.hasOwnProperty('groupId') &&  layerObj.groupId !== ''))
                {
                    groupLayer = this.getGroupLayerById(layerObj.groupId);
                    this.selectGroupFromLayer(groupLayer);
                }
                else
                {
                    if(typeof layerIds[l] !== 'undefined')
                    {
                        this.addLayerToSelection(layerIds[l], true);
                    }
                }
            }
        }
    },

    /**
     * Lock Layer
     *
     * @param {String} layerId
     */
    lockLayer: function(layerId)
    {
        var layer       = this.getLayerElementById(layerId),
            layerPanel  = FTXLayerPanel.getPanelElementById(layerId);

        layer.addClass('locked');
        layerPanel.find('.layer-lock').removeClass('fa-unlock').addClass('fa-lock locked');

        if(layer.get(0).classList.contains('layer_selected'))
        {
            FTXLayerPanel.clearSelectedPanelElements(layerId);
            this.deselectLayerByElement(layer);
        }

        FTXLayerPanel.updateLayerInfo(false);

        this.updateLayer(layerId, 'lock_layer', {
            locked: true
        }, false);
    },

    /**
     * Lock Layers
     *
     * @param layers
     */
    lockLayers: function(layers)
    {
        if(layers instanceof Array)
        {
            layers = this.recursiveMerge([], layers);

            if(layers.length)
            {
                for(var i = 0; i < layers.length; i++)
                {
                    this.lockLayer(layers[i]);
                }
            }
        }
        else if(typeof layers === 'string')
        {
            this.lockLayer(layers);
        }
    },

    /**
     * Lock Selected Layers
     *
     * @returns {*}
     */
    lockSelectedLayers: function()
    {
        var SelectedGroupsIds   = FTXCanvas.getSelectedGroupsIds();

        FTXLayerToolbar.getInstance().hideCurrentToolbar();

        FTXLayerPanel.toggleLockOnGroupLayerPanel(SelectedGroupsIds);

        return this.lockLayers(this.data.selectedLayers);
    },

    /**
     * Unlock Layer
     *
     * @param {String} layerId
     */
    unlockLayer: function(layerId)
    {
        var layer       = this.getLayerElementById(layerId),
            layerPanel  = FTXLayerPanel.getPanelElementById(layerId);

        layer.removeClass('locked');
        layerPanel.find('.layer-lock').removeClass('fa-lock locked').addClass('fa-unlock');

        this.updateLayer(layerId, 'unlock_layer', {
            locked: false
        }, false);
    },

    /**
     * Set Lock Status from Layer Object
     *
     * @param layerObj
     * @returns {*}
     */
    setLockStatusFromObj: function(layerObj)
    {
        if(layerObj.locked)
        {
            return this.lockLayer(layerObj.layerId);
        }
        else
        {
            return this.unlockLayer(layerObj.layerId);
        }
    },

    /**
     * Show Hide layer
     *
     * @param {String} layerId
     * @param action
     * @param history
     */
    showHideLayer: function(layerId, action, history)
    {
        var layer       = this.getLayerElementById(layerId),
            layerPanel  = FTXLayerPanel.getPanelElementById(layerId);

        if(!layer)
        {
            layer = this.getGroupLayerById(layerId);
        }

        if(layer)
        {
            switch(action)
            {
                case 'show':

                    layer.removeClass('layer-hidden');

                    layerPanel.find('.layer-visibility').first().removeClass('fa-eye-slash').addClass('fa-eye');

                    this.updateLayer(layerId, 'Layer Visible', {
                        visible: true
                    }, history);

                    break;

                case 'hide':

                    if(layer.get(0).classList.contains('group'))
                    {
                        layer.get(0).classList.remove('groupLayer_selected');
                    }
                    else
                    {
                        if(layerPanel.get(0).classList.contains('layer-panel-selected'))
                        {
                            this.deselectLayerByElement(layer);
                        }
                    }

                    layer.get(0).classList.add('layer-hidden');

                    if(layerPanel.get(0))
                    {
                        layerPanel.get(0).classList.remove('layer-panel-selected');
                    }

                    layerPanel.find('.layer-visibility').first().removeClass('fa-eye').addClass('fa-eye-slash');

                    this.updateLayer(layerId, 'Layer Hide', {
                        visible: false
                    }, history);

                    break;
            }
        }
    },

    /**
     * Show Layer
     *
     * @param {String} layerId
     * @param history
     */
    showLayer: function(layerId, history)
    {
        var layerObj    = this.getLayerById(layerId),
            layer       = this.getLayerElementById(layerId);

        if(layerObj.layerType === 'group')
        {
            this.showAllGroupLayers(layerId, false);
            layer = this.getGroupLayerById(layerId);
        }

        this.showHideLayer(layerId, 'show', history);

        // if group element is shown then show group layer as well
        if(this.isElementGroupedElement(layerId) && !this.allGroupLayersHideShow(layerObj.groupId, 'hide'))
        {
        	this.showHideLayer(layerObj.groupId, 'show', false);
        }
    },

    /**
     * Hide Layer
     *
     * @param {String} layerId
     * @param history
     */
    hideLayer: function(layerId, history)
    {
        var layerObj = this.getLayerById(layerId);

        if(layerObj.layerType === 'group')
        {
            this.hideAllGroupLayers(layerId, false);
        }

        this.showHideLayer(layerId, 'hide', history);

        // if last group element is hide then hide group layer as well
        if(this.isElementGroupedElement(layerId) && this.allGroupLayersHideShow(layerObj.groupId, 'hide'))
        {
        	this.showHideLayer(layerObj.groupId, 'hide', false);
        }
    },

    /**
     * Show All Layers
     *
     * @param history
     */
    showAllLayers: function(history)
    {
        var layers      = FTXCanvas.layers,
            useHistory  = typeof history === 'undefined' || history,
            preLayerObjs, postLayerObjs;

        if(useHistory)
        {
            preLayerObjs = FTXCanvas.getLayersById(Object.keys(FTXCanvas.layers));
        }

        if(layers && !_.isEmpty(layers))
        {
            for(var layerId in layers)
            {
                if(layers.hasOwnProperty(layerId))
                {
                    //this.showLayer(layerId, false);
                    this.showHideLayer(layerId, 'show', false);
                }
            }
        }

        FTXLayerPanel.toggleVisibilityAllButton(true);

        if(useHistory)
        {
            postLayerObjs = FTXCanvas.getLayersById(Object.keys(FTXCanvas.layers));

            this.addLayerStateToHistory(postLayerObjs, preLayerObjs, "Multiple Layers Visible", 'show_multiple_layers');
        }
    },

    /**
     * Hide All Layers
     *
     * @param history
     */
    hideAllLayers: function(history)
    {
        var layers      = FTXCanvas.layers,
            useHistory  = typeof history === 'undefined' || history,
            preLayerObjs, postLayerObjs;

        if(useHistory)
        {
            preLayerObjs = FTXCanvas.getLayersById(Object.keys(FTXCanvas.layers));
        }

        if(layers && !_.isEmpty(layers))
        {
            for(var layerId in layers)
            {
                if(layers.hasOwnProperty(layerId))
                {
                    //this.hideLayer(layerId, false);
                    this.showHideLayer(layerId, 'hide', false)
                }
            }
        }

        FTXLayerPanel.toggleVisibilityAllButton(false);

        if(useHistory)
        {
            postLayerObjs = FTXCanvas.getLayersById(Object.keys(FTXCanvas.layers));

            this.addLayerStateToHistory(postLayerObjs, preLayerObjs, "Layer's Hidden", 'hide_multiple_layers');
        }
    },

    /**
     * Set Hide from Layer Object
     *
     * @param layerObj
     * @param history
     * @returns {*}
     */
    setHideStatusFromObj: function(layerObj, history)
    {
        if(layerObj.visible === true || layerObj.visible === undefined)
        {
            return this.showLayer(layerObj.layerId, history);
        }
        else
        {
            return this.hideLayer(layerObj.layerId, history);
        }
    },

    /**
     * Hide all Group Layers
     *
     * @param groupId
     * @param history
     */
    hideAllGroupLayers: function(groupId, history)
    {
        var layersIds      = this.getLayerIdsFromGroup(groupId),
            layersIdsCount = layersIds.length;

        for(var i = 0; i < layersIdsCount; i++)
        {
            var layerId         = layersIds[i],
                layer           = this.getLayerElementById(layerId),
                layerElement    = layer.get(0);

            if(!layerElement.classList.contains('layer-hidden'))
            {
                this.showHideLayer(layerId, 'hide', history);
            }
        }
    },

    /**
     * Show all Group Layers
     *
     * @param groupId
     * @param history
     */
    showAllGroupLayers: function(groupId, history)
    {
        var layersIds      = this.getLayerIdsFromGroup(groupId),
            layersIdsCount = layersIds.length;

        for(var i = 0; i < layersIdsCount; i++)
        {
            this.showHideLayer(layersIds[i], 'show', history);
        }
    },

    /**
     * Add Multiple Selection
     *
     * @param {String} layerId
     * @param callFrom
     */
    initializeMultiSelect: function(layerId, callFrom)
    {
        var context     = this,
            controls    = this.getMultiSelectLayer(),
            controlsEl  = controls.get(0),
            layer       = this.getLayerElementById(layerId);

        // Cover layer position
        if(this.getSelectedLayerCount(true) > 0)
        {
            this.coverLayerPosition(callFrom);
        }

        // Add draggable handlers and functions
        FTXCanvasTransform.initTransforms(controls);

        // if(this.getSelectedLayerCount(true) == 1 && FTXCanvasGuides.getSelectedGuidesCount() == 0)
        if(this.getSelectedLayerCount(true, true) === 1)
        {
            if(!layerId)
            {
                layer = this.getSelectedLayers(true, true);
            }

            controlsEl.classList.add('multipleSelection');

            FTXCanvasTransform.updateContainerFromLayer(layer);
        }
        else
        {
            // Remove octants from container
            FTXCanvasTransform.removeContainerOctant();

            // Update from multiple cover layer bounds
            FTXCanvasTransform.updateContainerFromCoverLayers();

            controlsEl.classList.remove('multipleSelection');
        }
    },

    /**
     * Cover Layer Position
     *
     * @param callFrom
     */
    coverLayerPosition: function(callFrom)
    {
        var context             = this,
            selectedElements    = context.getSelectedLayers(true, true),
            selectedCount       = context.getSelectedLayerCount(true, true),
            coverLayerBounds;

        context.selectors.controls.removeAttribute('style');

        if(callFrom !== 'history' && !callFrom)
        {
            // Set Default Position to Layers
            context.setDefaultPositionToLayers();

            // Set Position to Layers Respect to Group
            context.setPositionToLayers();
        }

        coverLayerBounds = context.getCoverLayerBounds(selectedElements);

        this.selectors.controls.style.width     = coverLayerBounds.width + 'px';
        this.selectors.controls.style.height    = coverLayerBounds.height + 'px';
        this.selectors.controls.style.left      = coverLayerBounds.left + 'px';
        this.selectors.controls.style.top       = coverLayerBounds.top + 'px';
        this.selectors.controls.style.opacity   = 1;

        FTXCanvasTransform.toggleControlSet();

        if(selectedCount > 0 && selectedCount !== 1)
        {
            FTXCanvasTransform.setElementSettings(this.selectors.controls, {
                x: coverLayerBounds.left,
                y: coverLayerBounds.top,
                _p: {
                    cwid: coverLayerBounds.width,
                    chgt: coverLayerBounds.height
                }
            });
        }
    },

    /**
     * Update groupItems position from Group
     *
     * @param groupId
     */
    updatePositionOfGroupLayers: function(groupId)
    {
        var groupLayer      = this.getGroupLayerById(groupId),
            groupItems      = this.getLayersFromGroups(groupLayer),
            groupItemsCount = groupItems.length;

        for(var i = 0; i < groupItemsCount; i++)
        {
            var layerEl     = groupItems[i],
                layer       = jQuery(layerEl),
                layerId     = this.getLayerIdFromElement(layer),
                positionX   = parseInt(layerEl.style.left, 10) + parseInt(groupLayer.get(0).style.left, 10) +  'px',
                positionY   = parseInt(layerEl.style.top, 10) + parseInt(groupLayer.get(0).style.top, 10) +  'px';

            this.updateLayer(layerId, 'layer_position', {
                position: {
                    x: parseInt(positionX, 10),
                    y: parseInt(positionY, 10)
                }
            }, false);

            FTXCanvas.storeZoomState(layerId, {
                x: parseInt(positionX, 10),
                y: parseInt(positionY, 10)
            });

            FTXCanvasTransform.setElementSettings(layer, {
                y: parseInt(positionY, 10),
                x: parseInt(positionX, 10)
            });
        }
    },

    /**
     * Set Default Group Position to Layers
     *
     * @param groupLayers
     */
    setDefaultPositionToLayers: function(groupLayers)
    {
        if(this.selectedHasGroup() || groupLayers)
        {
            var selectedGroupLayers, groupItems, groupItemsCount;

            if(groupLayers)
            {
                selectedGroupLayers = groupLayers;
                groupItems          = this.getLayersFromGroups(selectedGroupLayers);
            }
            else
            {
                selectedGroupLayers = this.getSelectedGroups();
                groupItems          = this.getLayersFromGroups();
            }

            groupItemsCount = groupItems.length;

            for(var i = 0; i < groupItemsCount; i++)
            {
                var layerEl     = groupItems[i],
                    layer       = jQuery(layerEl),
                    layerId     = this.getLayerIdFromElement(layer),
                    layerObj    = this.getLayerById(layerId),
                    groupLayer  = this.getGroupLayerById(layerObj.groupId);

                if(groupLayer)
                {
                    layerEl.style.left = parseInt(layerEl.style.left, 10) + parseInt(groupLayer.get(0).style.left, 10) + 'px';
                    layerEl.style.top  = parseInt(layerEl.style.top, 10) + parseInt(groupLayer.get(0).style.top, 10) + 'px';

                    FTXCanvasTransform.setElementSettings(layer, {
                        y: parseInt(layerEl.style.top, 10),
                        x: parseInt(layerEl.style.left, 10)
                    });
                }
            }

            this.setGroupLayerPosition(selectedGroupLayers);
        }
    },

    /**
     * Set Position to Layers Respect to Group
     * Assign Group Layer Position {{top: 0, left: 0}}
     *
     * @param updateLayer
     * @param groupLayers
     */
    setPositionToLayers: function(updateLayer, groupLayers, doNotUpdateSettings)
    {
        if(this.selectedHasGroup() || groupLayers)
        {
            var selectedGroupLayers, groupItems, groupItemsCount;

            if(groupLayers)
            {
                selectedGroupLayers = groupLayers;
                groupItems          = this.getLayersFromGroups(selectedGroupLayers);
            }
            else
            {
                selectedGroupLayers = this.getSelectedGroups();
                groupItems          = this.getLayersFromGroups();
            }

            this.setCoverLayerBoundsToGroup(selectedGroupLayers, updateLayer);

            groupItemsCount = groupItems.length;

            for(var j = 0; j < groupItemsCount; j++)
            {
                var layerEl     = groupItems[j],
                    layerId     = this.getLayerIdFromElement(jQuery(layerEl)),
                    layerObj    = this.getLayerById(layerId),
                    groupLayer  = this.getGroupLayerById(layerObj.groupId);

                if(groupLayer)
                {
                    layerEl.style.left = (parseInt(layerEl.style.left, 10) - parseInt(groupLayer.get(0).style.left, 10)) + 'px';
                    layerEl.style.top  = (parseInt(layerEl.style.top, 10) - parseInt(groupLayer.get(0).style.top, 10)) + 'px';

                    if(!doNotUpdateSettings){

                        FTXCanvasTransform.setElementSettings(jQuery(layerEl), {
                            y: parseInt(layerEl.style.top, 10),
                            x: parseInt(layerEl.style.left, 10)
                        });
                    }

                }
            }
        }
    },

    /**
     * Get Layers Array
     *
     * @returns {Array}
     */
    getLayersArray: function(excludeGroup)
    {
        var layers = [];

        for(var identifier in this.layers)
        {
            if(this.layers.hasOwnProperty(identifier))
            {
                var layer = this.layers[identifier];
                if(excludeGroup && layer.layerType === 'group')
                {
                    continue;
                }
                layers.push(this.recursiveMerge({},this.layers[identifier]));
            }
        }

        return layers;
    },

    /**
     * Get Sorted Layers
     *
     * @param property
     * @param direction
     * @returns {Array}
     */
    getSortedLayers: function(property, direction)
    {
        var layers          = this.layers,
            sortDirection   = (typeof direction !== 'undefined' && direction) ? direction : 'desc',
            itemLists       = [];

        var sortedLayers =  _.sortBy(layers, property);

        for(var s = 0; s < sortedLayers.length; s++)
        {
            var layerObj = sortedLayers[s];

            if(layerObj.groupId === "" || layerObj.layerType === 'group')
            {
                itemLists.push(layerObj.layerId);
            }
        }

        return itemLists;
    },

    /**
     * Sort Layer Objs By Property
     *
     * @param layerObjs
     * @param property
     * @param direction
     * @returns {Array}
     */
    sortLayerObjsByProperty: function(layerObjs, property, direction)
    {
        var sortedLayers    = [],
            sortDirection   = (typeof direction !== 'undefined' && direction) ? direction : 'asc';

        if(layerObjs)
        {
            sortedLayers = layerObjs.sort(function(a, b)
            {
                var vA = a[property],
                    vB = b[property];

                if(sortDirection === 'undefined' || sortDirection === 'desc')
                {
                    return parseInt(vB) - parseInt(vA);
                }
                else
                {
                    return parseInt(vA) - parseInt(vB);
                }
            });
        }

        return sortedLayers;
    },

    /**
     * Sort Layer Objects By zIndex
     *
     * @param property
     * @param sortDirection
     * @returns {Object}
     */
    sortLayerObjsByzIndex: function(property, sortDirection)
    {
        var layersWithOutGroupItems         = this.getLayersObjsWithOutGroupItems(),
            itemLists                       = {},
            layersWithOutGroupItemsArray    = [],
            layersObjsOnlyGroupItems         = this.getLayersObjsOnlyGroupItems();

        // converting layers object to array
        for(i in layersWithOutGroupItems)
        {
            layersWithOutGroupItemsArray.push(layersWithOutGroupItems[i]);
        }

        var sortedLayers = this.sortLayerObjsByProperty(layersWithOutGroupItemsArray, property, sortDirection);

        for(var s = 0; s < sortedLayers.length; s++)
        {
            var layerObj = sortedLayers[s],
                element  = this.getLayerElementById(layerObj.layerId);

            layerObj.layerIndex = s + 1;

            if(element)
            {
                element.css({
                    'z-index' : 101 + s
                });
            }

            itemLists[layerObj.layerId] = layerObj;
        }

        this.recursiveMerge(itemLists, layersObjsOnlyGroupItems);

        return itemLists;
    },

    /**
     * Get Element Positions
     *
     * @param selected
     * @returns {{}}
     */
    getElementPositions: function(selected)
    {
        var layersBounds    = {},
            context         = this;

        _.each(selected, function(el, i)
        {
            var element = jQuery(el);
            var layerId = context.getLayerIdFromElement(element);

            layersBounds[layerId] = element.position();
        });

        return layersBounds;
    },

    /**
     * Get Cover Layer Bounds
     *
     * @param selected
     * @returns {{top: number, left: number, width: number, height: number}}
     */
    getCoverLayerBounds: function(selected)
    {
        var coverBounds = {
                top:    null,
                left:   null,
                width:  0,
                height: 0
            },
            selectedCount   = selected.length,
            furthestRight   = null,
            furthestDown    = null,
            bounds;

        if(selectedCount)
        {
            for(var i = 0; i < selectedCount; i++)
            {
                var layerEl     = selected[i],
                    element     = jQuery(layerEl);

                if(FTXCanvasGuides.isElementGuide(layerEl))
                {
                    continue;
                }

                var elementPosition = element.position();
                    bounds          = layerEl.getBoundingClientRect();

                if(selectedCount > 1)
                {
                    layerEl.classList.add('multiSelectLayers');

                    if((furthestRight == null || bounds.width + elementPosition.left) > furthestRight)
                    {
                        furthestRight = bounds.width + elementPosition.left;
                    }

                    if((furthestDown == null || bounds.height + elementPosition.top) > furthestDown)
                    {
                        furthestDown = bounds.height + elementPosition.top;
                    }

                    if(coverBounds.left == null)
                    {
                        coverBounds.left = elementPosition.left;
                    }
                    else
                    {
                        if(coverBounds.left > elementPosition.left)
                        {
                            coverBounds.left = elementPosition.left;
                        }
                    }

                    if(coverBounds.top == null)
                    {
                        coverBounds.top = elementPosition.top;
                    }
                    else
                    {
                        if(coverBounds.top > elementPosition.top)
                        {
                            coverBounds.top = elementPosition.top;
                        }
                    }
                }
                else
                {
                    coverBounds = {
                        top:            elementPosition.top,
                        left:           elementPosition.left,
                        width:          bounds.width,
                        height:         bounds.height
                    };
                }
            }
        }

        if(selectedCount > 1)
        {
            coverBounds.width   = Math.abs((furthestRight) - coverBounds.left);
            coverBounds.height  = Math.abs((furthestDown) - coverBounds.top);
        }

        return coverBounds;
    },

    /**
     * Set Cover Group Layer Bounds
     *
     * @param groupLayers
     * @param updateLayer
     */
    setCoverLayerBoundsToGroup: function(groupLayers, updateLayer)
    {
        var groupLayerLength = groupLayers.length;

        if(groupLayers.length)
        {
            for(var i = 0; i < groupLayerLength; i++)
            {
                var groupLayer      = jQuery(groupLayers[i]),
                    previousTrans   = groupLayers[i].style.transform,
                    groupLayerId    = this.getLayerIdFromElement(groupLayer),
                    groupItems      = this.getLayersFromGroup(groupLayerId);

                    groupLayers[i].style.transform = "";

                    coverBounds     = this.getCoverLayerBounds(groupItems);

                    groupLayers[i].style.transform = previousTrans;

                this.setGroupLayerPosition(groupLayer, coverBounds, updateLayer);
            }
        }
    },

    /**
     * Set Group Layer Position
     *
     * @param groupLayers
     * @param positionObj
     * @param updateLayer
     */
    setGroupLayerPosition: function(groupLayers, positionObj, updateLayer)
    {
        if(!positionObj && typeof positionObj === 'undefined')
        {
            positionObj = {
                left: 0,
                top:  0
            };
        }

        var groupLayersCount = groupLayers.length;

        for(var i = 0; i < groupLayersCount; i++)
        {
            var groupLayer          = groupLayers[i],
                groupLayerElement   = jQuery(groupLayers[i]),
                groupLayerId        = this.getLayerIdFromElement(groupLayerElement),
                groupLayerFreeTrans = groupLayerElement.data('freetrans');

            if(typeof groupLayer !== "undefined")
            {
                groupLayer.style.left   = positionObj.left + 'px';
                groupLayer.style.top    = positionObj.top + 'px';
                groupLayer.style.width  = positionObj.width + 'px';
                groupLayer.style.height = positionObj.height + 'px';

                FTXCanvasTransform.setElementSettings(groupLayerElement, {
                    y: parseInt(groupLayer.style.top, 10),
                    x: parseInt(groupLayer.style.left, 10),
                    _p: {
                        cwid: parseInt(groupLayer.style.width, 10),
                        chgt: parseInt(groupLayer.style.height, 10),
                        width: parseInt(groupLayer.style.width, 10),
                        height: parseInt(groupLayer.style.height, 10)
                    }
                });

                if(updateLayer)
                {
                    this.updateLayer(groupLayerId, 'layer_position', {
                        position: {
                            x: parseInt(groupLayer.style.left, 10),
                            y: parseInt(groupLayer.style.top, 10)
                        }
                    }, false);

                    this.storeZoomState(groupLayerId, {
                        x:          positionObj.left,
                        y:          positionObj.top,
                        width:      positionObj.width,
                        height:     positionObj.height,
                    });
                }
            }
        }
    },

    /**
     * Add Draggable to Element
     *
     * @param {HTMLElement|jQuery} element
     * @returns {Boolean}
     */
    addDraggable: function(element)
    {
        return FTXCanvasTransform.initTransforms(element);
    },

    /**
     * Add Draggable to All Layers
     *
     */
    addDraggableToAllLayers: function()
    {
        for(var layerId in this.layers)
        {
            if(this.layers.hasOwnProperty(layerId))
            {
                var layer     = this.getLayerElementById(layerId),
                    layerObj  = this.getLayerById(layerId);

                if(layer && layerObj.layerType === 'text')
                {
                    this.addDraggable(layer);
                }
            }
        }
    },

    /**
     * Handle Keydown Movement
     *
     * @param event
     */
    handleKeydownMovement: function(event)
    {
        var context             = this,
            selectLayers        = this.getSelectedLayers(),
            selectedGuides      = FTXCanvasGuides.data.selectedGuides.slice(),
            controls            = jQuery(this.selectors.controls),
            controlsData        = controls.data('freetrans'),
            changedLeft         = null,
            changedTop          = null,
            layerObjs           = context.getLayersById(FTXCanvas.data.selectedLayers),
            guideObjs           = FTXCanvasGuides.getGuidesById(selectedGuides),
            historyTitle        = 'Layer Moved';

        selectLayers.find('.tp-caption').focusout();

        if(FTXLayerPanel.data.isPointerIsOnPanel && (selectLayers.length > 0) )
        {
            FTXLayerPanel.selectors.layerPanelScrollHandle.perfectScrollbar('destroy');
        }

        /*
        todo:- Remove at last
        if(selectLayers.length > 0)
        {
            event.preventDefault();
        }*/

        if(selectLayers.length > 0)
        {
            event.preventDefault();

            if(context.getSelectedGroupLayerCount() > 0)
            {
                // Set Default Position to Layers
                context.setDefaultPositionToLayers();
            }

            switch(event.which)
            {
                // Left Arrow
                case 37:

                    if(event.shiftKey)
                    {
                        changedLeft = -10;
                    }
                    else
                    {
                        changedLeft = -1;
                    }

                    break;

                // Up Arrow
                case 38:

                    if(event.shiftKey)
                    {
                        changedTop = -10;
                    }
                    else
                    {
                        changedTop = -1;
                    }

                    break;

                // Right Arrow
                case 39:

                    if(event.shiftKey)
                    {
                        changedLeft = 10;
                    }
                    else
                    {
                        changedLeft = 1;
                    }

                    break;

                // Down Arrow
                case 40:

                    if(event.shiftKey)
                    {
                        changedTop = 10;
                    }
                    else
                    {
                        changedTop = 1;
                    }

                    break;
            }

            _.each(selectLayers, function(el)
            {
                var element         = jQuery(el),
                    elementData     = element.data('freetrans'),
                    layerId         = context.getLayerIdFromElement(element),
                    layerObj        = context.getLayerById(layerId),
                    elementPosition = {
                        x: elementData.x,
                        y: elementData.y
                    },
                    guideId         = null,
                    isElementGuide  = FTXCanvasGuides.isElementGuide(element);


                if(isElementGuide)
                {
                    historyTitle = "Guide Moved"
                }
                else
                {
                    historyTitle = layerObj.layerType + " Layer Moved";
                }

                // (vertical moving down -> no history or vice versa)
                if(!FTXCanvasGuides.canGuideMoveInDirection(element, context.getKeyboardDirection(event.which)))
                {
                    guideId = FTXCanvasGuides.getGuideIdByElement(element);
                    selectedGuides.splice(selectedGuides.indexOf(guideId), 1);
                    return;
                }

                var positionChange  = {};

                // If left is changed, we assign x to update position function
                if(changedLeft)
                {
                    positionChange.x = elementPosition.x + changedLeft;

                    if(!isElementGuide)
                    {
                        context.setElementTransform(element, {
                            'left': positionChange.x
                        });
                    }
                    else
                    {
                        FTXCanvasGuides.setElementTransform(element, {
                            'left': parseFloat(element.css('left')) + changedLeft
                        });

                        guideId = FTXCanvasGuides.getGuideIdByElement(element);
                        FTXCanvasGuides.updateGuideWithZoomState(guideId, element);
                    }

                    elementData.x = positionChange.x;
                }

                // If top is changed, we assign y to update position function
                if(changedTop)
                {
                    positionChange.y = elementPosition.y + changedTop;

                    if(!isElementGuide)
                    {
                        context.setElementTransform(element, {
                            'top': positionChange.y
                        });
                    }
                    else
                    {
                        FTXCanvasGuides.setElementTransform(element, {
                            'top': parseFloat(element.css('top')) + changedTop
                        });

                        guideId = FTXCanvasGuides.getGuideIdByElement(element);
                        FTXCanvasGuides.updateGuideWithZoomState(guideId, element);
                    }

                    elementData.y = positionChange.y;
                }

                // Update Layer using whatever values are available in position change
                context.updateLayer(layerId, 'check_mr', {
                    position: positionChange
                }, false);

                FTXCanvas.storeZoomState(layerId, positionChange);

                if(context.textEditing())
                {
                    FTXLayerToolbar.showSelectedToolbar();
                }
            });

            // Set position and base transformations of cover layer
            controlsData.x = controlsData.x + changedLeft;
            controlsData.y = controlsData.y + changedTop;

            this.setElementTransform(controls, {
                'left': controlsData.x,
                'top' : controlsData.y
            });

            if(context.getSelectedGroupLayerCount() > 0)
            {
                // Set Default Position to Layers
                context.setPositionToLayers(true);
            }
        }

        var updatedLayerObjs        = FTXCanvas.getLayersById(FTXCanvas.data.selectedLayers),
            updatedGuideObjs        = FTXCanvasGuides.getGuidesById(selectedGuides);

        if(updatedLayerObjs.length > 0 || updatedGuideObjs.length > 0)
        {
            if( (updatedLayerObjs.length + updatedGuideObjs.length) > 1)
            {
                historyTitle    = "Multiple Layers Moved"
            }
            FTXCanvas.addLayerStateToHistory(updatedLayerObjs.concat(updatedGuideObjs), layerObjs.concat(guideObjs), historyTitle, 'update');
        }

        if(FTXLayerPanel.data.isPointerIsOnPanel && (selectLayers.length > 0) )
        {
            FTXLayerPanel.selectors.layerPanelScrollHandle.perfectScrollbar({
                suppressScrollX: true
            });
        }

    },

    /**
     * Get Element Distance from Canvas
     *
     * @param {HTMLElement|jQuery} element
     * @returns {{left: number, top: number}}
     */
    getElementDistanceFromCanvas: function(element)
    {
        var divLayerBounds      = this.selectors.divLayers.getBoundingClientRect(),
            outerWrapperBounds  = this.selectors.layersOuterWrapper.getBoundingClientRect(),
            elementBounds       = element.getBoundingClientRect();

        var canvasDifferenceLeft    = divLayerBounds.left - outerWrapperBounds.left,
            canvasDifferenceTop     = divLayerBounds.top - outerWrapperBounds.top,
            elementDifferenceLeft   = elementBounds.left - outerWrapperBounds.left,
            elementDifferenceTop    = elementBounds.top - outerWrapperBounds.top;

        return {
            'left': elementDifferenceLeft - canvasDifferenceLeft,
            'top':  elementDifferenceTop - canvasDifferenceTop
        }
    },

    /**
     * Clear All Selection
     *
     */
    clearAllSelection: function ()
    {
        if(document.selection)
        {
            document.selection.empty();
        }
        else if(window.getSelection)
        {
            window.getSelection().removeAllRanges();
        }

        // Give the document focus
        window.focus();

        if(document.activeElement)
        {
            document.activeElement.blur();
        }
    },

    /**
     * Deselect All Layers
     *
     */
    deselectAllLayers: function()
    {
        var context             = this,
            selectedElements    = this.getSelectedLayers(true),
            selectedLayerLength = selectedElements.length,
            controls            = this.getMultiSelectLayer(),
            selectAllButton     = FTXLayerPanel.selectors.layerSelectAll;

        context.selectors.groupedIcon.addClass('hide');
        selectAllButton.classList.remove('all-selected');

        if(selectedLayerLength)
        {
            FTXImageCrop.closeCrop(false);
            FTXLayerToolbar.getInstance().hideCurrentToolbar();

            // Clear selected layers
            FTXCanvasTransform.data.isDragging  = false;
            FTXCanvasTransform.data.isRotating  = false;
            this.data.selectedLayers            = [];
            this.data.selectedGroupLayers       = [];

            selectedElements.removeClass("layer_selected multiSelectLayers editingMode");
            selectedElements.removeClass("editing-active");
            this.clearAllSelection();

            this.addDraggableToAllLayers();

            controls.attr('style', '');

            controls.removeClass('editingMode');
        }

        // Clear layer panel selections
        FTXLayerPanel.clearSelectedPanelElements();

        // Clear control dimensions on de-selection
        FTXCanvasTransform.clearControls();

        // Reset animation sidebar data
        if(typeof FTXCanvasAnimation !== 'undefined')
        {
            FTXCanvasAnimation.resetFormElements();
        }

        this.clearToolbarInterface();
        this.updateCurrentSelection();

        jQuery('.group').removeClass('groupLayer_selected');

        if(this.hasAnimation())
        {
            FTXAnimationPlayer.stopPreview();
        }

        FTXLayerPanel.updateLayerInfo(false);
    },

    /**
     * Clear Toolbar Interface & Popups
     *
     */
    clearToolbarInterface: function()
    {
        // Hide zoom setter dropdown
        this.selectors.zoomOptions.zoomList.parent().get(0).classList.remove('open');

        // Hide all spectrum containers
        this.hideSpectrumContainers();
    },

    /**
     * Hide Spectrum Containers
     *
     */
    hideSpectrumContainers: function()
    {
        var spectrumContainers  = document.getElementsByClassName('sp-container'),
            spectrumLength      = spectrumContainers.length;

        if(spectrumContainers && spectrumLength)
        {
            for(var i = 0; i < spectrumLength; i++)
            {
                spectrumContainers[i].classList.add('sp-hidden');
            }
        }
    },

    /**
     * Set Element Transform
     *
     * @param {HTMLElement|jQuery} element
     * @param options
     */
    setElementTransform: function(element, options)
    {
        element = jQuery(element);

        var el      = element.get(0),
            angle   = 0;

        if(FTXCanvasGuides.isElementGuide(el))
        {
            return false;
        }

        options.top     = options.top === undefined ? parseInt(el.style.top) : options.top;
        options.left    = options.left === undefined ? parseInt(el.style.left) : options.left;

        element.css({
            'left': parseFloat(options.left),
            'top':  parseFloat(options.top)
        });

        if(typeof options.rotation !== 'undefined')
        {
            angle = parseFloat(options.rotation);
            FTXCanvasTransform.setLayerRotation(element, angle);
        }

        /*
        el.style.left   = parseFloat(options.left) + 'px';
        el.style.top    = parseFloat(options.top) + 'px';
        */

    },

    /**
     * Deselect Group by ID
     *
     * @param groupId
     * @returns {*}

    deselectGroupById: function(groupId)
    {
        var element = this.getGroupLayerById(groupId);

        return this.deselectGroupByElement(element);
    },*/

    /**
     * Deselect Group By Element
     *
     * @param {HTMLElement|jQuery} element

    deselectGroupByElement: function(groupLayer)
    {
        var groupId         = this.getGroupIdFromLayer(groupLayer),
            selectedIndex   = this.data.selectedLayers.indexOf(groupId),
            groupLayerPanel = FTXLayerPanel.getLayerPanelElement(groupId),
            groupItems      = this.getLayersFromGroup(groupId),
            itemCount       = groupItems.length;

        FTXLayerToolbar.getInstance().hideCurrentToolbar();
        //FTXEditorToolbar.hideToolbar();

        for(var i = 0; i < itemCount; i++)
        {
            var element     = jQuery(groupItems[i]),
                elementId   = this.getLayerIdFromElement(element);

            FTXLayerPanel.clearGroupSelectedPanelElement(elementId);
        }

        // Remove selected class from group element
        groupLayer.get(0).classList.remove("group_selected");
        groupLayerPanel.get(0).classList.remove('layer-panel-selected');

        // If the selected layer is found in data.selectedLayers, remove it by index
        if(selectedIndex !== -1)
        {
            this.data.selectedLayers.splice(selectedIndex, 1);
            this.updateCurrentSelection();
        }

        this.coverLayerPosition();

        // If no further elements are selected, clear controls
        if(this.getSelectedLayerCount() < 1)
        {
            FTXCanvasTransform.clearControls();
        }

        try
        {
            this.addDraggable(groupLayer);
        }
        catch(e) {}
    },
    */

    /**
     * Deselect Layer by ID
     *
     * @param {String} layerId
     * @returns {*}
     */
    deselectLayerById: function(layerId)
    {
        var element = this.getLayerElementById(layerId);
        return this.deselectLayerByElement(element);
    },

    /**
     * Deselect Layer By Element
     *
     * @param {HTMLElement|jQuery} element
     */
    deselectLayerByElement: function(element)
    {
        var layerId         = this.getLayerIdFromElement(element),
            selectedIndex   = this.data.selectedLayers.indexOf(layerId);

        FTXLayerToolbar.getInstance().hideCurrentToolbar();

        // Remove selected class from element
        element.get(0).classList.remove("layer_selected");

        // If the selected layer is found in data.selectedLayers, remove it by index
        if(selectedIndex !== -1)
        {
            this.data.selectedLayers.splice(selectedIndex, 1);
            this.updateCurrentSelection();
        }

        this.coverLayerPosition(false);

        // If no further elements are selected, clear controls
        if(this.getSelectedLayerCount() < 1)
        {
            FTXCanvasTransform.clearControls();
        }


        try
        {
            this.addDraggable(element);
        }
        catch(e) {}

        this.changeAnimationSettingsFrom()
    },

    /**
     * Delete Layer by ID
     *
     * @param {String} layerId
     * @param history
     * @returns {*}
     */
    deleteLayerById: function(layerId, history)
    {
        return this.removeLayer(layerId, history);
    },

    /**
     * Delete Layer by Element
     *
     * @param {HTMLElement|jQuery} element
     * @param history
     * @returns {*}
     */
    deleteLayerByElement: function(element, history)
    {
        var layerId = this.getLayerIdFromElement(element);

        return this.removeLayer(layerId, history);
    },

    /**
     * Delete Selected Layers
     *
     */
    deleteSelectedLayers: function(history)
    {
        var selectAllButton     = FTXLayerPanel.selectors.layerSelectAll;

        FTXLayerToolbar.getInstance().hideCurrentToolbar();

        var selectedLayers      = JSON.parse(JSON.stringify(this.data.selectedLayers)),
            selectedGroupLayers = this.data.selectedGroupLayers;

        selectedLayers = selectedLayers.concat(selectedGroupLayers);

        if(selectedLayers && selectedLayers.length > 0)
        {
            var layerObjs = this.getLayersById(selectedLayers);

            var layerIndexesBefore  = this.setlayerIndexesBefore();

            for(var i = 0; i < selectedLayers.length; i++)
            {
                this.deleteLayerById(selectedLayers[i], false);
            }

            this.layers = this.sortLayerObjsByzIndex('layerIndex', 'asc');

            var layerIndexesAfter  = this.setlayerIndexesAfter();

            if(typeof history === 'undefined' || history)
            {
                var historyTitle = "Multiple Layers Removed";

                if(layerObjs.length == 1)
                {
                    historyTitle = layerObjs[0].layerType + " Layer Removed"
                }
                this.addLayerStateToHistory(layerObjs, layerObjs, historyTitle, 'delete', layerIndexesAfter, layerIndexesBefore);
            }
        }

        FTXLayerPanel.updateLayerListFromLayers();
        FTXCanvasTransform.clearControls();

        selectAllButton.classList.remove('all-selected');
    },

    /**
     * Delete Group layer
     *
     * @param groupId
     * @param history
    */
    deleteGroupLayerById: function(groupId, history)
    {
        var groupLayers = FTXCanvas.getGroupLayerIds(groupId);

        if(groupLayers && groupLayers.length > 0)
        {
            var layerObjs = this.getLayersById(groupLayers);

            var layerIndexesBefore  = this.setlayerIndexesBefore();

            for(var i = 0; i < groupLayers.length; i++)
            {
                this.deleteLayerById(groupLayers[i], false);
            }

            FTXLayerPanel.deletePanelElementById(groupId);

            this.layers = this.sortLayerObjsByzIndex('layerIndex', 'asc');

            var layerIndexesAfter  = this.setlayerIndexesAfter();


            this.addLayerStateToHistory(layerObjs, layerObjs, 'Group Layer Removed', 'delete',layerIndexesAfter, layerIndexesBefore);

        }

        FTXLayerPanel.updateLayerListFromLayers();
        FTXCanvasTransform.clearControls();

        this.deleteGroupById(groupId);
    },
    /**
     * Delete Selected Items
     *
     */
    deleteSelectedItems: function()
    {
        var selectedLayers  = this.data.selectedLayers,
            selectedGuides  = FTXCanvasGuides.data.selectedGuides,
            groupLayers     = this.data.selectedGroupLayers,
            layerObjs       = this.getLayersById(selectedLayers),
            groupObjs       = this.getLayersById(groupLayers),
            guideObjs       = FTXCanvasGuides.getGuidesById(selectedGuides),
            mixedObjs       = layerObjs.concat(guideObjs),
            selectAllButton = FTXLayerPanel.selectors.layerSelectAll,
            historyTitle    = "Multiple Layers Removed";

        mixedObjs = mixedObjs.concat(groupObjs);

        if(this.getSelectedLayerCount() > 0)
        {
            this.deleteSelectedLayers(false);
            FTXCanvasGuides.deleteSelectedGuides();

            if(mixedObjs.length == 1)
            {
                historyTitle = mixedObjs[0].layerType + " Layer Removed";
            }
            this.addLayerStateToHistory(mixedObjs, mixedObjs, historyTitle, 'delete');
        }

        selectAllButton.classList.remove('all-selected');
        FTXLayerPanel.updateLayerInfo(false);
    },

    /**
     * Delete By layer Objects
     *
     * @param layerObjs
     * @param history
     */
    deleteByLayerObjects: function(layerObjs, history)
    {
        if(layerObjs)
        {
            if(layerObjs instanceof Array)
            {
                for(var l = 0; l < layerObjs.length; l++)
                {
                    if(typeof layerObjs[l].layerId !== 'undefined')
                    {
                        this.deleteLayerById(layerObjs[l].layerId, history);
                    }
                }
            }
            else if(layerObjs instanceof Object && typeof layerObjs.layerId !== 'undefined')
            {
                this.deleteLayerById(layerObjs.layerId, history);
            }
        }
    },

    /**
     * Delete All Layers
     *
     * @param history
     */
    deleteAllLayers: function(history)
    {
        var layers = this.getAllLayerIds();

        if(layers.length)
        {
            for(var l = 0; l < layers.length; l++)
            {
                this.deleteLayerById(layers[l], history);
            }
        }
    },

    /**
     * Clear Canvas
     *
     */
    clearCanvas: function()
    {
        this.deleteAllLayers(false);
        this.setBackgroundClass('', false);
    },

    /**
     * Remove Layer
     *
     * @param {String} layerId
     * @param history
     */
    removeLayer: function(layerId, history)
    {
        var layer               = this.getLayerElementById(layerId),
            layerObj            = this.getLayerById(layerId),
            isGroupLayer        = false;

        if(typeof history === 'undefined' || history)
        {
            layerIndexesBefore  = this.setlayerIndexesBefore();
        }

        if(!layer)
        {
            layer                 = this.getGroupLayerById(layerId);
            this.data.groupLayers = _.without(this.data.groupLayers, layerId);
            isGroupLayer          = true;
        }

        if(layer)
        {
            layer.remove();
        }

        FTXEditorToolbar.deleteToolbar(layerId);

        // Strip layer from selection array
        this.removeLayerIdFromSelected(layerId, isGroupLayer);

        // Remove layer used names
        FTXLayerPanel.data.layerNames = _.without(FTXLayerPanel.data.layerNames, layerObj.layerName);

        delete this.layers[layerId];

        // This should be run after all or single remove funtion is completed
        this.layers = this.sortLayerObjsByzIndex('layerIndex', 'asc');

        var layerIndexesAfter  = this.setlayerIndexesAfter();

        // Add delete to history
        if(typeof history === 'undefined' || history)
        {
            var layerIndexesAfter  = this.setlayerIndexesAfter();

            this.addLayerStateToHistory(layerObj, layerObj, layerObj.layerType + ' Layer Removed', 'delete', layerIndexesAfter, layerIndexesBefore);
        }

        FTXLayerPanel.deletePanelElementById(layerId);

        if(FTXCanvas.getSelectedLayerCount() === 0)
        {
            FTXCanvasTransform.clearControls();
        }
    },

    /**
     * Remove Layer ID From Selected
     *
     * @param {String} layerId
     */
    removeLayerIdFromSelected: function(layerId, isGroupLayer)
    {
        if(layerId && layerId !== '')
        {
            if(isGroupLayer === true)
            {
                this.data.selectedGroupLayers = this.removeFromArray(this.data.selectedGroupLayers, layerId);
            }
            else
            {
                this.data.selectedLayers      = this.removeFromArray(this.data.selectedLayers, layerId);
            }
        }
    },

    /**
     * Add Layer to Initial History
     *
     * @param layerObj
     * @param type
     */
    addLayerToInitialHistory: function(layerObj, type)
    {
        var initialHistory = {
            'type':             type,
            'layerId':          layerObj.layerId,
            'layerObj':         layerObj,
            'transaction_time': Date.now() / 1000 | 0
        };

        var cloneInitialHistory = this.recursiveMerge({}, initialHistory);

        this.data.layerHistory.initialStates.push(cloneInitialHistory);
    },

    /**
     * Add Layer State to History
     *
     * @param layerObj
     * @param previousState
     * @param type
     * @param action
     * @param layerIndexes
     */
    addLayerStateToHistory: function(layerObj, previousState, type, action,  layerIndexesAfter, layerIndexesBefore, options)
    {
        var historyLength = this.data.layerHistory.history.length,
            historyAction = action,
            groupItems, historyObj, historyMaxed = false;

        if(historyLength >= this.params.historyOptions.maxSize)
        {
            this.data.layerHistory.history.shift();

            historyMaxed = true;
        }

        if(historyAction === 'hide_multiple_layers')
        {
            this.data.nextSelectionState        = 'hide_multiple_layers';
            this.data.previousSelectionState    = 'show_multiple_layers';
            historyAction = 'update';
        }
        else if(historyAction === 'show_multiple_layers')
        {
            this.data.nextSelectionState        = 'show_multiple_layers';
            this.data.previousSelectionState    = 'hide_multiple_layers';
            historyAction = 'update';
        }
        else if(historyAction === 'rotate_multiple_layers')
        {
            this.data.nextSelectionState        = 'rotate_multiple_layers';
            this.data.previousSelectionState    = 'rotate_multiple_layers';
            historyAction = 'update';
        }
        else if(historyAction === 'magicResize')
        {
            this.data.nextSelectionState        = 'magic_resize_layers';
            this.data.previousSelectionState    = 'magic_resize_layers';
        }
        else
        {
            if(layerObj && layerObj.length > 1)
            {
                if(!this.selectors.controls.classList.contains('hide'))
                {
                    if(this.selectedHasGroup())
                    {
                        this.data.nextSelectionState        = 'groupMultipleSelect';
                        this.data.previousSelectionState    = 'groupMultipleSelect';
                    }
                    else
                    {
                        this.data.nextSelectionState        = 'multipleSelect';
                        this.data.previousSelectionState    = 'multipleSelect';
                    }
                }
            }
            else
            {
                if(layerObj && layerObj.groupId)
                {
                    groupItems = this.getArrayOfIdsFromObjects(layerObj);

                    if(groupItems.length > 1)
                    {
                        this.data.nextSelectionState        = 'group';
                        this.data.previousSelectionState    = 'group';
                    }
                }
                else
                {
                    this.data.nextSelectionState        = false;
                    this.data.previousSelectionState    = false;
                }
            }
        }

        var guideObjs       = FTXCanvasGuides.getGuidesById(FTXCanvasGuides.getAllGuideIds()),
            layerObjs       = FTXCanvas.getLayersArray();

        historyObj = {
            'type':                     type,
            'action':                   historyAction,
            'histId':                   this.generateIdentifier(),
            'layerObjs':                {},
            'previousState':            {},
            'transaction_time':         Date.now() / 1000 | 0,
            'previousSelectionState':   this.data.previousSelectionState,
            'nextSelectionState':       this.data.nextSelectionState,
            'groupAfter':               [],
            'groupBefore':              [],
            'gridAfter':                [],
            'gridBefore':               [],
            'layerIndexesAfter':        [],
            'layerIndexesBefore':       [],
            'layersArray':              layerObjs.concat(guideObjs),
            'canvasOptions':            this.recursiveMerge({}, FTXCanvas.params.canvasOptions),
        };

        if(historyAction === 'magicResize')
        {
            historyObj.newCanvasDimensions      = options.newCanvasDimensions;
            historyObj.oldCanvasDimensions      = options.oldCanvasDimensions;
            historyObj.oldSizeId                = options.oldSizeId;
            historyObj.newSizeId                = options.newSizeId;
            historyObj.oldSizeName              = options.oldSizeName;
            historyObj.newSizeName              = options.newSizeName;
        }

        if(historyAction === 'psdReplace')
        {
            historyObj.oldCanvasOptions      = options.oldCanvasOptions;
            historyObj.newCanvasOptions      = options.newCanvasOptions;
        }

        // we will add layerIndexesAfter & layerIndexesBefore if passed with history state
        if(typeof layerIndexesBefore !== undefined &&
           typeof layerIndexesAfter !== undefined)
        {
            historyObj.layerIndexesAfter    = layerIndexesAfter;
            historyObj.layerIndexesBefore   = layerIndexesBefore;
        }

        if(historyAction === "group" || historyAction === "ungroup")
        {
            historyObj.groupAfter       = layerObj;
            historyObj.groupBefore      = previousState;
        }
        else if(historyAction === "layer_grid")
        {
            historyObj.gridAfter       = layerObj;
            historyObj.gridBefore      = previousState;
        }
        else
        {
            historyObj.layerObjs        = layerObj;
            historyObj.previousState    = previousState;
        }


        if(layerObj && layerObj.layerText !== undefined && previousState && previousState.layerText !== undefined)
        {
            var caretPos = FTXCanvas.getSelectedCaretPosition();

            if(caretPos)
            {
                var oldText         = jQuery(previousState.layerText).text(),
                    newText         = jQuery(layerObj.layerText).text(),
                    oldLength       = oldText.length,
                    newLength       = newText.length;

                historyObj.newCaretPos  = caretPos;
                historyObj.oldCaretPos  = caretPos - (newLength - oldLength);
            }
        }

        var currentIndex    = this.getCurrentLayerStateIndex(),
            highestIndex    = historyLength - 1,
            cloneHistoryObj = this.recursiveMerge({}, historyObj);

        if(historyMaxed)
        {
            currentIndex -= 1;
        }

        // If we never had history, or if the index is greater than our highest index
        // We can proceed as normal.
        if(historyLength === 0 || currentIndex > highestIndex)
        {
            // Push history item without modification to the history
            this.data.layerHistory.history.push(cloneHistoryObj);

            // Set current history to length + 1 to be above last state
            this.data.layerHistory.currentIndex = historyLength + 1;
        }
        else
        {
            // Set index and grab layer state from swapped history
            var newIndex    = currentIndex + 1,
                swapIndex   = currentIndex < 0 ? 0 : currentIndex - 1,
                swapState   = this.getLayerState(swapIndex),
                swapCopy    = this.recursiveMerge({}, swapState);

            // Copy previous state from index prior to refactoring,
            // which gives us all details from update prior to the state we remove
            if(currentIndex > 0)
            {
                //cloneHistoryObj.previousState = swapCopy.layerObjs;
            }

            // Set length to splice history array at current point,
            // which removes anything after this point
            this.data.layerHistory.history.length = (currentIndex < 0 ? 0 : currentIndex);

            // Push new clone history object, updated with old state prior to shift
            this.data.layerHistory.history.push(cloneHistoryObj);

            // Set index to one above our current, to keep us at ending point
            this.data.layerHistory.currentIndex = (currentIndex < 0 ? 1 : newIndex);
        }

        FTXHistoryPanel.updateHistoryPanel();
        console.log("Adding to History", this.data.layerHistory);
    },

    /**
     * Set Layer State Index
     *
     * @param index
     * @param type
     * @returns {Boolean}
     */
    setLayerStateIndex: function(index, type)
    {
        var historyLength = this.data.layerHistory.history.length;

        if((index === 0 && type === 'backward'))
        {
            index = -1;
        }
        else if(index < 0)
        {
            return false;
        }
        else if(type === 'forward' && index >= 0)
        {
            index = index + 1;
        }

        this.data.layerHistory.currentIndex = index;
    },

    /**
     * Get Current Layer State Index
     *
     * @returns {String}
     */
    getCurrentLayerStateIndex: function()
    {
        return this.data.layerHistory.currentIndex;
    },

    /**
     * Get Last Layer State Index
     *
     * @returns {number}
     */
    getLastLayerStateIndex: function()
    {
        var currentIndex = this.getCurrentLayerStateIndex();
        return currentIndex - 1;
    },

    /**
     * Get Next Layer State Index
     *
     * @returns {number}
     */
    getNextLayerStateIndex: function()
    {
        var currentIndex    = this.getCurrentLayerStateIndex(),
            historyLength   = this.data.layerHistory.history.length;

        return currentIndex < historyLength - 1 ? (currentIndex === -1 ? currentIndex + 1 : currentIndex) : historyLength - 1
    },

    /**
     * Handle History KeyDown
     *
     * @returns {*}
     */
    handleHistoryKeyDown: function()
    {
        var context         = this,
            clientOS        = FTXCanvasUtils.data.clientOS,
            clientIsMacOS   = clientOS == 'MacOS';

        return function(event)
        {
            if(!event[clientIsMacOS ? 'metaKey' : 'ctrlKey'] || (event.shiftKey && !event[clientIsMacOS ? 'metaKey' : 'ctrlKey']))
            {
                return true;
            }

            event.preventDefault();
            event.stopPropagation();

            if(event[clientIsMacOS ? 'metaKey' : 'ctrlKey'])
            {
                if(event.shiftKey)
                {
                    context.restoreToNextState();
                }
                else
                {
                    context.restoreToLastState();
                }
            }

            ExportCanvasDesign.toggleExportModalTabs();
        };
    },

    /**
     * Handle Selection KeyDown
     *
     * @returns {Function}
     */
    handleSelectionKeyDown: function()
    {
        var context = this;

        return function(event)
        {
            if(context.textEditing() && FTXLayerToolbar.getInstanceByType('text').getExtension('colorPicker'))
            {
                context.data.lastTextColor = FTXLayerToolbar.getInstanceByType('text').getExtension('colorPicker').getTextSelectedColor();
            }

            if(!context.textEditing() && !context.targetIsInput(event))
            {
                if(event.shiftKey)
                {
                    return context.deselectAllLayers();
                }

                return context.selectAllLayers();
            }
        }
    },

    /**
     * Update Selected Caret Position
     *
     */
    getSelectedCaretPosition: function()
    {
        if(this.textEditing() && window.getSelection)
        {
            var el      = this.getSelectedLayerElement(),
                element = el ? el.get(0) : '';

            if(element && element !== '')
            {
                return this.getCharacterOffsetWithin(element);
            }
        }

        return null;
    },

    /**
     * Restore to Last State
     *
     * @returns {*}
     */
    restoreToLastState: function()
    {
        CanvasMagicResizeHandler.hidePopover();

        if(this.hasAnimation() && FTXAnimationPlayer.isMainTimelineActive())
        {
            return false;
        }

        var lastIndex       = this.getLastLayerStateIndex(),
            currentIndex    = this.getCurrentLayerStateIndex();

        if(currentIndex >= 0)
        {
            return this.restoreByLayerStateIndex(lastIndex, 'backward');
        }
        else
        {
            toastr.warning('Nothing to undo in history');
        }
    },

    /**
     * Restore to Next State
     *
     * @returns {*}
     */
    restoreToNextState: function()
    {
        CanvasMagicResizeHandler.hidePopover();

        if(this.hasAnimation() && FTXAnimationPlayer.isMainTimelineActive())
        {
            return false;
        }

        var nextIndex       = this.getNextLayerStateIndex(),
            currentIndex    = this.getCurrentLayerStateIndex(),
            historyLength   = this.data.layerHistory.history.length,
            highestIndex    = historyLength - 1;

        if(currentIndex <= highestIndex)
        {
            return this.restoreByLayerStateIndex(nextIndex, 'forward');
        }
        else
        {
            toastr.warning('Nothing to redo in history');
        }
    },

    /**
     * Get Layer State
     *
     * @param index
     * @param type
     * @returns {*}
     */
    restoreByLayerStateIndex: function(index, type)
    {
        var layerState = this.getLayerState(index),
            updatedParams, sizeId;

        this.setLayerStateIndex(index, type);

        FTXCanvas.restoreLayerState(layerState, type);

        FTXHistoryPanel.markActiveHistory();

        if(layerState)
        {
            if(layerState.action === 'magicResize')
            {
                FTXCanvasMagicResize.data.isUndoRedoMagicAction = true;

                updatedParams = {
                    canvasOptions : {
                        canvasDimensions : {
                            width:  (type === 'forward') ? layerState.newCanvasDimensions.width : layerState.oldCanvasDimensions.width ,
                            height: (type === 'forward') ? layerState.newCanvasDimensions.height : layerState.oldCanvasDimensions.height
                        }
                    },
                    animationTimelineFactor: FTXCanvas.params.animationTimelineFactor
                };

                sizeId = (type === 'forward' ? layerState.newSizeId: layerState.oldSizeId);

                if(sizeId !== '')
                {
                    sizeId = parseInt(sizeId)
                }

                FTXCanvasMagicResize.data.initialSizeId     = FTXCanvas.params.canvasOptions.sizeId     = sizeId;
                FTXCanvasMagicResize.data.initialSizeName   = FTXCanvas.params.canvasOptions.sizeName   = String( type === 'forward' ? layerState.newSizeName: layerState.oldSizeName );

                FTXCanvasMagicResize.updateCanvasWithNewDimension(updatedParams);

                CanvasMagicResizeHandler.setSizeOnPopOverTitle(
                    updatedParams.canvasOptions.canvasDimensions.width,
                    updatedParams.canvasOptions.canvasDimensions.height,
                    FTXCanvas.params.canvasOptions.sizeId,
                    FTXCanvas.params.canvasOptions.sizeName
                );

                FTXCanvasMagicResize.data.isUndoRedoMagicAction = false;

                ExportCanvasDesign.toggleExportModalTabs();
            }

            return true;
        }

        return false;
    },

    /**
     * Get Layer State
     *
     * @param index
     * @returns {*}
     */
    getLayerState: function(index)
    {
        var layerHistory = this.data.layerHistory.history;

        if(layerHistory[index] !== undefined)
        {
            return layerHistory[index];
        }

        return false;
    },

    /**
     * Restore Layer to State
     *
     * @param layerState
     * @param type
     */
    restoreLayerState: function(layerState, type)
    {
        var selectAllButton = FTXLayerPanel.selectors.layerSelectAll;

        this.data.layerHistory.currentState     = layerState;
        this.data.layerHistory.lastDirection    = type;

        switch(type)
        {
            case 'forward':

                this.restoreLayersForward(layerState);


                break;

            case 'backward':

                this.restoreLayersBackward(layerState);

                break;
        }

        setTimeout(function()
        {
            FTXLayerPanel.updateLayerListFromLayers();
            FTXLayerPanel.updateLayerInfo(true);
        }, 0);

        if(selectAllButton)
        {
            if(this.allLayersSelected())
            {
                selectAllButton.classList.add('all-selected');
            }
            else
            {
                selectAllButton.classList.remove('all-selected');
            }
        }


        FTXLayerToolbar.getInstance().hideCurrentToolbar();
        
        if(this.getSelectedLayerCount(true) === 1)
        {
            FTXLayerToolbar.getInstance().showCurrentToolbar();
        }

        if(this.getSelectedLayerCount(true) > 1 )
        {
            var layers = this.getSelectedLayers();

            FTXLayerToolbar.getInstanceByType('multiLayer').getEditor().addElements(layers);
            FTXLayerToolbar.getInstance().showCurrentToolbar();
        }

        return false;
    },

    /**
     * Restore Layers Forward (Redo)
     *
     * @param layerState
     * @returns {*}
     */
    restoreLayersForward: function(layerState)
    {
        var layerObjs = layerState.layerObjs;

        switch(layerState.action)
        {
            case 'add':

                var itemToAdd;

                if(layerObjs)
                {
                    if(layerObjs instanceof Array)
                    {
                        for(var aL = 0; aL < layerObjs.length; aL++)
                        {
                            itemToAdd = layerObjs[aL];

                            if(typeof itemToAdd.type !== 'undefined' && itemToAdd.type === 'guide')
                            {
                                FTXCanvasGuides.drawGuide(itemToAdd.x, itemToAdd.y, itemToAdd.axis, (typeof itemToAdd.id !== 'undefined' ? itemToAdd.id : null), false, 'factor');
                            }
                            else
                            {
                                if(itemToAdd.layerType === 'group')
                                {
                                    this.groupSelectedLayers(itemToAdd, false, false, true);
                                }
                                else
                                {
                                    this.addLayers(itemToAdd, true);
                                }
                            }
                        }
                    }
                    else if(layerObjs instanceof Object)
                    {
                        itemToAdd = layerObjs;

                        if(typeof itemToAdd.type !== 'undefined' && itemToAdd.type === 'guide')
                        {
                            FTXCanvasGuides.drawGuide(itemToAdd.x, itemToAdd.y, itemToAdd.axis, (typeof itemToAdd.id !== 'undefined' ? itemToAdd.id : null), false, 'factor');
                        }
                        else
                        {
                            this.addLayers(itemToAdd, true);
                        }
                    }
                }

                break;

            case 'delete':

                var itemToRemove;

                if(layerObjs)
                {
                    if(layerObjs instanceof Array)
                    {
                        for(var dL = 0; dL < layerObjs.length; dL++)
                        {
                            itemToRemove = layerObjs[dL];

                            if(typeof itemToRemove.type !== 'undefined' && itemToRemove.type === 'guide')
                            {
                                FTXCanvasGuides.deleteByGuideObjects(itemToRemove, false);
                            }
                            else
                            {
                                this.deleteByLayerObjects(itemToRemove, false);
                            }
                        }
                    }
                    else if(layerObjs instanceof Object)
                    {
                        itemToRemove = layerObjs;

                        if(typeof itemToRemove.type !== 'undefined' && itemToRemove.type === 'guide')
                        {
                            FTXCanvasGuides.deleteByGuideObjects(itemToRemove, false);
                        }
                        else
                        {
                            this.deleteByLayerObjects(itemToRemove, false);
                        }
                    }

                    this.layers = this.sortLayerObjsByzIndex('layerIndex', 'asc');
                }

                break;

            case 'update':

                this.updateLayersByState(layerObjs, layerState.nextSelectionState);

                break;

            case 'sorting':

                layerObjs = layerState.layerIndexesAfter;

                var layerObjsCount = layerObjs.length;

                for(var l = 0; l < layerObjsCount; l++)
                {
                    this.updateLayerIndexByState(layerObjs[l]);
                }

                break;

            case 'group':

                // Regroup objects from history
                this.historyGroupAction(layerState);

                break;

            case 'ungroup':

                // Ungroup objects
                this.historyGroupAction(layerState);

                break;

            case 'layer_grid':

                // Regroup objects from history
                this.historyImageGridAction(layerState);

                break;

            case 'background':

                this.restoreToBackgroundState(layerObjs);

                break;

            case 'layerName':

                this.updateLayerNameByState(layerObjs);

                break;

            case 'magicResize':

                this.updateLayersByState(layerObjs, layerState.nextSelectionState);

                break;

            case 'psdReplace':

                this.historyDesignReplace(layerState, 'forward');

                break;
        }
    },

    /**
     * Restore Layers Backwards (Undo)
     *
     * @param layerState
     * @returns {*}
     */
    restoreLayersBackward: function(layerState)
    {
        var layerObjs = (layerState.previousState != null ? layerState.previousState : layerState.layerObjs);

        switch(layerState.action)
        {
            case 'add':

                var itemToRemove;

                if(layerObjs)
                {
                    if(layerObjs instanceof Array)
                    {
                        for(var dL = 0; dL < layerObjs.length; dL++)
                        {
                            itemToRemove = layerObjs[dL];

                            if(typeof itemToRemove.type !== 'undefined' && itemToRemove.type === 'guide')
                            {
                                FTXCanvasGuides.deleteByGuideObjects(itemToRemove, false);
                            }
                            else
                            {
                                if(itemToRemove.layerType === 'group')
                                {
                                    this.deleteGroupById(itemToRemove.groupId);
                                }
                                else
                                {
                                    this.deleteByLayerObjects(itemToRemove, false);
                                }
                            }
                        }
                    }
                    else if(layerObjs instanceof Object)
                    {
                        itemToRemove = layerObjs;

                        if(typeof itemToRemove.type !== 'undefined' && itemToRemove.type === 'guide')
                        {
                            FTXCanvasGuides.deleteByGuideObjects(itemToRemove, false);
                        }
                        else
                        {
                            this.deleteByLayerObjects(itemToRemove, false);
                        }
                    }
                }

                // setting up layer indexes

                /*var layerIndexesBefore = layerState.layerIndexesBefore;

                layerObjsCount = layerIndexesBefore.length;

                for(var l = 0; l < layerObjsCount; l++)
                {
                    this.updateLayerIndexByState(layerIndexesBefore[l]);
                }*/

                break;

            case 'delete':

                var itemToAdd, groupsObjs = [];

                if(layerObjs)
                {
                    var layers              = FTXCanvas.layers,
                        layerIndexesBefore  = layerState.layerIndexesBefore;

                    // Reset LayerIndexes with previous one
                    for(var identifier in layers)
                    {
                        if(layers.hasOwnProperty(identifier))
                        {
                            var layerObj = _.findWhere(layerIndexesBefore, {layerId: layers[identifier].layerId});

                            if(!layerObj)
                            {
                                layerObj = _.findWhere(layerIndexesBefore, {groupId: layers[identifier].layerId});
                            }

                            if(layerObj)
                            {
                                var zIndex   = layerObj.index + 100;
                                this.changeElementLayerIndex((layerObj.layerId ? layerObj.layerId : layerObj.groupId) , zIndex);
                            }
                        }
                    }

                    if(layerObjs instanceof Array)
                    {
                        for(var aL = 0; aL < layerObjs.length; aL++)
                        {
                            itemToAdd = layerObjs[aL];

                            if(typeof itemToAdd.type !== 'undefined' && itemToAdd.type === 'guide')
                            {
                                FTXCanvasGuides.drawGuide(itemToAdd.x, itemToAdd.y, itemToAdd.axis, (typeof itemToAdd.id !== 'undefined' ? itemToAdd.id : null), false, 'factor');
                            }
                            else
                            {
                                var layerType = itemToAdd.layerType;

                                if(layerType !== 'group')
                                {
                                    this.addLayers(itemToAdd, true);
                                }
                                else
                                {
                                    groupsObjs = _.without(groupsObjs, itemToAdd);
                                    groupsObjs.push(itemToAdd);
                                }
                            }
                        }

                        if(groupsObjs.length > 0)
                        {
                           this.reCreateGroupsFromGroupsObjs(groupsObjs);
                        }
                    }
                    else if(layerObjs instanceof Object)
                    {
                        itemToAdd = layerObjs;

                        if(typeof itemToAdd.type !== 'undefined' && itemToAdd.type === 'guide')
                        {
                            FTXCanvasGuides.drawGuide(itemToAdd.x, itemToAdd.y, itemToAdd.axis, (typeof itemToAdd.id !== 'undefined' ? itemToAdd.id : null), false, 'factor');
                        }
                        else
                        {
                            this.addLayers(itemToAdd, true);
                        }
                    }
                }

                break;

            case 'update':

                this.updateLayersByState(layerObjs, layerState.previousSelectionState);

                break;

            case 'sorting':

                layerObjs = layerState.layerIndexesBefore;

                var layerObjsCount = layerObjs.length;

                for(var l = 0; l < layerObjsCount; l++)
                {
                    this.updateLayerIndexByState(layerObjs[l]);
                }

                break;

            case 'group':

                // Ungroup objects (reverse process)
                this.historyUngroupAction(layerState);

                break;

            case 'ungroup':

                // Group objects (reverse process)
                this.historyUngroupAction(layerState);

                break;

            case 'layer_grid':

                // remove image form grid (reverse process)
                this.historyImageUnGridAction(layerState);

                break;

            case 'background':

                this.restoreToBackgroundState(layerObjs);

                break;

            case 'layerName':

                this.updateLayerNameByState(layerObjs);

                break;

            case 'magicResize':

                this.updateLayersByState(layerObjs, layerState.previousSelectionState);

                break;

            case 'psdReplace':

                this.historyDesignReplace(layerState, 'backward');

                break;
        }
    },

    /**
     * Restore Design
     *
     * @param layerState
     * @param historyDirection
     * @returns {*}
     */
    historyDesignReplace: function(layerState, historyDirection)
    {
        var context     = this,
            groupsObjs  = [],
            layerObjs, canvasOptions, sizeId;

        switch(historyDirection)
        {
            case 'forward':

                layerObjs       = layerState.layerObjs;
                canvasOptions    = layerState.newCanvasOptions;

                break;

            case 'backward':

                layerObjs       = (layerState.previousState != null ? layerState.previousState : layerState.layerObjs);
                canvasOptions    = layerState.oldCanvasOptions;

                break;
        }

        if(layerObjs instanceof Array)
        {
            FTXCanvas.clearCanvas();

            FTXCanvasGuides.clearGuides();

            for(var aL = 0; aL < layerObjs.length; aL++)
            {
                var itemToAdd = FTXCanvas.recursiveMerge({}, layerObjs[aL]);

                if(typeof itemToAdd.type != 'undefined' && itemToAdd.type === 'guide')
                {
                    FTXCanvasGuides.drawGuide(itemToAdd.x, itemToAdd.y, itemToAdd.axis, (typeof itemToAdd.id != 'undefined' ? itemToAdd.id : null), false, 'factor');
                }
                else
                {
                    var layerType = itemToAdd.layerType;

                    if(layerType !== 'group')
                    {
                        FTXCanvas.addLayers(itemToAdd, true);
                    }
                    else
                    {
                        groupsObjs = _.without(groupsObjs, itemToAdd);
                        groupsObjs.push(itemToAdd);
                    }
                }
            }

            if(groupsObjs.length > 0)
            {
                context.reCreateGroupsFromGroupsObjs(groupsObjs);
            }
        }

        if(canvasOptions && canvasOptions.canvasBackground != context.params.canvasOptions.canvasBackground)
        {
            context.setBackgroundClass(canvasOptions.canvasBackground, false);
        }

        // noinspection EqualityComparisonWithCoercionJS
        if(canvasOptions.canvasDimensions.width != FTXCanvas.params.canvasOptions.canvasDimensions.width
            || canvasOptions.canvasDimensions.height != FTXCanvas.params.canvasOptions.canvasDimensions.height
            || canvasOptions.sizeId != FTXCanvas.params.canvasOptions.sizeId
            )
        {
            var updatedParams = {
                canvasOptions : {
                    canvasDimensions : {
                        width:  canvasOptions.canvasDimensions.width,
                        height: canvasOptions.canvasDimensions.height
                    }
                },
                animationTimelineFactor: FTXCanvas.params.animationTimelineFactor
            };

            sizeId = canvasOptions.sizeId;

            if(sizeId !== '')
            {
                sizeId = parseInt(canvasOptions.sizeId)
            }

            FTXCanvasMagicResize.data.initialSizeId     = FTXCanvas.params.canvasOptions.sizeId = sizeId;
            FTXCanvasMagicResize.data.initialSizeName   = FTXCanvas.params.canvasOptions.sizeName = String(canvasOptions.sizeName);

            FTXCanvasMagicResize.updateCanvasWithNewDimension(updatedParams);

            CanvasMagicResizeHandler.setSizeOnPopOverTitle(
                updatedParams.canvasOptions.canvasDimensions.width,
                updatedParams.canvasOptions.canvasDimensions.height,
                FTXCanvas.params.canvasOptions.sizeId,
                FTXCanvas.params.canvasOptions.sizeName
            );
        }
    },

    /**
     * Restore Group: Group Forward(redo) and unGroup Backwards(undo)
     *
     * @param layerState
     * @returns {*}
     */
    historyGroupAction: function(layerState)
    {
        var groupBefore         = layerState.groupBefore,
            groupAfter          = layerState.groupAfter,
            layerIndexesAfter   = layerState.layerIndexesAfter;

        this.deselectAllLayers();

        var elementObj, elementId, layers, layerObj;

        if(groupBefore.length > 0)
        {
            var groupBeforeObjectElementCount = groupBefore.length;

            for(var i = 0; i < groupBeforeObjectElementCount; i++)
            {
                elementObj = groupBefore[i];

                if(elementObj.groupId !== 'undefined' && elementObj.hasOwnProperty('groupId'))
                {
                    elementId = elementObj.groupId;

                    var groupItems  = [];

                    layers = elementObj.layers;

                    for(var identifier in layers)
                    {
                        if(layers.hasOwnProperty(identifier))
                        {
                            if(layers[identifier].layerId !== 'undefined' && layers[identifier].hasOwnProperty('layerId'))
                            {
                                groupItems.push(this.getLayerElementById(layers[identifier].layerId));
                            }
                            else
                            {
                                var groupElements   = layers[identifier].layers,
                                    groupCount      = groupElements.length;

                                for(var h = 0; h < groupCount; h++)
                                {
                                    groupItems.push(this.getLayerElementById(groupElements[h]));
                                }
                            }
                        }
                    }

                    this.unGroupSelectedLayers(groupItems, false);

                    var panelElement = FTXLayerPanel.getLayerPanelElement(elementObj.groupId);
                    FTXLayerPanel.data.layerNames = _.without(FTXLayerPanel.data.layerNames, panelElement.find('.timeline-layer-text').val());
                }
            }
        }

        if(groupAfter.length > 0)
        {
            var groupAfterObjectElementCount = groupAfter.length;

            for(var l = 0; l < groupAfterObjectElementCount; l++)
            {
                elementObj = groupAfter[l];

                if(elementObj.layerId !== 'undefined' && elementObj.hasOwnProperty('layerId'))
                {
                    elementId = elementObj.layerId;
                }
                else
                {
                    elementId   = elementObj.groupId;
                    layers      = elementObj.layers;

                    var layersCount = layers.length;

                    if(layersCount > 0)
                    {
                        var groupIds = [];

                        for(var c = 0; c < layersCount; c++)
                        {
                            layerId = layers[c].layerId;

                            groupIds.push(layerId);
                        }

                        this.groupSelectedLayers(elementObj, groupIds, false, false);
                    }
                    else
                    {
                        layerObj = this.getLayerById(elementId);

                        layerObj.layerIndex = elementObj.layerIndex;
                        layerObj.groupId    = '';

                        this.addLayerWithZoomState(layerObj, false, false, false, true);
                    }
                }
            }

            if(layerIndexesAfter.length > 0)
            {
                var layerIndexesAfterCount = layerIndexesAfter.length;

                for(var r = 0; r < layerIndexesAfterCount; r++)
                {
                    elementObj = layerIndexesAfter[r];

                    var layerId     = (typeof elementObj.layerId !== 'undefined' ? elementObj.layerId : elementObj.groupId),
                        layer       = this.getLayerElementById(layerId);
                        layerObj    = this.getLayerById(layerId);

                    if(!layer)
                    {
                        layer = this.getGroupLayerById(layerId);
                    }

                    // in case group already deleted from dom and trying to apply properties in the group layer
                    if(layer)
                    {
                        layer.css('z-index', 100 + elementObj.index);
                    }

                    layerObj.layerIndex = elementObj.index;
                    this.layers[layerId] = layerObj;
                }
            }
        }

        FTXLayerPanel.updateLayerListFromLayers();
    },

    /**
     * Restore Image from grid
     *
     * @param layerState
     * @returns {*}
     */
    historyImageUnGridAction: function(layerState)
    {
        var gridBefore          = layerState.gridBefore,
            gridAfter           = layerState.gridAfter,
            layerIndexesBefore  = layerState.layerIndexesBefore;

        var elementObj, layerId, elementId, layer, layerObj;

        if(gridBefore.length > 0)
        {
            var gridBeforeObjectElementCount   = gridBefore.length;

            for(var g = 0; g < gridBeforeObjectElementCount; g++)
            {
                elementObj = gridBefore[g];

                if(elementObj.layerId !== 'undefined' && elementObj.hasOwnProperty('layerId'))
                {
                    elementId = elementObj.layerId;

                    if(!FTXCanvas.layers[elementId])
                    {
                        this.addLayerWithZoomState(elementObj, false, false, false, true);
                    }
                    else
                    {
                        this.updateLayerByState(elementObj);
                    }
                }
            }

            if(layerIndexesBefore.length > 0)
            {
                var layerIndexesBeforeCount = layerIndexesBefore.length;

                for(var h = 0; h < layerIndexesBeforeCount; h++)
                {
                    elementObj  = layerIndexesBefore[h];
                    layerId     = (typeof elementObj.layerId !== 'undefined' ? elementObj.layerId : elementObj.groupId);
                    layer       = this.getLayerElementById(layerId);
                    layerObj    = this.getLayerById(layerId);

                    if(!layer)
                    {
                        layer = this.getGroupLayerById(layerId);
                    }

                    layer.css('z-index', 100 + elementObj.index);

                    layerObj.layerIndex = elementObj.index;
                    this.layers[layerId] = layerObj;
                }
            }

            FTXLayerPanel.updateLayerListFromLayers();
        }
    },

    /**
     * Restore grid from image
     *
     * @param layerState
     * @returns {*}
     */
    historyImageGridAction: function(layerState)
    {
        var gridBefore          = layerState.gridBefore,
            gridAfter           = layerState.gridAfter,
            layerIndexesAfter   = layerState.layerIndexesAfter;

        var elementObj, elementId, layerId, layerObj, layer;

        this.deselectAllLayers();

        if(gridBefore.length > 0)
        {
            var gridBeforeObjectElementCount   = gridBefore.length;

            for(var g = 0; g < gridBeforeObjectElementCount; g++)
            {
                elementObj = gridBefore[g];

                if(elementObj.layerId !== 'undefined' && elementObj.hasOwnProperty('layerId'))
                {
                    elementId = elementObj.layerId;

                    if(elementObj.layerType !== 'grid')
                    {
                        this.deleteLayerById(elementId, false);
                    }
                }
            }

            if(layerIndexesAfter.length > 0)
            {
                var layerIndexesAfterCount = layerIndexesAfter.length;

                for(var h = 0; h < layerIndexesAfterCount; h++)
                {
                    elementObj  = layerIndexesAfter[h];
                    layerId     = (typeof elementObj.layerId !== 'undefined' ? elementObj.layerId : elementObj.groupId);
                    layer       = this.getLayerElementById(layerId);
                    layerObj    = this.getLayerById(layerId);

                    if(!layer)
                    {
                        layer = this.getGroupLayerById(layerId);
                    }

                    // in case group already deleted from dom and trying to apply properties in the group layer
                    if(layer)
                    {
                        layer.css('z-index', 100 + elementObj.index);
                    }

                    layerObj.layerIndex = elementObj.index;
                    this.layers[layerId] = layerObj;
                }
            }
        }

        if(gridAfter)
        {
            this.updateLayerByState(gridAfter);
        }

        FTXLayerPanel.updateLayerListFromLayers();
    },

    /**
     * Restore unGroup: unGroup Forward(redo) and Group Backwards(undo)
     *
     * @param layerState
     * @returns {*}
     */
    historyUngroupAction: function(layerState)
    {
        var groupBefore         = layerState.groupBefore,
            groupAfter          = layerState.groupAfter,
            layerIndexesBefore  = layerState.layerIndexesBefore;

        FTXLayerToolbar.getInstance().hideCurrentToolbar();

        var elementObj, elementId, layerId, layerObj, layer, layers, groupItems, layersCount, itemsCount;

        if(groupAfter.length > 0)
        {
            var groupAfterObjectElementCount = groupAfter.length;

            for(var i = 0; i < groupAfterObjectElementCount; i++)
            {
                elementObj = groupAfter[i];

                if(elementObj.layerId !== 'undefined' && elementObj.hasOwnProperty('layerId'))
                {
                    elementId = elementObj.layerId;
                }
                else
                {
                    elementId = elementObj.groupId;

                    layers          = elementObj.layers;
                    layersCount     = layers.length;
                    groupItems      = [];

                    for(var h = 0; h < layersCount; h++)
                    {
                        groupItems.push(this.getLayerElementById(layers[h].layerId));
                    }

                    this.unGroupSelectedLayers(groupItems, false);

                    var panelElement = FTXLayerPanel.getLayerPanelElement(elementObj.groupId);
                    FTXLayerPanel.data.layerNames = _.without(FTXLayerPanel.data.layerNames, panelElement.find('.timeline-layer-text').val());
                }
            }
        }

        if(groupBefore.length > 0)
        {
            var groupBeforeObjectElementCount   = groupBefore.length;

            for(var l = 0; l < groupBeforeObjectElementCount; l++)
            {
                elementObj = groupBefore[l];

                if(elementObj.layerId !== 'undefined' && elementObj.hasOwnProperty('layerId'))
                {
                    elementId = elementObj.layerId;

                    if(!FTXCanvas.layers[elementId])
                    {
                        layerObj = this.getLayerById(elementId);

                        layerObj.layerIndex = elementObj.layerIndex;
                        layerObj.groupId    = '';

                        this.addLayerWithZoomState(layerObj, false, false, false, true);
                    }
                }
                else
                {
                    elementId       = elementObj.groupId;
                    layers          = elementObj.layers;
                    layersCount     = layers.length;

                    if(layersCount > 0)
                    {
                        var groupIds = [];

                        for(var r = 0; r < layersCount; r++)
                        {
                            if(layers[r].layerId !== 'undefined' && layers[r].hasOwnProperty('layerId'))
                            {
                                layerId = layers[r].layerId;

                                groupIds.push(layerId);
                            }
                            else
                            {
                                groupItems = layers[r].layers;
                                itemsCount = groupItems.length;

                                if(itemsCount > 0)
                                {
                                    for(var f = 0; f < itemsCount; f++)
                                    {
                                        groupIds.push(groupItems[f]);
                                    }
                                }
                            }
                        }

                        if(groupIds.length > 0)
                        {
                            this.groupSelectedLayers(elementObj, groupIds, false, false, true);
                        }

                        this.deselectAllLayers();
                    }
                    else
                    {
                        layerObj = this.getLayerById(elementId);

                        layerObj.layerIndex = elementObj.layerIndex;
                        layerObj.groupId    = '';

                        this.addLayerWithZoomState(layerObj, false, false, false, true);
                    }
                }
            }

            if(layerIndexesBefore.length > 0)
            {
                var layerIndexesBeforeCount = layerIndexesBefore.length;

                for(var d = 0; d < layerIndexesBeforeCount; d++)
                {
                    elementObj  = layerIndexesBefore[d];
                    layerId     = (typeof elementObj.layerId !== 'undefined' ? elementObj.layerId : elementObj.groupId);
                    layer       = this.getLayerElementById(layerId);
                    layerObj    = this.getLayerById(layerId);

                    if(!layer)
                    {
                        layer = this.getGroupLayerById(layerId);
                    }

                    layer.css('z-index', 100 + elementObj.index);

                    layerObj.layerIndex = elementObj.index;
                    this.layers[layerId] = layerObj;
                }
            }
        }

        FTXLayerPanel.updateLayerListFromLayers();
    },

    /**
     * Change element layer index)
     *
     * @param {String} layerId
     * @param {String|Number} zIndex
     */
    changeElementLayerIndex: function(layerId, zIndex)
    {
        var layerIndex  = zIndex - 100,
            layer       = FTXCanvas.getLayerElementById(layerId);

        if(!layer)
        {
            layer = FTXCanvas.getGroupLayerById(layerId);
        }

        if(layer && layerIndex > 0)
        {
            layer.get(0).style.zIndex = zIndex;

            // Update layer, passing the latest index
            FTXCanvas.updateLayer(layerId, 'layer_update_index', {
                'layerIndex': layerIndex
            }, false);

            FTXLayerPanel.setPanelDepth(layerId, layerIndex);
        }

        FTXLayerPanel.setPanelDepth(layerId, layerIndex);
    },

    /**
     * Compare Layer States
     *
     * @param oldState
     * @param newState
     * @returns {Boolean}
     */
    compareLayerStates: function(oldState, newState)
    {
        var oldLayerIds = this.getLayerIdsFromState(oldState, 'previousState'),
            newLayerIds = this.getLayerIdsFromState(newState, 'previousState');

        return this.arrayEquals(oldLayerIds.layers, newLayerIds.layers);
    },

    /**
     * Get Layer Ids From State
     *
     * @param state
     * @param key
     * @returns {{layers: Array}}
     */
    getLayerIdsFromState: function(state, key)
    {
        var layerIds  = [],
            layerObjs = state[key];

        if(layerObjs)
        {
            if(layerObjs instanceof Array)
            {
                for(var o = 0; o < layerObjs.length; o++)
                {
                    if(typeof layerObjs[o].layerId !== 'undefined')
                    {
                        layerIds.push(layerObjs[o].layerId);
                    }
                }
            }
            else if(layerObjs instanceof Object && typeof layerObjs.layerId !== 'undefined')
            {
                layerIds.push(layerObjs.layerId);
            }
        }

        return {
            layers: layerIds
        }
    },

    /**
     * Get Current Zoom Value
     *
     * @returns {number}
     */
    getZoomValue: function ()
    {
        return this.data.zoomPreferences.canvasZoom;
    },

    /**
     * Set Zoom Value
     *
     * @param value
     */
    setZoomValue: function(value)
    {
        this.data.zoomPreferences.canvasZoom = value;
    },

    /**
     * Zoom Default (1)
     *
     * @param type
     * @returns {*}
     */
    zoomDefault: function(type)
    {
        return this.setZoom(1, (typeof type !== 'undefined' && type !== '') ? type : 'center');
    },

    /**
     * Zoom In
     *
     * @returns {*}
     */
    zoomIn: function()
    {
        var currentZoom = this.getZoomValue(),
            maxZoom     = 5;

        this.data.zoomStatus = true;

        if(currentZoom < maxZoom)
        {
            currentZoom = parseFloat((Math.round(currentZoom * 4) / 4).toFixed(2));
            currentZoom += .25;

            return this.setZoom(currentZoom, 'focus');
        }
    },

    /**
     * Zoom Out
     *
     * @returns {*}
     */
    zoomOut: function()
    {
        var currentZoom = this.getZoomValue(),
            minZoom     = .25;

        this.data.zoomStatus = true;

        currentZoom = parseFloat((Math.round(currentZoom * 4) / 4).toFixed(2));

        if(currentZoom > minZoom)
        {
            currentZoom -= .25;

            return this.setZoom(currentZoom, 'focus');
        }
        else if(currentZoom === minZoom)
        {
            return this.setZoom(currentZoom, 'focus');
        }
    },

    /**
     * Set Zoom
     *
     * @param zoomVal
     * @param type
     */
    setZoom: function(zoomVal, type)
    {
        var selectedLayers  = this.data.selectedLayers,
            zoomType        = (typeof type !== 'undefined' && type !== '') ? type : 'center',
            isCropEnable    = FTXImageCrop.data.isCropEnable;

        // Deselect all layers while zooming
        this.deselectAllLayers();

        // Set scroll offsets, to use in calculating canvas changes
        this.data.zoomPreferences.scrollOffsets = this.getCenteredScrollOffset();

        // Set zoom on the canvas
        //canvasDifference = this.setCanvasZoom(zoomVal);
        this.setCanvasZoom(zoomVal);

        // Set zoom on the elements, resize and change as appropriate
        this.zoomRefactorElements(zoomVal);

        this.zoomRefactorRulers(zoomVal);

        // Set zoom on the guides, reposition and change as appropriate
        FTXCanvasGuides.zoomRefactorGuides(zoomVal);

        // Add the previous layers back to selection to reset controls
        this.addLayersToSelection(selectedLayers);

        // Change the zoom amount at the footer toolbar
        this.selectors.zoomAmt.html(Math.round((zoomVal * 100)) + '%');

        // Center canvas and run resize events
        this.centerCanvasScroll(zoomType);
        this.resizeEvents();

        // If a single layer is selected, we'll update container based on the layer
        if(this.getSelectedLayerCount(true) === 1)
        {
            FTXCanvasTransform.updateContainerFromLayer(this.getSelectedLayerElement());
        }

        if(selectedLayers.length > 0)
        {
            FTXLayerToolbar.getInstance().showCurrentToolbar();
        }

        if(isCropEnable)
        {
            FTXImageCrop.enableCrop();
        }
    },

    /**
     * Zoom To Fit
     *
     * @returns {*}
     */
    zoomToFit: function(preserveZoom)
    {
        var wrapperHeight   = jQuery(this.selectors.layersOuterWrapper).height(),
            canvasHeight    = parseInt(this.params.canvasOptions.canvasDimensions.height),
            ratioOffset     = .25,
            ratio           = parseFloat((Math.round(((wrapperHeight / canvasHeight) - ratioOffset) * 10000) / 10000).toFixed(2));

        if(preserveZoom)
        {
            ratio = this.getZoomValue()
        }

        if(ratio < 0.25)
        {
            ratio = 0.25;
        }

        if(canvasHeight <= wrapperHeight && this.getZoomValue() === 1 && !preserveZoom)
        {
            return false;
        }

        return this.setZoom(ratio, 'center');
    },

    /**
     * Set Canvas Zoom
     *
     * @param zoomVal
     */
    setCanvasZoom: function(zoomVal)
    {
        var canvasDimensions    = this.params.canvasOptions.canvasDimensions,
            divLayers           = this.selectors.divLayers,
            parentElement       = this.selectors.layersInnerWrapper,
            prevParentWidth     = parentElement.offsetWidth,
            prevParentHeight    = parentElement.offsetHeight,
            adjustedWidth       = Math.round(canvasDimensions.width * zoomVal),
            adjustedHeight      = Math.round(canvasDimensions.height * zoomVal),
            parentWidthDiff     = adjustedWidth - prevParentWidth,
            parentHeightDiff    = adjustedHeight - prevParentHeight;

        this.setZoomValue(zoomVal);
        FTXCanvasGuides.setZoomValue(zoomVal);

        parentElement.style.width   = parseInt(adjustedWidth) + 'px';
        parentElement.style.height  = parseInt(adjustedHeight) + 'px';

        divLayers.style.width   = parseInt(adjustedWidth) + 'px';
        divLayers.style.height  = parseInt(adjustedHeight) + 'px';

        return {
            canvasWidthDiff:    parentWidthDiff,
            canvasHeightDiff:   parentHeightDiff
        };
    },

    /**
     * Dispatch Sync Layer
     *
     * @param layerElement
     */
    dispatchSyncLayer: function(layerElement)
    {
        layerElement = jQuery(layerElement).get(0);

        if(layerElement)
        {
            var event = document.createEvent('Event');

            event.initEvent("syncControlsWithLayer", false, true);

            layerElement.dispatchEvent(event);
        }
    },

    /**
     * Refactor Element Position / Dimensions
     *
     * @param zoomVal
     */
    zoomRefactorElements: function(zoomVal)
    {
        var layers;

        layers = this.layers;

        var controlsElement     = this.selectors.controls,
            selectedLayerCount  = this.getSelectedLayerCount(true),
            groups              = this.getGroupsLayers(),
            controlsWidth,
            controlsHeight,
            controlsLeft,
            controlsTop;

        if(this.getGroupLayerCount() > 0)
        {
            this.setDefaultPositionToLayers(groups);
        }

        for(var identifier in layers)
        {
            if(layers.hasOwnProperty(identifier))
            {
                var layerObj        = layers[identifier],
                    layerId         = identifier,
                    layerType       = layerObj.layerType,
                    layerElement    = this.getLayerElementById(layerId);

                if(layerType === 'group')
                {
                    layerElement = this.getGroupLayerById(layerId);
                }

                if(layerElement)
                {
                    var element         = layerElement.get(0),
                        layerPositions  = layerObj.position,
                        dimensions      = layerObj.dimensions,
                        newLeft         = Math.round(layerPositions.x * zoomVal),
                        newTop          = Math.round(layerPositions.y * zoomVal),
                        newWidth        = Math.round(dimensions.width * zoomVal),
                        newHeight       = Math.round(dimensions.height * zoomVal),
                        newFontSize     = parseInt(layerObj.layerTextOptions.fontSize) * zoomVal;

                    dimensions.width    = Math.abs(dimensions.width);
                    dimensions.height   = Math.abs(dimensions.height);

                    switch(layerType)
                    {
                        case 'text':

                            element.style.fontSize = newFontSize + '%';

                            break;

                        case 'icon':

                            element.style.fontSize = newFontSize + '%';

                            break;

                        case 'image':

                            layerElement.css({
                                width   : newWidth,
                                height  : newHeight
                            });

                            if(layerObj.image && layerObj.image.dimensions && layerObj.image.position)
                            {
                                layerElement.find('img').css({
                                    width   : layerObj.image.dimensions.width * zoomVal,
                                    height  : layerObj.image.dimensions.height * zoomVal,
                                    left    : layerObj.image.position.left * zoomVal,
                                    top     : layerObj.image.position.top * zoomVal
                                });
                            }
                            else
                            {
                                layerElement.find('img').css({
                                    width   : newWidth,
                                    height  : newHeight,
                                    left    : 0,
                                    top     : 0
                                });
                            }

                            break;

                        case 'shape':

                            var shape   = layerElement.find('svg'),
                                svgEl   = shape.get(0);

                            newWidth    = Math.abs(dimensions.width) * zoomVal;
                            newHeight   = Math.abs(dimensions.height) * zoomVal;

                            if(svgEl)
                            {
                                svgEl.setAttribute('width', newWidth);
                                svgEl.setAttribute('height', newHeight);
                            }

                            break;

                        case 'group':

                            element.style.width     = newWidth + 'px';
                            element.style.height    = newHeight + 'px';

                            break;

                        case 'grid':

                            layerElement.css({
                                width:  newWidth,
                                height: newHeight
                            });

                            layerElement.find('.rows').css({
                                width:  newWidth,
                                height: newHeight
                            });

                            break;

                        case 'gradient':

                            layerElement.css({
                                width:  newWidth,
                                height: newHeight
                            });

                            layerElement.find('.gradient').css({
                                width:  newWidth,
                                height: newHeight
                            });

                            break;
                    }

                    // Update layer CSS
                    this.setElementTransform(layerElement, {
                        'left': newLeft,
                        'top':  newTop
                    });

                    // Update freetrans data for this layer
                    FTXCanvasTransform.setElementSettings(layerElement, {
                        _p: {
                            width:  newWidth,
                            height: newHeight,
                            cwid:   newWidth,
                            chgt:   newHeight,
                            prev: {
                                width:  newWidth,
                                height: newHeight
                            }
                        },
                        x: newLeft,
                        y: newTop
                    });

                    FTXCanvas.dispatchSyncLayer(layerElement);
                }
                else
                {
                    delete this.layers[layerId];
                }
            }

            // Store state for zoom to begin processing old values
            this.storeZoomState(layerId, {
                x:          newLeft,
                y:          newTop,
                width:      newWidth,
                height:     newHeight,
                fontSize:   newFontSize
            });
        }

        // If any one or more layers were selected at the time of zoom
        if(selectedLayerCount > 0)
        {
            // If only single layer was selected
            if(selectedLayerCount === 1)
            {
                var selectedLayerElement = this.getSelectedLayerElement();

                // Prepare data for control's freetrans
                controlsWidth   = selectedLayerElement.width();
                controlsHeight  = selectedLayerElement.height();
                controlsLeft    = selectedLayerElement.position().left;
                controlsTop     = selectedLayerElement.position().top;

                // Sync control's style with that selected layer
                controlsElement.css({
                    width:  controlsWidth,
                    height: controlsHeight,
                    left:   controlsLeft,
                    top:    controlsTop
                });
            }
            else
            {
                // Cover all the layers and it will automatically update dimensions and positions
                // of controls. So no need to give the style separately
                this.coverLayerPosition();

                // Prepare data for control's freetrans (Case is multiselect)
                controlsWidth   = controlsElement.width();
                controlsHeight  = controlsElement.height();
                controlsLeft    = controlsElement.position().left;
                controlsTop     = controlsElement.position().top;
            }

            // Finally update control's freetrans data (Whether single or multiselect)
            FTXCanvasTransform.setElementSettings(controlsElement, {
                _p: {
                    width:  controlsWidth,
                    height: controlsHeight,
                    cwid:   controlsWidth,
                    chgt:   controlsHeight,
                    prev: {
                        width:  controlsWidth,
                        height: controlsHeight
                    }
                },
                x: controlsLeft,
                y: controlsTop
            });
        }

        if(this.getGroupLayerCount() > 0)
        {
            this.setPositionToLayers(true, groups);
        }

        if(this.data.zoomStatus)
        {
            this.data.zoomStatus = false;
        }
    },

    /**
     * Zoom Refactor Rulers
     *
     * @param zoomVal
     */
    zoomRefactorRulers: function(zoomVal)
    {
        var incValues = jQuery('.ruler-increment');

        for(var i = 0; i < incValues.length; i++)
        {
            var incElement 	= jQuery(incValues[i]),
                incVal	    = incElement.data('incDefault');

            var zoomRulerVal = Math.round(incVal / zoomVal);

            incElement.html(zoomRulerVal);
        }
    },

    /**
     * Store Zoom State by Layer Object
     *
     * @param layerObj
     * @returns {*}
     */
    storeZoomStateByLayerObj: function(layerObj)
    {
        if(layerObj && typeof layerObj.layerId !== 'undefined')
        {
            return this.storeZoomState(layerObj.layerId, {
                x:          layerObj.position.x,
                y:          layerObj.position.y,
                width:      layerObj.dimensions.width,
                height:     layerObj.dimensions.height,
                fontSize:   layerObj.layerTextOptions.fontSize
            });
        }
    },

    /**
     * Store Zoom State
     *
     * @param {String} layerId
     * @param options
     */
    storeZoomState: function(layerId, options)
    {
        var zoomVal         = this.getZoomValue(),
            toUpdate        = ['x', 'y', 'width', 'height', 'fontSize'],
            updateParams    = {};

        if(typeof this.data.zoomPreferences.zoomLayerStates[zoomVal] === 'undefined')
        {
            this.data.zoomPreferences.zoomLayerStates[zoomVal] = {};
        }

        if(typeof this.data.zoomPreferences.zoomLayerStates[zoomVal][layerId] === 'undefined')
        {
            this.data.zoomPreferences.zoomLayerStates[zoomVal][layerId] = {};
        }

        for(var t = 0; t < toUpdate.length; t++)
        {
            var key = toUpdate[t];

            if(typeof options[key] !== 'undefined')
            {
                updateParams[key] = options[key];
            }
        }

        this.recursiveMerge(this.data.zoomPreferences.zoomLayerStates[zoomVal][layerId], updateParams);
    },

    /**
     * Get Zoom State
     *
     * @param {String} layerId
     * @returns {*}
     */
    getZoomState: function(layerId)
    {
        var zoomVal = this.getZoomValue();

        if(typeof this.data.zoomPreferences.zoomLayerStates[zoomVal] !== 'undefined' && typeof this.data.zoomPreferences.zoomLayerStates[zoomVal][layerId] !== 'undefined')
        {
            return this.data.zoomPreferences.zoomLayerStates[zoomVal][layerId];
        }

        return false;
    },

    /**
     * Center Canvas Scroll
     *
     * @param type
     * @param leftOnly
     */
    centerCanvasScroll: function(type, leftOnly)
    {
        var scrollElement   = this.selectors.layersOuterWrapper,
            centeredScroll  = this.getCanvasCenteredScroll(),
            scrollOffsets   = this.data.zoomPreferences.scrollOffsets,
            scrollToLeft    = centeredScroll.left,
            scrollToTop     = centeredScroll.top;

        if(typeof type !== 'undefined' && type === 'focus')
        {
            scrollToLeft    += scrollOffsets.left;
            scrollToTop     += scrollOffsets.top;
        }

        scrollElement.scrollLeft = scrollToLeft;

        if(typeof leftOnly === 'undefined' || !leftOnly)
        {
            scrollElement.scrollTop = scrollToTop;
        }
    },

    /**
     * Get Canvas Centered Scroll
     *
     * @returns {{top: number, left: number}}
     */
    getCanvasCenteredScroll: function()
    {
        var scrollElement   = jQuery(this.selectors.layersOuterWrapper),
            innerElement    = jQuery(this.selectors.layersInnerWrapper);

        var scrollLeft  = scrollElement.scrollLeft() + innerElement.position().left - scrollElement.width() / 2 + innerElement.width() / 2,
            scrollTop   = scrollElement.scrollTop() + innerElement.position().top - scrollElement.height() / 2 + innerElement.height() / 2;

        return {
            left:   scrollLeft,
            top:    scrollTop
        }
    },

    /**
     * Offset Center Canvas Scroll
     *
     */
    offsetCenterCanvasScroll: function()
    {
        var scrollElement   = this.selectors.layersOuterWrapper,
            centeredOffset  = this.getCenteredScrollOffset();

        scrollElement.scrollLeft    = centeredOffset.left;
        scrollElement.scrollTop     = centeredOffset.top;
    },

    /**
     * Get Centered Offset Position
     *
     * @returns {{left: number, top: number}}
     */
    getCenteredScrollOffset: function()
    {
        var scrollElement   = this.selectors.layersOuterWrapper,
            centeredScroll  = this.getCanvasCenteredScroll();

        var left        = centeredScroll.left,
            leftOffset  = scrollElement.scrollLeft,
            top         = centeredScroll.top,
            topOffset   = scrollElement.scrollTop;

        return {
            left:   (leftOffset - left),
            top:    (topOffset - top)
        }
    },

    /**
     * Update Layers by State
     *
     * @param layerObjs
     * @param currentState
     */
    updateLayersByState: function(layerObjs, currentState)
    {
        var layerObjsCount;

        this.deselectAllLayers();

        if(layerObjs instanceof Array)
        {
            layerObjsCount = layerObjs.length;

            for(var l = 0; l < layerObjsCount; l++)
            {
                var groupId     = layerObjs[l].groupId,
                    groupLayer  = this.getGroupLayerById(groupId),
                    layerId     = layerObjs[l].layerId,
                    layer       = this.getLayerElementById(layerId);

                if(!layer)
                {
                    layer = this.getGroupLayerById(layerId);
                }

                if(groupLayer)
                {
                    if(!groupLayer.get(0).classList.contains('groupLayer_selected'))
                    {
                        var groupLayerPanel = FTXLayerPanel.getLayerPanelElement(groupId);

                        groupLayer.get(0).classList.add('groupLayer_selected');
                        groupLayerPanel.get(0).classList.add('layer-panel-selected');

                        this.selectGroupFromLayer(groupLayer);
                    }
                }

                this.updateLayerByState(layerObjs[l]);

                this.addLayerToSelection(layerObjs[l].layerId, true, true);

                
            }

            if(currentState === 'groupMultipleSelect')
            {
                this.setPositionToLayers(true);
            }

            this.initializeMultiSelect(false, 'history');

            if(currentState === 'hide_multiple_layers' || currentState === 'show_multiple_layers' || currentState === 'rotate_multiple_layers' || currentState === 'magic_resize_layers' )
            {
                this.deselectAllLayers();
            }
        }
        else if(layerObjs instanceof Object)
        {
            this.updateLayerByState(layerObjs);
        }

        if(currentState === 'show_multiple_layers' || !this.allLayersHide())
        {
            FTXLayerPanel.toggleVisibilityAllButton(true);
        }
        else if(currentState === 'hide_multiple_layers' || this.allLayersHide())
        {
            FTXLayerPanel.toggleVisibilityAllButton(false);
        }

        setTimeout(function()
        {
            FTXLayerPanel.updateLayerListFromLayers();
        }, 0);
    },

    /**
     * Update Layer Indexes By State
     * @param layerObj
     */
    updateLayerIndexByState: function(layerObj)
    {
        var layerId = (typeof layerObj.layerId !== 'undefined' ? layerObj.layerId : layerObj.groupId),
            layer   = this.getLayerElementById(layerId),
            oldObj  = this.getLayerById(layerId);

        if(!layer)
        {
            layer = this.getGroupLayerById(layerId);
        }

        oldObj.layerIndex = layerObj.index;

        this.layers[layerId] = oldObj;

        if(oldObj.groupId === '' || oldObj.layerType === 'group')
        {
            layer.css('z-index', 100 + layerObj.index);
        }

        FTXLayerToolbar.updateMediumEditor();
    },

    /**
     * Update Layer Name by State
     *
     * @param originalObj
     */
    updateLayerNameByState: function(originalObj)
    {
        var cloneOriginal   = this.recursiveMerge({}, originalObj),
            layerId         = originalObj.layerId,
            oldObj          = this.getLayerById(layerId);

        if(oldObj.layerName !== originalObj.layerName)
        {
            FTXLayerPanel.updateLayerPanelInputValue(layerId, cloneOriginal.layerName);
        }

        this.layers[layerId] = cloneOriginal;
    },

    /**
     * Update Layer by State
     *
     * @param originalObj
     */
    updateLayerByState: function(originalObj)
    {
        var cloneOriginal   = this.recursiveMerge({}, originalObj),
            layerId         = originalObj.layerId,
            layer           = this.getLayerElementById(layerId),
            oldObj          = this.getLayerById(layerId);

        if(!layer)
        {
            layer = this.getGroupLayerById(layerId);
        }

        if(!layer && typeof originalObj.type !== 'undefined' && originalObj.type === 'guide')
        {
            return this.updateGuideByState(cloneOriginal);
        }

        this.layers[layerId] = cloneOriginal;

        var cloneToRefactor = this.recursiveMerge({}, originalObj),
            refactoredObj   = this.refactorLayerObjByZoom(cloneToRefactor, 'multiply'),
            selectedCount   = this.getSelectedLayerCount(),
            rotation        = (refactoredObj.rotation) ? refactoredObj.rotation : this.layerDefaults.rotation;

        FTXCanvasTransform.setElementSettings(layer, {
            y:     refactoredObj.position.y,
            x:     refactoredObj.position.x,
            angle: rotation.angle,
            _p: {
                rad:    rotation.rad,
                width:  refactoredObj.dimensions.width,
                height: refactoredObj.dimensions.height
            }
        });

        this.setHideStatusFromObj(refactoredObj, false);

        if(originalObj.groupId === '' || originalObj.layerType === 'group')
        {
            layer.css('z-index', 100 + originalObj.layerIndex);
        }

        this.setElementTransform(layer, {
            'left': refactoredObj.position.x,
            'top':  refactoredObj.position.y,
            'rotation': rotation.angle
        });

        this.setElementTransform(this.selectors.controls, {
            'left': refactoredObj.position.x,
            'top':  refactoredObj.position.y,
            'rotation': rotation.angle
        });

        FTXCanvasTransform.setElementSettings(this.selectors.controls, {
            'y':     refactoredObj.position.y,
            'x':     refactoredObj.position.x,
            'angle': rotation.angle
        });

        if(selectedCount > 0)
        {
            this.selectors.controls.style.width   = refactoredObj.dimensions.width;
            this.selectors.controls.style.height  = refactoredObj.dimensions.height;
        }

        // Set opacity
        layerOpacityExtension.setOpacity(layer, refactoredObj.opacity);

        if(!this.isElementGroupedElement(layerId))
        {
            // Set blend mode options
            layerBlendModeExtension.setBlendMode(layer, refactoredObj.blendMode);

            // Set flip to layer
            layerFlipExtension.flipLayer(layer, refactoredObj.layerFlip);
        }

        var layerInner;

        switch(refactoredObj.layerType)
        {
            case 'text':

                layerInner = layer.get(0).querySelector('.innerslide_layer');

                layerInner.innerHTML = refactoredObj.layerText;

                layer.css({
                    // 'font-family':      refactoredObj.layerTextOptions.fontFamily,
                    'font-size':        refactoredObj.layerTextOptions.fontSize,
                    'font-weight':      refactoredObj.layerTextOptions.fontWeight,
                    'letter-spacing':   refactoredObj.layerTextOptions.letterSpacing,
                    'line-height':      refactoredObj.layerTextOptions.lineHeight
                });

                textEffectExtension.setTextEffect(layer, refactoredObj.layerTextOptions.textEffect);

                this.updateCaretFromLayerState();

                break;

            case 'icon':

                layerInner  = layer.get(0).querySelector('.innerslide_layer');

                layerInner.innerHTML = refactoredObj.layerText;

                layer.css({
                    'font-family':      refactoredObj.layerTextOptions.fontFamily,
                    'font-size':        refactoredObj.layerTextOptions.fontSize,
                    'font-weight':      refactoredObj.layerTextOptions.fontWeight,
                    'letter-spacing':   refactoredObj.layerTextOptions.letterSpacing,
                    'line-height':      refactoredObj.layerTextOptions.lineHeight
                });

                break;

            case 'image':

                layer.css({
                    width:  refactoredObj.dimensions.width,
                    height: refactoredObj.dimensions.height
                });

                if(refactoredObj.image && refactoredObj.image.dimensions && refactoredObj.image.position)
                {
                    layer.find('img').css({
                        width   : refactoredObj.image.dimensions.width,
                        height  : refactoredObj.image.dimensions.height,
                        left    : refactoredObj.image.position.left,
                        top     : refactoredObj.image.position.top
                    });
                }
                else
                {
                    layer.find('img').css({
                        width   : refactoredObj.dimensions.width,
                        height  : refactoredObj.dimensions.height,
                        left    : 0,
                        top     : 0
                    });
                }

                var shape = refactoredObj.shape;

                layer.removeClass(function (index, className) {
                    return (className.match (/(\S+)clip-path/g) || []).join(' ');
                });

                if(shape)
                {
                    if(window['loadedClipPathShapes'][shape] && window['loadedClipPathShapes'][shape]['shapeClipPath'])
                    {
                        var appliedClass = window['loadedClipPathShapes'][shape]['shapeClipPath'];

                        layer.addClass(appliedClass);
                    }
                }
                
                break;

            case 'shape':

                this.updateShapesByLayerState(refactoredObj, layer);

                break;

            case 'group':

                layer.css({
                    width:  refactoredObj.dimensions.width,
                    height: refactoredObj.dimensions.height
                });

                if(oldObj.visible === refactoredObj.visible)
                {
                    this.updatePositionOfGroupLayers(layerId);
                }

                break;

            case 'grid':

                var gridRows    = layer.find('.rows'),
                    gridSpacing = parseInt(refactoredObj.grid.spacing);

                gridRows.css({
                    borderWidth: refactoredObj.grid.borderSpacing ? (gridSpacing + 'px'): '0px',
                });

                gridRows.html(FTXCanvasGrid.getGridHtml(refactoredObj.grid.items, refactoredObj.grid.spacing, refactoredObj.grid.borderSpacing));

                layer.css({
                    width:  refactoredObj.dimensions.width,
                    height: refactoredObj.dimensions.height
                });

                layer.find('.rows').css({
                    'width':  refactoredObj.dimensions.width,
                    'height': refactoredObj.dimensions.height
                });

                layer.find('.rows').css({
                    'width':  refactoredObj.dimensions.width,
                    'height': refactoredObj.dimensions.height
                });

                if(refactoredObj.grid.spacing != oldObj.grid.spacing || refactoredObj.grid.borderSpacing != oldObj.grid.borderSpacing)
                {
                    layer.find('.rows').css({
                        borderWidth: refactoredObj.grid.borderSpacing? (gridSpacing + 'px'): '0px',
                    });

                    layer.find('.rows .item').each(function()
                    {
                        var left    = parseFloat(this.style.left),
                            top     = parseFloat(this.style.top),
                            width   = parseFloat(this.style.width),
                            height  = parseFloat(this.style.height),
                            isLeft, isTop, isBottom, isRight;

                        if(!refactoredObj.grid.borderSpacing)
                        {
                            isLeft      = left == 0;
                            isTop       = top == 0;
                            isRight     = width+left == 100;
                            isBottom    = height+top == 100;
                        }

                        jQuery(this).find('.content').css({
                            left:   ((isLeft)? 0: gridSpacing) + 'px',
                            right:  ((isRight)? 0: gridSpacing) + 'px',
                            top:    ((isTop)? 0: gridSpacing) + 'px',
                            bottom: ((isBottom)? 0: gridSpacing) + 'px',
                        });
                    });
                }

                break;

            case 'gradient':

                layer.css({
                    width:  refactoredObj.dimensions.width,
                    height: refactoredObj.dimensions.height
                });

                var layerStyle      = '',
                    targetGradient  = layer.find('.gradient').get(0),
                    shape           = refactoredObj.shape;

                layerStyle += refactoredObj.gradient.image ? ('background-image: ' + refactoredObj.gradient.image + ';') : '';
                layerStyle += refactoredObj.gradient.chromeImage ? ('background-image: ' + refactoredObj.gradient.chromeImage + ';') : '';
                layerStyle += refactoredObj.gradient.mozImage ? ('background-image: ' + refactoredObj.gradient.mozImage + ';') : '';

                layerStyle += ('background-color: '+ (refactoredObj.gradient.color ? refactoredObj.gradient.color : 'none') + ';');
                layerStyle += ('width: '+ refactoredObj.dimensions.width + 'px;');
                layerStyle += ('height: '+ refactoredObj.dimensions.height + 'px;');

                targetGradient.className = 'gradient ' + (shape ? window['loadedClipPathShapes'][shape]['shapeClipPath']: '');

                targetGradient.setAttribute('style', layerStyle);
                break;
        }

        FTXLayerToolbar.updateMediumEditor();

        this.storeZoomState(layerId, {
            x:          refactoredObj.position.x,
            y:          refactoredObj.position.y,
            width:      refactoredObj.dimensions.width,
            height:     refactoredObj.dimensions.height,
            fontSize:   parseInt(refactoredObj.layerTextOptions.fontSize)
        });

        FTXCanvas.dispatchSyncLayer(layer);
    },

    /**
     * Update Shape Layers By State
     *
     * @param layerObj
     * @param layer
     */
    updateShapesByLayerState: function(layerObj, layer)
    {
        var svgLayer = layer.find('svg');

        svgLayer.attr('width', layerObj.dimensions.width);
        svgLayer.attr('height', layerObj.dimensions.height);

        var colorObject = layerObj.svgParams.colorOptions;

        colorpickerShapeExtension.setLayerShapeColors(layerObj.layerId);

        for(var colorIndex in colorObject)
        {
            if(colorObject.hasOwnProperty(colorIndex))
            {
                var colorElement = layer.find('.' + colorIndex),
                    colorOptions = layerObj.svgParams.colorOptions[colorIndex];

                if(typeof colorOptions !== 'undefined')
                {
                    if(typeof colorOptions.fill !== 'undefined')
                    {
                        colorElement.css({"fill": colorOptions.fill});
                    }

                    if(typeof colorOptions.stroke !== 'undefined')
                    {
                        colorElement.css({"stroke": colorOptions.stroke});
                    }

                    if(typeof colorOptions.fillOpacity !== 'undefined')
                    {
                        if(colorOptions.fillOpacity != null)
                        {
                            colorElement.css({"fill-opacity": colorOptions.fillOpacity});
                        }
                        else
                        {
                            colorElement.css({"fill-opacity": ''});
                        }
                    }

                    if(typeof colorOptions.strokeWidth !== 'undefined')
                    {
                        colorElement.css({"stroke-width": colorOptions.strokeWidth});
                    }

                    if(typeof colorOptions.strokeOpacity !== 'undefined')
                    {
                        if(colorOptions.strokeOpacity != null)
                        {
                            colorElement.css({"stroke-opacity": colorOptions.strokeOpacity});
                        }
                        else
                        {
                            colorElement.css({"stroke-opacity": ''});
                        }
                    }
                }
            }
        }
    },

    /**
     * Update Guide By State
     *
     * @param guideObj
     */
    updateGuideByState: function(guideObj)
    {
        var guide           = FTXCanvasGuides.getGuideElementById(guideObj.id),
            cloneToRefactor = this.recursiveMerge({}, guideObj),
            refactoredObj   = this.refactorGuideObjByZoom(cloneToRefactor, 'multiply');

        if(guide)
        {
            FTXCanvasGuides.setElementTransform(guide, {
                'left': refactoredObj.x,
                'top':  refactoredObj.y
            });

            FTXCanvasTransform.setElementSettings(guide, {
                x: refactoredObj.x,
                y: refactoredObj.y
            });

            // update Guide Object after redo undo
            FTXCanvasGuides.updateGuideWithZoomState(guideObj.id, guide);
        }
    },

    /**
     * Update Caret From Layer State
     *
     */
    updateCaretFromLayerState: function()
    {
        var selectionState = this.data.layerHistory.currentState;

        if(this.textEditing())
        {
            var el = this.getSelectedLayerElement();

            if(el && el.get(0) && selectionState && this.data.layerHistory.lastDirection)
            {
                switch(this.data.layerHistory.lastDirection)
                {
                    case 'forward':

                        if(selectionState.newCaretPos !== undefined && selectionState.newCaretPos !== '')
                        {
                            this.setCharacterOffsetWithin(el.get(0), selectionState.newCaretPos);
                        }

                        break;

                    case 'backward':

                        if(selectionState.oldCaretPos !== undefined && selectionState.oldCaretPos !== '')
                        {
                            this.setCharacterOffsetWithin(el.get(0), selectionState.oldCaretPos);
                        }

                        break;
                }
            }
        }
    },

    /**
     * Restore to Background State
     *
     * @param backgroundObj
     */
    restoreToBackgroundState: function(backgroundObj)
    {
        if(backgroundObj && backgroundObj.class !== undefined)
        {
            this.setBackgroundClass(backgroundObj.class, false);
        }
    },

    /**
     * Check if Selector Collides with Layer
     *
     * @param a
     * @param b
     * @returns {Boolean}
     */
    doLayersCollide: function(a, b)
    {
        var layerA = jQuery(a),
            layerB = jQuery(b);

        if(!FTXCanvasGuides.isElementGuide(layerA.get(0)) && !FTXCanvasGuides.isElementGuide(layerB.get(0)))
        {
            var pointsA = new Array(4),
                pointsB = new Array(4);

            layerA.find('> .corner').each(function(i)
            {
                pointsA[i] = {x: parseInt($(this).offset().left), y: parseInt($(this).offset().top)};
            });

            layerB.find('> .corner').each(function(i)
            {
                pointsB[i] = {x: parseInt($(this).offset().left), y: parseInt($(this).offset().top)};
            });

            return FTXCanvasUtils.doPolygonsIntersect(pointsB, pointsA);
        }
        else
        {
            var aBounds = layerA.get(0).getBoundingClientRect(),
                bBounds = layerB.get(0).getBoundingClientRect();

            return !(
                ((aBounds.top + aBounds.height) < (bBounds.top)) ||
                (aBounds.top > (bBounds.top + bBounds.height)) ||
                ((aBounds.left + aBounds.width) < bBounds.left) ||
                (aBounds.left > (bBounds.left + bBounds.width))
            );
        }
    },

    /**
     * Get Element Left / Top On Canvas
     *
     * @param width
     * @param height
     * @returns {{left: number, top: number}}
     */
    getElementCanvasCenter: function(width, height)
    {
        var canvasCenter = this.getCanvasCenter();

        return {
            left:   canvasCenter.centerX - (width / 2),
            top:    canvasCenter.centerY - (height / 2)
        }
    },

    /**
     * Get Canvas Center
     *
     * @returns {{centerX: number, centerY: number}}
     */
    getCanvasCenter: function()
    {
        var canvasElement   = this.selectors.divLayers,
            width           = jQuery(canvasElement).width(),
            height          = jQuery(canvasElement).height();

        return {
            centerX: width / 2,
            centerY: height / 2
        }
    },

    /**
     * Generate Identifier
     *
     * @returns {String}
     */
    generateIdentifier: function()
    {
        var identifier = "";

        var charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

        for(var l = 0; l <= 2; l++)
        {
            for(var i = 0; i < 4; i++)
            {
                identifier += charset.charAt(Math.floor(Math.random() * charset.length));
            }

            if(l !== 2)
            {
                identifier += '-';
            }
        }

        return identifier;
    },

    /**
     * Run Request
     *
     * @param url
     * @param type
     * @param params
     * @param asynchronous
     * @param onComplete
     * @param options
     * @returns {*}
     */
    runRequest: function(url, type, params, asynchronous, onComplete, options)
    {
        // Set response variable
        var response,
            async   = asynchronous === true,
            context = this;

        var ajaxOpts = {
            'async': async,
            'type': type,
            'global': false,
            'dataType': 'json',
            'data': params,
            'url': url,
            'complete': function(data)
            {
                response = data;

                if(typeof onComplete === 'function' && response && async)
                {
                    var responseText = context.IsJsonString(response.responseText) ? response.responseText : null;

                    onComplete(response, jQuery.parseJSON(responseText));
                }
            }
        };

        if(options && typeof options == 'object')
        {
            ajaxOpts = jQuery.extend(true, ajaxOpts, options);
        }

        // Run Ajax Call
        jQuery.ajax(ajaxOpts);

        if(!async)
        {
            if(typeof onComplete === 'function' && response)
            {
                var responseText = this.IsJsonString(response.responseText) ? response.responseText : null;

                onComplete(response, jQuery.parseJSON(responseText));
            }

            if(typeof response.responseText === 'undefined' || response.responseText === '' || !this.IsJsonString(response.responseText))
            {
                return false;
            }

            response = jQuery.parseJSON(response.responseText);

            if(typeof response === 'object')
            {
                return response
            }
            else
            {
                return false;
            }
        }

        return false;
    },

    /**
     * Check if Valid JSON String exists
     *
     * @param data
     * @returns {Boolean}
     * @constructor
     */
    IsJsonString: function(data)
    {
        try
        {
            JSON.parse(data);
        }
        catch(e)
        {
            return false;
        }

        return true;
    },

    /**
     * Clone Canvas
     *
     * @param preview
     * @returns {Boolean}
     */
    cloneCanvas: function(preview)
    {
        var canvasDimensions    = this.selectors.divLayers.getBoundingClientRect(),
            holder              = this.selectors.layersInnerWrapper,
            clone               = jQuery(holder).clone(),
            divLayers           = clone.find('#divLayers'),
            html                = '';

        divLayers.removeAttr('id').addClass('layer-output');

        divLayers.addClass('noborder');

        if(typeof preview !== 'undefined' && preview)
        {
            var wrapperElement = jQuery('<div class="canvas-fullscreen-preview-inner"></div>');

            wrapperElement.css({
                width:  divLayers.width(),
                height: divLayers.height()
            });

            clone.attr('id', 'canvas-preview').attr('class', 'canvas-fullscreen-preview').removeAttr('style');
            divLayers.wrap(wrapperElement);

            html += '<div class="panzoom-controls">' +
                        '<a class="btn btn-transparent mr-sm btn-success panZoomIn"><i class="fas fa-plus"></i></a>' +
                        '<a class="btn btn-transparent mr-sm btn-success panZoomOut"><i class="fas fa-minus"></i></a>' +
                        '<a class="btn btn-transparent mr-sm btn-info panZoomReset">Reset</a>' +
                        '<a class="btn btn-danger mr-sm btn-transparent btn-info panZoomClose">Close</a>' +
                    '</div>';

            if(this.hasAnimation())
            {
                setTimeout(function()
                {
                    FTXAnimationPlayer.resetTimelineElements();

                }, 500);

                FTXAnimationPlayer.resetTimeline();
                FTXAnimationPlayer.data.timeline = null;

                html += '<div class="animation-controls preview-animation-controls">' +
                            '<div class="anim-toolbar-section">' +
                            '<a id="preview-play-pause-animation" class="animation-buttons"><i class="fas fa-play"></i></a>' +
                            '</div>' +
                            '<div class="anim-toolbar-section">' +
                            '<a id="preview-restart-animation" class="animation-buttons"><i class="fas fa-step-backward"></i></a>' +
                            '</div>' +
                            '<div class="anim-toolbar-section">' +
                            '<div class="anim-timing-range" id="previewAnimationPlayRange">' +
                            '<div id="preview-anim-timing-range-handle" class="anim-handle ui-slider-handle no-pointer-events">0.00</div>' +
                            '</div></div>' +
                            '<div class="anim-toolbar-section close-button">' +
                            '<a id="preview-anim-timing-close" class="animation-buttons"><i class="fas fa-times"></i></a>' +
                            '</div>' +
                        '</div>';
            }

            clone.append(html);
        }
        else
        {
            clone.attr('id', 'canvas-grab').attr('class', 'hide');
            clone.removeAttr('style');
            clone.css({
                'left':     -(clone.width()),
                'top':      0,
                'position': 'absolute',
                'z-index':  '-1',
                'height':   canvasDimensions.height,
                'width':    canvasDimensions.width
            });
        }

        clone.find('.ft-container, .slide_layers_border, .snapX, .snapY, .guide, .loading-center').remove();

        jQuery(document.body).append(clone);

        if(preview && this.hasAnimation())
        {
            var playRange   = document.getElementById('previewAnimationPlayRange'),
                playPause   = document.getElementById('preview-play-pause-animation'),
                restart     = document.getElementById('preview-restart-animation'),
                reset       = document.getElementById('preview-anim-timing-close'),
                handle      = document.getElementById('preview-anim-timing-range-handle'),
                context     = this;

            jQuery(playRange).slider({
                range:  false,
                min:    0,
                max:    (FTXCanvas.params.animationTimelineFactor / 10) * 100,
                step:   .001,
                slide: function(event, ui)
                {
                    FTXAnimationPlayer.triggerToolbarSlideAction(event, ui);
                    handle.innerHTML = (ui.value / 10).toFixed(2);
                }
            });

            if(playPause)
            {
                playPause.onclick = function(event)
                {
                    FTXAnimationPlayer.data.playAnimFullScreen = true;
                    FTXAnimationPlayer.triggerToolbarPlayPauseAction(event);
                    context.disablePreviewControls(true);
                };
            }

            if(restart)
            {
                restart.onclick = function(event)
                {
                    FTXAnimationPlayer.triggerToolbarRestartAction(event);
                }
            }

            if(reset)
            {
                reset.onclick = function(event)
                {
                    FTXAnimationPlayer.resetTimeline();

                    jQuery(playRange).slider("value", 0);
                    handle.innerHTML = '0.00';

                    FTXAnimationPlayer.resetPlayButton();

                    TweenLite.set('.timelineUI-dragger', {x: 0});

                    setTimeout(function()
                    {
                        FTXAnimationPlayer.resetTimelineElements();
                    }, 120);

                }
            }
        }

        this.data.clonedCanvas = clone;

        return this.data.clonedCanvas;
    },

    /**
     * Remove Cloned Canvas
     *
     */
    removeClonedCanvas: function()
    {
        if(this.data.clonedCanvas)
        {
            if(this.hasAnimation())
            {
                FTXAnimationPlayer.data.playAnimFullScreen = false;

                setTimeout(function()
                {
                    FTXAnimationPlayer.resetTimelineElements();
                }, 500);

                FTXAnimationPlayer.resetTimeline();
                FTXAnimationPlayer.data.timeline = null;
            }

            this.data.clonedCanvas.remove();
            this.disablePreviewControls(false);
        }

        this.data.clonedCanvas = false;
    },

    /**
     * Trigger Page Lock
     *
     */
    triggerPageLock: function()
    {
        window.onbeforeunload = function()
        {
            return "Are you sure you want to exit this design?";
        };
    },

    /**
     * Cancel Back Lock
     */
    cancelPageLock: function()
    {
        window.onbeforeunload = null;
    },

    /**
     * Render Preview
     *
     */
    renderPreview: function()
    {
        var context     = this,
            zoomVal     = this.getZoomValue();

        this.deselectAllLayers();

        if(this.hasAnimation())
        {
            FTXAnimationPlayer.killTimeline();
            FTXAnimationPlayer.resetTimelineElements();
        }

        this.selectors.loaders.center.css('display', 'none');

        setTimeout(function()
        {
            var screenHeight    = screen.height,
                canvasHeight    = parseInt(context.params.canvasOptions.canvasDimensions.height),
                ratioOffset     = 0,
                ratio           = parseFloat((Math.round(((screenHeight / canvasHeight) - ratioOffset) * 10000) / 10000).toFixed(2));

            context.setPreviewMode(true);

            context.setZoom(ratio, 'focus');

            var clone               = context.cloneCanvas(true),
                innerPreviewWrapper = clone.find('.canvas-fullscreen-preview-inner');

            context.setZoom(zoomVal, 'focus');

            clone.find('.panZoomClose').on('click', function()
            {
                var element = document.querySelector('.canvas-fullscreen-preview');

                if(element && element.parentNode)
                {
                    element.parentNode.removeChild(element);
                }
            });

            var panZoom = innerPreviewWrapper.panzoom({
                eventNamespace      : '.designPrev',
                $zoomIn             : clone.find(".panZoomIn"),
                $zoomOut            : clone.find(".panZoomOut"),
                $reset              : clone.find('.panZoomReset'),
                startTransform      : 'matrix(0.5, 0, 0, 0.5, 0, -50)',
                panOnlyWhenZoomed   : true,
                increment           : 0.1,
                minScale            : 0.5,
                maxScale            : 2.5,
            }).panzoom('zoom');

            panZoom.panzoom('reset');
        }, 350);
    },

    /**
     * Reset canvas to center
     *
     * @private
     */
    resetCanvas: function()
    {
        this.centerCanvasScroll('center');
        this.resizeEvents();
    },

    /**
     * Save Close Design Wrapper
     *
     * @private
     */
    saveCloseDesign: function()
    {
        var context = this;

        if(!FTXStockPhotosCart.canProceedToSave('close'))
        {
            context.hideMainLoader();
            return false;
        }

        this.showMainLoader();
        this.selectors.loaders.center.css('display', 'none');

        setTimeout(function()
        {
            return context._saveDesign(true);
        }, 350);
    },

    /**
     * Save Design Wrapper
     *
     * @private
     */
    saveDesign: function()
    {
        var context = this;

        if(!FTXStockPhotosCart.canProceedToSave('save'))
        {
            context.hideMainLoader();
            return false;
        }

        this.selectors.loaders.center.css('display', 'none');

        this.showMainLoader();

        setTimeout(function()
        {
            return context._saveDesign(false);
        }, 350);
    },

    /**
     * initialize auto save functionality
     *
     * @return {*}
     */
    autoSaveInitialise: function()
    {
        this.data.autoSaveInitialise = true;
    },

    /**
     * Save Design Wrapper
     *
     * @private
     */
    autoSaveDesign: function()
    {
        var context = FTXCanvas;

        if(!Cookies.get('autoSaveEnable') || !parseInt(Cookies.get('autoSaveEnable')))
        {
            return;
        }

        if(this.data.autoSaveInitialise === false)
        {
            return;
        }

        FTXCanvas.data.actionTimer = setInterval(function()
        {
            context.disableSaveButton();

            setTimeout(function()
            {
                var dpCompOrCartItem = FTXStockPhotosCart.getCompOrCartListInDesign();

                if(dpCompOrCartItem && dpCompOrCartItem.constructor === Array && dpCompOrCartItem.length > 0)
                {
                    return;
                }

                return context._saveDesign(false, true);
            }, 350);

        }, FTXCanvas.data.delayInAutoSave)

    },

    /**
     * Disable Save Button
     *
     * @return {*}
     */
    disableSaveButton: function()
    {
        FTXCanvas.selectors.buttons.autoSaveToggle.innerHTML = " Saving ...&nbsp;";
    },

    /**
     * Enable Save Button
     *
     * @return {*}
     */
    enableSaveButton: function()
    {
        FTXCanvas.selectors.buttons.autoSaveToggle.innerHTML = "Auto-Save";
    },

    /**
     * Clear Timer for Auto Save
     *
     * @return {*}
     */
    clearAutoSaveTimer: function()
    {
        clearTimeout(FTXCanvas.data.actionTimer);
    },

    /**
     * Save Design with Source
     *
     * @param {Boolean|Optional} close
     * @param {Boolean|Optional} autoSave
     * @param {Object|Array} imagesArray
     */
    _saveDesign: function(close, autoSave, imagesArray)
    {
        var context = this,
            layers  = this.getLayersArray();

        layers = layers.map(function(item)
        {
            if(item && item._p)
            {
                delete item._p
            }

            return item
        });

        var params = {
            'layers'        : JSON.stringify(layers),
            'params'        : JSON.stringify(this.params),
            'guides'        : JSON.stringify(FTXCanvasGuides.guides),
            'title'         : this.selectors.slideTitle.value,
            'size_id'       : (context.params.canvasOptions.sizeId) ? context.params.canvasOptions.sizeId : null,
            'ajax'          : true,
            'width'         : context.params.canvasOptions.canvasDimensions.width,
            'height'        : context.params.canvasOptions.canvasDimensions.height
        };

        if(context.selectors.newCategory)
        {
            params['tags'] = $("#designer_tags").val();

            if(context.selectors.newCategory.value === '' && FTXTemplateOptions.data.templateOptionsModal)
            {
                context.hideMainLoader();

                toastr.options = {
                    'showDuration'  : '30000',
                };

                toastr.error('Choose a category before saving!');

                FTXTemplateOptions.data.templateOptionsModal.open();

                return false;
            }

            params['category_id'] = context.selectors.newCategory.value;
        }

        if(context.selectors.templatePublishCheckbox)
        {
            params['is_published'] = (context.selectors.templatePublishCheckbox.checked) ? 1 : 0;
        }

        // If we load from a template, we mark the loaded design
        // so we can copy it's assets upon save
        if(this.data.loadedFromDesignId != null)
        {
            params['loadedFromDesignId'] = this.data.loadedFromDesignId;
        }

        if(imagesArray)
        {
            params['imagesArray'] = imagesArray;
        }

        if(autoSave)
        {
            params['isAutoSave'] = true;
        }

        this.runRequest(this.data.saveUrl, 'POST', params, autoSave, function(response, responseText)
        {
            context.removeClonedCanvas();

            if(responseText && typeof responseText.status !== 'undefined')
            {
                if(responseText.status)
                {
                    // Reset loaded design to null upon save success
                    context.data.loadedFromDesignId = null;

                    FTXStockPhotosCart.replaceCompAfterPurchase(responseText.compPurchaseStatus, false);

                    if(!autoSave)
                    {
                        swal({
                            title: "Save Successful!",
                            text: "Design has been saved!",
                            type: "success",
                            timer: 3000
                        }).catch(swal.noop);
                        if(FTXCanvasSidebar.data.mediaDataType === 'revisions')
                        {
                            FTXCanvasSidebar.listRevisions();
                        }
                    }
                    else
                    {
                        context.enableSaveButton();
                    }

                    if(close)
                    {
                        context.cancelPageLock();
                        window.location.href = context.data.saveCloseUrl;
                    }
                }
                else
                {
                    if(response.responseJSON.errorCode && response.responseJSON.errorCode == 'TIME_OUT_EXCEEDED')
                    {
                        response.message = response.responseJSON.message;
                    }

                    if(!autoSave)
                    {
                        swal({
                            title: "Save Failed",
                            text: (typeof response.responseJSON.message !== 'undefined' && response.responseJSON.message !== '') ? response.responseJSON.message : 'There was an issue in saving your design',
                            type: 'error',
                            timer: 2000
                        }).catch(swal.noop);
                    }
                    else
                    {
                        context.enableSaveButton();
                    }
                }
            }
            else
            {
                swal({
                    title : 'Save Failed',
                    text  : 'There was an issue in saving your design',
                    type  : 'error',
                    timer : 2000
                }).catch(swal.noop);
            }

            context.hideMainLoader();
        });
    },

    /**
     * Create Advertisement Filter Box
     *
     * @return {*}
     */
    createAdvertisementFilterBox: function()
    {
        var filterOuter = document.createElement('div'),
            inputBox    = document.createElement('input'),
            clearButton = document.createElement('a');

        filterOuter.className       = "input-group-teaser mb0";
        inputBox.className          = "form-control";
        clearButton.className       = "fas fa-times clear-btn";

        inputBox.setAttribute('placeholder', 'Search Advertisements.....');

        jQuery.expr[':'].Contains = function(a, i, m)
        {
            // noinspection JSConstructorReturnsPrimitive
            return jQuery(a).text().toUpperCase().indexOf(m[3].toUpperCase()) >= 0;
        };

        inputBox.onchange = function(e)
        {
            var filter              = e.target.value,
                filterInContainer   = jQuery('.slideWrap');

            if(jQuery.trim(filter) !== '')
            {
                filter = filter.toLowerCase();
                filterInContainer.find(".titleBox:not(:Contains(" + filter + "))").parents('.slideBox').addClass('hide-media');
                filterInContainer.find(".titleBox:Contains(" + filter + ")").parents('.slideBox').removeClass('hide-media');
            }
            else
            {
                filterInContainer.find("div.slideBox").removeClass('hide-media');
            }

            return false;
        };

        inputBox.onkeyup = function(e)
        {
            jQuery(e.target).change();
        };

        clearButton.onclick = (function(inputBox)
        {
            return function()
            {
                var event       = document.createEvent('Event'),
                    bubbling    = false;

                event.initEvent('change', true, true);
                inputBox.value = "";
                inputBox.dispatchEvent(event, bubbling);
            }
        }(inputBox));

        filterOuter.appendChild(inputBox);
        filterOuter.appendChild(clearButton);

        return filterOuter;
    },

    /**
     * Render Entire Advertisements Grid
     *
     * @return {*}
     */
    renderAdvertisementsGrid: function()
    {
        var mainContainer       = this.selectors.export.slideBox.get(0),
            canvasDimensions    = this.params.canvasOptions.canvasDimensions,
            sizeKey             = canvasDimensions.width + '_' + canvasDimensions.height,
            advertisements      = this.advertisements,
            adFilterInput       = this.createAdvertisementFilterBox(),
            adsContent          = this.listExportAdvertisements(advertisements, sizeKey),
            panelOuter          = document.createElement('div'),
            panelHeading        = document.createElement('div'),
            panelBody           = document.createElement('div');

        panelOuter.className    = "panel panel-default";
        panelHeading.className  = "panel-heading";
        panelBody.className     = "panel-body p-sm h550";
        panelBody.style.position= 'relative';

        panelHeading.appendChild(adFilterInput);
        panelBody.appendChild(adsContent);
        panelOuter.appendChild(panelHeading);
        panelOuter.appendChild(panelBody);

        while(mainContainer.firstChild)
        {
            mainContainer.firstChild.remove();
        }

        mainContainer.appendChild(panelOuter);

        jQuery(panelBody).perfectScrollbar({
            suppressScrollX: true
        });
    },

    /**
     * List Export Advertisements
     *
     * @param advertisements
     * @param sizeKey
     * @return {HTMLElement}
     */
    listExportAdvertisements: function(advertisements, sizeKey)
    {
        var sizeKeyArray    = sizeKey.split('_'),
            width           = sizeKeyArray[0],
            height          = sizeKeyArray[1],
            outerWrapper    = document.createElement('div');

        if(advertisements.length > 0)
        {
            outerWrapper.className  = "slideWrap grid-4 wrapper-" + sizeKey + " w-"+ width +" h-" + height;

            for(var i = 0; i < advertisements.length; i++)
            {
                outerWrapper.appendChild(this.createSingleAdvertisementWrapper(advertisements[i], sizeKey));
            }
        }
        else
        {
            outerWrapper.className  = "alert alert-warning";
            outerWrapper.innerHTML  = "You have no available advertisements.";
        }

        return outerWrapper;
    },

    /**
     * Create Single Advertisement Item Content
     *
     * @param {object} advertisement
     * @param {String} sizeKey
     * @return {*|HTMLElement}
     */
    createSingleAdvertisementWrapper: function(advertisement, sizeKey)
    {
        var outerWrapper    = document.createElement('div'),
            innerWrapper    = document.createElement('div'),
            adImage         = document.createElement('img'),
            titleWrapper    = document.createElement('div'),
            context         = this;

        outerWrapper.className      = "slideBox";
        innerWrapper.className      = "slideBoxInner hasSelection";
        titleWrapper.className      = "titleBox";
        titleWrapper.innerHTML      = advertisement.name;
        adImage.src                 = this.getSlideThumb(advertisement, sizeKey);
        adImage.onerror             = (function(advertisement)
        {
            return function(e)
            {
                e.target.src = context.getSlidePlaceholder(advertisement, sizeKey);
            }
        }(advertisement));
        outerWrapper.style.position = "relative";
        outerWrapper.setAttribute('advertisement-id', advertisement.id);

        innerWrapper.appendChild(adImage);
        innerWrapper.appendChild(titleWrapper);
        outerWrapper.appendChild(innerWrapper);

        outerWrapper.onclick = function(event)
        {
            event.stopPropagation();
            jQuery('.slideBox').removeClass('selected');
            jQuery(event.currentTarget).addClass('selected');
        };

        return outerWrapper;
    },

    /**
     * Load More Advertisements
     *
     */
    loadMoreAdvertisements: function()
    {
        var context = this;

        jQuery.ajax({
            url : context.data.ajaxAdvertisementsURL,
            type: "post",
            data:
            {
                accountId:  context.data.accountId
            },
            async: false,
            beforeSend: function()
            {
                jQuery('.sk-cube-grid').show();
            },
            success: function(data)
            {
                if(typeof data.status !== 'undefined' && data.status)
                {
                    _.each(data.advertisements, function(obj)
                    {
                        context.advertisements.push(obj);
                    });

                    context.renderAdvertisementsGrid();
                }
            }
        });
    },

    /**
     * Save New Design
     *
     */
    saveNewDesign: function()
    {
        var context = this;

        if(!FTXStockPhotosCart.canProceedToSave('save_as_new'))
        {
            context.hideMainLoader();
            return false;
        }

        this.showMainLoader();

        this.selectors.loaders.center.css('display', 'none');

        setTimeout(function()
        {
            return context._saveNewDesign();
        }, 350);
    },

    /**
     * Create or Export Design
     *
     * @param {Number} imagesArray
     * @private
     */
    _saveNewDesign: function(imagesArray)
    {
        var context = this,
            layers  = this.getLayersArray();

        var newDesignNameModal = new ModalBox({
            modalClass      : 'modal-sm',
            modalTitle      : 'Create New Design',
            modalTitleClass : 'text-center',
            showTabIndex    : false,
            showCloseButton : true,
            modalFooter     : {
                show        : true,
                buttons     : [{
                    text        : 'Create',
                    className   : 'btn btn-info',
                    callback    : function ()
                    {
                        var newDesignTitle = document.getElementById('newDesignTitle');

                        if(newDesignTitle)
                        {
                            var newTitle = newDesignTitle.value.trim();

                            if(newTitle === '')
                            {
                                swal('Error!', 'Enter a valid title!', 'error');

                                return false;
                            }
                            else
                            {
                                newDesignNameModal.close();

                                context.showMainLoader();

                                setTimeout(function()
                                {
                                    var params = {
                                        'layers'    : JSON.stringify(layers),
                                        'params'    : JSON.stringify(context.params),
                                        'guides'    : JSON.stringify(FTXCanvasGuides.guides),
                                        'title'     : newTitle,
                                        'size_id'   : (context.params.canvasOptions.sizeId) ? context.params.canvasOptions.sizeId : null,
                                        'ajax'      : true,
                                        'width'     : context.params.canvasOptions.canvasDimensions.width,
                                        'height'    : context.params.canvasOptions.canvasDimensions.height,
                                        'account_id': context.data.accountId,
                                        'saveFrom'  : FTXCanvasSidebar.data.design.id
                                    };

                                    if(imagesArray)
                                    {
                                        params['imagesArray'] = imagesArray;
                                    }

                                    if(context.selectors.newCategory)
                                    {
                                        params['tags'] = $("#designer_tags").val();

                                        if(context.selectors.newCategory.value === '' && FTXTemplateOptions.data.templateOptionsModal)
                                        {
                                            context.hideMainLoader();

                                            toastr.options = {
                                                'showDuration'  : '30000',
                                            };

                                            toastr.error('Choose a category before saving!');

                                            FTXTemplateOptions.data.templateOptionsModal.open();

                                            return false;
                                        }

                                        params['category_id'] = context.selectors.newCategory.value;
                                    }

                                    if(context.selectors.templatePublishCheckbox)
                                    {
                                        params['is_published'] = (context.selectors.templatePublishCheckbox.checked) ? 1 : 0;
                                    }

                                    var response = context.runRequest(context.data.saveAsNewUrl, 'POST', params, false, function()
                                    {
                                        context.removeClonedCanvas();
                                    });

                                    context.removeClonedCanvas();
                                    context.hideMainLoader();

                                    if(typeof response.status !== 'undefined')
                                    {
                                        if(response.status)
                                        {
                                            swal({
                                                    type                : "success",
                                                    title               : "Saved Successful!",
                                                    text                : "Do you want to open the saved design?",
                                                    showCancelButton    : true,
                                                    confirmButtonText   : "Yes, open!",
                                                    cancelButtonText    : "Cancel",
                                                })
                                                .then(function(isConfirmed)
                                                {
                                                    if(isConfirmed)
                                                    {
                                                        context.cancelPageLock();
                                                        window.location.href = response.url;
                                                    }
                                                }).catch(swal.noop);
                                        }
                                        else
                                        {
                                            swal({
                                                title:  "Save Failed!",
                                                text:   response.message,
                                                type:   "error",
                                                timer:  3000
                                            });
                                        }
                                    }
                                }, 500);
                            }
                        }
                    }
                }]
            }
        });

        newDesignNameModal.setBodyContents(
            '<label for="exampleInputEmail1">Enter a name for new design</label>' +
            '<input type="text" class="form-control" id="newDesignTitle" placeholder="Title">'
        );

        context.hideMainLoader();

        newDesignNameModal.open();
    },

    /**
     * Download Image
     *
     * @param {HTMLElement|jQuery} element
     * @returns {*}
     */
    downloadImage: function(element)
    {
        var context             = this,
            downloadElement     = jQuery(element),
            elementData         = downloadElement.data(),
            downloadType        = elementData.type,
            dpCompOrCartItem    = FTXStockPhotosCart.getCompOrCartListInDesign();

        ExportCanvasDesign.closeExportModal();

        jQuery(this.selectors.buttons.downloadButton).dropdown('toggle');

        if(dpCompOrCartItem && dpCompOrCartItem.constructor === Array && dpCompOrCartItem.length > 0)
        {
            return swal({
                title               : "Alert",
                text                : "There are some premium elements in your Cart.",
                type                : "warning",
                showCancelButton    : true,
                confirmButtonColor  : "#DD6B55",
                cancelButtonColor   : "#337ab7",
                cancelButtonIcon    : "fas fa-lock",
                confirmButtonText   : "<i class='fal fa-times'></i> Discard Cart Items ",
                cancelButtonText    : '<span class="close-prompt-cart-count fa-stack fa-2x " data-count="'+ dpCompOrCartItem.length +'"> <i class="fa fa-shopping-cart fa-stack-1x" ></i></span> Open Cart '
            }).then(function()
            {
                FTXStockPhotosCart.clearFullCart(true);
                context.downloadAsType(downloadType)
            }).catch(function()
            {
                FTXStockPhotosCart.openCartPrompt('cart');
            });
        }

        return this.downloadAsType(downloadType);
    },

    /**
     * Download As Type
     *
     * @param type
     */
    downloadAsType: function(type)
    {
        var context = this;

        this.selectors.loaders.center.css('display', 'none');

        this.showMainLoader();

        setTimeout(function()
        {
            return context._downloadAsType(type);
        }, 350);
    },

    /**
     * Download As Type
     *
     * @param type
     * @private
     */
    _downloadAsType: function(type)
    {
        var context = this,
            layers  = this.getLayersArray();

        var params = {
            'title'         : context.selectors.slideTitle.value,
            'fileType'      : type,
            'canvasFonts'   : FTXEditorTextToolbar.data.loadedFont,
            'layers'        : JSON.stringify(layers),
            'params'        : JSON.stringify(this.params),
            'width'         : context.params.canvasOptions.canvasDimensions.width,
            'height'        : context.params.canvasOptions.canvasDimensions.height
        };

        var response = this.runRequest(this.data.downloadUrl, 'POST', params, false, function() {
            context.removeClonedCanvas();
        });

        if(typeof response.status !== 'undefined' && response.status)
        {
            if(typeof response.file !== 'undefined' && response.file)
            {
                this.cancelPageLock();
                context.newLocation(response.file);
            }
            else
            {
                swal({
                    title: "Save Failed",
                    text: 'There was an issue downloading your file',
                    type: 'error',
                    timer: 2000
                });
            }

            setTimeout(function()
            {
                context.triggerPageLock();
            }, 500);
        }

        if(response.status == false)
        {
            if(response.errorCode && response.errorCode == 'TIME_OUT_EXCEEDED')
            {
                swal({
                    title: "Save Failed",
                    text: response.message,
                    type: 'error',
                    timer: 2000
                });
            }
        }

        View.cancelPageLock();
        this.hideMainLoader();
    },

    /**
     * Get Computed Style Property
     *
     * @param {HTMLElement|jQuery} element
     * @param propName
     * @returns {*}
     */
    getComputedStyleProperty: function(element, propName)
    {
        if(window.getComputedStyle)
        {
            return window.getComputedStyle(element, null)[propName];
        }
        else if(element.currentStyle)
        {
            return element.currentStyle[propName];
        }
    },

    /**
     * Has Classes or ID
     *
     * @param {HTMLElement|jQuery} element
     * @param classOrIds
     * @returns {Boolean}
     */
    hasClassesOrId: function(element, classOrIds)
    {
        var splitString;

        element = jQuery(element).get(0);

        if(classOrIds instanceof Array)
        {
            for(var c = 0; c < classOrIds.length; c++)
            {
                var classOrId = classOrIds[c];

                splitString = classOrId.substr(1);

                if(classOrId.indexOf(".") === 0 && element.classList.contains(splitString))
                {
                    return true;
                }
                else if(classOrId.indexOf("#") === 0 && element.id === splitString)
                {
                    return true;
                }
            }
        }
        else if(classOrIds !== '')
        {
            splitString = classOrIds.substr(1);

            if(classOrIds.indexOf(".") === 0 && element.classList.contains(splitString))
            {
                return true;
            }
            else if(classOrIds.indexOf("#") === 0 && element.id === splitString)
            {
                return true;
            }
        }

        return false;
    },

    /**
     * Open Ghost Box
     *
     * @param event
     */
    startGhostBox: function(event)
    {
        var context         = FTXCanvas,
            element         = context.selectors.layersOuterWrapper,
            elementOffset   = context.getElementOffset(element),
            initialW        = context.data.initialW,
            initialH        = context.data.initialH,
            newPositionW    = event.pageX - elementOffset.left,
            newPositionH    = event.pageY - elementOffset.top,
            left            = (event.pageX - elementOffset.left) + element.scrollLeft,
            top             = (event.pageY - elementOffset.top) + element.scrollTop,
            ghostSelect     = FTXCanvas.selectors.ghostSelect;

        ghostSelect.style.width     = Math.abs(initialW - newPositionW) + 'px';
        ghostSelect.style.height    = Math.abs(initialH - newPositionH) + 'px';

        if((event.pageX - elementOffset.left) <= initialW && (event.pageY - elementOffset.top) >= initialH)
        {
            ghostSelect.style.left = left + 'px';
        }
        else if((event.pageY - elementOffset.top) <= initialH && (event.pageX - elementOffset.left) >= initialW)
        {
            ghostSelect.style.top = top + 'px';
        }
        else if((event.pageY - elementOffset.top) < initialH && (event.pageX - elementOffset.left) < initialW)
        {
            ghostSelect.style.left  = left + 'px';
            ghostSelect.style.top   = top + 'px';
        }
    },

    /**
     * Remove Ghost Box
     *
     * @param event
     */
    stopGhostBox: function(event)
    {
        var context             = FTXCanvas,
            targetElements      = context.getLayerElements(),
            ghostSelect         = FTXCanvas.selectors.ghostSelect,
            slideLayers         = FTXCanvas.getLayerElements(),
            selectedElements    = [],
            selectAllButton     = FTXLayerPanel.selectors.layerSelectAll;

        slideLayers.removeClass('no-pointer-events');

        if(FTXCanvasGuides.getGuideCount())
        {
            targetElements = targetElements.add(FTXCanvasGuides.getAllGuides());
        }

        document.documentElement.removeEventListener('mousemove', context.startGhostBox, false);
        document.documentElement.removeEventListener('mouseup', context.stopGhostBox, false);

        for(var s = 0; s < targetElements.length; s++)
        {
            var elementB        = jQuery(targetElements[s]),
                result          = context.doLayersCollide(ghostSelect, elementB),
                layer           = jQuery(targetElements[s]),
                isGuide         = FTXCanvasGuides.isElementGuide(targetElements[s]);

            if(result)
            {
                if(!isGuide)
                {
                    var layerId     = context.getLayerIdFromElement(layer),
                        layerObj    = context.getLayerById(layerId);

                    if(layerObj.locked)
                    {
                        continue;
                    }

                    if(!_.contains(selectedElements, layerId))
                    {
                        if(context.isElementGroupedElement(layerId))
                        {
                            var groupItems = FTXCanvas.getGroupLayerIds(layerObj.groupId),
                                groupLayer = context.getGroupLayerById(layerObj.groupId);

                            context.selectGroupFromLayer(groupLayer);

                            if(groupItems && groupItems.length)
                            {
                                for(var g = 0; g < groupItems.length; g++)
                                {
                                    if(!_.contains(selectedElements, groupItems[g]))
                                    {
                                        selectedElements.push(groupItems[g]);
                                    }
                                }
                            }
                        }
                        else
                        {
                            context.addLayerToSelection(layerId, true);
                            selectedElements.push(layerId);
                        }
                    }
                }
                else
                {
                    var guideId = FTXCanvasGuides.getGuideIdByElement(layer);
                    FTXCanvasGuides.addGuideToSelection(guideId, true);
                }
            }
        }

        FTXLayerToolbar.getInstance().hideCurrentToolbar();

        if(FTXCanvas.getSelectedLayerCount(true) === 1)
        {
            FTXLayerToolbar.getInstance().showCurrentToolbar();
        }

        if(FTXCanvas.allLayersSelected())
        {
            selectAllButton.classList.add('all-selected')
        }

        if(FTXCanvas.getSelectedLayerCount(true) > 1 )
        {
            var layers = context.getSelectedLayers();

            FTXLayerToolbar.getInstanceByType('multiLayer').getEditor().addElements(layers);
            FTXLayerToolbar.getInstance().showCurrentToolbar();
        }

        ghostSelect.classList.remove('ghost-active');
        ghostSelect.style.width     = '0px';
        ghostSelect.style.height    = '0px';

        FTXCanvas.clearAllSelection();
    },

    /**
     * Duplicate Selected Layers
     *
     * @param pasteInFront
     */
    duplicateSelectedLayers: function(pasteInFront)
    {
        var selectedLayers = this.data.selectedLayers.filter(function(layerId)
        {
            return FTXCanvas.layers[layerId].layerType !== 'grid';
        });

        this.data.clipBoard.entries = this.getLayersById(selectedLayers);
        this.pasteClipboardEntries(pasteInFront);
    },

    /**
     * Set Clipboard Entries
     *
     */
    setClipboardEntries: function()
    {
        var selectedLayersId    = this.data.selectedLayers,
            selectedLayers      = this.getLayersById(selectedLayersId),
            textArea            = document.createElement("input");

        this.data.clipBoard.entries = selectedLayers;
        textArea.value = JSON.stringify({
            layers  : selectedLayers,
        });

        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try
        {
            document.execCommand('copy');
        }
        catch (err)
        {
            console.error('Fallback: Oops, unable to copy', err);
        }

        document.body.removeChild(textArea);
    },

    /**
     * Paste Clipboard Entries
     *
     * @param pasteInFront
     */
    pasteClipboardEntries: function(pasteInFront)
    {
        var clipboardLayers     = this.data.clipBoard.entries,
            layersToProcess     = [],
            selectedLayers      = {};

        this.deselectAllLayers();

        var sortedClipboardLayers = this.sortLayerObjsByProperty(clipboardLayers, 'layerIndex', 'asc');

        if(sortedClipboardLayers.length === 0)
        {
            return;
        }

        for(var c = 0; c < sortedClipboardLayers.length; c++)
        {
            var layerObj        = this.recursiveMerge({}, clipboardLayers[c]),
                oldObj          = this.recursiveMerge({}, layerObj),
                newObj          = oldObj;

            if(typeof pasteInFront === 'undefined' && !pasteInFront)
            {
                newObj = this.addDistanceToLayerObject(oldObj, null, 20);
            }

            // Get new and old object refactored
            var newObjRef       = this.recursiveMerge({}, newObj),
                oldObjRef       = this.refactorLayerObjByZoom(newObjRef, 'multiply');

            delete oldObjRef.layerId;
            delete oldObjRef.layerIndex;
            delete oldObjRef.groupId;

            //var newLayer = this.addLayer(newObjRef, false, false);
            var newLayer = this.addLayer(oldObjRef, false, false);

            if(layerObj.groupId !== '' && selectedLayers[layerObj.groupId] === undefined )
            {
                selectedLayers[layerObj.groupId] = [];
            }

            if(layerObj.groupId !== '')
            {
                selectedLayers[layerObj.groupId].push(newLayer.layerId)
            }

            layersToProcess.push(newLayer.layerId);

            FTXLayerToolbar.getInstance().hideCurrentToolbar();

            newObj.layerId      = newLayer.layerId;
            newObj.layerIndex   = newLayer.layerIndex;
            newObj.groupId      = '';


            this.layers[newLayer.layerId] = newObj;

            this.storeZoomStateByLayerObj(newObjRef);
        }

        this.addLayersToSelection(layersToProcess);

        if(this.getSelectedLayerCount() === 1 && layersToProcess[0] !== undefined)
        {
            setTimeout(function()
            {
                FTXLayerToolbar.showSelectedToolbar();
            }, 180);
        }

        for(var ID in selectedLayers)
        {
            if(selectedLayers.hasOwnProperty(ID))
            {
                this.deselectAllLayers();

                var layersArray = selectedLayers[ID];

                this.addLayersToSelection(layersArray);
                this.groupSelectedLayers(false, false, false, true);

                var groupId = this.getSelectedGroupId();

                if(groupId)
                {
                    var previousGroupObj = this.getLayerById(ID);

                    if(previousGroupObj && previousGroupObj.rotation && previousGroupObj.rotation.angle)
                    {
                        this.updateLayer(groupId, 'layer_rotation', {
                            rotation: previousGroupObj.rotation
                        }, false);

                        this.setElementTransform(this.getGroupLayerById(groupId), {
                            'rotation': previousGroupObj.rotation.angle
                        });

                        this.setElementTransform(this.selectors.controls, {
                            'rotation': previousGroupObj.rotation.angle
                        });
                    }
                }

                layersToProcess.push(groupId);
            }
        }

        var newLayerObjs = this.getLayersById(layersToProcess),
            historyTitle = "Multiple Layer Copied";

        if(newLayerObjs.length === 1)
        {
            historyTitle = newLayerObjs[0].layerType + " Layer Copied";
        }

        this.addLayerStateToHistory(newLayerObjs, newLayerObjs, historyTitle, 'add');
    },

    /**
     * Re-Create Groups from Groups Objects
     *
     * @param groupsObjs
     */
    reCreateGroupsFromGroupsObjs: function(groupsObjs)
    {
        var groupCount = groupsObjs.length;

        for(var l = 0; l < groupCount; l++)
        {
            if(typeof groupsObjs[l] !== "undefined")
            {
                var groupObj    = groupsObjs[l],
                    groupId     = groupObj.layerId,
                    groupItems  = groupObj.layerIds,
                    groupIndex  = groupObj.layerIndex,
                    rotation = (groupObj.rotation.angle === undefined ? this.layerDefaults.rotation.angle : groupObj.rotation.angle);

            this.groupSelectedLayers(groupObj, groupItems, false, false, false, true);

                var updateLayer = this.getGroupLayerById(groupId);

                this.updateLayer(groupId, 'update', {
                    layerIndex: groupIndex,
                    rotation: groupObj.rotation,
                }, false);

                if(rotation)
                {
                    this.setElementTransform(this.getGroupLayerById(groupId), {
                        'rotation': rotation
                    });

                    this.setElementTransform(this.selectors.controls, {
                        'rotation': rotation
                    });
                }

                FTXLayerPanel.addGroupToPanel(this.getLayerById(groupId));
                FTXLayerPanel.moveLayerInGroupPanel(groupId);

                updateLayer.get(0).style.zIndex = groupIndex + 100;

                this.deselectAllLayers();

                FTXLayerPanel.updateLayerListFromLayers();
                FTXLayerPanel.updateLayerInfo(true);
            }
        }
    },

    /**
     * Is Numeric
     *
     * @param value
     * @returns {Boolean}
     */
    isNumeric: function(value)
    {
        return !isNaN(parseFloat(value)) && isFinite(value);
    },

    /**
     * Get Keyboard Direction
     *
     * @param key
     * @returns {*}
     */
    getKeyboardDirection: function(key)
    {
        switch(key)
        {
            case 37:

                return 'left';

            case 38:

                return 'up';

            case 39:

                return 'right';

            case 40:

                return 'down';

            default:

                return false;
        }
    },

    /**
     * Update Current Selection
     *
     */
    updateCurrentSelection: function()
    {
        // Essential variables
        var selectedLayerId         = this.getSelectedLayerId(),
            selectedLayerObj        = this.getLayerById(selectedLayerId),
            selectedLayerElement    = this.getLayerElementById(selectedLayerId),
            selectedLayerType       = selectedLayerObj.layerType !== false ? selectedLayerObj.layerType : null;

        // Set Current Selection Parameters
        this.currentSelection = {
            selectedLayersCount:    this.getSelectedLayerCount(),
            selectedLayers:         this.getSelectedLayers(),
            selectedLayersIds:      this.data.selectedLayers,
            selectedLayer:          selectedLayerElement,
            selectedLayerId:        selectedLayerId,
            selectedLayerType:      selectedLayerType
        };
    },

    /**
     * Get Slide by ID
     *
     * @param id
     * @returns {*}
     */
    getSlideById: function(id)
    {
        var result = [];

        _.each(this.advertisements, function(obj)
        {
            if(obj.id === id)
            {
                result.push(obj);
            }
        });

        return result? result[0] : null;
    },

    /**
     * Get Slide Thumbs
     *
     * @param slide
     * @param sizeKey
     * @returns {*}
     */
    getSlideThumb: function(slide, sizeKey)
    {
        var defaultImage = '/slides/placeholders/' + sizeKey + '.png';

        if(!sizeKey) { return false; }

        // If thumbs are available, return the code
        if(typeof slide.images !== 'undefined' && typeof slide.images[sizeKey] !== 'undefined' && typeof slide.images[sizeKey].thumb !== 'undefined')
        {
            if(slide.images[sizeKey].thumb !== '' || slide.images[sizeKey].thumb !== false)
            {
                return slide.images[sizeKey].thumb;
            }
        }

        return defaultImage;
    },

    /**
     * Get Slide Placeholder Image
     *
     * @param slide
     * @param sizeKey
     * @returns {*}
     */
    getSlidePlaceholder: function(slide, sizeKey)
    {
        var defaultImage = '/slides/placeholders/' + sizeKey + '.png';

        if(!sizeKey) { return false; }

        // If thumbs are available, return the code
        if(typeof slide.images !== 'undefined' && typeof slide.images[sizeKey] !== 'undefined' && typeof slide.images[sizeKey].placeholder !== 'undefined')
        {
            if(slide.images[sizeKey].placeholder !== '' || slide.images[sizeKey].placeholder !== false)
            {
                return slide.images[sizeKey].placeholder;
            }
        }

        return defaultImage;
    },

    /**
     * Check String In Array, Return Found Result
     *
     * @param array
     * @param string
     * @returns {*}
     */
    matchInArray: function(array, string)
    {
        for(var i = 0; i < array.length; i++)
        {
            var stringToMatch = array[i];

            if(stringToMatch.indexOf(string) > -1)
            {
                return stringToMatch;
            }
        }

        return false;
    },

    /**
     * Get First Index of Object
     *
     * @param obj
     * @returns {String}
     */
    firstInObject: function(obj)
    {
        for(var a in obj) return a;
    },

    /**
     * Remove From Array
     *
     * @param array
     * @param value
     */
    removeFromArray: function(array, value)
    {
        if(array && value)
        {
            array = _.without(array, value);
        }

        return array;
    },

    /**
     * Check if Array Equals Another
     *
     * @param array1
     * @param array2
     * @returns {Boolean}
     */
    arrayEquals: function(array1, array2)
    {
        // If any array is not passed, return false
        if(!array1 || !array2)
        {
            return false;
        }

        // Compare lengths, return false if not equal
        if(array1.length !== array2.length)
        {
            return false;
        }

        for(var i = 0, l = array1.length; i < l; i++)
        {
            // Check if we have nested arrays
            if(array1[i] instanceof Array && array2[i] instanceof Array)
            {
                // Recursive into nested arrays
                if(!this.arrayEquals(array1[i], array2[i]))
                {
                    return false;
                }
            }
            else if(array1[i] !== array2[i])
            {
                // Return false if values not the same
                return false;
            }
        }

        return true;
    },

    /**
     * Find Child
     *
     * @param parentClass
     * @param childClass
     * @returns {*}
     */
    findChild: function(parentClass, childClass)
    {
        var parent = document.querySelector(parentClass);

        if(parent === 'undefined' || parent === null)
        {
            return false;
        }

        var children = parent.getElementsByClassName(childClass);

        if(children.length > 0)
        {
            return {
                'parent':       parent,
                'children':     children,
                'childLength':  children.length
            };
        }

        return false;
    },

    /**
     * Get Element Offset
     *
     * @param {HTMLElement|jQuery} element
     * @returns {{top: number, left: number}}
     */
    getElementOffset: function(element)
    {
        var rect = element.getBoundingClientRect();

        return {
            top:    rect.top + document.body.scrollTop,
            left:   rect.left + document.body.scrollLeft
        }
    },

    /**
     * Recursive Merge Function
     *
     * @param obj1
     * @param obj2
     * @returns {*}
     */
    recursiveMerge: function(obj1, obj2)
    {
        return jQuery.extend(true, obj1, obj2);
    },

    /**
     * Deep Extend
     *
     * @param out
     * @returns {*|{}}
     */
    deepExtend: function(out)
    {
        out = out || {};

        for(var i = 1; i < arguments.length; i++)
        {
            var obj = arguments[i];

            if(!obj)
            {
                continue;
            }

            for(var key in obj)
            {
                if(obj.hasOwnProperty(key))
                {
                    if(typeof obj[key] === 'object')
                    {
                        out[key] = this.deepExtend(out[key], obj[key]);
                    }
                    else
                    {
                        out[key] = obj[key];
                    }
                }
            }
        }

        return out;
    },

    /**
     * Find the closest element
     *
     * @param  element
     * @param  selector
     * @return {*}
     */
    closestEl: function(element, selector)
    {
        var matchesFn,
            parent,
            vendorPrefixes = ['matches','webkitMatchesSelector','mozMatchesSelector','msMatchesSelector','oMatchesSelector'];

        // find vendor prefix
        vendorPrefixes.some(function(fn)
        {
            if(typeof document.body[fn] === 'function')
            {
                matchesFn = fn;

                return true;
            }
            return false;
        });

        // traverse parents
        while(element)
        {
            parent = element.parentElement;

            if(parent && parent[matchesFn](selector))
            {
                return parent;
            }
            element = parent;
        }

        return null;
    },

    /**
     * Get Character Offset Within Element
     *
     * @param {HTMLElement|jQuery} element
     * @returns {number}
     */
    getCharacterOffsetWithin: function(element)
    {
        var caretOffset = 0;
        var doc = element.ownerDocument || element.document;
        var win = doc.defaultView || doc.parentWindow;
        var sel;
        if (typeof win.getSelection !== "undefined") {
            sel = win.getSelection();
            if (sel.rangeCount > 0) {
                var range = win.getSelection().getRangeAt(0);
                var preCaretRange = range.cloneRange();
                preCaretRange.selectNodeContents(element);
                preCaretRange.setEnd(range.endContainer, range.endOffset);
                caretOffset = preCaretRange.toString().length;
            }
        } else if ( (sel = doc.selection) && sel.type !== "Control") {
            var textRange = sel.createRange();
            var preCaretTextRange = doc.body.createTextRange();
            preCaretTextRange.moveToElementText(element);
            preCaretTextRange.setEndPoint("EndToEnd", textRange);
            caretOffset = preCaretTextRange.text.length;
        }
        return caretOffset;
    },

    /**
     * Set Caret Inside Element to Position
     *
     * @param el
     * @param pos
     * @returns {*}
     */
    setCharacterOffsetWithin: function(el, pos)
    {
        if(el.childNodes && el.childNodes.length)
        {
            for(var i = 0; i < el.childNodes.length; i++)
            {
                var node = el.childNodes[i];

                // If we have a text node
                if(node.nodeType === 3)
                {
                    if(node.length >= pos)
                    {
                        // finally add our range
                        var range = document.createRange(),
                            sel = window.getSelection();

                        range.setStart(node,pos);
                        range.collapse(true);
                        sel.removeAllRanges();
                        sel.addRange(range);

                        return -1;
                    }
                    else
                    {
                        pos -= node.length;
                    }
                }
                else
                {
                    pos = this.setCharacterOffsetWithin(node, pos);

                    if(pos === -1)
                    {
                        return -1; // no need to finish the for loop
                    }
                }
            }
        }

        return pos;
    },

    /**
     * Refactor Layers Timeline
     */
    refactorLayersTimeline: function()
    {
        if(typeof FTXCanvasAnimation === 'undefined')
        {
            return false;
        }

        var factorAmount    = FTXCanvas.params.animationTimelineFactor,
            oldFactorAmount = (FTXCanvas.data.oldFactor === 0 ? 10 : FTXCanvas.data.oldFactor),
            layers          = FTXCanvas.getAllLayerIds();

        for(var i = 0; i < layers.length; i++)
        {
            var layerObj            = this.getLayerById(layers[i]),
                animationObj        = layerObj.animation,
                refactoredObject    = {},
                startTime           = animationObj.animationTimingStart,
                endTime             = animationObj.animationTimingEnd;

            if(typeof animationObj.animationTimingStart !== 'undefined' && typeof animationObj.animationTimingEnd)
            {
                refactoredObject.animationTimingStart   = FTXCanvasAnimation.factorLayerRangeByMaxTiming(oldFactorAmount, factorAmount, startTime);
                refactoredObject.animationTimingEnd     = FTXCanvasAnimation.factorLayerRangeByMaxTiming(oldFactorAmount, factorAmount, endTime);
            }

            this.recursiveMerge(layerObj.animation, refactoredObject);
        }

        this.data.isLayerFactored = true;
    },

    /**
     * Has Animation
     *
     * @returns {Boolean}
     */
    hasAnimation: function()
    {
        return typeof FTXAnimationPlayer !== 'undefined';
    },

    /**
     * Check if Chrome
     *
     * @returns {Boolean}
     */
    isChrome: function()
    {
        return /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    },

    /**
     * Is Safari
     *
     * @return {boolean}
     */
    isSafari: function()
    {
        var ua = navigator.userAgent.toLowerCase();

        if(ua.indexOf('safari') != -1)
        {
            return ua.indexOf('chrome') <= -1;
        }
    },

    /**
     * Check if windows os
     *
     * @returns {Boolean}
     */
    isWindows: function()
    {
        return navigator.userAgent.indexOf("Windows") !== -1
    },

    /**
     * disablePreviewControls
     *
     * @param check {Boolean}
     */
    disablePreviewControls: function(check)
    {
        var buttons = jQuery('.panZoomIn, .panZoomOut, .panZoomReset');

        if(check)
        {
            buttons.addClass('disabled');
        }
        else
        {
            buttons.removeClass('disabled');
        }
    },

    /**
     * Add Text Layer At Position
     *
     * @param position
     */
    addTextLayerAtPosition: function(position)
    {
        var layerObj =
        {
            layerType: "text",
            layerTextOptions:
            {
                'fontSize'  : "320%",
                // 'fontFamily': "Open Sans"
            },
            layerText: "<p><font face='Open Sans'>New Text</font></p>",
            position:{
                x: position.x,
                y: position.y
            }
        };

        var newLayer        = this.addLayer(layerObj, true, true, false),
            newObj          = this.recursiveMerge({}, newLayer),
            refactoredObj   = this.refactorLayerObjByZoom(newObj, 'divide');

        this.storeZoomStateByLayerObj(layerObj);

        FTXCanvasMagicResize.addReferenceDimensionsForNewLayer(refactoredObj);

        if(typeof newObj.layerId !== 'undefined')
        {
            this.layers[newObj.layerId] = refactoredObj;

            if(typeof history === 'undefined' || history)
            {
                this.addLayerStateToHistory(refactoredObj, refactoredObj, newObj.layerType + ' Layer Added', 'add');
            }
        }

        setTimeout(function()
        {
            if(FTXCanvas.getSelectedLayerCount() === 1 && newObj.layerType === 'text')
            {
                FTXEditorToolbar.highlightSelectedElement();
            }
        }, 500);
    },

    /**
     * Reset Animation Settings from Layer
     *
     * @param layerId
     * @param previousAnimation
     */
    resetAnimationSettingsFromLayer: function(layerId, previousAnimation)
    {
        if(typeof previousAnimation !== 'undefined' && Object.keys(previousAnimation).every(function(x)
        {
            return previousAnimation[x]===''|| previousAnimation[x]===null;
        }) === false)
        {
            this.updateLayer(layerId, "group", {
                beforeGroupAnimationConfig: previousAnimation
            }, false);
        }

        this.updateLayer(layerId, "group", {
            animation: this.layerDefaults.animation
        }, false);
    },

    /**
     * Check if Layer is a Group
     *
     * @param {String} layerId
     */
    checkLayerIsGroup: function(layerId)
    {
        return !!(this.getGroupLayerById(layerId));
    },

    /**
     * Get Image Extension
     *
     * @param img
     * @returns {string|*}
     */
    getImageExtension: function(img)
    {
        var image = jQuery(img).get(0);

        if(image)
        {
            var source = image.src;
            return source.substring(source.lastIndexOf('.') + 1, source.length) || source;
        }

        return null;
    },

    /**
     * Get Base64 Image
     *
     * @param  {HTMLElement} img
     * @return {String}
     */
    getBase64Image: function(img)
    {
        var canvas,
            dataURL,
            ext,
            ctx;

        canvas          = document.createElement("canvas");
        canvas.width    = img.width;
        canvas.height   = img.height;
        ctx             = canvas.getContext("2d");
        ext             = this.getImageExtension(img);
        ctx.drawImage(img, 0, 0);

        dataURL = canvas.toDataURL("image/" + ext);

        return dataURL;
    },

    /**
     * Detect If Color Is Light or Dark
     *
     * @param color
     * @returns {string}
     */
    lightOrDark: function(color)
    {
        if(color instanceof tinycolor)
        {
            color = color.toString();
        }

        // Variables for red, green, blue values
        var r, g, b, hsp;

        // Check the format of the color, HEX or RGB?
        if(color.match(/^rgb/))
        {
            // If HEX --> store the red, green, blue values in separate variables
            color = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)$/);

            r = color[1];
            g = color[2];
            b = color[3];
        }
        else
        {
            // If RGB --> Convert it to HEX: http://gist.github.com/983661
            color = +("0x" + color.slice(1).replace(color.length < 5 && /./g, '$&$&'));

            r = color >> 16;
            g = color >> 8 & 255;
            b = color & 255;
        }

        // HSP (Highly Sensitive Poo) equation from http://alienryderflex.com/hsp.html
        hsp = Math.sqrt(
            0.299 * (r * r) +
            0.587 * (g * g) +
            0.114 * (b * b)
        );

        // Using the HSP value, determine whether the color is light or dark
        if(hsp > 127.5)
        {
            return 'light';
        }
        else
        {
            return 'dark';
        }
    },

    /**
     * Change Window to new Location
     *
     * @param location
     * @returns {string}
     */
    newLocation: function(location)
    {
        var newLocation = ( typeof location === "string" ) ? location : window.location.href;
        window.location = newLocation + "?c=" + (new Date()).getTime();
    }
};
