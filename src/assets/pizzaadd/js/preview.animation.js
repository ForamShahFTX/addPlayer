(function ()
{
    'use strict';

    /**
     * Animation Player
     *
     * @param design
     * @param layers
     * @param presets
     * @constructor
     */
    function AnimationPlayer(design, layers, presets)
    {
        if(!design instanceof HTMLElement)
        {
            throw new Error("Design must be a HTMLElement");
        }

        this.animationTimelineFactor = 10;
        this.textAnimComplete   = [];
        this.animationPresets   = presets;
        this.timelineElements   = [];
        this.timeline           = null;
        this.playAnimFullScreen = false;
        this.layers             = layers;
        this.design             = design;

        if(this.design)
        {
            this.playButton         = this.design.querySelector(".play-animation");
            this.restartButton      = this.design.querySelector(".restart-animation");
        }

        this.initBindings();
    }

    /**
     * Initialize Bindings
     *
     */
    AnimationPlayer.prototype.initBindings = function()
    {
        var context = this;

        if(this.playButton)
        {
            this.playButton.onclick = function()
            {
                context.playAnimation();
            }
        }
        if(this.restartButton)
        {
            this.restartButton.onclick = function()
            {
                context.restartAnimation();
            }
        }
    };

    /**
     * Play Animation
     *
     * @returns {null|*}
     */
    AnimationPlayer.prototype.playAnimation = function()
    {
        var context             = this,
            processedAnimations = this.processLayersForAnimation(this.layers);

        if(processedAnimations)
        {
            this.resetTimelineElements();
            this.killTimeline();
            this.clearTimeline();

            //noinspection JSUnresolvedFunction
            this.timeline = new TimelineMax({
                paused:     true,
                onComplete: onComplete
            });

            this.addProcessedAnimationsToTimeline(processedAnimations, this.timeline);

            if(this.timeline != null && this.timeline._duration != undefined)
            {
                this.timeline.set({}, {}, this.animationTimelineFactor);
            }

            this.timeline.play();
        }

        /**
         * On Complete Function
         */
        function onComplete()
        {
            setTimeout(function()
            {
                // Reset timeline after playing
                context.killTimeline();
                context.resetTimelineElements();
            }, 100);
        }

        return this.timeline;
    };

    /**
     * Restart Animation
     *
     */
    AnimationPlayer.prototype.restartAnimation = function()
    {
        if(this.timeline)
        {
            this.playAnimation();
        }
    };

    /**
     * Process Layers for Animation
     *
     * @param layerObjs
     * @returns {{entrance: {}, exit: {}}}
     */
    AnimationPlayer.prototype.processLayersForAnimation = function(layerObjs)
    {
        var processedLayers = {
            'entrance':     {},
            'exit':         {},
            'continuous':   {}
        };

        if(!_.isEmpty(layerObjs))
        {
            for(var layerId in layerObjs)
            {
                if(layerObjs.hasOwnProperty(layerId))
                {
                    var layerObj  = layerObjs[layerId],
                        layerAnim = layerObj.animation;

                    if(layerAnim && this.validateLayerAnimations(layerObj) || layerAnim['animationContinuous'] != '')
                    {
                        var animStart           = layerAnim.animationTimingStart,
                            animEnd             = layerAnim.animationTimingEnd,
                            animOutEnabled      = layerAnim.animationOutEnabled,
                            continuousAnimation = layerAnim.animationContinuous;

                        if(processedLayers.entrance[animStart] == undefined)
                        {
                            processedLayers.entrance[animStart] = [];
                        }

                        if(processedLayers.exit[animEnd] == undefined)
                        {
                            processedLayers.exit[animEnd] = [];
                        }

                        processedLayers.entrance[animStart].push({
                            layerId:    layerId,
                            animation:  layerAnim.animationIn,
                            speed:      layerAnim.animationSpeedIn,
                            time:       layerAnim.animationTimingStart,
                            easing:     layerAnim.animationEasingIn
                        });

                        if(animOutEnabled)
                        {
                            processedLayers.exit[animEnd].push({
                                layerId:    layerId,
                                animation:  layerAnim.animationOut,
                                speed:      layerAnim.animationSpeedOut,
                                time:       layerAnim.animationTimingEnd,
                                easing:     layerAnim.animationEasingOut
                            });
                        }

                        if(continuousAnimation != '')
                        {
                            var layerInAnimationTime        = parseInt(layerAnim.animationTimingStart),
                                layerOutanimationTime       = parseInt(layerAnim.animationTimingEnd) - 500,
                                layerContinuousStartTime    = layerInAnimationTime + 500,
                                continuousAnimationDuration = (layerOutanimationTime - layerInAnimationTime);

                            if(processedLayers.continuous[layerContinuousStartTime] == undefined)
                            {
                                processedLayers.continuous[layerContinuousStartTime] = [];
                            }

                            processedLayers.continuous[layerContinuousStartTime].push({
                                layerId:    layerId,
                                animation:  layerAnim.animationContinuous,
                                speed:      (continuousAnimationDuration / 1000),
                                time:       layerContinuousStartTime,
                                easing:     ""
                            });
                        }
                    }
                }
            }
        }

        return !_.isEmpty(processedLayers) ? processedLayers : false;
    };

    /**
     * Validate Layer Animations
     *
     * @param layerObj
     * @returns {Boolean}
     */
    AnimationPlayer.prototype.validateLayerAnimations = function(layerObj)
    {
        if(!layerObj || !layerObj.animation)
        {
            return false;
        }

        var validArray  = [
                'animationIn',
                'animationTimingStart'
            ],
            layerAnimation = layerObj.animation;

        for(var i = 0; i < validArray.length; i++)
        {
            var animProp = layerAnimation[validArray[i]];

            if(typeof animProp == 'undefined' || animProp == '')
            {
                return false;
            }
        }

        return true;
    };

    /**
     * Reset Timeline Animations
     *
     */
    AnimationPlayer.prototype.resetTimelineElements = function()
    {
        var processedElements = this.timelineElements;

        if(Object.keys(processedElements).length)
        {
            for(var layerId in processedElements)
            {
                if(processedElements.hasOwnProperty(layerId))
                {
                    this.resetLayerFromAnimation(layerId);
                }
            }
        }
    };

    /**
     * Reset Layer From Animation
     *
     * @param {String} layerId
     */
    AnimationPlayer.prototype.resetLayerFromAnimation = function(layerId)
    {
        var layerObj        = this.getLayerById(layerId),
            layerElement    = this.getLayerElementById(layerId);

        if(layerObj && layerElement)
        {
            TweenLite.set(layerElement, {
                x: 0,
                y: 0,
                rotationX: 0,
                rotationY: 0,
                rotation: layerObj.rotation.angle || 0,
                scale: 1,
                skewX: 0,
                skewY: 0,
                opacity: layerObj.opacity || 1
            });
        }
    };

    /**
     * Get Layer By ID
     *
     * @param {String} layerId
     * @returns {*}
     */
    AnimationPlayer.prototype.getLayerById = function(layerId)
    {
        return this.layers[layerId] != undefined ? this.layers[layerId] : false;
    };

    /**
     * Get Layer Element By ID
     *
     * @param {String} layerId
     * @returns {*}
     */
    AnimationPlayer.prototype.getLayerElementById = function(layerId)
    {
        var layer = this.design.querySelector('#slide_layer_' + layerId);
        return layer ? jQuery(layer) : false;
    };

    /**
     * Check if Layer is a Group
     *
     * @param {String} layerId
     * @returns {*}
     */
    AnimationPlayer.prototype.checkLayerIsGroup = function(layerId)
    {
        return (this.getGroupLayerById(layerId)) ? true : false;
    };

    /**
     * Get Group Element By ID
     *
     * @param groupId
     * @returns {*}
     */
    AnimationPlayer.prototype.getGroupLayerById = function(groupId)
    {
        var layer = document.getElementById('group_' + groupId);
        return layer ? jQuery(layer) : false;
    };

    /**
     * Get Layer ID From Element
     *
     * @param {HTMLElement|jQuery} element
     * @returns {*}
     */
    AnimationPlayer.prototype.getLayerIdFromElement = function(element)
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
    };

    /**
     * Kill Timeline
     *
     */
    AnimationPlayer.prototype.killTimeline = function()
    {
        if(this.timeline)
        {
            this.timeline.kill();
        }
    };

    /**
     * Clear Timeline
     *
     */
    AnimationPlayer.prototype.clearTimeline = function()
    {
        if(this.timeline)
        {
            this.timeline.clear();
        }
    };

    /**
     * Add Processed Animations to Timeline
     *
     * @param processedAnimations
     * @param timeline
     */
    AnimationPlayer.prototype.addProcessedAnimationsToTimeline = function(processedAnimations, timeline)
    {
        if(processedAnimations)
        {
            for(var stageType in processedAnimations)
            {
                if(processedAnimations.hasOwnProperty(stageType))
                {
                    var animationTimings = processedAnimations[stageType];

                    if(!_.isEmpty(animationTimings))
                    {
                        for(var time in animationTimings)
                        {
                            if(animationTimings.hasOwnProperty(time))
                            {
                                var animationItems  = animationTimings[time],
                                    timeInSeconds   = time / 1000;

                                if(animationItems && animationItems.length)
                                {
                                    var animationItemLength = animationItems.length;

                                    for(var a = 0; a < animationItemLength; a++)
                                    {
                                        var animationSettings   = animationItems[a],
                                            animationName       = animationSettings.animation,
                                            customSpeed         = animationSettings.speed,
                                            customEasing        = animationSettings.easing,
                                            layerId             = animationSettings.layerId,
                                            layerObj            = this.getLayerById(layerId),
                                            layerElement        = this.getLayerElementById(layerId),
                                            animationDetails    = this.getAnimationPreset(animationName);

                                        this.resetLayerFromAnimation(layerId);

                                        if(!layerElement)
                                        {
                                            if(this.checkLayerIsGroup(layerId))
                                            {
                                                layerElement = this.getGroupLayerById(layerId);
                                            }
                                        }

                                        if(animationDetails && layerId && layerElement)
                                        {
                                            var processedSettings = this.processAnimationSettingTags(layerElement, animationName);

                                            if(processedSettings)
                                            {
                                                if(typeof this.timelineElements[layerId] == 'undefined')
                                                {
                                                    this.timelineElements[layerId] = {
                                                        element:    layerElement,
                                                        layerId:    layerId
                                                    };
                                                }

                                                var defaultSet          = processedSettings.defaultSet || {rotation: (layerObj && layerObj.rotation.angle ? layerObj.rotation.angle : 0)},
                                                    duration            = customSpeed || processedSettings.defaultDuration,
                                                    easing              = customEasing || processedSettings.defaultEasing,
                                                    animationSeries;

                                                if(processedSettings.type == 'Text Effect')
                                                {
                                                    if(defaultSet)
                                                    {
                                                        var element = layerElement.get(0);

                                                        this.addTextAnimationTimeline(element, processedSettings, timeline, timeInSeconds);
                                                    }
                                                }
                                                else
                                                {
                                                    animationSeries = processedSettings.series;

                                                    if(defaultSet)
                                                    {
                                                        timeline.set(layerElement, defaultSet, 0);
                                                    }

                                                    for(var i = 0; i < animationSeries.length; i++)
                                                    {
                                                        var animation           = animationSeries[i],
                                                            animationDuration   = duration || animation.duration || .5,
                                                            animationEasing     = easing || animation.ease || 'Power1.easeInOut',
                                                            applyCustomEasing   = true;

                                                        try
                                                        {
                                                            var evaluatedEase = eval(animationEasing);
                                                        }
                                                        catch(e)
                                                        {
                                                            applyCustomEasing = false
                                                        }

                                                        if(applyCustomEasing)
                                                        {
                                                            // Apply easing if the eval() returned
                                                            animation = jQuery.extend(true, animation, {
                                                                ease: evaluatedEase
                                                            });
                                                        }

                                                        var tween;

                                                        // Set up TweenLite.from() for entrance animations
                                                        if(stageType == 'entrance')
                                                        {
                                                            tween = TweenLite.from(layerElement, animationDuration, animation);
                                                        }
                                                        // Set up TweenLite.to() for exit animations
                                                        else if(stageType == 'exit')
                                                        {
                                                            tween = TweenLite.to(layerElement, animationDuration, animation);
                                                        }
                                                        // Set up TweenLite.to() for continuous animations
                                                        else if(stageType == 'continuous')
                                                        {
                                                            tween = TweenLite.to(layerElement, animationDuration, animation);
                                                        }

                                                        // If tween is found, add tween to timeline
                                                        if(tween)
                                                        {
                                                            timeline.add(tween, timeInSeconds);
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    };

    /**
     * Get Animation Preset
     *
     * @param animationName
     * @returns {*}
     */
    AnimationPlayer.prototype.getAnimationPreset = function(animationName)
    {
        var stageTypes = [
            'entrance', 'exit', 'continuous'
        ];

        for(var i = 0; i < stageTypes.length; i++)
        {
            if(this.animationPresets[stageTypes[i]])
            {
                var presetList      = this.animationPresets[stageTypes[i]],
                    searchResult    = _.findWhere(presetList, {"name": animationName});

                if(searchResult)
                {
                    return searchResult;
                }
            }
        }

        return false;
    };

    /**
     * Process Animation Settings Tags
     *
     */
    AnimationPlayer.prototype.processAnimationSettingTags = function(element, animationName)
    {
        element = jQuery(element).get(0);

        var animationSettings   = this.getAnimationPreset(animationName),
            elementBounds       = element.getBoundingClientRect(),
            wrapperEl           = this.design,
            canvasBounds        = wrapperEl.getBoundingClientRect(),
            left                = parseInt(element.style.left),
            top                 = parseInt(element.style.top),
            width               = elementBounds.width,
            height              = elementBounds.height,
            canvasWidth         = canvasBounds.width,
            canvasHeight        = canvasBounds.height;

        var replacerTags = {
            '{elementLeft}':                left,
            '{elementTop}':                 top,
            '{elementWidth}':               width,
            '{elementHeight}':              height,
            '{elementCenterX}':             left + (width) / 2,
            '{elementCenterY}':             top + (height) / 2,
            '{canvasLeft}':                 -(Math.abs(left)),
            '{canvasTop}':                  -(Math.abs(top)),
            '{canvasRight}':                canvasWidth - left - width,
            '{canvasBottom}':               canvasHeight - top - height,
            '{canvasWidth}':                canvasWidth,
            '{canvasHeight}':               canvasHeight,
            '{elementOuterStartLeft}':      -(Math.abs(width)) - left,
            '{elementOuterStartRight}':     canvasWidth - left,
            '{elementOuterStartTop}':       -(Math.abs(height)) - top,
            '{elementOuterStartBottom}':    canvasHeight - top
        };

        for(var tag in replacerTags)
        {
            if(replacerTags.hasOwnProperty(tag))
            {
                animationSettings = this.searchTagInAnimationObject(animationSettings, tag, replacerTags[tag]);
            }
        }

        return animationSettings;
    };

    /**
     * Search Tag in Animation Object
     *
     * @param animationSettings
     * @param tag
     * @param value
     * @returns {*}
     */
    AnimationPlayer.prototype.searchTagInAnimationObject = function(animationSettings, tag, value)
    {
        var settingsString = JSON.stringify(animationSettings);

        if(settingsString && tag != undefined && value != undefined)
        {
            settingsString = this.replaceTagValue(settingsString, tag, value);
        }

        return JSON.parse(settingsString);
    };

    /**
     * Replace Tag Value
     *
     * @param string
     * @param tag
     * @param value
     * @returns {*}
     */
    AnimationPlayer.prototype.replaceTagValue = function(string, tag, value)
    {
        var indexOfMatch = string.indexOf(tag);

        while(indexOfMatch != -1)
        {
            string = string.replace(tag, value);

            indexOfMatch = string.indexOf(tag);
        }

        return string;
    };

    /**
     * Add Text Animation To Timeline
     *
     * @param {HTMLElement|jQuery} element
     * @param processedSettings
     * @param timeline
     * @param timeInSeconds
     */
    AnimationPlayer.prototype.addTextAnimationTimeline = function(element, processedSettings, timeline, timeInSeconds)
    {
        var context = this;

        timeline.add(function()
        {
            context.runTextAnimations(element, processedSettings);
        }, timeInSeconds);
    };

    /**
     * Text Animation Can Play
     *
     * @param {String} layerId
     * @returns {Boolean}
     */
    AnimationPlayer.prototype.textAnimationCanPlay = function(layerId)
    {
        return this.textAnimComplete[layerId] ? false : true;
    };

    /**
     * Run Text Animations
     *
     * @param {HTMLElement|jQuery} element
     * @param processedSettings
     * @returns {Boolean}
     */
    AnimationPlayer.prototype.runTextAnimations = function(element, processedSettings)
    {
        var textSplit   = processedSettings.textSplit,
            layerId     = this.getLayerIdFromElement(element),
            context     = this;

        if(!textSplit || !this.textAnimationCanPlay(layerId))
        {
            return false;
        }

        var duration        = textSplit.duration,
            childCaption    = element.querySelectorAll('.tp-caption');

        if(textSplit && textSplit.type && childCaption)
        {
            if(this.textAnimComplete[layerId] != "undefined")
            {
                this.textAnimComplete[layerId] = true;
            }
            else
            {
                var layerObj = {
                    layerId : true
                };

                this.textAnimComplete.push(layerObj);
            }

            var splitText           = new SplitText(jQuery(childCaption), {type: "words"}),
                splitTextTimeline   = new TimelineMax({
                    onComplete: onTextAnimationComplete
                });

            try
            {
                kill();

                switch(textSplit.type)
                {
                    case 'words':

                        duration = duration || 0.6;

                        splitText.split({type: "words"});

                        jQuery(splitText.words).each(function(index, el)
                        {
                            splitTextTimeline.from(jQuery(el), duration, {
                                opacity: 0,
                                force3D: true
                            }, index * 0.01);

                            splitTextTimeline.from(jQuery(el), duration, {
                                scale:  index % 2 == 0  ? 0 : 2,
                                ease:   Back.easeOut
                            }, index * 0.01);
                        });

                        break;

                    case 'chars':

                        duration = duration || 0.6;

                        splitText.split({type: "chars"});

                        splitTextTimeline.staggerFrom(splitText.chars, duration, {
                            scale:              4,
                            autoAlpha:          0,
                            rotationX:          -180,
                            transformOrigin:    '100% 50%',
                            ease:               Back.easeOut
                        }, 0.02, onTextAnimationComplete);

                        break;

                    case 'lines':

                        duration = duration || 0.5;

                        splitText.split({type: "lines"});

                        splitTextTimeline.staggerFrom(splitText.lines, duration, {
                            opacity:            0,
                            rotationX:          -120,
                            force3D:            true,
                            transformOrigin:    'top center -150'
                        }, 0.1, onTextAnimationComplete);

                        break;

                    case 'wordsRandomIn':

                        duration = duration || 0.75;

                        splitText.split({type: "words"});

                        var numWords = splitText.words.length;

                        for(var i = 0; i < numWords; i++)
                        {
                            splitTextTimeline.from(splitText.words[i], duration, {
                                force3D:    true,
                                scale:      Math.random() >0.5 ? 0 : 2,
                                opacity:    0
                            }, Math.random());
                        }

                        break;

                    case 'charsSpinIn':

                        duration = duration || 0.75;

                        splitText.split({type: "chars"});

                        var numChars = splitText.chars.length;

                        for(var c = 0; c < numChars; c++)
                        {
                            splitTextTimeline.from(splitText.chars[c], 0.8, {
                                css: {
                                    y:          getRandomInt(-75, 75),
                                    x:          getRandomInt(-150, 150),
                                    rotation:   getRandomInt(0, 720),
                                    autoAlpha:  0
                                },
                                ease: Back.easeOut
                            }, c * 0.02, "dropIn");
                        }

                        break;

                    case 'charsSwayIn':

                        duration = duration || 0.75;

                        splitText.split({type: "chars"});

                        splitTextTimeline.staggerTo(splitText.chars, duration, {
                            css: {
                                transformOrigin:    "50% 50% -30px",
                                rotationY:          -360,
                                rotationX:          360,
                                rotation:           360
                            },
                            ease: Elastic.easeInOut
                        }, 0.02, "+=1");

                        break;

                    case 'all':

                        duration = duration || 0.35;

                        splitText.split({type: "chars, words, lines"});

                        splitTextTimeline.staggerFrom(splitText.chars, duration, {
                            autoAlpha:  0,
                            scale:      4,
                            force3D:    true
                        }, 0.01, 0.5, onTextAnimationComplete);

                        break;
                }
            }
            catch(err)
            {
                kill();
                console.error("AnimationException: ", (err.message) ? err.message : 'There was an error playing text animations');
            }
        }

        /**
         * On Text Animation Complete
         */
        function onTextAnimationComplete()
        {
            if(context.textAnimComplete[layerId] != "undefined")
            {
                context.textAnimComplete[layerId] = false;
            }

            kill();
        }

        /**
         * Kill Text Animation
         */
        function kill()
        {
            if(splitText && splitText.revert)
            {
                splitText.revert();
            }
        }

        /**
         * Get Random Int
         *
         * @param min
         * @param max
         * @returns {*}
         */
        function getRandomInt(min, max)
        {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }
    };

    window.AnimationPlayer = AnimationPlayer;
}());