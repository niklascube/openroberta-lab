/**
 * @fileOverview Scene for a robot simulation
 * @author Beate Jost <beate.jost@iais.fraunhofer.de>
 */
define(['simulation.simulation', 'simulation.math', 'util', 'interpreter.constants', 'simulation.constants', 'program.controller', 'jquery'], function(SIM,
    SIMATH, UTIL, IC, C, PROGRAM_C, $) {

    /**
     * Creates a new Scene.
     *
     * @constructor
     */
    function Scene(backgroundImg, robots, customObstacleList, pattern, ruler, colorBlockList) {
        this.backgroundImg = backgroundImg;
        this.robots = robots;
        this.customObstacleList = customObstacleList;
        this.numprogs = robots.length;
        this.ruler = ruler;
        this.colorBlockList = colorBlockList;
        this.pattern = pattern;
        this.uCtx = $('#unitBackgroundLayer')[0].getContext('2d'); // unit context
        this.bCtx = $('#backgroundLayer')[0].getContext('2d'); // background context
        this.mCtx = $('#rulerLayer')[0].getContext('2d'); // ruler == *m*easurement context
        this.oCtx = $('#objectLayer')[0].getContext('2d'); // object context
        this.rCtx = $('#robotLayer')[0].getContext('2d'); // robot context
        this.playground = {
            x: 0,
            y: 0,
            w: 0,
            h: 0
        };
        this.wave = 0.0;
        this.waves = [];
        for (var i = 0; i < this.numprogs; i++) {
            this.waves.push(0.0);
        }
        if (this.numprogs > 1) {
            $("#constantValue").html("");
            var robotIndexColour = "";
            robotIndexColour += '<select id="robotIndex" style="background-color:' + this.robots[SIM.getRobotIndex()].geom.color + '">';
            for (var i = 0; i < this.numprogs; i++) {
                robotIndexColour += '<option style="background-color:' + this.robots[i].geom.color + '" value="' + SIM.getRobotIndex() + '">&nbsp' + "</option>";
            }
            robotIndexColour += "</select>";
            $("#constantValue").append('<div><label>Robot</label><span style="width:auto">' + robotIndexColour + '</span></div>');
        }
    }

    Scene.prototype.updateBackgrounds = function() {
        this.drawBackground(1, this.uCtx);
        this.drawBackground();
    };


    Scene.prototype.drawBackground = function(option_scale, option_context) {
        var ctx = option_context || this.bCtx;
        var sc = option_scale || SIM.getScale();
        var left = (this.playground.w - (this.backgroundImg.width + 20) * sc) / 2.0;
        var top = (this.playground.h - (this.backgroundImg.height + 20) * sc) / 2.0;
        var w = (this.backgroundImg.width + 20) * sc;
        var h = (this.backgroundImg.height + 20) * sc;
        if (option_context) { //unified background
            $('#unitBackgroundLayer').get(0).width = w;
            $('#unitBackgroundLayer').get(0).height = h;
        }
        $('.canvasSim').each(function() {
            $(this).get(0).width = w;
            $(this).get(0).height = h;

        });
        $('#canvasDiv').css({
            top: top + 'px',
            left: left + 'px',
        });
        ctx.restore();
        ctx.save();
        ctx.scale(sc, sc);
        if (this.backgroundImg) {
            if (getFnName(this.robots[0].constructor).indexOf("Calliope") < 0 && getFnName(this.robots[0].constructor) != 'Microbit') {
                ctx.beginPath();
                if (this.pattern) {
                    var patternImg = this.pattern;
                    var pattern = ctx.createPattern(patternImg, 'repeat');
                    ctx.strokeStyle = pattern;
                }
                ctx.lineWidth = 10;
                ctx.strokeRect(5, 5, this.backgroundImg.width + 10, this.backgroundImg.height + 10);
            }
            ctx.drawImage(this.backgroundImg, 10, 10, this.backgroundImg.width, this.backgroundImg.height);
        }
    };

    Scene.prototype.drawRuler = function() {
        this.mCtx.clearRect(this.ruler.xOld - 20, this.ruler.yOld - 20, this.ruler.wOld + 40, this.ruler.hOld + 40);
        this.mCtx.restore();
        this.mCtx.save();
        if (this.ruler.img) {
            this.ruler.xOld = this.ruler.x;
            this.ruler.yOld = this.ruler.y;
            this.ruler.wOld = this.ruler.w;
            this.ruler.hOld = this.ruler.h;
            this.mCtx.scale(SIM.getScale(), SIM.getScale());
            this.mCtx.drawImage(this.ruler.img, this.ruler.x, this.ruler.y, this.ruler.w, this.ruler.h);
        }
    };

    Scene.prototype.drawObstacles = function() {
        this.oCtx.clearRect(SIM.getGround().x-20, SIM.getGround().y-20, SIM.getGround().w+40, SIM.getGround().h+40);
        for(let key in this.customObstacleList) {
            let obstacle = this.customObstacleList[key];
            this.oCtx.restore();
            this.oCtx.save();
            this.oCtx.scale(SIM.getScale(), SIM.getScale());
            if (obstacle.img) {
                this.oCtx.drawImage(obstacle.img, obstacle.x, obstacle.y, obstacle.w, obstacle.h);
            } else if (obstacle.color) {
                this.oCtx.fillStyle = obstacle.color;
                this.oCtx.shadowColor = '#3e3e3e';
                this.oCtx.shadowOffsetY = 5;
                this.oCtx.shadowOffsetX = 5;
                this.oCtx.shadowBlur = 5;
                if (obstacle.form === "rectangle") {
                    this.oCtx.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
                } else if (obstacle.form === "triangle") {
                    this.oCtx.beginPath();
                    this.oCtx.moveTo(obstacle.ax, obstacle.ay);
                    this.oCtx.lineTo(obstacle.bx, obstacle.by);
                    this.oCtx.lineTo(obstacle.cx, obstacle.cy);
                    this.oCtx.fill();
                } else if (obstacle.form === "circle") {
                    this.oCtx.beginPath();
                    this.oCtx.arc(obstacle.x, obstacle.y, obstacle.r, obstacle.startAngle, obstacle.endAngle, Math.PI*2, true);
                    this.oCtx.fill();
                }
                if(SIM.getSelectedObject() != null) this.highlightObject();
            }

       }
        if(SIM.getSelectedObject() != null) this.highlightObject();
    };

    Scene.prototype.highlightObject = function() {
        let selectedObject = SIM.getSelectedObject();
        if(selectedObject != null) {
            var objectCorners;
            if(selectedObject.form === "rectangle") {
                objectCorners = [
                    {x: Math.round(selectedObject.x), y: Math.round(selectedObject.y)},
                    {x: (Math.round(selectedObject.x) + selectedObject.w), y: Math.round(selectedObject.y)},
                    {x: Math.round(selectedObject.x), y: (Math.round(selectedObject.y) + selectedObject.h)},
                    {x: (Math.round(selectedObject.x) + selectedObject.w), y: (Math.round(selectedObject.y) + selectedObject.h)}
                ];
            } else if(selectedObject.form === "triangle") {
                objectCorners = [
                    {x: Math.round(selectedObject.ax), y: Math.round(selectedObject.ay)},
                    {x: Math.round(selectedObject.bx), y: Math.round(selectedObject.by)},
                    {x: Math.round(selectedObject.cx), y: Math.round(selectedObject.cy)}
                ];
            }
            for (let c in objectCorners) {
                this.oCtx.restore();
                this.oCtx.save();
                this.oCtx.scale(SIM.getScale(), SIM.getScale());
                this.oCtx.beginPath();
                this.oCtx.lineWidth = 2;
                this.oCtx.shadowBlur = 0;
                this.oCtx.strokeStyle = "gray";
                this.oCtx.arc(objectCorners[c].x, objectCorners[c].y, 4, 0, 2 * Math.PI);
                this.oCtx.fillStyle = "black";
                this.oCtx.stroke();
                this.oCtx.fill();
        }
        }
    }

    Scene.prototype.drawColorBlocks = function() {
        for(let key in this.colorBlockList) {
            let colorBlock = this.colorBlockList[key];
            this.bCtx.restore();
            this.bCtx.save();
            this.bCtx.scale(SIM.getScale(), SIM.getScale());
            if (colorBlock.img) {
                this.uCtx.drawImage(colorBlock.img, colorBlock.x, colorBlock.y, colorBlock.w, colorBlock.h);
            } else if (colorBlock.color) {
                this.uCtx.fillStyle = colorBlock.color;
                this.bCtx.fillStyle = colorBlock.color;
                this.uCtx.fillRect(colorBlock.x, colorBlock.y, colorBlock.w, colorBlock.h);
                this.bCtx.fillRect(colorBlock.x, colorBlock.y, colorBlock.w, colorBlock.h);
            }
            if(SIM.getSelectedObject() != null) this.highlightObject();
       }
    };

    Scene.prototype.drawVariables = function() {
        $("#variableValue").html("");
        var variables = SIM.getSimVariables()
        if (Object.keys(variables).length > 0) {
            for (var v in variables) {
                var value = variables[v][0];
                addVariableValue(v, value);
            }
        } else {
            $('#variableValue').append('<div><label> No variables instantiated</label></div>')
        }
    }

    Scene.prototype.drawMbed = function() {
        this.rCtx.clearRect(0, 0, C.MAX_WIDTH, C.MAX_HEIGHT);
        this.rCtx.restore();
        this.rCtx.save();
        // provide new user information
        $('#notConstantValue').html('');
        $("#notConstantValue").append('<div><label>FPS</label><span>' + UTIL.round(1 / SIM.getDt(), 0) + '</span></div>');
        $("#notConstantValue").append('<div><label>Time</label><span>' + UTIL.round(this.robots[0].time, 3) + 's</span></div>');
        $("#notConstantValue").append('<div><label>Compass</label><span>' + UTIL.round(this.robots[0].compass.degree, 0) + '°</span></div>');
        $("#notConstantValue").append('<div><label>Light Sensor</label><span>' + UTIL.round(this.robots[0].display.lightLevel, 0) + '%</span></div>');
        $("#notConstantValue").append('<div><label>Temperature</label><span>' + UTIL.round(this.robots[0].temperature.degree, 2) + '°</span></div>');
        var gesture;
        for (var i in this.robots[0].gesture) {
            gesture = i;
            break;
        }
        $("#notConstantValue").append('<div><label>Gesture</label><span>' + gesture + '</span></div>');
        for (var i = 0; i < 4; i++) {
            if (this.robots[0]['pin' + i]) {
                if (this.robots[0]['pin' + i].touched) {
                    $("#notConstantValue").append('<div><label>Pin ' + i + '</label><span>' + this.robots[0]['pin' + i].touched + '</span></div>');
                } else if (this.robots[0]['pin' + i].digitalIn !== undefined) {
                    $("#notConstantValue").append('<div><label>Pin ' + i + '</label><span>' + this.robots[0]['pin' + i].digitalIn + ' \u2293</span></div>');
                } else if (this.robots[0]['pin' + i].analogIn !== undefined) {
                    $("#notConstantValue").append('<div><label>Pin ' + i + '</label><span>' + this.robots[0]['pin' + i].analogIn + ' \u223F</span></div>');
                }
            }
        }
        this.rCtx.scale(SIM.getScale(), SIM.getScale());
        this.rCtx.save();

        this.rCtx.translate(this.backgroundImg.width / 2.0 + 10, this.backgroundImg.height / 2.0 + 10);
        this.rCtx.scale(1, -1);
        for (var prop in this.robots[0]) {
            if (this.robots[0][prop]) {
                if (this.robots[0][prop].draw !== undefined && this.rCtx) {
                    this.robots[0][prop].draw(this.rCtx);
                }
            }
        }
        this.rCtx.restore();
    };

    Scene.prototype.drawRobots = function() {
        if (this.robots[0].idle) {
            this.drawMbed();
            return;
        }
        this.rCtx.clearRect(0, 0, C.MAX_WIDTH, C.MAX_HEIGHT);
        for (var r = 0; r < this.numprogs; r++) {
            this.rCtx.restore();
            this.rCtx.save();
            var x;
            var y;
            if (SIM.getBackground() === 7) {
                x = UTIL.round((this.robots[r].pose.x + this.robots[r].pose.transX) / 3, 1);
                y = UTIL.round((-this.robots[r].pose.y - this.robots[r].pose.transY) / 3, 1);
                this.rCtx.fillStyle = "#ffffff";
            } else {
                x = this.robots[r].pose.x + this.robots[r].pose.transX;
                y = this.robots[r].pose.y + this.robots[r].pose.transY;
                this.rCtx.fillStyle = "#333333";
            }
            if (SIM.getRobotIndex() === r) {
                $("#notConstantValue").html("");
                if (this.numprogs > 1) {
                    $("#robotIndex").css('background-color', this.robots[SIM.getRobotIndex()].geom.color);
                    $("#notConstantValue").append('<div><label>Program Name</label><span>' + this.robots[r].savedName + '</span></div>');
                }
                $("#notConstantValue").append('<div><label>FPS</label><span>' + UTIL.round(1 / SIM.getDt(), 0) + '</span></div>');
                $("#notConstantValue").append('<div><label>Time</label><span>' + UTIL.round(this.robots[r].time, 3) + 's</span></div>');
                $("#notConstantValue").append('<div><label>Robot X</label><span>' + UTIL.round(x, 0) + '</span></div>');
                $("#notConstantValue").append('<div><label>Robot Y</label><span>' + UTIL.round(y, 0) + '</span></div>');
                $("#notConstantValue").append('<div><label>Robot θ</label><span>' + UTIL.round(SIMATH.toDegree(this.robots[r].pose.theta), 0) + '°</span></div>');
                $("#notConstantValue").append('<div><label>Motor left</label><span>' + UTIL.round(this.robots[r].encoder.left * C.ENC, 0) + '°</span></div>');
                $("#notConstantValue").append('<div><label>Motor right</label><span>' + UTIL.round(this.robots[r].encoder.right * C.ENC, 0) + '°</span></div>');
                if (Array.isArray(this.robots[r].touchSensor)) {
                    for (var s in this.robots[r].touchSensor) {
                        $("#notConstantValue").append('<div><label>Touch Sensor ' + s.replace("ORT_", "") + '</label><span>' + UTIL.round(this.robots[r].touchSensor[s].value, 0) + '</span></div>');
                    }
                }
                for (var s in this.robots[r].colorSensor) {
                    $("#notConstantValue").append('<div><label>Light Sensor ' + s.replace("ORT_", "") + '</label><span>' + UTIL.round(this.robots[r].colorSensor[s].lightValue, 0) + '%</span></div>');
                }
                for (var s in this.robots[r].ultraSensor) {
                    $("#notConstantValue").append('<div><label>Ultra Sensor ' + s.replace("ORT_", "") + '</label><span>' + UTIL.roundUltraSound(this.robots[r].ultraSensor[s].distance / 3.0, 0) + 'cm</span></div>');
                }
                if (this.robots[r].sound) {
                    $("#notConstantValue").append('<div><label>Sound Sensor </label><span>' + UTIL.round(this.robots[r].sound.volume * 100, 0) + '%</span></div>');
                }
                for (var s in this.robots[r].colorSensor) {
                    $("#notConstantValue").append('<div><label>Color Sensor ' + s.replace("ORT_", "") + '</label><span style="margin-left:6px; width: 20px; background-color:' + this.robots[r].colorSensor[s].color + '">&nbsp;</span></div>');
                }

                for (var s in this.robots[r].infraredSensors) {
                    for (var side in this.robots[r].infraredSensors[s]) {
                        $("#notConstantValue").append('<div><label>Infrared Sensor ' + s.replace("ORT_", "") + ' ' + side + '</label><span>' + this.robots[r].infraredSensors[s][side].value + '</span></div>');

                    }
                }
            }
            this.rCtx.scale(SIM.getScale(), SIM.getScale());
            this.rCtx.save();
            this.rCtx.translate(this.robots[r].pose.x, this.robots[r].pose.y);
            this.rCtx.rotate(this.robots[r].pose.theta - Math.PI / 2);
            this.rCtx.scale(1, -1);
            //axis
            this.rCtx.lineWidth = "2.5";
            this.rCtx.strokeStyle = this.robots[r].wheelLeft.color;
            this.rCtx.beginPath();
            this.rCtx.moveTo(this.robots[r].geom.x - 5, 0);
            this.rCtx.lineTo(this.robots[r].geom.x + this.robots[r].geom.w + 5, 0);
            this.rCtx.stroke();
            //back wheel
            if (this.robots[r].wheelBack) {
                this.rCtx.fillStyle = this.robots[r].wheelBack.color;
                this.rCtx.fillRect(this.robots[r].wheelBack.x, this.robots[r].wheelBack.y, this.robots[r].wheelBack.w, this.robots[r].wheelBack.h);
                this.rCtx.shadowBlur = 0;
                this.rCtx.shadowOffsetX = 0;
                //this.rCtx.fillStyle = "black";
                //this.rCtx.fillRect(this.robots[r].frontRight.x + 12.5, this.robots[r].frontRight.y, 20, 10);
            }
            //bumper
            var touchSensors;
            if (this.robots[r].touchSensor) {
                touchSensors = this.robots[r].touchSensor;
                for (var t in touchSensors){
                    this.rCtx.fillStyle = this.robots[r].geom.color;
                    switch (touchSensors[t].position) {
                        case "BACK":
                            this.rCtx.shadowBlur = 0;
                            this.rCtx.shadowOffsetX = 0;
                            this.rCtx.fillRect(this.robots[r].backRight.x + 12.5, this.robots[r].backRight.y -8, 20, 10);
                            this.rCtx.fillRect(this.robots[r].frontRight.x + 12.5, this.robots[r].frontRight.y, 20, 10);
                            break;
                        default:
                            this.rCtx.shadowBlur = 0;
                            this.rCtx.shadowOffsetX = 0;
                            this.rCtx.fillRect(this.robots[r].frontRight.x + 12.5, this.robots[r].frontRight.y, 20, 10);
                            break;
                    }
                    if (this.robots[r].led && !this.robots[r].leds) {
                        this.rCtx.fillStyle = this.robots[r].led.color;
                        var grd = this.rCtx.createRadialGradient(this.robots[r].led.x, this.robots[r].led.y, 1, this.robots[r].led.x, this.robots[r].led.y, 15);
                        grd.addColorStop(0, this.robots[r].led.color);
                        grd.addColorStop(0.5, this.robots[r].geom.color);
                        this.rCtx.fillStyle = grd;
                    } else {
                        this.rCtx.fillStyle = this.robots[r].geom.color;
                    }
                }
            } else {
                this.rCtx.fillStyle = this.robots[r].geom.color;
            }

            this.rCtx.shadowBlur = 5;
            this.rCtx.shadowColor = "black";
            this.rCtx.beginPath();
            var radius = this.robots[r].geom.radius || 0;
            this.rCtx.moveTo(this.robots[r].geom.x + radius, this.robots[r].geom.y);
            this.rCtx.lineTo(this.robots[r].geom.x + this.robots[r].geom.w - radius, this.robots[r].geom.y);
            this.rCtx.quadraticCurveTo(this.robots[r].geom.x + this.robots[r].geom.w, this.robots[r].geom.y, this.robots[r].geom.x + this.robots[r].geom.w, this.robots[r].geom.y + radius);
            this.rCtx.lineTo(this.robots[r].geom.x + this.robots[r].geom.w, this.robots[r].geom.y + this.robots[r].geom.h - radius);
            this.rCtx.quadraticCurveTo(this.robots[r].geom.x + this.robots[r].geom.w, this.robots[r].geom.y + this.robots[r].geom.h, this.robots[r].geom.x + this.robots[r].geom.w - radius, this.robots[r].geom.y + this.robots[r].geom.h);
            this.rCtx.lineTo(this.robots[r].geom.x + radius, this.robots[r].geom.y + this.robots[r].geom.h);
            this.rCtx.quadraticCurveTo(this.robots[r].geom.x, this.robots[r].geom.y + this.robots[r].geom.h, this.robots[r].geom.x, this.robots[r].geom.y + this.robots[r].geom.h - radius);
            this.rCtx.lineTo(this.robots[r].geom.x, this.robots[r].geom.y + radius);
            this.rCtx.quadraticCurveTo(this.robots[r].geom.x, this.robots[r].geom.y, this.robots[r].geom.x + radius, this.robots[r].geom.y);
            this.rCtx.closePath();
            this.rCtx.fill();
            this.rCtx.shadowBlur = 0;
            this.rCtx.shadowOffsetX = 0;
            //LED
            if (this.robots[r].led && !this.robots[r].leds) {
                this.rCtx.fillStyle = this.robots[r].led.color;
                this.rCtx.beginPath();
                this.rCtx.arc(this.robots[r].led.x, this.robots[r].led.y, 2.5, 0, Math.PI * 2);
                this.rCtx.fill();
            }

            if (this.robots[r].leds) {
                for (var port in this.robots[r].leds) {
                    this.rCtx.fillStyle = this.robots[r].leds[port].color;
                    this.rCtx.beginPath();
                    this.rCtx.arc(this.robots[r].leds[port].x, this.robots[r].leds[port].y, 2.5, 0, Math.PI * 2);
                    this.rCtx.fill();
                }
            }

            //touch
            var touch = false;
            if (Array.isArray(this.robots[r].touchSensor)) {
                touch = true;
            }
            for (var t in touchSensors) {
                this.rCtx.shadowBlur = 5;
                this.rCtx.fillStyle = this.robots[r].geom.color;
                this.rCtx.shadowOffsetX = 0;
                this.rCtx.fillRect(this.robots[r].frontRight.x, this.robots[r].frontRight.y, this.robots[r].frontLeft.x - this.robots[r].frontRight.x, 3.5);
                if (touchSensors[t].position === "BACK") {
                    this.rCtx.shadowOffsetX = 0;
                    this.rCtx.fillRect(this.robots[r].backRight.x, this.robots[r].backRight.y, this.robots[r].backLeft.x - this.robots[r].backRight.x, 3.5);
                }
                if (touchSensors[t].value === 1) {
                    this.rCtx.fillStyle = 'red';
                    switch (touchSensors[t].position){
                        case "BACK":
                            this.rCtx.fillRect(this.robots[r].backRight.x, this.robots[r].backRight.y, this.robots[r].backLeft.x - this.robots[r].backRight.x, 3.5);
                            break;
                        default:
                            this.rCtx.fillRect(this.robots[r].frontRight.x, this.robots[r].frontRight.y, this.robots[r].frontLeft.x - this.robots[r].frontRight.x, 3.5);
                            break;
                    }
                }
            }
            this.rCtx.shadowBlur = 0;
            this.rCtx.shadowOffsetX = 0;
            //wheels
            this.rCtx.fillStyle = this.robots[r].wheelLeft.color;
            this.rCtx.fillRect(this.robots[r].wheelLeft.x, this.robots[r].wheelLeft.y, this.robots[r].wheelLeft.w, this.robots[r].wheelLeft.h);
            this.rCtx.fillStyle = this.robots[r].wheelRight.color;
            this.rCtx.fillRect(this.robots[r].wheelRight.x, this.robots[r].wheelRight.y, this.robots[r].wheelRight.w, this.robots[r].wheelRight.h);
            this.rCtx.lineWidth = "0.5";
            //color
            var colorSensors = this.robots[r].colorSensor;
            for (var s in colorSensors) {
                var startAngle, endAngle;
                startAngle = endAngle = 0;
                switch(colorSensors[s].position) { // rotate half circle based on color sensor position
                    case "BACK":
                        startAngle = 0;
                        endAngle = Math.PI;
                        break;
                    case "LEFT":
                        startAngle = 1.5*Math.PI;
                        endAngle = 0.5*Math.PI;
                        break;
                    case "RIGHT":
                        startAngle = 0.5*Math.PI;
                        endAngle = 1.5*Math.PI;
                        break;
                    default:
                        startAngle = Math.PI;
                        endAngle = 2*Math.PI;
                        break;
                }
                this.rCtx.beginPath();
                if (colorSensors[s].alignment !== C.ALIGNMENT_ENUM.HORIZONTAL) {
                    this.rCtx.arc(colorSensors[s].x, colorSensors[s].y, colorSensors[s].r, 0, Math.PI * 2);
                } else {
                    this.rCtx.arc(colorSensors[s].x, colorSensors[s].y, colorSensors[s].r, startAngle, endAngle, true);
                }
                this.rCtx.fillStyle = colorSensors[s].color;
                this.rCtx.fill();
                this.rCtx.strokeStyle = "black";
                this.rCtx.stroke();
                if (s !== 0) {
                    this.rCtx.translate(colorSensors[s].x, colorSensors[s].y);
                    this.rCtx.scale(-1, 1);
                    this.rCtx.rotate(-Math.PI / 2);
                    this.rCtx.beginPath();
                    this.rCtx.fillStyle = "#555555";
                    switch(colorSensors[s].position){
                        case "BACK":
                            this.rCtx.fillText(s, 6, 4);
                            break;
                        case "LEFT":
                            this.rCtx.fillText(s, -3, 13);
                            break;
                        case "RIGHT":
                            this.rCtx.fillText(s, -3, -6);
                            break;
                        default:
                            this.rCtx.fillText(s, -11, 4);
                            break;
                    }
                    this.rCtx.rotate(Math.PI/2);
                    this.rCtx.scale(-1, 1);
                    this.rCtx.translate(-colorSensors[s].x, -colorSensors[s].y);
                }
            }
            // infrared sensors (mBot)
            var infraredSensors = this.robots[r].infraredSensors;
            for (var s in infraredSensors) {
                // here we always have a left (1) and right (2) side
                this.rCtx.beginPath();
                this.rCtx.lineWidth = "0.1";
                this.rCtx.arc(infraredSensors[s]["left"].x, infraredSensors[s]["left"].y, infraredSensors[s]["left"].r, 0, Math.PI * 2);
                this.rCtx.fillStyle = infraredSensors[s]["left"].value ? "black" : "white";
                this.rCtx.fill();
                this.rCtx.strokeStyle = "black";
                this.rCtx.stroke();
                this.rCtx.lineWidth = "0.5";
                this.rCtx.beginPath();
                this.rCtx.lineWidth = "0.1";
                this.rCtx.arc(infraredSensors[s]["right"].x, infraredSensors[s]["right"].y, infraredSensors[s]["right"].r, 0, Math.PI * 2);
                this.rCtx.fillStyle = infraredSensors[s]["right"].value ? "black" : "white";
                this.rCtx.fill();
                this.rCtx.strokeStyle = "black";
                this.rCtx.stroke();
                this.rCtx.lineWidth = "0.5";
            }

            //ledSensor
            if (this.robots[r].ledSensor && this.robots[r].ledSensor.color) {
                this.rCtx.fillStyle = this.robots[r].ledSensor.color;
                this.rCtx.beginPath();
                this.rCtx.arc(this.robots[r].ledSensor.x, this.robots[r].ledSensor.y, 2.5, 0, Math.PI * 2);
                this.rCtx.fill();
            }
            this.rCtx.restore();
            // ultra
            var ultraSensors = this.robots[r].ultraSensor;
            this.waves[r] += C.WAVE_LENGTH * SIM.getDt();
            this.waves[r] = this.waves[r] % C.WAVE_LENGTH;
            this.rCtx.lineDashOffset = C.WAVE_LENGTH - this.waves[r];
            this.rCtx.setLineDash([20, 40]);
            for (var s in ultraSensors) {
                for (var i = 0; i < ultraSensors[s].u.length; i++) {
                    this.rCtx.beginPath();
                    this.rCtx.lineWidth = "0.5";
                    this.rCtx.strokeStyle = "#555555";
                    this.rCtx.moveTo(ultraSensors[s].rx, ultraSensors[s].ry);
                    if (ultraSensors[s].u[i]) {
                        this.rCtx.lineTo(ultraSensors[s].u[i].x, ultraSensors[s].u[i].y);
                    }
                    this.rCtx.stroke();
                }
                this.rCtx.beginPath();
                this.rCtx.lineWidth = "1";
                this.rCtx.strokeStyle = "black";
                this.rCtx.moveTo(ultraSensors[s].rx, ultraSensors[s].ry);
                this.rCtx.lineTo(ultraSensors[s].cx, ultraSensors[s].cy);

                this.rCtx.stroke();
                if (s !== 0 && (this.robots[r].name !== "mbot")) {
                    this.rCtx.translate(ultraSensors[s].rx, ultraSensors[s].ry);
                    this.rCtx.rotate(this.robots[r].pose.theta);
                    this.rCtx.beginPath();
                    this.rCtx.fillStyle = "#555555";
                    this.rCtx.fillText(s, (ultraSensors[s].y !== 30 ? 10 : -10), 4);
                    this.rCtx.rotate(-this.robots[r].pose.theta);
                    this.rCtx.translate(-ultraSensors[s].rx, -ultraSensors[s].ry);
                }
            }
            // mBot only (so far)
            if (this.robots[r].display && this.robots[r].display.draw) {
                this.robots[r].display.draw(this.robots[r].ctx);
            }

            //this.rCtx.stroke();
            this.rCtx.lineDashOffset = 0;
            this.rCtx.setLineDash([]);
            if (this.robots[r].canDraw) {
                this.bCtx.lineCap = 'round';
                this.bCtx.beginPath();
                this.bCtx.lineWidth = this.robots[r].drawWidth;
                this.bCtx.strokeStyle = this.robots[r].drawColor;
                this.bCtx.moveTo(this.robots[r].pose.xOld, this.robots[r].pose.yOld);
                this.bCtx.lineTo(this.robots[r].pose.x, this.robots[r].pose.y);
                this.bCtx.stroke();
                this.uCtx.beginPath();
                this.uCtx.lineCap = 'round';
                this.uCtx.lineWidth = this.robots[r].drawWidth;
                this.uCtx.strokeStyle = this.robots[r].drawColor;
                this.uCtx.moveTo(this.robots[r].pose.xOld, this.robots[r].pose.yOld);
                this.uCtx.lineTo(this.robots[r].pose.x, this.robots[r].pose.y);
                this.uCtx.stroke();
                this.robots[r].pose.xOld = this.robots[r].pose.x;
                this.robots[r].pose.yOld = this.robots[r].pose.y;
            }
        }
    };

    Scene.prototype.updateSensorValues = function(running) {
        for (var r = 0; r < this.numprogs; r++) {
            var personalObstacleList = [];
            personalObstacleList.push(SIM.obstacleList[0]);
            personalObstacleList = personalObstacleList.concat(SIM.obstacleList[1].slice());
            var values = this.robots[r].robotBehaviour.hardwareState.sensors;
            for (var i = 0; i < this.numprogs; i++) {
                if (i === r) {
                    continue;
                } else {
                    var tempobstacle = {
                        isParallelToAxis: false,
                        backLeft: this.robots[i].backLeft,
                        backRight: this.robots[i].backRight,
                        frontLeft: this.robots[i].frontLeft,
                        frontRight: this.robots[i].frontRight,
                        tolerance: Math.max(Math.abs(this.robots[i].right), Math.abs(this.robots[i].left) || 0)
                    };
                    personalObstacleList.push(tempobstacle);
                }
            }
            if (this.robots[r].touchSensor || this.robots[r].ultraSensor) { // check only if it is a moving robot
                var touchSensors = [];
                if (Array.isArray(this.robots[r].touchSensor)) {
                    touchSensors = this.robots[r].touchSensor;
                    for (var s in this.robots[r].touchSensor) {
                        touchSensors[s] = this.robots[r].touchSensor[s];
                        break;
                    }
                } else {
                    touchSensors = this.robots[r].touchSensor || [{}];
                }
                for (var t in touchSensors) {
                    touchSensors[t].value = 0;
                    this.robots[r].frontLeft.bumped = false;
                    this.robots[r].frontRight.bumped = false;
                    this.robots[r].backLeft.bumped = false;
                    this.robots[r].backRight.bumped = false;
                    for (var i = 0; i < personalObstacleList.length; i++) {
                        var p = personalObstacleList[i];
                        if (i === 0) {
                            var x = this.robots[r].frontLeft.rx;
                            var y = this.robots[r].frontLeft.ry;

                            if (p.form === "triangle") {
                                if (SIM.checkDownTriangle(x, y, p.ax, p.ay, p.bx, p.by, p.cx, p.cy)) {
                                    this.robots[r].frontLeft.bumped = true;
                                    if (touchSensors[t].position !== "BACK") {
                                        touchSensors[t].value = 1;
                                    }
                                }
                            } else if (p.form === "circle") {
                                if (SIM.checkDownCircle(x, y, p.x, p.y, p.r)) {
                                    this.robots[r].frontLeft.bumped = true;
                                    if (touchSensors[t].position !== "BACK") {
                                        touchSensors[t].value = 1;
                                    }
                                }
                            } else if (x < p.x || x > p.x + p.w || y < p.y || y > p.y + p.h) {
                                this.robots[r].frontLeft.bumped = true;
                                if (touchSensors[t].position !== "BACK") {
                                    touchSensors[t].value = 1;
                                }
                            }
                            x = this.robots[r].frontRight.rx;
                            y = this.robots[r].frontRight.ry;
                            if (p.form === "triangle") {
                                if (SIM.checkDownTriangle(x, y, p.ax, p.ay, p.bx, p.by, p.cx, p.cy)) {
                                    this.robots[r].frontRight.bumped = true;
                                    if (touchSensors[t].position !== "BACK") {
                                        touchSensors[t].value = 1;
                                    }
                                }
                            } else if (p.form === "circle") {
                                if (SIM.checkDownCircle(x, y, p.x, p.y, p.r)) {
                                    this.robots[r].frontRight.bumped = true;
                                    if (touchSensors[t].position !== "BACK") {
                                        touchSensors[t].value = 1;
                                    }
                                }
                            } else if (x < p.x || x > p.x + p.w || y < p.y || y > p.y + p.h) {
                                this.robots[r].frontRight.bumped = true;
                                if (touchSensors[t].position !== "BACK") {
                                    touchSensors[t].value = 1;
                                }
                            }
                            x = this.robots[r].backLeft.rx;
                            y = this.robots[r].backLeft.ry;
                            if (p.form === "triangle") {
                                if (SIM.checkDownTriangle(x, y, p.ax, p.ay, p.bx, p.by, p.cx, p.cy)) {
                                    this.robots[r].backLeft.bumped = true;
                                    if (touchSensors[t].position === "BACK") {
                                        touchSensors[t].value = 1;
                                    }
                                }
                            } else if (p.form === "circle") {
                                if (SIM.checkDownCircle(x, y, p.x, p.y, p.r)) {
                                    this.robots[r].backLeft.bumped = true;
                                    if (touchSensors[t].position === "BACK") {
                                        touchSensors[t].value = 1;
                                    }
                                }
                            } else if (x < p.x || x > p.x + p.w || y < p.y || y > p.y + p.h) {
                                this.robots[r].backLeft.bumped = true;
                                if (touchSensors[t].position === "BACK") {
                                    touchSensors[t].value = 1;
                                }
                            }
                            x = this.robots[r].backRight.rx;
                            y = this.robots[r].backRight.ry;
                            if (p.form === "triangle") {
                                if (SIM.checkDownTriangle(x, y, p.ax, p.ay, p.bx, p.by, p.cx, p.cy)) {
                                    this.robots[r].backRight.bumped = true;
                                    if (touchSensors[t].position === "BACK") {
                                        touchSensors[t].value = 1;
                                    }
                                }
                            } else if (p.form === "circle") {
                                if (SIM.checkDownCircle(x, y, p.x, p.y, p.r)) {
                                    this.robots[r].backRight.bumped = true;
                                    if (touchSensors[t].position === "BACK") {
                                        touchSensors[t].value = 1;
                                    }
                                }
                            } else if (x < p.x || x > p.x + p.w || y < p.y || y > p.y + p.h) {
                                this.robots[r].backRight.bumped = true;
                                if (touchSensors[t].position === "BACK") {
                                    touchSensors[t].value = 1;
                                }
                            }
                        } else {
                            if (p.isParallelToAxis) {
                                var x = this.robots[r].frontLeft.rx;
                                var y = this.robots[r].frontLeft.ry;
                                if (p.form === "triangle") {
                                    if (SIM.checkDownTriangle(x, y, p.ax, p.ay, p.bx, p.by, p.cx, p.cy)) {
                                        this.robots[r].frontLeft.bumped = true;
                                        if (touchSensors[t].position !== "BACK") {
                                            touchSensors[t].value = 1;
                                        }
                                    }
                                } else if (p.form === "circle") {
                                    if (SIM.checkDownCircle(x, y, p.x, p.y, p.r)) {
                                        this.robots[r].frontLeft.bumped = true;
                                        if (touchSensors[t].position !== "BACK") {
                                            touchSensors[t].value = 1;
                                        }
                                    }
                                } else if (x > p.x && x < p.x + p.w && y > p.y && y < p.y + p.h) {
                                    this.robots[r].frontLeft.bumped = true;
                                    if (touchSensors[t].position !== "BACK") {
                                        touchSensors[t].value = 1;
                                    }
                                }
                                x = this.robots[r].frontRight.rx;
                                y = this.robots[r].frontRight.ry;
                                if (p.form === "triangle") {
                                    if (SIM.checkDownTriangle(x, y, p.ax, p.ay, p.bx, p.by, p.cx, p.cy)) {
                                        this.robots[r].frontRight.bumped = true;
                                        if (touchSensors[t].position !== "BACK") {
                                            touchSensors[t].value = 1;
                                        }
                                    }
                                } else if (p.form === "circle") {
                                    if (SIM.checkDownCircle(x, y, p.x, p.y, p.r)) {
                                        this.robots[r].frontRight.bumped = true;
                                        if (touchSensors[t].position !== "BACK") {
                                            touchSensors[t].value = 1;
                                        }
                                    }
                                } else if (x > p.x && x < p.x + p.w && y > p.y && y < p.y + p.h) {
                                    this.robots[r].frontRight.bumped = true;
                                    if (touchSensors[t].position !== "BACK") {
                                        touchSensors[t].value = 1;
                                    }
                                }
                                x = this.robots[r].backLeft.rx;
                                y = this.robots[r].backLeft.ry;
                                if (p.form === "triangle") {
                                    if (SIM.checkDownTriangle(x, y, p.ax, p.ay, p.bx, p.by, p.cx, p.cy)) {
                                        this.robots[r].backLeft.bumped = true;
                                        if (touchSensors[t].position === "BACK") {
                                            touchSensors[t].value = 1;
                                        }
                                    }
                                } else if (p.form === "circle") {
                                    if (SIM.checkDownCircle(x, y, p.x, p.y, p.r)) {
                                        this.robots[r].backLeft.bumped = true;
                                        if (touchSensors[t].position === "BACK") {
                                            touchSensors[t].value = 1;
                                        }
                                    }
                                } else if (x > p.x && x < p.x + p.w && y > p.y && y < p.y + p.h) {
                                    this.robots[r].backLeft.bumped = true;
                                    if (touchSensors[t].position === "BACK") {
                                        touchSensors[t].value = 1;
                                    }
                                }
                                x = this.robots[r].backRight.rx;
                                y = this.robots[r].backRight.ry;
                                if (p.form === "triangle") {
                                    if (SIM.checkDownTriangle(x, y, p.ax, p.ay, p.bx, p.by, p.cx, p.cy)) {
                                        this.robots[r].backRight.bumped = true;
                                        if (touchSensors[t].position === "BACK") {
                                            touchSensors[t].value = 1;
                                        }
                                    }
                                } else if (p.form === "circle") {
                                    if (SIM.checkDownCircle(x, y, p.x, p.y, p.r)) {
                                        this.robots[r].backRight.bumped = true;
                                        if (touchSensors[t].position === "BACK") {
                                            touchSensors[t].value = 1;
                                        }
                                    }
                                } else if (x > p.x && x < p.x + p.w && y > p.y && y < p.y + p.h) {
                                    this.robots[r].backRight.bumped = true;
                                    if (touchSensors[t].position === "BACK") {
                                        touchSensors[t].value = 1;
                                    }
                                }
                            } else {
                                var rectobj = {
                                    p1: {
                                        x: p.backLeft.rx,
                                        y: p.backLeft.ry
                                    },
                                    p2: {
                                        x: p.frontLeft.rx,
                                        y: p.frontLeft.ry
                                    },
                                    p3: {
                                        x: p.frontRight.rx,
                                        y: p.frontRight.ry
                                    },
                                    p4: {
                                        x: p.backRight.rx,
                                        y: p.backRight.ry
                                    }
                                };
                                var x = this.robots[r].frontLeft.rx;
                                var y = this.robots[r].frontLeft.ry;
                                if (SIMATH.isPointInsideRectangle({
                                    x: x,
                                    y: y
                                }, rectobj)) {
                                    this.robots[r].frontLeft.bumped = true;
                                    if (touchSensors[t].position !== "BACK") {
                                        touchSensors[t].value = 1;
                                    }
                                }
                                x = this.robots[r].frontRight.rx;
                                y = this.robots[r].frontRight.ry;
                                if (SIMATH.isPointInsideRectangle({
                                    x: x,
                                    y: y
                                }, rectobj)) {
                                    this.robots[r].frontRight.bumped = true;
                                    if (touchSensors[t].position !== "BACK") {
                                        touchSensors[t].value = 1;
                                    }
                                }
                                x = this.robots[r].backLeft.rx;
                                y = this.robots[r].backLeft.ry;
                                if (SIMATH.isPointInsideRectangle({
                                    x: x,
                                    y: y
                                }, rectobj)) {
                                    this.robots[r].backLeft.bumped = true;
                                    if (touchSensors[t].position === "BACK") {
                                        touchSensors[t].value = 1;
                                    }
                                }
                                x = this.robots[r].backRight.rx;
                                y = this.robots[r].backRight.ry;
                                if (SIMATH.isPointInsideRectangle({
                                    x: x,
                                    y: y
                                }, rectobj)) {
                                    this.robots[r].backRight.bumped = true;
                                    if (touchSensors[t].position === "BACK") {
                                        touchSensors[t].value = 1;
                                    }
                                }
                            }
                            if (touchSensors[t].value === 0) {
                                var robotSeg;
                                switch (touchSensors[t].position) {
                                    case("BACK"):
                                        robotSeg = {
                                            x1 : this.robots[r].backLeft.rx,
                                            x2 : this.robots[r].backRight.rx,
                                            y1 : this.robots[r].backLeft.ry,
                                            y2 : this.robots[r].backRight.ry
                                        }
                                        break;
                                    default:
                                        robotSeg = {
                                            x1 : this.robots[r].frontLeft.rx,
                                            x2 : this.robots[r].frontRight.rx,
                                            y1 : this.robots[r].frontLeft.ry,
                                            y2 : this.robots[r].frontRight.ry
                                        }
                                        break;
                                }
                                var p;
                                if (personalObstacleList[i].form !== "circle") {
                                    var obstacleLines = SIMATH.getLinesFromRect(personalObstacleList[i]);
                                    if (personalObstacleList[i].form === "triangle") obstacleLines = SIMATH.getLinesFromTria(personalObstacleList[i]);
                                    for (var k = 0; k < obstacleLines.length; k++) {
                                        var interPoint = SIMATH.getIntersectionPoint(
                                            robotSeg
                                        , obstacleLines[k]);
                                        if (interPoint) {
                                            if (Math.abs(this.robots[r].frontLeft.rx - interPoint.x) < Math.abs(this.robots[r].frontRight.rx - interPoint.x)) {
                                                this.robots[r].frontLeft.bumped = true;
                                            } else if (Math.abs(this.robots[r].frontRight.rx - interPoint.x) < Math.abs(this.robots[r].frontLeft.rx - interPoint.x)) {
                                                this.robots[r].frontRight.bumped = true;
                                            } else if (Math.abs(this.robots[r].backLeft.rx - interPoint.x) < Math.abs(this.robots[r].backRight.rx - interPoint.x)) {
                                                this.robots[r].backLeft.bumped = true;
                                            } else {
                                                this.robots[r].backRight.bumped = true;
                                            }
                                            touchSensors[t].value = 1;
                                        } else {
                                            var p = SIMATH.getDistanceToLine({
                                                x: touchSensors[t].rx,
                                                y: touchSensors[t].ry
                                            }, {
                                                x: obstacleLines[k].x1,
                                                y: obstacleLines[k].y1
                                            }, {
                                                x: obstacleLines[k].x2,
                                                y: obstacleLines[k].y2
                                            });
                                            var thisTolerance = Math.max(Math.abs(this.robots[r].right), Math.abs(this.robots[r].left));
                                            if (SIMATH.sqr(touchSensors[t].rx - p.x) + SIMATH.sqr(touchSensors[t].ry - p.y) <
                                                SIM.getDt() * (personalObstacleList[i].tolerance + thisTolerance)) {
                                                this.robots[r].frontLeft.bumped = true;
                                                this.robots[r].frontRight.bumped = true;
                                                touchSensors[t].value = 1;
                                            } else {
                                                var interPoint = SIMATH.getIntersectionPoint({
                                                    x1: this.robots[r].backLeft.rx,
                                                    x2: this.robots[r].backRight.rx,
                                                    y1: this.robots[r].backLeft.ry,
                                                    y2: this.robots[r].backRight.ry
                                                }, obstacleLines[k]);
                                                if (interPoint) {
                                                    if (Math.abs(this.robots[r].backLeft.rx - interPoint.x) < Math.abs(this.robots[r].backRight.rx - interPoint.x)) {
                                                        this.robots[r].backLeft.bumped = true;
                                                    } else {
                                                        this.robots[r].backRight.bumped = true;
                                                    }
                                                } else {
                                                    var p = SIMATH.getDistanceToLine({
                                                        x: touchSensors[t].rx,
                                                        y: touchSensors[t].ry
                                                    }, {
                                                        x: obstacleLines[k].x1,
                                                        y: obstacleLines[k].y1
                                                    }, {
                                                        x: obstacleLines[k].x2,
                                                        y: obstacleLines[k].y2
                                                    });
                                                    if (SIMATH.sqr(this.robots[r].backMiddle.rx - p.x) + SIMATH.sqr(this.robots[r].backMiddle.ry - p.y) <
                                                        SIM.getDt() * (personalObstacleList[i].tolerance + thisTolerance)) {
                                                        this.robots[r].backLeft.bumped = true;
                                                        this.robots[r].backRight.bumped = true;
                                                    }
                                                }
                                            }
                                        }
                                    }
                                } else {
                                    var interPoint = SIMATH.getClosestIntersectionPointCircle(robotSeg, personalObstacleList[i]);
                                    if (interPoint) {
                                        if (Math.abs(this.robots[r].frontLeft.rx - interPoint.x) < Math.abs(this.robots[r].frontRight.rx - interPoint.x)) {
                                            this.robots[r].frontLeft.bumped = true;
                                        } else if (Math.abs(this.robots[r].frontRight.rx - interPoint.x) < Math.abs(this.robots[r].frontLeft.rx - interPoint.x)) {
                                            this.robots[r].frontRight.bumped = true;
                                        } else if (Math.abs(this.robots[r].backLeft.rx - interPoint.x) < Math.abs(this.robots[r].backRight.rx - interPoint.x)) {
                                            this.robots[r].backLeft.bumped = true;
                                        } else {
                                            this.robots[r].backRight.bumped = true;
                                        }
                                        touchSensors[t].value = 1;
                                    } else {
                                        p = SIMATH.getDistanceToCircle({
                                            x: touchSensors[t].rx,
                                            y: touchSensors[t].ry
                                        }, personalObstacleList[i]);
                                    }
                                    var thisTolerance = Math.max(Math.abs(this.robots[r].right), Math.abs(this.robots[r].left));
                                    if (SIMATH.sqr(touchSensors[t].rx - p.x) + SIMATH.sqr(touchSensors[t].ry - p.y) <
                                        SIM.getDt() * (personalObstacleList[i].tolerance + thisTolerance)) {
                                        this.robots[r].frontLeft.bumped = true;
                                        this.robots[r].frontRight.bumped = true;
                                        touchSensors[t].value = 1;
                                    } else {
                                        var interPoint = SIMATH.getClosestIntersectionPointCircle({
                                            x1: this.robots[r].backLeft.rx,
                                            x2: this.robots[r].backRight.rx,
                                            y1: this.robots[r].backLeft.ry,
                                            y2: this.robots[r].backRight.ry
                                        }, personalObstacleList[i]);
                                        if (interPoint) {
                                            if (Math.abs(this.robots[r].backLeft.rx - interPoint.x) < Math.abs(this.robots[r].backRight.rx - interPoint.x)) {
                                                this.robots[r].backLeft.bumped = true;
                                            } else {
                                                this.robots[r].backRight.bumped = true;
                                            }
                                        } else {
                                            p = SIMATH.getDistanceToCircle({
                                                x: touchSensors[t].rx,
                                                y: touchSensors[t].ry
                                            }, personalObstacleList[i]);
                                            if (SIMATH.sqr(this.robots[r].backMiddle.rx - p.x) + SIMATH.sqr(this.robots[r].backMiddle.ry - p.y) <
                                                SIM.getDt() * (personalObstacleList[i].tolerance + thisTolerance)) {
                                                this.robots[r].backLeft.bumped = true;
                                                this.robots[r].backRight.bumped = true;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    values.touch = {};
                    for (var s in this.robots[r].touchSensor) {
                        if (touchSensors[t].value === 1) {
                            values.touch[s] = true;
                        } else {
                            values.touch[s] = false;
                        }
                    }
                }
            }
            if (this.robots[r].colorSensor) {
                var colorSensors = this.robots[r].colorSensor;
                values.color = {};
                values.light = {};
                for (var s in colorSensors) {
                    var red, green, blue;
                    red = green = blue = 0;

                    if (colorSensors[s].alignment !== C.ALIGNMENT_ENUM.HORIZONTAL) {
                        var colors = this.uCtx.getImageData(Math.round(colorSensors[s].rx - 3), Math.round(colorSensors[s].ry - 3), 6, 6);
                        var out = [0, 4, 16, 20, 24, 44, 92, 116, 120, 124, 136, 140]; // outside the circle
                        for (var j = 0; j < colors.data.length; j += 24) {
                            for (var i = j; i < j + 24; i += 4) {
                                if (out.indexOf(i) < 0) {
                                    red += colors.data[i + 0];
                                    green += colors.data[i + 1];
                                    blue += colors.data[i + 2];
                                }
                            }
                        }
                        var num = colors.data.length / 4 - 12; // 12 are outside
                        red = red / num;
                        green = green / num;
                        blue = blue / num;
                    } else { // alignment is HORIZONTAL or is UNDEFINED / not set
                        var scannedConeColors = [];

                        var colorSensorTheta = 0;
                        switch (colorSensors[s].position) {
                            case (C.POSITION_ENUM.RIGHT):
                                colorSensorTheta = Math.PI / 180 * 90;
                                break;
                            case (C.POSITION_ENUM.BACK):
                                colorSensorTheta = Math.PI;
                                break;
                            case (C.POSITION_ENUM.LEFT):
                                colorSensorTheta = Math.PI / 180 * 270;
                                break;
                            default:
                                colorSensorTheta = 0;
                        }

                        var angles = [-(Math.PI / 26.5), -(Math.PI / 17.66666), -(Math.PI / 8.8333), 0, (Math.PI / 8.8333), (Math.PI / 17.66666), (Math.PI / 26.5)]; // SUM(53°)
                        var cA = [];
                        for (var i = 0; i < angles.length; i++) {
                            cA[i] = {
                                x1: colorSensors[s].rx,
                                y1: colorSensors[s].ry,
                                x2: colorSensors[s].rx + C.MAXDIAG * Math.cos(this.robots[r].pose.theta + angles[i] + colorSensorTheta),
                                y2: colorSensors[s].ry + C.MAXDIAG * Math.sin(this.robots[r].pose.theta + angles[i] + colorSensorTheta)
                            }
                        }

                        for (var j = 0; j < cA.length; j++) {
                            var shortestDistance = C.MAXDIAG;
                            var scannedPoint;
                            var scannedPoints = [];
                            for (var i = 0; i < personalObstacleList.length; i++) {
                                var obstacleLines = (SIMATH.getLinesFromRect(personalObstacleList[i]));
                                for (var k = 0; k < obstacleLines.length; k++) {
                                    var interPoint = SIMATH.getIntersectionPoint(cA[j], obstacleLines[k]);
                                    if (interPoint) {
                                        var dis = Math.sqrt((interPoint.x - colorSensors[s].rx) * (interPoint.x - colorSensors[s].rx) + (interPoint.y - colorSensors[s].ry) * (interPoint.y - colorSensors[s].ry));
                                        if (dis < shortestDistance) {
                                            // only get shortest distance
                                            shortestDistance = dis;
                                            var x = interPoint.x + C.COLOR_SENSOR_HORIZONTAL_DISTANCE * Math.cos(this.robots[r].pose.theta + angles[i] + colorSensorTheta);
                                            var y = interPoint.y + C.COLOR_SENSOR_HORIZONTAL_DISTANCE * Math.sin(this.robots[r].pose.theta + angles[i] + colorSensorTheta);
                                            if (i !== 0) {
                                                // scan 1x1 square
                                                scannedPoint = this.oCtx.getImageData(Math.round(x * SIM.getScale()), Math.round(y * SIM.getScale()), 1, 1).data;
                                            } else {
                                                scannedPoint = [1, 1, 1, 0];
                                            }

                                            scannedPoints = [];
                                            var stepCount = Math.floor(dis / 3.0);
                                            for (var m = 1; m <= stepCount; m++) {
                                                x = colorSensors[s].rx + (C.COLOR_SENSOR_HORIZONTAL_DISTANCE * i) * Math.cos(this.robots[r].pose.theta + angles[i] + colorSensorTheta);
                                                y = colorSensors[s].ry + (C.COLOR_SENSOR_HORIZONTAL_DISTANCE * i) * Math.sin(this.robots[r].pose.theta + angles[i] + colorSensorTheta);
                                                var scannedPointOnLine = this.oCtx.getImageData(Math.round(x * SIM.getScale()), Math.round(y * SIM.getScale()), 1, 1).data;
                                                for (var p = 0; p < scannedPointOnLine.length; p++) {
                                                    scannedPoints.push(scannedPointOnLine[p]);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            if (typeof scannedPoint !== "undefined") {
                                for (var p = 0; p < scannedPoint.length; p++) {
                                    scannedConeColors.push(scannedPoint[p]);
                                }
                                for (var t = 0; t < scannedPoints.length; t++) {
                                    scannedConeColors.push(scannedPoints[t]);
                                }
                            }
                        }
                        var rgb = getObstacleColor(scannedConeColors);
                        red = rgb[0];
                        green = rgb[1];
                        blue = rgb[2];
                    }


                    values.color[s] = {};
                    values.light[s] = {};
                    colorSensors[s].colorValue = SIMATH.getColor(SIMATH.rgbToHsv(red, green, blue));
                    values.color[s].colorValue = colorSensors[s].colorValue;
                    values.color[s].colour = colorSensors[s].colorValue;
                    if (colorSensors[s].colorValue === C.COLOR_ENUM.NONE) {
                        colorSensors[s].color = 'grey';
                    } else if (colorSensors[s].colorValue === C.COLOR_ENUM.BLACK) {
                        colorSensors[s].color = 'black';
                    } else if (colorSensors[s].colorValue === C.COLOR_ENUM.WHITE) {
                        colorSensors[s].color = 'white';
                    } else if (colorSensors[s].colorValue === C.COLOR_ENUM.YELLOW) {
                        colorSensors[s].color = 'yellow';
                    } else if (colorSensors[s].colorValue === C.COLOR_ENUM.BROWN) {
                        colorSensors[s].color = 'brown';
                    } else if (colorSensors[s].colorValue === C.COLOR_ENUM.RED) {
                        colorSensors[s].color = 'red';
                    } else if (colorSensors[s].colorValue === C.COLOR_ENUM.BLUE) {
                        colorSensors[s].color = 'blue';
                    } else if (colorSensors[s].colorValue === C.COLOR_ENUM.GREEN) {
                        colorSensors[s].color = 'lime';
                    }
                    colorSensors[s].lightValue = ((red + green + blue) / 3 / 2.55);

                    values.color[s].light = colorSensors[s].lightValue;
                    values.color[s].rgb = [UTIL.round(red, 0), UTIL.round(green, 0), UTIL.round(blue, 0)];
                    values.color[s].ambientlight = 0;
                    values.light[s].light = colorSensors[s].lightValue;
                    values.light[s].ambientlight = 0;
                }
            }

            if (this.robots[r].ultraSensor) {
                var ultraSensors = this.robots[r].ultraSensor;
                values.ultrasonic = {};
                values.infrared = {};
                for (var s in ultraSensors) {
                    ultraSensors[s].u = [];
                    values.ultrasonic[s] = {};
                    values.infrared[s] = {};
                    var u3 = {
                        x1: ultraSensors[s].rx,
                        y1: ultraSensors[s].ry,
                        x2: ultraSensors[s].rx + C.MAXDIAG * Math.cos(this.robots[r].pose.theta + ultraSensors[s].theta),
                        y2: ultraSensors[s].ry + C.MAXDIAG * Math.sin(this.robots[r].pose.theta + ultraSensors[s].theta)
                    };
                    var u1 = {
                        x1: ultraSensors[s].rx,
                        y1: ultraSensors[s].ry,
                        x2: ultraSensors[s].rx + C.MAXDIAG * Math.cos(this.robots[r].pose.theta - Math.PI / 8 + ultraSensors[s].theta),
                        y2: ultraSensors[s].ry + C.MAXDIAG * Math.sin(this.robots[r].pose.theta - Math.PI / 8 + ultraSensors[s].theta)
                    };
                    var u2 = {
                        x1: ultraSensors[s].rx,
                        y1: ultraSensors[s].ry,
                        x2: ultraSensors[s].rx + C.MAXDIAG * Math.cos(this.robots[r].pose.theta - Math.PI / 16 + ultraSensors[s].theta),
                        y2: ultraSensors[s].ry + C.MAXDIAG * Math.sin(this.robots[r].pose.theta - Math.PI / 16 + ultraSensors[s].theta)
                    };
                    var u5 = {
                        x1: ultraSensors[s].rx,
                        y1: ultraSensors[s].ry,
                        x2: ultraSensors[s].rx + C.MAXDIAG * Math.cos(this.robots[r].pose.theta + Math.PI / 8 + ultraSensors[s].theta),
                        y2: ultraSensors[s].ry + C.MAXDIAG * Math.sin(this.robots[r].pose.theta + Math.PI / 8 + ultraSensors[s].theta)
                    };
                    var u4 = {
                        x1: ultraSensors[s].rx,
                        y1: ultraSensors[s].ry,
                        x2: ultraSensors[s].rx + C.MAXDIAG * Math.cos(this.robots[r].pose.theta + Math.PI / 16 + ultraSensors[s].theta),
                        y2: ultraSensors[s].ry + C.MAXDIAG * Math.sin(this.robots[r].pose.theta + Math.PI / 16 + ultraSensors[s].theta)
                    };

                    var uA = new Array(u1, u2, u3, u4, u5);
                    ultraSensors[s].distance = C.MAXDIAG;
                    var uDis = [Infinity, Infinity, Infinity, Infinity, Infinity];
                    for (var i = 0; i < personalObstacleList.length; i++) {

                        if(personalObstacleList[i].form !== "circle") {
                            var obstacleLines = (SIMATH.getLinesFromRect(personalObstacleList[i]));
                            if(personalObstacleList[i].form === "triangle") obstacleLines = SIMATH.getLinesFromTria(personalObstacleList[i]);
                            for (var k = 0; k < obstacleLines.length; k++) {
                                for (var j = 0; j < uA.length; j++) {
                                    var interPoint = SIMATH.getIntersectionPoint(uA[j], obstacleLines[k]);
                                    if (interPoint) {
                                        var dis = Math.sqrt((interPoint.x - ultraSensors[s].rx) * (interPoint.x - ultraSensors[s].rx) + (interPoint.y - ultraSensors[s].ry) * (interPoint.y - ultraSensors[s].ry));
                                        if (dis < ultraSensors[s].distance) {
                                            ultraSensors[s].distance = dis;
                                            ultraSensors[s].cx = interPoint.x;
                                            ultraSensors[s].cy = interPoint.y;
                                        }
                                        if (dis < uDis[j]) {
                                            uDis[j] = dis;
                                            ultraSensors[s].u[j] = interPoint;
                                        }
                                    }
                                }
                            }
                        } else {
                            for (var j = 0; j < uA.length; j++) {
                                var interPoint = SIMATH.getClosestIntersectionPointCircle(uA[j], personalObstacleList[i]);

                                if (interPoint) {
                                    var dis = Math.sqrt((interPoint.x - ultraSensors[s].rx) * (interPoint.x - ultraSensors[s].rx) + (interPoint.y - ultraSensors[s].ry) * (interPoint.y - ultraSensors[s].ry));
                                    if (dis < ultraSensors[s].distance) {
                                        ultraSensors[s].distance = dis;
                                        ultraSensors[s].cx = interPoint.x;
                                        ultraSensors[s].cy = interPoint.y;
                                    }
                                    if (dis < uDis[j]) {
                                        uDis[j] = dis;
                                        ultraSensors[s].u[j] = interPoint;
                                    }
                                }
                            }
                        }
                    }
                    var distance = ultraSensors[s].distance / 3.0;
                    // adopt sim sensor to real sensor
                    if (distance < 255) {
                        values.ultrasonic[s].distance = distance;
                    } else {
                        values.ultrasonic[s].distance = 255.0;
                    }
                    values.ultrasonic[s].presence = false;
                    // treat the ultrasonic sensor as infrared sensor
                    if (distance < 70) {
                        values.infrared[s].distance = 100.0 / 70.0 * distance;
                    } else {
                        values.infrared[s].distance = 100.0;
                    }
                    values.infrared[s].presence = false;
                }
            }

            if (this.robots[r].infraredSensors) {
                var infraredSensors = this.robots[r].infraredSensors;

                for (var s in infraredSensors) {
                    values.infrared[s] = {};
                    for (var side in infraredSensors[s]) {
                        var red = 0;
                        var green = 0;
                        var blue = 0;
                        var colors = this.uCtx.getImageData(Math.round(infraredSensors[s][side].rx - 3), Math.round(infraredSensors[s][side].ry - 3), 6, 6);
                        var out = [0, 4, 16, 20, 24, 44, 92, 116, 120, 124, 136, 140]; // outside the circle
                        for (var j = 0; j < colors.data.length; j += 24) {
                            for (var i = j; i < j + 24; i += 4) {
                                if (out.indexOf(i) < 0) {
                                    red += colors.data[i + 0];
                                    green += colors.data[i + 1];
                                    blue += colors.data[i + 2];
                                }
                            }
                        }

                        var num = colors.data.length / 4 - 12; // 12 are outside
                        red = red / num;
                        green = green / num;
                        blue = blue / num;

                        var lightValue = ((red + green + blue) / 3 / 2.55);
                        if (lightValue < 50) {
                            infraredSensors[s][side].value = true;
                        } else {
                            infraredSensors[s][side].value = false;
                        }

                        values.infrared[s][side] = infraredSensors[s][side].value;
                    }

                }

            }

            if (running) {
                this.robots[r].time += SIM.getDt();
                for (var key in this.robots[r].timer) {
                    this.robots[r].timer[key] += UTIL.round(SIM.getDt() * 1000, 0);
                }
            }
            values.time = this.robots[r].time;
            if (this.robots[r].timer) {
                values.timer = {};
                for (var key in this.robots[r].timer) {
                    values.timer[key] = this.robots[r].timer[key];
                }
            }
            if (this.robots[r].encoder) {
                values.encoder = {};
                values.encoder.left = this.robots[r].encoder.left * C.ENC;
                values.encoder.right = this.robots[r].encoder.right * C.ENC;
            }
            if (this.robots[r].gyroSensor) {
                values.gyro = {};
                for (var s in this.robots[r].gyroSensor) {
                    values.gyro[s] = {};
                    values.gyro[s].angle = SIMATH.toDegree(this.robots[r].pose.theta);
                    values.gyro[s].rate = SIM.getDt() * SIMATH.toDegree(this.robots[r].pose.thetaDiff);
                }
            }
            if (this.robots[r].buttons) {
                values.buttons = {};
                values.buttons.any = false;
                values.buttons.Reset = false;
                for (var key in this.robots[r].buttons) {
                    values.buttons[key] = this.robots[r].buttons[key] === true;
                    values.buttons.any = (values.buttons.any || this.robots[r].buttons[key]);
                }
            }
            if (this.robots[r].webAudio) {
                values.volume = this.robots[r].webAudio.volume * 100;
            }
            if (this.robots[r].sound) {
                values.sound = {};
                values.sound.volume = UTIL.round(this.robots[r].sound.volume * 100, 0);
            }
            if (this.robots[r].display) {
                var robotName = getFnName(this.robots[r].constructor);
                values.light = {};
                values.display = {};
                values.light.ambientlight = this.robots[r].display.lightLevel;
                if (robotName === 'Ev3' || robotName === 'Nxt' || robotName === "Mbot") {
                    values.display.brightness = this.robots[r].display.brightness;
                    values.display.pixel = this.robots[r].display.leds;
                } else {
                    values.display.brightness = Math.round((this.robots[r].display.brightness * 9.0) / 255.0, 0);
                    values.display.pixel = this.robots[r].display.leds.map(function(x) {
                        return x.map(function(y) {
                            return Math.round(y / IC.BRIGHTNESS_MULTIPLIER);
                        });
                    });
                }
            }
            if (this.robots[r].temperature) {
                values.temperature = {};
                values.temperature.value = this.robots[r].temperature.degree;
            }
            if (this.robots[r].gesture) {
                values.gesture = {};
                for (var mode in this.robots[r].gesture) {
                    values.gesture[mode] = this.robots[r].gesture[mode];
                }
            }
            if (this.robots[r].compass) {
                values.compass = {};
                values.compass.angle = this.robots[r].compass.degree;
            }
            for (var i = 0; i < 4; i++) {
                if (this.robots[r]['pin' + i]) {
                    values['pin' + i] = {};
                    values['pin' + i].pressed = this.robots[r]['pin' + i].touched;
                    if (this.robots[r]['pin' + i].digitalIn !== undefined) {
                        values['pin' + i].digital = this.robots[r]['pin' + i].digitalIn;
                    } else if (this.robots[r]['pin' + i].analogIn !== undefined) {
                        values['pin' + i].analog = this.robots[r]['pin' + i].analogIn;
                    }
                }
            }
            values.correctDrive = SIM.getBackground() == 7;
            if (this.robots[r].display && this.robots[r].display.finished) {
                this.robots[r].robotBehaviour.setBlocking(false);
                this.robots[r].display.finished = false;
            }
            if (this.robots[r].sayText && this.robots[r].sayText.finished) {
                this.robots[r].robotBehaviour.setBlocking(false);
                this.robots[r].sayText.finished = false;
            }
            if (this.robots[r].tone && this.robots[r].tone.finished) {
                this.robots[r].robotBehaviour.setBlocking(false);
                this.robots[r].tone.finished = false;
            }
            values.frameTime = SIM.getDt();
        }
    };

    function getObstacleColor(data) {
        // SOLUTION COPIED FROM https://stackoverflow.com/questions/44556692/javascript-get-average-color-from-a-certain-area-of-an-image/44557266#44557266
        var R, G, B, A, wR, wG, wB, wTotal;
        R = G = B = A = wR = wG = wB = wTotal = 0;
        var components = data.length;
        for (let i = 0; i < components; i += 4) {
            // A single pixel (R, G, B, A) will take 4 positions in the array:
            var r = data[i];
            var g = data[i + 1];
            var b = data[i + 2];
            var a = data[i + 3];
            // switch 0 to 128 (NONE) as empty layer is black with full transparency
            if (r == 0 && g == 0 && b == 0 && a == 0) {
                r = g = b = 128;
                a = 255;
            }
            R += r;
            G += g;
            B += b;
            A += a;

            const w = a / 255;
            wR += r * w;
            wG += g * w;
            wB += b * w;
            wTotal += w;
        }

        const pixelsPerChannel = components / 4;

        // The | operator is used here to perform an integer division:
        R = R / pixelsPerChannel | 0;
        G = G / pixelsPerChannel | 0;
        B = B / pixelsPerChannel | 0;
        wR = wR / wTotal | 0;
        wG = wG / wTotal | 0;
        wB = wB / wTotal | 0;

        return [wR, wG, wB];
    }

    function getFnName(fn) {
        var f = typeof fn == 'function';
        var s = f && ((fn.name && ['', fn.name]) || fn.toString().match(/function ([^\(]+)/));
        return (!f && 'not a function') || (s && s[1] || 'anonymous');
    }

    function addVariableValue(name, value) {
        switch (typeof value) {
            case "number": {
                $("#variableValue").append('<div><label>' + name + ' :  </label><span> ' + UTIL.round(value, 0) + '</span></div>');
                break;
            }
            case "string": {
                $("#variableValue").append('<div><label>' + name + ' :  </label><span> ' + value + '</span></div>');
                break;
            }
            case "boolean": {
                $("#variableValue").append('<div><label>' + name + ' :  </label><span> ' + value + '</span></div>');
                break;
            }
            case "object": {
                for (var i = 0; i < value.length; i++) {
                    addVariableValue(name + " [" + String(i) + "]", value[i]);
                }
                break;
            }
        }
    }

    return Scene;
});