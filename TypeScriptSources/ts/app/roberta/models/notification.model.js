/**
 * Rest calls to the server related to notification operations (save, delete, get)
 *
 * @module rest/program
 */

export function getNotifications (successFn) {
    COMM.json("/notifications/getNotifications", {}, function (result) {
        if (result.rc === "ok" && result.message === "ORA_SERVER_SUCCESS") {
            successFn(result)
        }
    });
}

export function postNotifications (notifications, successFn) {
    COMM.json("/notifications/postNotifications", {
        notifications : notifications
    }, successFn);
}
