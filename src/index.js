import { mat4 } from "gl-matrix";
import { box2d, initBox2D } from "./init-box2d.js";
import { gl, initWebGLContext } from "./webgl-context.js";
import createProgram from "./shader-program.js";
import DebugDrawer from "./debug-drawer.js";
import ContactListener from "./contact-listener.js";
import RayCastCallback from "./ray-cast-callback.js";

async function init() {
    await initBox2D();
    const {
        b2_dynamicBody,
        b2BodyDef,
        b2PolygonShape,
        b2Vec2,
        b2World,
        getPointer,
    } = box2d;

    if (!initWebGLContext("renderCanvas")) {
        return;
    }
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 1);

    const projMatrix = mat4.create();
    mat4.ortho(projMatrix, -50, 50, -50, 50, 10, -10);
    const viewMatrix = mat4.create();
    mat4.lookAt(viewMatrix, [0, 0, 10], [0, 0, 0], [0, 1, 0]);
    const projViewMatrix = mat4.create();
    mat4.mul(projViewMatrix, projMatrix, viewMatrix);

    const world = new b2World();
    const gravity = new b2Vec2(0, -3);
    world.SetGravity(gravity);
    const pixelsPerMeter = 30;

    const colorProgram = await createProgram("assets/shaders/", "color.vert", "color.frag");
    const debugDrawer = new DebugDrawer(colorProgram, pixelsPerMeter);
    debugDrawer.projViewMatrix = projMatrix;
    debugDrawer.viewMatrix = viewMatrix;
    world.SetDebugDraw(debugDrawer.instance);

    const metaData = {};

    // Ground
    const groundBodyDef = new b2BodyDef();
    groundBodyDef.set_position(new b2Vec2(0 / pixelsPerMeter, -45 / pixelsPerMeter));
    const groundBody = world.CreateBody(groundBodyDef);
    const groundShape = new b2PolygonShape();
    groundShape.SetAsBox(90 / 2 / pixelsPerMeter, 5 / 2 / pixelsPerMeter);
    const groundFixture = groundBody.CreateFixture(groundShape, 0);
    metaData[getPointer(groundFixture)] = {
        name: "ground"
    };

    // Platform0
    const platform0BodyDef = new b2BodyDef();
    platform0BodyDef.set_position(new b2Vec2(-40 / pixelsPerMeter, 10 / pixelsPerMeter));
    const platform0Body = world.CreateBody(platform0BodyDef);
    const platform0Shape = new b2PolygonShape();
    platform0Shape.SetAsBox(40 / 2 / pixelsPerMeter, 5 / 2 / pixelsPerMeter);
    const platform0Fixture = platform0Body.CreateFixture(platform0Shape, 0);
    metaData[getPointer(platform0Fixture)] = {
        name: "platform0"
    };

    // Platform1
    const platform1BodyDef = new b2BodyDef();
    platform1BodyDef.set_position(new b2Vec2(40 / pixelsPerMeter, -15 / pixelsPerMeter));
    const platform1Body = world.CreateBody(platform1BodyDef);
    const platform1Shape = new b2PolygonShape();
    platform1Shape.SetAsBox(40 / 2 / pixelsPerMeter, 5 / 2 / pixelsPerMeter);
    const platform1Fixture = platform1Body.CreateFixture(platform1Shape, 0);
    metaData[getPointer(platform1Fixture)] = {
        name: "platform1"
    };

    // Box
    const boxBodyDef = new b2BodyDef();
    boxBodyDef.set_position(new b2Vec2(0 / pixelsPerMeter, 50 / pixelsPerMeter));
    boxBodyDef.angle = 0 * Math.PI / 180;
    boxBodyDef.type = b2_dynamicBody;
    const boxBody = world.CreateBody(boxBodyDef);
    const boxShape = new b2PolygonShape();
    boxShape.SetAsBox(20 / 2 / pixelsPerMeter, 20 / 2 / pixelsPerMeter);
    const boxFixture = boxBody.CreateFixture(boxShape, 1);
    metaData[getPointer(boxFixture)] = {
        name: "box"
    };

    const contactListener = new ContactListener(metaData);
    world.SetContactListener(contactListener.instance);

    const rayCastCallback = new RayCastCallback(colorProgram, pixelsPerMeter, metaData);
    rayCastCallback.projViewMatrix = projViewMatrix;

    const point1 = new b2Vec2(20 / pixelsPerMeter, -15 / pixelsPerMeter);
    const point2 = new b2Vec2(0 / pixelsPerMeter, -15 / pixelsPerMeter);

    let currentTime, lastTime, dt;

    function render() {
        requestAnimationFrame(render);
        gl.clear(gl.COLOR_BUFFER_BIT);

        currentTime = Date.now();
        dt = (currentTime - lastTime) / 1000;
        lastTime = currentTime;

        world.Step(dt, 3, 2);

        world.RayCast(rayCastCallback.instance, point1, point2);
        rayCastCallback.drawLine(point1, point2, [1, 0, 0]);

        const boxPosition = boxBody.GetPosition();
        const boxRayEnd = new b2Vec2(boxPosition.x - 30 / pixelsPerMeter, boxPosition.y);
        world.RayCast(rayCastCallback.instance, boxPosition, boxRayEnd);
        rayCastCallback.drawLine(boxPosition, boxRayEnd, [1, 0, 0]);

        // Draw colliders
        world.DebugDraw();
    }

    lastTime = Date.now();
    render();
}

init();
