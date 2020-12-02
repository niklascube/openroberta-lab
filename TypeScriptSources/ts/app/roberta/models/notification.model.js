import * as comm from "comm";

/**
 * Rest calls to the server related to notification operations (save, delete, get)
 *
 * @module rest/program
 */

export function getNotifications (successFn) {
    comm.json("/notifications/getNotifications", {}, function (result) {
        if (result.rc === "ok" && result.message === "ORA_SERVER_SUCCESS") {
            successFn(result)
        }
    });
}

export function postNotifications (notifications, successFn) {
    comm.json("/notifications/postNotifications", {
        notifications : notifications
    }, successFn);
}
