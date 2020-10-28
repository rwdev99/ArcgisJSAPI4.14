import { DrawTool } from './base';

export class DrawPolygon extends DrawTool {

    protected _symbol:__draw.symbolOption = {
        type: "simple-fill",
        color: [ 0,0, 255, 0.2 ],
        outline: {
            color: [5, 5, 100, 0.95],
            width: 1.2
        }
    }
    protected _buffer_symbol:__draw.symbolOption = {
        type: "simple-fill",
        color: [ 0,0, 255, 0.2 ],
        outline: {
            style:"dash-dot",
            color: [5, 5, 100, 0.95],
            width: 1
        }
    }

    private _warning_buffer:__draw.symbolOption = {
        type: "simple-fill",
        color: [ 255,0, 0, 0.2 ],
        outline: {
            style:"dash-dot",
            color: [255, 0, 0, 0.8],
            width: 1
        }
    }
    private _drawing_buffer_with_fill:__draw.symbolOption = {
        type: "simple-fill",
        color: [ 0,0, 0, 0.1 ],
        outline: {
            color: [5, 5, 100, 0.95],
            width: 1.2
        }
    }
    private _drawing_buffer_without_fill:__draw.symbolOption = {
        type: "simple-line", 
        color: [4, 90, 141],
        width: 1,
        cap: "round",
        join: "round"
    }
    
    private isCross:boolean = false

    async addTempToGlry(polygon:__esri.Polygon){
        //- 逆時針點位需要反轉；否則無法顯示填充顏色
        if(!polygon.isClockwise(polygon.rings[0])){
            polygon.rings[0].reverse()
        }
        //- 如果在 環 還不能構成面的狀態下就使用 linesymbol 會報錯
        let symbol = polygon.rings[0].length>=3?this._drawing_buffer_with_fill:this._drawing_buffer_without_fill

        if(this.isCross){symbol=this._warning_buffer}

        this.Glyr.add(new this.Graphic({
            geometry:polygon,
            symbol: symbol
        }))
    }

    async addToGlry(polygon:__esri.Polygon,checkBuffer:boolean){
        //- 逆時針點位需要反轉；否則無法顯示填充顏色
        if(!polygon.isClockwise(polygon.rings[0])){
          polygon.rings[0].reverse()
        }
        let symbol:any = {}
        symbol = checkBuffer && this.buffer>0?this._buffer_symbol:this._symbol

        this.Glyr.add(new this.Graphic({
            geometry:checkBuffer&&this.buffer>0?await this.buffGeometry(polygon,this.buffer):polygon,
            symbol:symbol
        }))
    }
    
    handleTipTextByEvt(evt:__esri.PolygonDrawActionVertexAddEvent|__esri.PolygonDrawActionCursorUpdateEvent){
        switch(evt.vertexIndex){
            case 0:
                this.TipText.setText("單擊左鍵繪製多邊形，雙擊左鍵完成")
                break
            case 1:
                this.TipText.setText("請繼續單擊左鍵")
                break
            default:
                this.TipText.setText("繼續單擊左鍵繪製，或雙擊左鍵完成")
        }
        if(this.isCross){
            this.TipText.setText("請移動滑鼠，當前位置不允許設置點，會使圖形破碎","warning")
        }
    }

    async perform(){
        

        this.Action = this.Draw.create("polygon",{mode:"click"})

        this.Action.on('vertex-add',async (evt:__esri.PolygonDrawActionVertexAddEvent)=>{
            let polygon = await this.createPolygonByEvt(evt)
            this.clearGraphics()
            this.handleTipTextByEvt(evt)
            await this.addTempToGlry(polygon)
        })
        this.Action.on("cursor-update",async (evt:__esri.PolygonDrawActionCursorUpdateEvent)=>{
            let polygon = await this.createPolygonByEvt(evt)
            
            this.TipText.setPosition(evt)
            this.handleTipTextByEvt(evt)

            this.clearGraphics()
            await this.addTempToGlry(polygon)
        })

        await new Promise(resolve=>{
            this.Action.on('draw-complete',async (evt:__esri.PolygonDrawActionDrawCompleteEvent)=>{
                let polygon = await this.createPolygonByEvt(evt)
                this.clearGraphics()
                await this.addToGlry(polygon,false)
                await this.addToGlry(polygon,true)

                this.Draw.reset()
                this.TipText.destroy()
                resolve() //- 僅完成Promise後續動作由建構該實例的父類決定
            })
        })
    }


    async performSketch(){
        await new Promise(resolve=>{

            this.SketchViewModel.polygonSymbol = this._symbol as any // when complete wil be apply
            this.EventHub.emit("tipText","繪製多邊形，請點擊地圖來產生至少 3 個點來進行調整") 
            
            let cLastGs = new Array<__esri.Graphic>()
            let uLastG:__esri.Graphic = null

            this.SketchViewModel.on("create",evt=>{
                if(evt.state==="cancel"){
                    return
                }
                if(evt.state==="complete"){
                    uLastG = cLastGs.pop()
                    this.SketchViewModel.update(uLastG,{tool:"reshape"})
                    cLastGs = []
                    return
                }
                if(evt.toolEventInfo.type === "vertex-add"){
                    cLastGs.push(evt.graphic)
                    if(cLastGs.length > 2) { // 可構成面，交給使用者變形
                        this.EventHub.emit("tipText","拖動各圓點改變多邊形，點擊其他地方完成操作") 
                        this.SketchViewModel.complete()
                    }
                }
            })

            // 檢查使用者的變形是否重疊
            this.SketchViewModel.on("update",async evt=>{
                if(evt.state === "complete" || evt.state === "cancel"){
                    this.EventHub.emit("tipText","正在處理中...") 
                    resolve()
                }
                let isCross = false
                isCross = await this.Engine.overlaps(uLastG.geometry,evt.graphics[0].geometry)
                if(!isCross){
                    uLastG = evt.graphics[0]
                }else{
                    this.EventHub.emit("tipText","圖形發生交集，請重試") 
                    this.SketchViewModel.undo()
                }
            })
            
            this.SketchViewModel.create("polygon",{mode:"click"})
        })
    }
}
