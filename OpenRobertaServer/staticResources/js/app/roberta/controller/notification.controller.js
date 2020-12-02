define(["require", "exports", "guiState.model", "guiState.controller", "../models/notification.model", "comm"], function (require, exports, guiStateModel, guiStateController, notificationModel, comm) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.showNotificationModal = exports.reloadNotifications = exports.init = void 0;
    var activeNotifications = [];
    var fadingDuration = 400;
    var notificationElement = $("#releaseInfo");
    var notificationElementTitle = notificationElement.children('#releaseInfoTitle');
    var notificationElementDescription = notificationElement.children('#releaseInfoContent');
    var $notificationForm = $("#notificationForm");
    var $notificationFileUpload = $('#notificationFileUpload');
    var $notificationFileDownload = $('#notificationFileDownload');
    var defaultElementMarkerTime = 5 * 60 * 1000;
    var defaultPopupTime = 20 * 1000;
    var defaultStartScreenTime = undefined;
    function init() {
        initNotificationModal();
        notificationModel.getNotifications(function (result) {
            activeNotifications = initNotifications(result.notifications);
        });
        comm.onNotificationsAvailableCallback(reloadNotifications);
    }
    exports.init = init;
    function reloadNotifications() {
        removeActiveEventListeners();
        notificationModel.getNotifications(function (result) {
            activeNotifications = initNotifications(result.notifications);
        });
    }
    exports.reloadNotifications = reloadNotifications;
    /*----------- NOTIFICATION MODAL -----------*/
    function showNotificationModal() {
        notificationModel.getNotifications(function (result) {
            setFileDownloadContent(result.notifications);
            $('#modal-notifications').modal("show");
        });
    }
    exports.showNotificationModal = showNotificationModal;
    function showAlertInNotificationModal(context, content, time) {
        time = time || 6 * 1000;
        var $alert = $('#notification-modal-alert');
        $alert
            .html(content)
            .removeClass()
            .addClass("alert")
            .addClass("alert-" + context)
            .slideDown()
            .delay(time)
            .slideUp();
    }
    function initNotificationModal() {
        $notificationForm.on('submit', function (e) {
            e.preventDefault();
            readFileInputField(function (fileContent) {
                notificationModel.postNotifications(fileContent, function (restResponse) {
                    if (restResponse.rc === "ok" && restResponse.message === "ORA_NOTIFICATION_SUCCESS") {
                        $notificationForm[0].reset();
                        showAlertInNotificationModal("success", "The notifications were transmitted successfully");
                        setFileDownloadContent(JSON.parse(fileContent));
                    }
                    else {
                        var errorCode = restResponse.cause;
                        var exceptionMessage = restResponse.parameters && restResponse.parameters.MESSAGE ? ":" + restResponse.parameters.MESSAGE : "";
                        var content = errorCode + exceptionMessage;
                        showAlertInNotificationModal("danger", content, 60 * 1000);
                    }
                });
            });
        });
    }
    function readFileInputField(readyFn) {
        var uploadedFiles = $notificationFileUpload.prop("files");
        if (uploadedFiles.length > 0) {
            readFile(uploadedFiles[0], readyFn);
        }
    }
    function readFile(file, readyFn) {
        var fileReader = new FileReader();
        fileReader.onload = function () {
            readyFn(fileReader.result);
        };
        fileReader.readAsText(file);
    }
    function setFileDownloadContent(jsonContent) {
        var data = "text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(jsonContent, null, "\t"));
        $notificationFileDownload
            .attr("href", "data:" + data);
    }
    /*----------- NOTIFICATION HANDLING -----------*/
    function removeActiveEventListeners() {
        for (var notificationI in activeNotifications) {
            var notification = activeNotifications[notificationI];
            notification.removeEventHandlers();
            notification.hideNotification();
        }
        activeNotifications = [];
    }
    function initNotifications(notificationSpecifications) {
        var notificationStates = [];
        var _loop_1 = function () {
            var notificationSpecification = notificationSpecifications[notificationSpecificationI];
            var notificationHandlers = [];
            var activeEventHandlers = [];
            function initNotificationHandlers() {
                for (var handlerI in notificationSpecification.handlers) {
                    var handler = notificationSpecification.handlers[handlerI];
                    if (handler.popupNotification) {
                        var popup = makePopupNotification(handler.popupNotification);
                        notificationHandlers.push(popup);
                    }
                    if (handler.elementMarker) {
                        var elementMarker = makeElementMarker(handler.elementMarker);
                        notificationHandlers.push(elementMarker);
                    }
                    if (handler.startScreen) {
                        var startScreen = makeStartScreen(handler.startScreen);
                        notificationHandlers.push(startScreen);
                    }
                }
            }
            function showNotification() {
                // if once property set remove all event handlers
                if (notificationSpecification.once) {
                    removeEventHandlers();
                }
                for (var notificationI in notificationHandlers) {
                    var notification = notificationHandlers[notificationI];
                    notification.show();
                }
            }
            function hideNotification() {
                for (var notificationI in notificationHandlers) {
                    var notification = notificationHandlers[notificationI];
                    notification.hide();
                }
            }
            function showNotificationsIfConditionsMet(specificConditions) {
                var generalConditions = notificationSpecification.conditions;
                if (evaluateConditions(specificConditions) && evaluateConditions(generalConditions)) {
                    showNotification();
                }
            }
            /**
             * Registers event handler and also adds a object with a remove function to the activeEventHandler array
             * @param selector
             * @param event
             * @param fn
             */
            function addEventHandler(selector, event, fn) {
                var $element = $(selector);
                var elementIsPresent = $element.length;
                /**
                 * Rewriting the .live() method in terms of its successors is straightforward; these are templates for equivalent calls for all three event attachment methods:
                 * $( selector ).live( events, data, handler );                // jQuery 1.3+
                 * $( document ).on( events, selector, data, handler );        // jQuery 1.7+
                 * https://api.jquery.com/live/
                 */
                var remove;
                if (elementIsPresent) {
                    // Use direct event handler if element is present
                    $element.on(event, fn);
                    remove = function () {
                        $element.off(event, fn);
                    };
                }
                else {
                    // Use delegate event handler if element is not yet present
                    $(document).on(event, selector, fn);
                    remove = function () {
                        $element.off(event, selector, fn);
                    };
                }
                activeEventHandlers.push({ remove: remove });
            }
            function addEventHandlers() {
                if (!notificationSpecification.triggers || notificationSpecification.triggers > 0) {
                    // Directly run notification if conditions are met
                    showNotificationsIfConditionsMet();
                    return;
                }
                var _loop_2 = function () {
                    var trigger = notificationSpecification.triggers[triggerI];
                    var event_1 = trigger.event;
                    var addClass = trigger.addClass;
                    var removeClass = trigger.removeClass;
                    var selector = parseSelector(trigger);
                    if (!selector) {
                        return "continue";
                    }
                    // "Normal" event listeners
                    if (event_1) {
                        addEventHandler(selector, event_1, function (e) {
                            showNotificationsIfConditionsMet(trigger.conditions);
                        });
                    }
                    // Class changed event listeners
                    if (addClass || removeClass) {
                        addEventHandler(selector, "classChange", function (e) {
                            if (addClass && $(selector).hasClass(addClass)) {
                                showNotificationsIfConditionsMet(trigger.conditions);
                            }
                            if (removeClass && !$(selector).hasClass(removeClass)) {
                                showNotificationsIfConditionsMet(trigger.conditions);
                            }
                        });
                    }
                };
                for (var triggerI in notificationSpecification.triggers) {
                    _loop_2();
                }
            }
            function removeEventHandlers() {
                for (var activeEventHandlerI in activeEventHandlers) {
                    var activeEventHandler = activeEventHandlers[activeEventHandlerI];
                    activeEventHandler.remove();
                }
                activeEventHandlers = [];
            }
            /**
             * Evaluates if the conditions defined in the parameter are met
             *
             * If conditions is undefined, this returns also true
             * If a condition no valid specifications this conditions is seen as met
             *
             * @param conditions {Array} array of condition object
             * @returns {boolean}
             */
            function evaluateConditions(conditions) {
                if (conditions === undefined) {
                    return true;
                }
                return conditions.every(function (condition) {
                    if (condition.guiModel) {
                        var element_1 = guiStateModel.gui[condition.guiModel];
                        if (condition.anyOf && Array.isArray(condition.anyOf)) {
                            return condition.anyOf.some(function (s) {
                                return element_1 === s;
                            });
                        }
                        if (condition.equals) {
                            return element_1 === condition.equals;
                        }
                        if (condition.notEquals) {
                            if (!Array.isArray(condition)) {
                                return element_1 !== condition.notEquals;
                            }
                            return condition.notEquals.every(function (s) {
                                return element_1 !== s;
                            });
                        }
                    }
                    var selector = parseSelector(condition);
                    if (condition.hasClass && selector) {
                        return $(selector).hasClass(condition.hasClass);
                    }
                    if (!notificationSpecification.ignoreDate) {
                        if (condition.endTime) {
                            var endTime = parseDateStringWithTimezone(condition.endTime);
                            var now = new Date();
                            return endTime >= now;
                        }
                        if (condition.startTime) {
                            var startTime = parseDateStringWithTimezone(condition.startTime);
                            var now = new Date();
                            return startTime <= now;
                        }
                    }
                    return true;
                });
            }
            // Active notification
            initNotificationHandlers();
            addEventHandlers();
            notificationStates.push({
                hideNotification: hideNotification,
                removeEventHandlers: removeEventHandlers
            });
        };
        for (var notificationSpecificationI in notificationSpecifications) {
            _loop_1();
        }
        return notificationStates;
    }
    /**
     * State management for running notifications
     * @param showFn function gets executed if show() is called and the notification is not yet active
     * @param hideFn function gets executed if hide() is called and the notification is currently active
     * @param time (in ms) used to set timers to automatically call the hide function after that time
     * @returns {{hide: hide, show: show}}
     */
    function makeNotification(showFn, hideFn, time) {
        var active = false;
        var timer;
        function clearTimerIfExisting() {
            if (timer) {
                clearTimeout(timer);
            }
        }
        function setOrResetTimer() {
            if (time) {
                clearTimerIfExisting(timer);
                timer = setTimeout(hide, time);
            }
        }
        function show() {
            setOrResetTimer();
            if (!active) {
                showFn();
                active = true;
            }
        }
        function hide() {
            if (active) {
                clearTimerIfExisting();
                hideFn();
                active = false;
            }
        }
        return {
            show: show,
            hide: hide
        };
    }
    /**
     * Generates a popup notification object
     * Has functions hide and show
     * @param popupNotification object, containing properties title, content and optionally time
     * @returns {{hide: hide, show: show}}
     */
    function makePopupNotification(popupNotification) {
        var title = parseLocalized(popupNotification.title);
        var content = parseLocalized(popupNotification.content);
        function show() {
            notificationElementTitle.html(title);
            notificationElementDescription.html(content);
            notificationElement.fadeIn(fadingDuration);
        }
        function hide() {
            if (notificationElementTitle.html() === title && notificationElementDescription.html() === content) {
                notificationElement.fadeOut(fadingDuration);
            }
        }
        return makeNotification(show, hide, popupNotification.time || defaultPopupTime);
    }
    /**
     * Generates a element marker object
     * Has functions hide and show
     * @param elementMarker object, must contain property content and can contain property time
     * @returns {{hide: hide, show: show}}
     */
    function makeElementMarker(elementMarker) {
        var content = parseLocalized(elementMarker.content);
        var $element = $(parseSelector(elementMarker));
        var $badge = $("<span class='badge badge-primary' style='display:none;'>" + content + "</span>");
        function show() {
            if ($element.length) {
                $badge
                    .appendTo($element)
                    .fadeIn(fadingDuration);
            }
        }
        function hide() {
            if ($element.length) {
                $badge
                    .fadeOut(fadingDuration)
                    .queue(function () {
                    $(this).remove();
                });
            }
        }
        return makeNotification(show, hide, elementMarker.time || defaultElementMarkerTime);
    }
    /**
     * Generates a start screen object
     * Has functions: show() and hide()
     * @param startScreen must contain property content and can contain property time
     * @returns {{hide: hide, show: show}}
     */
    function makeStartScreen(startScreen) {
        var content = parseLocalized(startScreen.content);
        var $startupMessage = $("#startup-message-statustext");
        var $element = $('<h4 style="display: none">' + content + '</h4>');
        function show() {
            $element
                .appendTo($startupMessage)
                .slideDown(fadingDuration);
        }
        function hide() {
            $element
                .slideUp(fadingDuration)
                .queue(function () {
                $(this).remove();
            });
        }
        return makeNotification(show, hide, startScreen.time || defaultStartScreenTime);
    }
    function parseSelector(element) {
        if (element.htmlId) {
            return "#" + element.htmlId;
        }
        if (element.htmlSelector) {
            return element.htmlSelector;
        }
        return undefined;
    }
    function parseLocalized(object) {
        var localizedDescription = object[guiStateController.getLanguage()];
        return localizedDescription || object["en"];
    }
    /**
     * Parse date from a datestring
     * The parameter must match the format "YYYY-MM-DD HH:mm"
     * This automatically adds the German Timezone (+0200)
     * @param str datestring
     */
    function parseDateStringWithTimezone(str) {
        return new Date(str + " +0200");
    }
});
