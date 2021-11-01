import EventEmitter from "eventEmitter3";
import { IUpdatable, MathTools, OLineStyle, ORectangle, ORectTransform, UpdateService } from "math-understanding-tools";
import { OFillStyle } from "math-understanding-tools/dist/mathunderstandingtools/graphics/OFillStyle";
import { Graphics, Point, Rectangle, Text } from "pixi.js";
import { IArea, FilledArea } from "./Area";

enum ButtonState {
    IDLE = "idle",
    OVER = "over",
    DOWN = "down",
    LOCK = "lock"
}

const DEFAULT_DOWN_STYLE:OFillStyle = new OFillStyle().setColor(0xCCCCCC).setAlpha(1);
const DEFAULT_LOCK_STYLE:OFillStyle = new OFillStyle().setColor(0x777777).setAlpha(1);
const DEFAULT_OVER_STYLE:OFillStyle = new OFillStyle().setColor(0xFFFFFF).setAlpha(1);
const DEFAULT_IDLE_STYLE:OFillStyle = new OFillStyle().setColor(0xEEEEEE).setAlpha(1);

type ButtonTransitions = {
    idleTransition:ITransition;
    overTransition:ITransition;
    downTransition:ITransition;
    lockTransition:ITransition;
    clickNormalTransition:ITransition;
    clickLockTransition:ITransition;
}

type FilledAreaTransitions = {
    idleTransition:FilledAreaTransition;
    overTransition:FilledAreaTransition;
    downTransition:FilledAreaTransition;
    lockTransition:FilledAreaTransition;
    clickNormalTransition:FilledAreaTransition;
    clickLockTransition:FilledAreaTransition;
}

interface ITransition {
    start():Promise<void>;
    applyEndState():void;
    stop():void;
}

const lerpColor = function(pFrom:number, pTo:number, pRatio:number) {
    const ar = (pFrom & 0xFF0000) >> 16,
          ag = (pFrom & 0x00FF00) >> 8,
          ab = (pFrom & 0x0000FF),

          br = (pTo & 0xFF0000) >> 16,
          bg = (pTo & 0x00FF00) >> 8,
          bb = (pTo & 0x0000FF),

          rr = ar + pRatio * (br - ar),
          rg = ag + pRatio * (bg - ag),
          rb = ab + pRatio * (bb - ab);

    return (rr << 16) + (rg << 8) + (rb | 0);
};

class FilledAreaTransition implements ITransition, IUpdatable {
    private _target:FilledArea;
    private _fillStyle:OFillStyle;
    private _lineStyle:OLineStyle;
    private _from:{fillStyle:OFillStyle, lineStyle:OLineStyle};
    private _elapsedTime:number = 0;
    private _duration:number = .1;
    private _isRunning:boolean = false;

    public constructor(pTarget:FilledArea, pFillStyle:OFillStyle, pLineStyle:OLineStyle){
        this._target = pTarget; 
        this._fillStyle = pFillStyle;
        this._lineStyle = pLineStyle;
    }

    public get fillStyle():OFillStyle {
        return this._fillStyle;
    }

    public get lineStyle():OLineStyle {
        return this._lineStyle;
    }

    public update():void {
        this._elapsedTime += UpdateService.deltaTime;
        let lRatio:number = MathTools.clamp(this._elapsedTime / this._duration, 0, 1);
        this._interpolate(lRatio);

        if (lRatio == 1){
            if (this._resolve)
                this._resolve();

            this._promise = null;
            this._reject = null;
            this._resolve = null;
            this.stop();
        }
    }

    protected _interpolate(pRatio:number):void {
        let lFromFillStyle:OFillStyle = this._from.fillStyle;
        let lFromLineStyle:OLineStyle = this._from.lineStyle;

        this._target.lineStyle.color      = lerpColor(lFromLineStyle.color, this.lineStyle.color, pRatio);
        this._target.lineStyle.alpha      = MathTools.lerp(lFromLineStyle.alpha, this.lineStyle.alpha, pRatio);
        this._target.lineStyle.alignement = MathTools.lerp(lFromLineStyle.alignement, this.lineStyle.alignement, pRatio);
        this._target.lineStyle.miterLimit = MathTools.lerp(lFromLineStyle.miterLimit, this.lineStyle.miterLimit, pRatio);
        this._target.fillStyle.color      = lerpColor(lFromFillStyle.color, this.fillStyle.color, pRatio);
        this._target.fillStyle.alpha      = MathTools.lerp(lFromFillStyle.alpha, this.fillStyle.alpha, pRatio);
    }

    private _promise:Promise<void>|null;

    public start():Promise<void> {
        if (this._promise)
            return this._promise;
        
        this._isRunning = true;
        this._from = {
            fillStyle:this._target.fillStyle.clone(),
            lineStyle:this._target.lineStyle.clone()
        };

        this._target.lineStyle
            .setCap(<any>this._lineStyle.cap)
            .setNative(this.lineStyle.native)
            .setJoin(<any>this.lineStyle.join);

        this._elapsedTime = 0;
        UpdateService.add(this);
        let lThat = this;

        return this._promise = new Promise<void>((resolve, reject)=>{
            lThat._resolve = resolve;
            lThat._reject = reject;
        });
    }

    private _resolve:null|(()=>void);
    private _reject:null|((pReason?:any)=>void);

    public applyEndState(): void {
        this._target.fillStyle.setAlpha(this._fillStyle.alpha).setColor(this._fillStyle.color);
        Object.assign(this._target.lineStyle, this._lineStyle);
    }

    public stop(): void {
        if (this._reject){
            this._reject(new Error("transition has been stopped"));
        }
        
        this._isRunning = false;
        this._promise = null;
        UpdateService.remove(this);
    }
}

