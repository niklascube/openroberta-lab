define(["require", "exports", "comm"], function (require, exports, comm) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.postNotifications = exports.getNotifications = void 0;
    /**
     * Rest calls to the server related to notification operations (save, delete, get)
     *
     * @module rest/program
     */
    function getNotifications(successFn) {
        comm.json("/notifications/getNotifications", {}, function (result) {
            if (result.rc === "ok" && result.message === "ORA_SERVER_SUCCESS") {
                successFn(result);
            }
        });
    }
    exports.getNotifications = getNotifications;
    function postNotifications(notifications, successFn) {
        comm.json("/notifications/postNotifications", {
            notifications: notifications
        }, successFn);
    }
    exports.postNotifications = postNotifications;
});
