var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define(["require", "exports", "guiState.model", "guiState.controller", "../models/notification.model", "comm", "jquery"], function (require, exports, guiStateModel, guiStateController, notificationModel, comm, $) {
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
                        var popup = new PopupNotificationState(handler.popupNotification);
                        notificationHandlers.push(popup);
                    }
                    if (handler.elementMarker) {
                        var elementMarker = new ElementMarkerState(handler.elementMarker);
                        notificationHandlers.push(elementMarker);
                    }
                    if (handler.startScreen) {
                        var startScreen = new StartScreenNotificationState(handler.startScreen);
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
    var NotificationState = /** @class */ (function () {
        function NotificationState(time) {
            this.active = false;
            this.time = time;
        }
        NotificationState.prototype.clearTimerIfExists = function () {
            if (this.timer) {
                clearTimeout(this.timer);
            }
        };
        NotificationState.prototype.setOrResetTimer = function () {
            if (this.time) {
                this.clearTimerIfExists();
                this.timer = setTimeout(this.hide, this.time);
            }
        };
        NotificationState.prototype.show = function () {
            this.setOrResetTimer();
            if (!this.active) {
                this.showAction();
                this.active = true;
            }
        };
        NotificationState.prototype.hide = function () {
            if (this.active) {
                this.clearTimerIfExists();
                this.hideAction();
                this.active = false;
            }
        };
        return NotificationState;
    }());
    var PopupNotificationState = /** @class */ (function (_super) {
        __extends(PopupNotificationState, _super);
        function PopupNotificationState(popupNotification) {
            var _this = _super.call(this, popupNotification.time || defaultPopupTime) || this;
            _this.title = parseLocalized(popupNotification.title);
            _this.content = parseLocalized(popupNotification.content);
            return _this;
        }
        PopupNotificationState.prototype.hideAction = function () {
            if (notificationElementTitle.html() === this.title && notificationElementDescription.html() === this.content) {
                notificationElement.fadeOut(fadingDuration);
            }
        };
        PopupNotificationState.prototype.showAction = function () {
            notificationElementTitle.html(this.title);
            notificationElementDescription.html(this.content);
            notificationElement.fadeIn(fadingDuration);
        };
        return PopupNotificationState;
    }(NotificationState));
    var ElementMarkerState = /** @class */ (function (_super) {
        __extends(ElementMarkerState, _super);
        function ElementMarkerState(elementMarker) {
            var _this = _super.call(this, elementMarker.time || defaultElementMarkerTime) || this;
            _this.content = parseLocalized(elementMarker.content);
            _this.$element = $(parseSelector(elementMarker));
            _this.$badge = $("<span class='badge badge-primary' style='display:none;'>" + _this.content + "</span>");
            return _this;
        }
        ElementMarkerState.prototype.hideAction = function () {
            if (this.$element.length) {
                this.$badge
                    .fadeOut(fadingDuration)
                    .queue(function () {
                    $(this).remove();
                });
            }
        };
        ElementMarkerState.prototype.showAction = function () {
            if (this.$element.length) {
                this.$badge
                    .appendTo(this.$element)
                    .fadeIn(fadingDuration);
            }
        };
        return ElementMarkerState;
    }(NotificationState));
    var StartScreenNotificationState = /** @class */ (function (_super) {
        __extends(StartScreenNotificationState, _super);
        function StartScreenNotificationState(startScreen) {
            var _this = _super.call(this, startScreen.time || defaultStartScreenTime) || this;
            _this.$startupMessage = $("#startup-message-statustext");
            _this.content = parseLocalized(startScreen.content);
            _this.$element = $('<h4 style="display: none">' + _this.content + '</h4>');
            return _this;
        }
        StartScreenNotificationState.prototype.showAction = function () {
            this.$element
                .appendTo(this.$startupMessage)
                .slideDown(fadingDuration);
        };
        StartScreenNotificationState.prototype.hideAction = function () {
            this.$element
                .slideUp(fadingDuration)
                .queue(function () {
                $(this).remove();
            });
        };
        return StartScreenNotificationState;
    }(NotificationState));
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
