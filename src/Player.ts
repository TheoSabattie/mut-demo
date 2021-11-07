import { Graphics } from "@pixi/graphics";
import { IPointData } from "@pixi/math";
import { IUpdatable, MathTools, OVector2, UpdateService } from "math-understanding-tools";
import { KeyboardController } from "./KeyboardController";

const TELEPORT_DURATION:number = .75;
const JUMP_FORCE:number = 190;
const JUMP_LINEAR_UP_DURATION:number = 0.5;
const JUMP_LINEAR_DOWN_DURATION:number = 0.5;
const JUMP_GRAVITY_IMPULSE:number = -750;
const SQUASH_JUMP_DOWN = {x:2, y:0.5};
const SQUASH_JUMP_UP = {x:.75, y:1.75};
const SQUASH_JUMP_RECEIPT = {x:1.5, y:.75};
const SQUASH_JUMP_DOWN_SPEED:number = 10;
const SQUASH_JUMP_UP_SPEED:number = 8;
const SQUASH_JUMP_RECEIPT_SPEED:number = 8;

const GRAVITY:number = 1500;
const TRAIL_SIZE:number = 60;
const TRAIL_WIDTH:number = 30;

export enum PlayerMode {
    TELEPORT = 0,
    JUMP_LINEAR = 1,
    JUMP_GRAVITY = 2,
    JUMP_GRAVITY_SQUASH = 3,
    JUMP_GRAVITY_SQUASH_FX = 4
}

function inverseLerp(pValue:number, pA:number, pB:number):number{
    return (pValue - pA) / (pB - pA);
}

function remap(pValue:number, pFromA:number, pFromB:number, pToA:number, pToB:number){
    return MathTools.lerp(pToA, pToB, inverseLerp(pValue, pFromA, pFromB));
}

export class Player extends Graphics implements IUpdatable {
    private _keyboardController:KeyboardController;
    private _doAction:Function;
    private _mode:PlayerMode = PlayerMode.JUMP_GRAVITY_SQUASH_FX;
    private _toY:number = 0;
    private _fromY:number = 0;
    private _yVelocity:number = 0;
    private _particles:Array<IPointData> = [];
    private _trail:Graphics = new Graphics();

    public constructor(pKeyboardController:KeyboardController){
        super();
        this.beginFill(0xFF0000);
        this.drawRect(-50, -100, 100, 100);
        this.endFill();
        this._keyboardController = pKeyboardController;
        this._setModeNormal();
        this.on("added", this._onAdded);
    }

    public get mode():PlayerMode {
        return this._mode;
    }

    public set mode(pMode:PlayerMode) {
        if (pMode != PlayerMode.JUMP_GRAVITY_SQUASH_FX)
            this._trail.clear();
        else {
            this._resetParticlesPositions();
        }

        this._mode = pMode;
    }

    public start():void {
        UpdateService.add(this);
    }

    private _onAdded(pEvent:Event):void {
        this.parent.addChildAt(this._trail, this.parent.getChildIndex(this));
        this._resetParticlesPositions();
    }

    private _resetParticlesPositions():void {
        if (this._particles.length > 0){
            this._particles = [];
        }

        for (var i:number = 0; i < TRAIL_SIZE; i++)
            this._particles.push(this.position.clone());
    }

    private _doActionNormal():void {
        if (this._mode == PlayerMode.JUMP_GRAVITY_SQUASH || this._mode == PlayerMode.JUMP_GRAVITY_SQUASH_FX){
            let lScale = OVector2.moveTowards(this.scale, new OVector2(1,1), UpdateService.deltaTime*SQUASH_JUMP_RECEIPT_SPEED);
            this.scale.set(lScale.x, lScale.y);
        }

        if (this._keyboardController.isJustDown("Space")){
            this._setModeJumpDown();
        }
    }

    private _setModeJumpDown():void  {
        this._resetElapsedTime();
        this._doAction = this._doActionJumpDown;
    }

    private _setModeJump():void {
        this._yVelocity = JUMP_GRAVITY_IMPULSE;
        this._fromY = this.y;
        this._toY = this.y - JUMP_FORCE;
        this._resetElapsedTime();
        this._doAction = this._doActionJump;
    }

    private _setModeReceipt():void {
        this._resetElapsedTime();
        this._doAction = this._doActionReceipt;
    }

    private _setModeNormal():void {
        this._doAction = this._doActionNormal;
    }

    private _setModeFall():void {
        this._resetElapsedTime();
        this._doAction = this._doActionFall;
    }

    private _elapsedTime:number;

    private _resetElapsedTime():void{
        this._elapsedTime = 0;
    }

    private _updateElapsedTime():void {
        this._elapsedTime += UpdateService.deltaTime;
    }

    private _reachTime(pTime:number):boolean {
        return this._elapsedTime >= pTime;
    }

    private _ratioTime(pTime:number):number {
        return this._elapsedTime / pTime;
    }

    private _doActionJumpDown():void {
        if (this._mode == PlayerMode.JUMP_GRAVITY_SQUASH || this._mode == PlayerMode.JUMP_GRAVITY_SQUASH_FX){
            let lScale = OVector2.moveTowards(this.scale, SQUASH_JUMP_DOWN, UpdateService.deltaTime*SQUASH_JUMP_DOWN_SPEED);
            this.scale.set(lScale.x, lScale.y);
        }

        if (this._keyboardController.isJustUp("Space")){
            this._setModeJump();
        }
    }

