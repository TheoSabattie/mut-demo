import { Application } from  "pixi.js";
import { EventTypes, Graphic, GraphicGrid, GraphicRectangle, GraphicVector, MathMapWindow, MathTools, ORectTransform, OVector2, UpdateService } from  "math-understanding-tools";
import { Graphics } from "pixi.js";
import { sound, filters } from "@pixi/sound";
import { KeyboardController } from "./KeyboardController";
import { gsap } from "gsap";
import { Button, FilledAreaButton } from "./Button";
import { Text } from "./Text";
import { RootArea, Area, FilledArea } from "./Area";
import { Player, PlayerMode } from "./Player";

let options = {
    antialias:true,
    autoResize:true
};

const SOUNDS = [
    sound.add("pop0", "pop.ogg"),
    sound.add("pop1", "pop2.wav"),
    sound.add("pop2", "pop3.wav")
];

let soundSet = SOUNDS.slice();

const app    = new Application(options);
var keyboardController:KeyboardController = new KeyboardController(window);
var mathMapWindow:MathMapWindow = new MathMapWindow(app.stage, 50);
mathMapWindow.rectTransform.pivot.setTo(.5,.5);
mathMapWindow.rectTransform.anchorMin.setTo(0,0);
mathMapWindow.rectTransform.anchorMax.setTo(1,1);

UpdateService.add(gameloop);

function gameloop():void {
    if (keyboardController.isJustDown("ArrowRight")){
        player.mode = (player.mode + 1) %5;
        gsap.from(mathMapWindow.fillStyle, {onUpdate:function(){
            mathMapWindow.fillStyle.color = MathTools.lerpColor(0xFFFFFF, 0, this.progress());
        }});
    } else if (keyboardController.isJustDown("ArrowLeft")){
        player.mode = ((player.mode - 1)+5)%5;
        gsap.from(mathMapWindow.fillStyle, {onUpdate:function(){
            mathMapWindow.fillStyle.color = MathTools.lerpColor(0xFFFFFF, 0, this.progress());
        }});
    }
}



let player = new Player(keyboardController);
player.x = -150;
player.y = -50;

player.mode = PlayerMode.TELEPORT;

var position:OVector2 = new OVector2(-3,-1);

var trail:Graphics = new Graphics();
mathMapWindow.map.objectsContainer.addChild(trail);

var platform:GraphicRectangle = mathMapWindow.map.addRectangle(new OVector2(-5, 0), 8, 2);
platform.lineStyle.color = 0x333333;
platform.originLineStyle.alpha = 0;
platform.fillStyle.color = 0x888888;
platform.fillStyle.alpha = 1;
mathMapWindow.map.grid.lineStyle.alpha = 0;

mathMapWindow.map.objectsContainer.addChild(player);
/*var button:Button = new Button(mathMapWindow.container);

button.lineStyle.setAlpha(0);
button.rectTransform.sizeDelta.setTo(200,40);
button.rectTransform.pivot.setTo(1,0);
button.rectTransform.anchorMin.setTo(1,0);
button.rectTransform.anchorMax.setTo(1,0);
button.rectTransform.anchoredPosition.setTo(-25, 25);
button.text.text = "";*/

let root:RootArea = new RootArea(app.stage);
/*
let uiEl = new FilledArea(root);
uiEl.rectTransform.anchorMax.setTo(.5,1);
uiEl.fillStyle.color = 0xFF0FF00

let button = new FilledAreaButton(uiEl);
button.interactable = false;

let text:Text = new Text(uiEl);
console.log(root.rectTransform.rect);
text.rectTransform.anchorMin.setTo(.5,.5);
text.rectTransform.anchorMax.setTo(.5,.5);
text.rectTransform.pivot.setTo(.5,.5);
*/

var positionVector:GraphicVector = mathMapWindow.map.addVector(new OVector2(), position.clone());

document.addEventListener("DOMContentLoaded", init);
window.addEventListener("resize", resize);

function init(_:Event):void {
    app.ticker.add((_)=>{
        UpdateService.update(app.ticker.deltaMS/1000);
    });
    document.body.appendChild(app.view);
    appear(getClickPromise());
    resize();
}

function getClickPromise():Promise<void> {
    return new Promise<void>(result => {
        function click(pEvent:MouseEvent):void {
            window.removeEventListener("click", click);
            result();
        }

        window.addEventListener("click", click);
    });
}

function playPopSound(){
    if (soundSet.length == 0)
        soundSet = SOUNDS.slice();

    let lRandomIndex:number = Math.floor(Math.random() * soundSet.length);
    let lRandomSound = soundSet[lRandomIndex];
    soundSet.splice(lRandomIndex, 1);
    lRandomSound.play();
}

async function appear(pPromise:Promise<void>){
    let timeline:gsap.core.Timeline = gsap.timeline();
    timeline.call(playPopSound);
    timeline.from(mathMapWindow.map.originCircle, {radius:0, ease:"back.out(5)", onComplete:playPopSound});
    timeline.from([mathMapWindow.map.xAxis, mathMapWindow.map.yAxis], {magnitude:0.000001, ease:"back.out(2)", onComplete:playPopSound});
    timeline.from(platform, {height:0, width:0, ease:"back.out(2)", onComplete:playPopSound});
    timeline.from(player, {height:0, width:0, ease:"back.out(2)", onComplete:playPopSound});
    timeline.from(positionVector, {magnitude:0.000001, onComplete:function(){
        positionVector.to = position;
        player.start();
        UpdateService.add(keyboardController);

        let lCB = player.position.cb.bind(player.transform); 
        player.position.cb = function(){
            position.setTo(player.position.x / 50, player.position.y / 50);
            (<any>positionVector)._draw();
            lCB();
        };
    }});
    timeline.pause();
    await pPromise;
    timeline.play();
}

function resize(_?:Event):void {
    app.renderer.resize(window.innerWidth, window.innerHeight);
    ORectTransform.rootRectangle.setSize(window.innerWidth, window.innerHeight);
}