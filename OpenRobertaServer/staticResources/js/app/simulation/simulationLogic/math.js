/**
 * @fileOverview Math for a simple robot simulation
 * @author Beate Jost <beate.jost@smail.inf.h-brs.de>
 * @version 0.1
 */

define([ 'exports', 'simulation.constants' ], function(exports, CONSTANTS) {
    /**
     * exports helper for calculations in ORsimulation
     * 
     * @namespace
     */

    /**
     * Convert from degree to radians.
     * 
     * @memberOf exports
     * @param {Number}
     *            degree to convert
     * @returns {Number} radians
     */
    exports.toRadians = function(degree) {
        return degree * (Math.PI / 180);
    };
    /**
     * Convert from radians to degree.
     * 
     * @memberOf exports
     * @param {Number}
     *            radians to convert
     * @returns {Number} degree
     */
    exports.toDegree = function(radians) {
        return radians * (180 / Math.PI);
    };

    /**
     * Get intersection point from two lines.
     * 
     * @memberOf exports
     * @param {line1}
     *            one line
     * @param {line2}
     *            another line
     * @returns {point} or null, if no intersection found
     */
    exports.getIntersectionPoint = function(line1, line2) {
        var d = (line1.x1 - line1.x2) * (line2.y1 - line2.y2) - (line1.y1 - line1.y2) * (line2.x1 - line2.x2);
        if (d === 0) {
            return null;
        }
        var xi = ((line2.x1 - line2.x2) * (line1.x1 * line1.y2 - line1.y1 * line1.x2) - (line1.x1 - line1.x2) * (line2.x1 * line2.y2 - line2.y1 * line2.x2))
                / d;
        var yi = ((line2.y1 - line2.y2) * (line1.x1 * line1.y2 - line1.y1 * line1.x2) - (line1.y1 - line1.y2) * (line2.x1 * line2.y2 - line2.y1 * line2.x2))
                / d;

        if (xi < Math.min(line1.x1, line1.x2) - 0.01 || xi > Math.max(line1.x1, line1.x2) + 0.01) {
            return null;
        }
        if (xi < Math.min(line2.x1, line2.x2) - 0.01 || xi > Math.max(line2.x1, line2.x2) + 0.01) {
            return null;
        }
        if (yi < Math.min(line1.y1, line1.y2) - 0.01 || yi > Math.max(line1.y1, line1.y2) + 0.01) {
            return null;
        }
        if (yi < Math.min(line2.y1, line2.y2) - 0.01 || yi > Math.max(line2.y1, line2.y2) + 0.01) {
            return null;
        }
        return {
            x : xi,
            y : yi
        };
    };
    /**
     * Finds the intersection between a circles border
     * and a line from the origin to the otherLineEndPoint.
     * @param  {Vector} origin            - center of the circle and start of the line
     * @param  {number} radius            - radius of the circle
     * @param  {Vector} otherLineEndPoint - end of the line
     * @return {Vector}                   - point of the intersection
     */
     exports.getIntersectionPointsCircle = function(line, circle) {
        // Calculate the euclidean distance between a & b
        const eDistAtoB = Math.sqrt( Math.pow(line.x2-line.x1, 2) + Math.pow(line.y2-line.x2, 2) );

        // compute the direction vector d from a to b
        const dx = (line.x2-line.x1)/eDistAtoB;
        const dy =(line.y2-line.y1)/eDistAtoB;

        // Now the line equation is x = dx*t + ax, y = dy*t + ay with 0 <= t <= 1.

        // compute the value t of the closest point to the circle center (cx, cy)
        const t = (dx * (circle.x-line.x1)) + (dy * (circle.y-line.y1));

        // compute the coordinates of the point e on line and closest to c
        let e = {x: 0, y: 0, onLine:false};
        e.x = (t * dx) + line.x1;
        e.y = (t * dy) + line.y1;

         const vX = e.x - circle.x;
         const vY = e.y - circle.y;
         const magV = Math.sqrt(vX*vX + vY*vY);

         const poc = {
             x: circle.x + vX / magV * circle.r,
             y: circle.y + vY / magV * circle.r
         }

         // Calculate the euclidean distance between c & e
        let eDistCtoE = Math.sqrt(Math.pow(e.x - circle.x, 2) + Math.pow(e.y - circle.y, 2));


        // test if the line intersects the circle
        if(eDistCtoE < circle.r) {
            // compute distance from t to circle intersection point
            dt = Math.sqrt( Math.pow(circle.r, 2) - Math.pow(eDistCtoE, 2));

            // compute first intersection point
            let f = {x: 0, y: 0, onLine:false};
            f.x = ((t-dt) * dx) + line.x1;
            f.y = ((t-dt) * dy) + line.y2;
            // check if f lies on the line
            f.onLine = Math.sqrt( Math.pow(line.x1-f.x, 2) + Math.pow(line.y1-f.y, 2) )
                + Math.sqrt( Math.pow(f.x-line.x2, 2) + Math.pow(f.y-line.y2, 2) )
                == Math.sqrt( Math.pow(line.x1-line.x2, 2) + Math.pow(line.y1-line.y2, 2));

            // compute second intersection point
            let g = {x: 0, y: 0, onLine:false};
            g.x = ((t+dt) * dx) + line.x1;
            g.y= ((t+dt) * dy) + line.y1;
            // check if g lies on the line
            g.onLine = Math.sqrt( Math.pow(line.x1-g.x, 2) + Math.pow(line.y1-g.y, 2) )
                + Math.sqrt( Math.pow(g.x-line.x2, 2) + Math.pow(g.y-line.y2, 2) )
                == Math.sqrt( Math.pow(line.x1-line.x2, 2) + Math.pow(line.y1-line.y2, 2));
            return {points: {intersection1:f, intersection2:g}, distance: eDistCtoE, pointOnCircle: poc};

        } else if (parseInt(eDistCtoE) === parseInt(circle.r)) {
            // console.log("Only one intersection");
            return {points: false, distance: eDistCtoE, pointOnCircle: poc};
        } else {
            // console.log("No intersection");
            return {points: false, distance: eDistCtoE, pointOnCircle: poc};
        }
    };
    /**
     * Get four lines from a rectangle.
     * 
     * @memberOf exports
     * @param {rect}
     *            a rectangle
     * @returns {Array} four lines
     */
    exports.getLinesFromRect = function(rect) {
        if (rect.isParallelToAxis) {
            return [ {
                x1 : rect.x,
                x2 : rect.x,
                y1 : rect.y,
                y2 : rect.y + rect.h
            }, {

                x1 : rect.x,
                x2 : rect.x + rect.w,
                y1 : rect.y,
                y2 : rect.y
            }, {
                x1 : rect.x + rect.w,
                x2 : rect.x,
                y1 : rect.y + rect.h,
                y2 : rect.y + rect.h
            }, {
                x1 : rect.x + rect.w,
                x2 : rect.x + rect.w,
                y1 : rect.y + rect.h,
                y2 : rect.y
            } ];
        } else {
            return [ {
                x1 : rect.backLeft.rx,
                x2 : rect.frontLeft.rx,
                y1 : rect.backLeft.ry,
                y2 : rect.frontLeft.ry
            }, {

                x1 : rect.frontLeft.rx,
                x2 : rect.frontRight.rx,
                y1 : rect.frontLeft.ry,
                y2 : rect.frontRight.ry
            }, {
                x1 : rect.frontRight.rx,
                x2 : rect.backRight.rx,
                y1 : rect.frontRight.ry,
                y2 : rect.backRight.ry
            }, {
                x1 : rect.backRight.rx,
                x2 : rect.backLeft.rx,
                y1 : rect.backRight.ry,
                y2 : rect.backLeft.ry
            } ];
        }

    };
    /**
     * Get distance from a line to a circle.
     *
     * @memberOf exports
     * @param {circle}
     *            circle
     * @param {line1}
     *            a line point
     * @param {line2}
     *            another line point
     * @returns {distance} nearest distance
     */
    exports.getDistanceToCircle = function(circle, line) {
            var v1, v2, v3, u;
            v1 = {};
            v2 = {};
            v3 = {};
            v1.x = line.x;
            v1.y = line.y;
            v2.x = circle.x - line.x;
            v2.y = circle.y - line.y;
            u = (v2.x * v1.x + v2.y * v1.y) / (v1.y * v1.y + v1.x * v1.x); // unit dist of point on line
            if(u >= 0 && u <= 1){
                v3.x = (v1.x * u + line.x) - circle.x;
                v3.y = (v1.y * u + line.y) - circle.y;
                v3.x *= v3.x;
                v3.y *= v3.y;
                return Math.sqrt(v3.y + v3.x); // return distance from line
            }
            // get distance from end points
            v3.x = circle.x - line.x;
            v3.y = circle.y - line.y;
            v3.x *= v3.x;  // square vectors
            v3.y *= v3.y;
            v2.x *= v2.x;
            v2.y *= v2.y;
            return Math.min(Math.sqrt(v2.y + v2.x), Math.sqrt(v3.y + v3.x));
    };
    /**
     * Get four lines from a triangle.
     *
     * @memberOf exports
     * @param {tria}
     *            a triangle
     * @returns {Array} three lines
     */
    exports.getLinesFromTria = function(tria) {
        if (tria.isParallelToAxis) {
            return [{
                x1: tria.ax,
                x2: tria.bx,
                y1: tria.ay,
                y2: tria.by
            }, {
                x1: tria.bx,
                x2: tria.cx,
                y1: tria.by,
                y2: tria.cy
            }, {
                x1: tria.ax,
                x2: tria.cx,
                y1: tria.ay,
                y2: tria.cy
            }];
        }
    };
        /**
     * Calculate the square of a number.
     * 
     * @memberOf exports
     * @param {Number}
     *            x value to square
     * @returns {Number} square of x
     */
    exports.sqr = function(x) {
        return x * x;
    };
    /**
     * Get the distance of two points.
     * 
     * @memberOf exports
     * @param {p1}
     *            one point
     * @param {p1}
     *            x another point
     * @returns {distance}
     */
    function getDistance(p1, p2) {
        return exports.sqr(p1.x - p2.x) + exports.sqr(p1.y - p2.y);
    }
    exports.getDistance = getDistance;
    /**
     * Get the shortest distance from a point to a line as a vector.
     * 
     * @memberOf exports
     * @param {p}
     *            one point
     * @param {p1}
     *            start point of line
     * @param {p2}
     *            p2 end point of line
     * @returns {distance}
     */
    function getDistanceToLine(p, p1, p2) {
        var d = exports.getDistance(p1, p2);
        if (d == 0) {
            return p1;
        }
        var t = ((p.x - p1.x) * (p2.x - p1.x) + (p.y - p1.y) * (p2.y - p1.y)) / d;
        if (t < 0) {
            return p1;
        }
        if (t > 1) {
            return p2;
        }
        return ({
            x : p1.x + t * (p2.x - p1.x),
            y : p1.y + t * (p2.y - p1.y)
        });
    }
    exports.getDistanceToLine = getDistanceToLine;

    exports.isPointInsideRectangle = function(p, rect) {
        var p1 = rect.p1;
        var p2 = rect.p2;
        var p3 = rect.p3;
        var p4 = rect.p4;
        var t1 = getDistance(p, getDistanceToLine(p, p1, p2));
        var t2 = getDistance(p, getDistanceToLine(p, p2, p3));
        var t3 = getDistance(p, getDistanceToLine(p, p3, p4));
        var t4 = getDistance(p, getDistanceToLine(p, p4, p1));
        var s1 = getDistance(p1, p2);
        var s2 = getDistance(p2, p3);
        if (t1 <= s2 && t3 <= s2 && t2 <= s1 && t4 <= s1) {
            return true;
        } else {
            return false;
        }
    }
    /**
     * Convert a rgb value to hsv value.
     * 
     * @memberOf exports
     * @param {Number}
     *            r red value
     * @param {Number}
     *            g green value
     * @param {Number}
     *            b blue value
     * @returns {Array} hsv value
     */
//copy from http://stackoverflow.com/questions/2348597/why-doesnt-this-javascript-rgb-to-hsl-code-work
    exports.rgbToHsv = function(r, g, b) {
        var min = Math.min(r, g, b), max = Math.max(r, g, b), delta = max - min, h, s, v = max;

        v = Math.floor(max / 255 * 100);
        if (max !== 0) {
            s = Math.floor(delta / max * 100);
        } else {
            // black
            return [ 0, 0, 0 ];
        }
        if (r === max) {
            h = (g - b) / delta; // between yellow & magenta
        } else if (g === max) {
            h = 2 + (b - r) / delta; // between cyan & yellow
        } else {
            h = 4 + (r - g) / delta; // between magenta & cyan
        }
        h = Math.floor(h * 60); // degrees
        if (h < 0) {
            h += 360;
        }
        return [ h, s, v ];
    };
    /**
     * Map a hsv value to a color name.
     * 
     * @memberOf exports
     * @param {Array}
     *            hsv value
     * @returns {Enum} color
     */
    exports.getColor = function(hsv) {
        if (hsv[2] <= 10) {
            return CONSTANTS.COLOR_ENUM.BLACK;
        }
        if ((hsv[0] < 10 || hsv[0] > 350) && hsv[1] > 90 && hsv[2] > 50) {
            return CONSTANTS.COLOR_ENUM.RED;
        }
        if (hsv[0] > 40 && hsv[0] < 70 && hsv[1] > 90 && hsv[2] > 50) {
            return CONSTANTS.COLOR_ENUM.YELLOW;
        }
        if (hsv[0] < 50 && hsv[1] > 50 && hsv[1] < 100 && hsv[2] < 50) {
            return CONSTANTS.COLOR_ENUM.BROWN;
        }
        if (hsv[1] < 10 && hsv[2] > 90) {
            return CONSTANTS.COLOR_ENUM.WHITE;
        }
        if (hsv[0] > 70 && hsv[0] < 160 && hsv[1] > 80) {
            return CONSTANTS.COLOR_ENUM.GREEN;
        }
        if (hsv[0] > 200 && hsv[0] < 250 && hsv[1] > 90 && hsv[2] > 50) {
            return CONSTANTS.COLOR_ENUM.BLUE;
        }
        return CONSTANTS.COLOR_ENUM.NONE;
    }

});
