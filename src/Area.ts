import { Container, Point, Graphics } from "pixi.js";
import { ORectTransform, EventTypes, UpdateService, OLineStyle, OVector2, Point as PointType } from "math-understanding-tools";
import { OFillStyle } from "math-understanding-tools/dist/mathunderstandingtools/graphics/OFillStyle";

export interface IArea {
    get parent():IArea|null;
    get container():Container;
    get rectTransform():ORectTransform;
}

export class RootArea implements IArea {
    private _container:Container; 
    private _rectTransform:ORectTransform = new ORectTransform();

    public constructor(pRootContainer:Container){
        this._container = pRootContainer;
        this._rectTransform.anchorMin.setTo(0,0);
        this._rectTransform.anchorMax.setTo(1,1);
        this._rectTransform.pivot.setTo(.5,.5);
    }

    public get container():Container {
        return this._container;
    }

    public get rectTransform():ORectTransform {
        return this._rectTransform;
    }

    public get parent():IArea|null {
        return null;
    }
}

export class Area implements IArea {
    private _rectTransform:ORectTransform = new ORectTransform();
    private _container:Container = new Container();
    private _parent:IArea;
    private _isListeningNextFrame:boolean = false;

	/**
	 * Constructor of a responsive Window
	 * @param pParent parent
	 */
    public constructor(pParent:IArea) {
        this.parent = pParent;
        this._rectTransform.addListener(EventTypes.CHANGE, this._onPropertyChange, this);
    }
    
    public get parent():IArea {
        return this._parent;
    }

    public set parent(pValue:IArea) {
        this._parent = pValue;
        this._parent.container.addChild(this._container);
        this._rectTransform.parent = pValue == null ? null : pValue.rectTransform;
        this._onPropertyChange();
    }

    /**
	 * The RectTransform representing the size of the window
	 * <p>Modification of the property or the RectTransform object will invoke automatically scheduleDraw method</p>
	 */
    public get rectTransform():ORectTransform {
        return this._rectTransform;
    }

    public get container():Container {
        return this._container;
    }

    protected _onPropertyChange():void {
        this.scheduleDraw();
    }

    public scheduleDraw():void {
        if (!this._isListeningNextFrame){
            this._isListeningNextFrame = true;
            UpdateService.add(this._nextFrame);
        }
    }
    
    private _nextFrame = ():void=> 
    {
        this._isListeningNextFrame = false;
        UpdateService.remove(this._nextFrame);
        this._draw();
    }

    protected _draw():void {
        let lRectTransform = this.rectTransform;
        let lRect = lRectTransform.rect;

        let lGlobalPosition = new Point(
            lRect.x + lRect.width  * lRectTransform.pivot.x,
            lRect.y + lRect.height * lRectTransform.pivot.y
        );
        
        let lLocalPositionFromParent = this._container.parent == null ? lGlobalPosition : this._container.parent.toLocal(lGlobalPosition);
        
        this._container.x = lLocalPositionFromParent.x,
        this._container.y = lLocalPositionFromParent.y;
    }
}

const DEFAULT_FILL_STYLE:OFillStyle = new OFillStyle();
const DEFAULT_LINE_STYLE:OLineStyle = <OLineStyle>new OLineStyle().setWidth(5).setColor(0xFFFFFF);

export class FilledArea extends Area {
    public static get defaultFillStyle():OFillStyle {
        return DEFAULT_FILL_STYLE;
    }
    
    public static get defaultLineStyle():OLineStyle {
        return DEFAULT_LINE_STYLE;
    }

    private _lineStyle:OLineStyle|null = null;
    private _fillStyle:OFillStyle|null = null;
    private _usedLineStyle:OLineStyle|null = null;
    private _usedFillStyle:OFillStyle|null = null;
    private _graphics:Graphics = new Graphics();

    public constructor(pParent:IArea){
        super(pParent);
        this.container.addChild(this._graphics);
    }

    public get defaultFillStyle():OFillStyle 
    {
        return FilledArea.defaultFillStyle;
    }
    
    public get defaultLineStyle():OLineStyle
    {
        return FilledArea.defaultLineStyle;
    }

    public get fillStyle():OFillStyle {
        if (this._fillStyle == null){
            this._fillStyle = this.defaultFillStyle.clone();
            this._setUsedFillStyle(this._fillStyle);
        }
        
        return this._fillStyle;
    }

    public set fillStyle(pValue:OFillStyle|null) {
        if (pValue == this.defaultFillStyle)
            pValue = null;
        
        this._fillStyle = pValue;
        this._setUsedFillStyle(pValue);
    }
    
    public get lineStyle():OLineStyle {
        if (this._lineStyle == null){
            this._lineStyle = this.defaultLineStyle.clone();
            this._setUsedLineStyle(this._lineStyle);
        }
        
        return this._lineStyle;
    }
    
    public set lineStyle(pValue:OLineStyle|null) {
        if (pValue == this.defaultLineStyle)
            pValue = null;
        
        this._lineStyle = pValue;
        this._setUsedLineStyle(pValue);
    }
    
    protected _getUsedFillStyle():OFillStyle {
        if (this._usedFillStyle == null){
            this._setUsedFillStyle((this._fillStyle != null) ? this._fillStyle : this.defaultFillStyle);
        }
        
        return <OFillStyle>this._usedFillStyle;
    }
    
    protected _setUsedFillStyle(pValue:OFillStyle|null):void {
        if (this._usedFillStyle != null){
            this._usedFillStyle.removeListener(EventTypes.CHANGE, this._onPropertyChanged, this);
        }
        
        pValue = (pValue == null) ? this.defaultFillStyle : pValue;
        this._usedFillStyle = pValue;
        this._usedFillStyle.addListener(EventTypes.CHANGE, this._onPropertyChanged, this);
    }
    
    protected _getUsedLineStyle():OLineStyle {
        if (this._usedLineStyle == null){
            this._setUsedLineStyle((this._lineStyle != null) ? this._lineStyle : this.defaultLineStyle);
        }
        
        return <OLineStyle>this._usedLineStyle;
    }
    
    protected _setUsedLineStyle(pValue:OLineStyle|null):void {
        if (this._usedLineStyle != null){
            this._usedLineStyle.removeListener(EventTypes.CHANGE, this._onPropertyChanged, this);
        }
        
        pValue = (pValue == null) ? this.defaultLineStyle : pValue;
        this._usedLineStyle = pValue;
        this._usedLineStyle.addListener(EventTypes.CHANGE, this._onPropertyChanged, this);
    }

    override _draw():void {
        let lRect = this.rectTransform.rect;
        let lTopLeft:PointType     = this.container.toLocal(lRect.min);
        let lBottomRight:PointType = this.container.toLocal(lRect.max);
        let lSize                  = OVector2.substract(lBottomRight, lTopLeft);
        
        this._graphics.clear();
        this._getUsedFillStyle().applyToGraphics(this._graphics);
        this._getUsedLineStyle().applyToGraphics(this._graphics);
        this._graphics.drawRect(lTopLeft.x, lTopLeft.y, lSize.x, lSize.y);
        this._graphics.endFill()
    }

    protected _onPropertyChanged(){
        this.scheduleDraw();
    }
}