    private _doActionJump():void {
        if (this._mode == PlayerMode.TELEPORT || this._mode == PlayerMode.JUMP_LINEAR){
            let lDuration:number = 0;
            
            if (this._mode == PlayerMode.TELEPORT){
                this.y = this._toY;
                lDuration = TELEPORT_DURATION;
            } else if (this._mode == PlayerMode.JUMP_LINEAR){
                lDuration = JUMP_LINEAR_UP_DURATION;
                this.y = MathTools.lerp(this._fromY, this._toY, this._ratioTime(JUMP_LINEAR_UP_DURATION));
            }

            if (this._reachTime(lDuration)){
                this._setModeFall();
                return;
            }
        } else {
            if (this._mode == PlayerMode.JUMP_GRAVITY_SQUASH || this._mode == PlayerMode.JUMP_GRAVITY_SQUASH_FX){
                let lTargetedScale:OVector2 = OVector2.lerp(SQUASH_JUMP_UP, new OVector2(1,1), inverseLerp(this._yVelocity, JUMP_GRAVITY_IMPULSE, 0));
                let lScale = OVector2.moveTowards(this.scale, lTargetedScale, UpdateService.deltaTime*SQUASH_JUMP_UP_SPEED);
                this.scale.set(lScale.x, lScale.y);
            }
            
            this.y += this._yVelocity * UpdateService.deltaTime;
            this._yVelocity += GRAVITY * UpdateService.deltaTime;

            if (this._yVelocity >= 0){
                this._setModeFall();
                return;
            }
        }

        this._updateElapsedTime();
    }

    private _doActionFall():void {
        if (this._mode == PlayerMode.TELEPORT || this._mode == PlayerMode.JUMP_LINEAR){
            let lDuration:number = 0;

            if (this._mode == PlayerMode.TELEPORT){
                this.y = this._fromY;
            } else if (this._mode == PlayerMode.JUMP_LINEAR){
                lDuration = JUMP_LINEAR_DOWN_DURATION;
                this.y = MathTools.lerp(this._toY, this._fromY, this._ratioTime(lDuration));
            }

            if (this._reachTime(lDuration)){
                this._setModeReceipt();
                return;
            }
        } else {
            if (this._mode == PlayerMode.JUMP_GRAVITY_SQUASH || this._mode == PlayerMode.JUMP_GRAVITY_SQUASH_FX){
                let lTargetedScale:OVector2 = OVector2.lerp(SQUASH_JUMP_UP, new OVector2(1,1), inverseLerp(Math.abs(this._yVelocity), -JUMP_GRAVITY_IMPULSE, 50));
                let lScale = OVector2.moveTowards(this.scale, lTargetedScale, UpdateService.deltaTime*SQUASH_JUMP_UP_SPEED);
                this.scale.set(lScale.x, lScale.y);
            }

            this.y += this._yVelocity * UpdateService.deltaTime;
            this._yVelocity += GRAVITY * UpdateService.deltaTime;

            if (this.y >= this._fromY){
                this.y = this._fromY;
                this._setModeReceipt();
                return;
            }
        }

        this._updateElapsedTime();
    }

    private _doActionReceipt():void {
        if (this._mode == PlayerMode.JUMP_GRAVITY_SQUASH || this._mode == PlayerMode.JUMP_GRAVITY_SQUASH_FX){
            let lScale = OVector2.moveTowards(this.scale, SQUASH_JUMP_RECEIPT, UpdateService.deltaTime*SQUASH_JUMP_RECEIPT_SPEED);
            this.scale.set(lScale.x, lScale.y);

            if (this.scale.x == SQUASH_JUMP_RECEIPT.x && this.scale.y == SQUASH_JUMP_RECEIPT.y)
                this._setModeNormal();
        } else {
            let lDuration:number = 0;

            if (this._reachTime(lDuration)){
                this._setModeNormal();
                return;
            }
    
            this._updateElapsedTime();
        }
    }

    public update():void {
        this._doAction();

        let lParticles = this._particles;
        lParticles.shift();
        lParticles.push(this.position.clone());
    
        if (this._mode == PlayerMode.JUMP_GRAVITY_SQUASH_FX){
            let lTrail = this._trail;
            lTrail.clear();
            lTrail.beginFill(0xFFFFFF);
            lTrail.moveTo(lParticles[0].x + TRAIL_WIDTH, lParticles[0].y);

            for (var i:number = 1; i < TRAIL_SIZE; i++){
                lTrail.beginFill(0xBBBBBB, i/TRAIL_SIZE);
                lTrail.lineTo(lParticles[i].x + TRAIL_WIDTH * i/TRAIL_SIZE, lParticles[i].y);
                lTrail.lineTo(lParticles[i].x - TRAIL_WIDTH * i/TRAIL_SIZE, lParticles[i].y);
                lTrail.lineTo(lParticles[i-1].x - TRAIL_WIDTH * (i-1)/TRAIL_SIZE, lParticles[i-1].y);
                lTrail.lineTo(lParticles[i-1].x + TRAIL_WIDTH * (i-1)/TRAIL_SIZE, lParticles[i-1].y);
                lTrail.moveTo(lParticles[i].x + TRAIL_WIDTH * i/TRAIL_SIZE, lParticles[i].y);
            }
        
            lTrail.closePath();
            lTrail.endFill();
        }
    }
}