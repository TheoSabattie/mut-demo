import { Application } from  "pixi.js";
import { EventTypes, Graphic, GraphicGrid, GraphicRectangle, GraphicVector, MathMapWindow, ORectTransform, OVector2, UpdateService } from  "math-understanding-tools";
import { Graphics } from "pixi.js";
import { KeyboardController } from "./KeyboardController";
import { gsap } from "gsap";
import { Button, FilledAreaButton } from "./Button";
import { Text } from "./Text";
import { RootArea, Area, FilledArea } from "./Area";

let options = {
    antialias:true,
    autoResize:true
};

const app    = new Application(options);
var keyboardController:KeyboardController = new KeyboardController(window);
var mathMapWindow:MathMapWindow = new MathMapWindow(app.stage, 50);
mathMapWindow.rectTransform.pivot.setTo(.5,.5);
mathMapWindow.rectTransform.anchorMin.setTo(0,0);
mathMapWindow.rectTransform.anchorMax.setTo(1,1);
var position:OVector2 = new OVector2(-3,-1);

var trail:Graphics = new Graphics();
mathMapWindow.map.objectsContainer.addChild(trail);

var platform:GraphicRectangle = mathMapWindow.map.addRectangle(new OVector2(-5, 0), 8, 2);
platform.lineStyle.color = 0x333333;
platform.originLineStyle.alpha = 0;
platform.fillStyle.color = 0x888888;
platform.fillStyle.alpha = 1;
mathMapWindow.map.grid.lineStyle.alpha = 0;

var rect = new Graphics();
mathMapWindow.map.objectsContainer.addChild(rect);
/*var button:Button = new Button(mathMapWindow.container);

button.lineStyle.setAlpha(0);
button.rectTransform.sizeDelta.setTo(200,40);
button.rectTransform.pivot.setTo(1,0);
button.rectTransform.anchorMin.setTo(1,0);
button.rectTransform.anchorMax.setTo(1,0);
button.rectTransform.anchoredPosition.setTo(-25, 25);
button.text.text = "";*/

let root:RootArea = new RootArea(app.stage);

let uiEl = new FilledArea(root);
uiEl.rectTransform.anchorMax.setTo(.5,1);
uiEl.fillStyle.color = 0xFF0FF00

let button = new FilledAreaButton(uiEl);
button.interactable = false;

/*
let wind = new Window(root);
wind.rectTransform.anchorMax.setTo(.5,1);
*/
let text:Text = new Text(uiEl);
console.log(root.rectTransform.rect);
text.rectTransform.anchorMin.setTo(.5,.5);
text.rectTransform.anchorMax.setTo(.5,.5);
text.rectTransform.pivot.setTo(.5,.5);

rect.position.set(position.x*50, position.y*50);
rect.beginFill(0xFF0000);
rect.drawRect(-50, -100, 100, 100);
position.addListener(EventTypes.CHANGE, ()=>{
    rect.x = position.x * 50;
    rect.y = position.y * 50;
});

mathMapWindow.map.addVector(new OVector2(), position);

document.addEventListener("DOMContentLoaded", init);
window.addEventListener("resize", resize);

function init(_:Event):void {
    app.ticker.add((_)=>{
        UpdateService.update(app.ticker.deltaMS/1000);
    });
    document.body.appendChild(app.view);
    resize();
}

UpdateService.add(gameloop);
var particles:Array<OVector2> = [];

const CELL_SIZE:number = 50;
const TRAIL_SIZE:number = 60;

for (var i:number = 0; i < TRAIL_SIZE; i++){
    particles.push(position.clone());
}

trail.beginFill(0xFFFFFF);
trail.lineStyle({
    color:0xFFFFFF,
    alpha:1,
    width:4
})

function gameloop():void {
    if (keyboardController.isDown("Space")){
        jump();
    }

    particles.shift();
    particles.push(position.clone());

    trail.clear();
    trail.moveTo(particles[0].x * CELL_SIZE, particles[0].y * CELL_SIZE);

    for (var i:number = 1; i < TRAIL_SIZE; i++){
        trail.beginFill(0xBBBBBB, i/TRAIL_SIZE);
        trail.lineTo(particles[i].x * CELL_SIZE - i/TRAIL_SIZE * 30, particles[i].y * CELL_SIZE);
        trail.lineTo(particles[i].x * CELL_SIZE + i/TRAIL_SIZE * 30, particles[i].y * CELL_SIZE);
        trail.lineTo(particles[i-1].x * CELL_SIZE + (i-1)/TRAIL_SIZE * 30, particles[i-1].y * CELL_SIZE);
        trail.lineTo(particles[i-1].x * CELL_SIZE - (i-1)/TRAIL_SIZE * 30, particles[i-1].y * CELL_SIZE);
        trail.moveTo(particles[i].x * CELL_SIZE - i/TRAIL_SIZE * 30, particles[i].y * CELL_SIZE);
    }

    trail.closePath();
    trail.endFill();
}

let isJumping = false;

function jump(){
    if (isJumping)
        return;

    isJumping = true;
    // TODO : juming movement

    let timeline:gsap.core.Timeline = gsap.timeline();
    // teleport
    // timeline.set(position, {y:-5});
    // timeline.set(position, {y:-1, delay:1, onComplete:()=>{isJumping = false}});

    // linear
    // timeline.to(position, {y:-5, duration:0.5, ease:"none"});
    // timeline.to(position, {y:-1, duration:0.5, ease:"none", onComplete:()=>{isJumping = false}});
    
    // sympa
    // timeline.to(position, {y:-5, duration:.5, ease:"sine.out"});
    // timeline.to(position, {y:-1, duration:.5, ease:"sine.in", onComplete:()=>{isJumping = false}});

    // décollage
    timeline.to(rect.scale, {x:2, y:0.5, duration:.15});
    timeline.to(rect.scale, {x:.75, y:1.75, duration:.15});
    timeline.to(position, {y:-5, duration:.5, ease:"sine.out", delay:"-0.15"});
    timeline.to(rect.scale, {y:1, x:1, duration:.3, delay:"-0.3"});
    timeline.to(position, {y:-1, duration:.5, ease:"sine.in", delay:"-0.1"});
    timeline.to(rect.scale, {x:.75, y:1.75, duration:.3, delay:"-0.3"});
    timeline.to(rect.scale, {x:1.5, y:.75, duration:.1, ease:"sin.out"});
    timeline.to(rect.scale, {x:1, y:1, duration:.1, ease:"sin.in", onComplete:()=>{isJumping = false;}});
}

function resize(_?:Event):void {
    app.renderer.resize(window.innerWidth, window.innerHeight);
    ORectTransform.rootRectangle.setSize(window.innerWidth, window.innerHeight);
}