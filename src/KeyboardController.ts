import { IUpdatable, UpdateService } from "math-understanding-tools";
import { KeyboardEventName } from "./KeyboardEventName";

export class KeyboardController implements EventListenerObject, IUpdatable {
    private _keysToIsDown:{[key:string]:boolean} = {};
    private _keysToJustDown:{[key:string]:boolean} = {};
    private _keysToJustUp:{[key:string]:boolean} = {};
    private _window:Window;

    public constructor(pWindow:Window){
        this._window = pWindow;
        pWindow.addEventListener(KeyboardEventName.KEY_DOWN, this);
        pWindow.addEventListener(KeyboardEventName.KEY_UP, this);
    }

    public update(): void {
        for (let key in this._keysToJustDown)
            this._keysToJustDown[key] = false;

        for (let key in this._keysToJustUp)
            this._keysToJustUp[key] = false;
    }

    public handleEvent(pEvent:Event):void {
        let lKeyboardEvent:KeyboardEvent = <KeyboardEvent> pEvent;
        
        if (pEvent.type == KeyboardEventName.KEY_DOWN){
            if(!this._keysToIsDown[lKeyboardEvent.code])
                this._keysToJustDown[lKeyboardEvent.code] = true;

            this._keysToIsDown[lKeyboardEvent.code] = true;
        } else if (pEvent.type == KeyboardEventName.KEY_UP){
            if(this._keysToIsDown[lKeyboardEvent.code])
                this._keysToJustUp[lKeyboardEvent.code] = true;

            this._keysToIsDown[lKeyboardEvent.code] = false;
        }
    }

    public isDown(pCode:string):boolean {
        return this._keysToIsDown[pCode];
    }

    public isUp(pCode:string):boolean {
        return !this._keysToIsDown[pCode];
    }

    public isJustDown(pCode:string):boolean {
        return this._keysToJustDown[pCode];
    }

    public isJustUp(pCode:string):boolean {
        return this._keysToJustUp[pCode];
    }

    public destroy():void {
        this._window.removeEventListener(KeyboardEventName.KEY_DOWN, this);
        this._window.removeEventListener(KeyboardEventName.KEY_UP, this);
    }
}