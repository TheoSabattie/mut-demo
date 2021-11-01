import { KeyboardEventName } from "./KeyboardEventName";

export class KeyboardController implements EventListenerObject {
    private _keysToIsDown:{[key:string]:boolean} = {};
    private _window:Window;

    public constructor(pWindow:Window){
        this._window = pWindow;
        pWindow.addEventListener(KeyboardEventName.KEY_DOWN, this);
        pWindow.addEventListener(KeyboardEventName.KEY_UP, this);
    }

    public handleEvent(pEvent:Event):void {
        let lKeyboardEvent:KeyboardEvent = <KeyboardEvent> pEvent;
        
        if (pEvent.type == KeyboardEventName.KEY_DOWN){
            this._keysToIsDown[lKeyboardEvent.code] = true;
        } else if (pEvent.type == KeyboardEventName.KEY_UP){
            this._keysToIsDown[lKeyboardEvent.code] = false;
        }
    }

    public isDown(pCode:string):boolean {
        return this._keysToIsDown[pCode];
    }

    public isUp(pCode:number):boolean {
        return this._keysToIsDown[pCode];
    }

    public destroy():void {
        this._window.removeEventListener(KeyboardEventName.KEY_DOWN, this);
        this._window.removeEventListener(KeyboardEventName.KEY_UP, this);
    }
}