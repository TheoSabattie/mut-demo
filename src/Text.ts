import { Text as PixiText } from "pixi.js";
import { IArea, Area } from "./Area";

export class Text extends Area {
    private _text:PixiText = new PixiText("text");

    public constructor(pParent:IArea){
        super(pParent);
        this.container.addChild(this._text);
        this._text.style.fill = 0x00FF00;
    }

    override _draw():void{
        super._draw();
        this._text.anchor.set(this.rectTransform.pivot.x, this.rectTransform.pivot.y);
    }
}