export abstract class Button {
    private _transitions:ButtonTransitions;

    private _target:EventEmitter;
    private _downOnMe:boolean = false;
    private _state:ButtonState = ButtonState.IDLE;
    private _currentTransition:ITransition;
    private _interactable:boolean = true;
    private _isPlayingClickFeedback:boolean = false;

    public constructor(pTarget:EventEmitter, pTransitions:ButtonTransitions){
        this._target = pTarget;
        this._transitions = pTransitions;
        this._currentTransition = this._transitions.idleTransition;
        this._currentTransition.applyEndState();

        pTarget.addListener("mouseover", this._onMouseOver);
        pTarget.addListener("mouseout", this._onMouseOut);
        pTarget.addListener("mousedown", this._onMouseDown);
        pTarget.addListener("mouseupoutside", this._onMouseUpOutside);
        pTarget.addListener("mouseup", this._onMouseUp);
        pTarget.addListener("click", this._onClick);
    }

    public get interactable():boolean {
        return this._interactable;
    }

    public set interactable(pValue:boolean){
        if (this._interactable == pValue)
            return;
        
        this._interactable = pValue;
        this._updateView();
    }

    private _onClick = async (pEvent:MouseEvent):Promise<void> => {
        this._currentTransition.stop();
        this._isPlayingClickFeedback = true;
        this._currentTransition = this._interactable ? this._transitions.clickNormalTransition : this._transitions.clickLockTransition;

        try {   
            await this._currentTransition.start();
            this._isPlayingClickFeedback = false;
            this._updateView();
        } catch(_){}
    }

    private _onMouseOver = (pEvent:MouseEvent):void => {
        if (this._downOnMe){
            this._state = ButtonState.DOWN;
        } else {
            this._state = ButtonState.OVER;
        }

        this._updateView();
    }

    private _onMouseOut = (pEvent:MouseEvent):void => {
        this._state = ButtonState.IDLE;
        this._updateView();
    }

    private _onMouseDown = (pEvent:MouseEvent):void => {
        if (this._isPlayingClickFeedback)
            return;

        this._downOnMe = true;
        this._state = ButtonState.DOWN;
        this._updateView();
    }

    private _onMouseUpOutside = (pEvent:MouseEvent):void => {
        this._downOnMe = false;
    }

    private _onMouseUp = (pEvent:MouseEvent):void => {
        this._downOnMe = false;
        this._state = ButtonState.OVER;
        this._updateView();
    }

    public get state():ButtonState{
        if (!this._interactable)
            return ButtonState.LOCK;

        return this._state;
    }

    public set state(pState:ButtonState){
        if (pState == this._state)
            return;
        
        this._state = pState;
        this._updateView();
    }

    private async _updateView():Promise<void> {
        if (this._isPlayingClickFeedback)
            return;

        let lNewTransition:ITransition;

        switch(this.state){
            case ButtonState.LOCK:
                lNewTransition = this._transitions.lockTransition;
            case ButtonState.DOWN:
                lNewTransition = this._transitions.downTransition;
                break;
            case ButtonState.OVER:
                lNewTransition = this._transitions.overTransition;
                break;
            case ButtonState.IDLE:
            default:
                lNewTransition = this._transitions.idleTransition; 
                break;
        }
        
        if (this._currentTransition == lNewTransition)
            return;

        this._currentTransition.stop();
        this._currentTransition = lNewTransition;

        try {
            await this._currentTransition.start();
        } catch(_){}
    }
}

export class FilledAreaButton extends Button {
    private _targetedFillArea:FilledArea;
    private _filledAreaTransitions:FilledAreaTransitions;

    public constructor(pFilledArea:FilledArea){
        let lFillStyle:OFillStyle = pFilledArea.fillStyle;
        let lLineStyle:OLineStyle = pFilledArea.lineStyle;

        let lFilledAreaTransitions:FilledAreaTransitions = {
            idleTransition        : new FilledAreaTransition(pFilledArea, lFillStyle.clone(), lLineStyle.clone()),
            downTransition        : new FilledAreaTransition(pFilledArea, lFillStyle.clone().setColor(lerpColor(lFillStyle.color, 0x000000, .2)), <OLineStyle>lLineStyle.clone().setColor(lerpColor(lLineStyle.color, 0, .2))), 
            lockTransition        : new FilledAreaTransition(pFilledArea, lFillStyle.clone().setColor(lerpColor(lFillStyle.color, 0x000000, .5)), <OLineStyle>lLineStyle.clone().setColor(lerpColor(lLineStyle.color, 0, .5))),
            overTransition        : new FilledAreaTransition(pFilledArea, lFillStyle.clone().setColor(lerpColor(lFillStyle.color, 0xFFFFFF, .2)), <OLineStyle>lLineStyle.clone().setColor(lerpColor(lLineStyle.color, 0xFFFFFF, .2))),
            clickLockTransition   : new FilledAreaTransition(pFilledArea, lFillStyle.clone().setColor(lerpColor(lFillStyle.color, 0xFF0000, .5)), <OLineStyle>lLineStyle.clone().setColor(lerpColor(lLineStyle.color, 0xFF0000, .5))),
            clickNormalTransition : new FilledAreaTransition(pFilledArea, lFillStyle.clone().setColor(lerpColor(lFillStyle.color, 0x00FF00, .5)), <OLineStyle>lLineStyle.clone().setColor(lerpColor(lLineStyle.color, 0x00FF00, .5))),
        };

        pFilledArea.container.interactive = true;
        pFilledArea.container.buttonMode = true;

        super(pFilledArea.container, lFilledAreaTransitions);
        
        this._filledAreaTransitions = lFilledAreaTransitions;
        this._targetedFillArea = pFilledArea;
    }
}