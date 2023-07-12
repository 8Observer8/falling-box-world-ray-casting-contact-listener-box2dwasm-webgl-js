import { box2d } from "./init-box2d.js";
import { gl } from "./webgl-context.js";
import { mat4, vec3 } from "gl-matrix";

export default class RayCastCallback {

    constructor(program, pixelsPerMeter, metaData) {
        this.metaData = metaData;
        this.pixelsPerMeter = pixelsPerMeter;
        this.program = program;
        gl.useProgram(program);

        const vertPositions = [
            -0.5, -0.5,
            0.5, -0.5,
            -0.5, 0.5,
            0.5, 0.5
        ];
        this.vertPosBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertPosBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPositions),
            gl.STATIC_DRAW);

        this.aPositionLocation = gl.getAttribLocation(program, "aPosition");
        this.uMvpMatrixLocation = gl.getUniformLocation(program, "uMvpMatrix");
        this.uColorLocation = gl.getUniformLocation(program, "uColor");

        this.mvpMatrix = mat4.create();
        this.modelMatrix = mat4.create();
        this.projViewMatrix = null;

        const {
            b2Fixture,
            getPointer,
            JSRayCastCallback,
            wrapPointer
        } = box2d;

        const self = this;
        this.instance = Object.assign(new JSRayCastCallback(), {
            ReportFixture(fixture_p, point_p, normal_p, fraction) {
                const fixture = wrapPointer(fixture_p, b2Fixture);
                const name = self.metaData[getPointer(fixture)].name;
                console.log(name);
            }
        });
    }

    drawLine(from, to, color, thickness = 1) {
        gl.useProgram(this.program);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertPosBuffer);
        gl.vertexAttribPointer(this.aPositionLocation, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.aPositionLocation);

        const centerPoint = vec3.fromValues(from.x * this.pixelsPerMeter +
            (to.x * this.pixelsPerMeter - from.x * this.pixelsPerMeter) / 2,
            from.y * this.pixelsPerMeter + (to.y * this.pixelsPerMeter -
                from.y * this.pixelsPerMeter) / 2, 0);
        const a = (from.y - to.y) * this.pixelsPerMeter;
        const b = (from.x - to.x) * this.pixelsPerMeter;
        const tan = a / b;
        const rad = Math.atan(tan);
        const v = vec3.fromValues(b, a, 0);
        const length = vec3.length(v);
        mat4.fromTranslation(this.modelMatrix, centerPoint);
        mat4.rotateZ(this.modelMatrix, this.modelMatrix, rad);
        mat4.scale(this.modelMatrix, this.modelMatrix, [length, thickness, 1]);
        mat4.mul(this.mvpMatrix, this.projViewMatrix, this.modelMatrix);
        gl.uniformMatrix4fv(this.uMvpMatrixLocation, false, this.mvpMatrix);
        gl.uniform3fv(this.uColorLocation, color);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
}
