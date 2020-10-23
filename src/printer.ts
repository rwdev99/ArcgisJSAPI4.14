
import { loadModule } from './utils';

/**
 * PrintTask
 * @see https://developers.arcgis.com/javascript/latest/api-reference/esri-tasks-PrintTask.html
 * PrintTemplate
 * @see https://developers.arcgis.com/javascript/latest/api-reference/esri-tasks-support-PrintTemplate.html
 * @see https://developers.arcgis.com/javascript/latest/api-reference/esri-tasks-support-LegendLayer.html
 * PrintParameters
 * @see https://developers.arcgis.com/javascript/latest/api-reference/esri-tasks-support-PrintParameters.html
 */

export class Printer{

    /**
     * history
     */
    history:Array<Ihistory> = new Array<Ihistory>()

    /**
     * Base properties
     */
    private _srvUrl:string
    private _view:__esri.MapView|__esri.SceneView
    private _DPI:number = 96
    // private _ORIGIN_DPI:number = 150
    private _RESOLUTION:number = 96/150

    /**
     * PDF layout
     */
    size:"A0"|"A1"|"A3"|"A4"|"B4"|"B5" = "A4"

    dir:"vertical"|"horizontal"

    scale:number

    title:string
    comment:string
    title_height:number = 20
    commt_height:number = 20

    private _page_height:number = 0
    private _page_width:number = 0

    private _previewRoot:HTMLElement
    private _previewContainer:HTMLElement
    private _previewDom:HTMLElement //- change w、h

    /**
     * @param view 地圖實例之 VIEW
     * @param previewRoot 預覽框的根節點
     * @param srvUrl 產生圖片的(ARCGIS API) 服務URL
     */
    constructor(
        view:__esri.MapView|__esri.SceneView,
        previewRoot:HTMLElement,
        //srvUrl:string = "https://urbangis.hccg.gov.tw/arcgis/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task"
        srvUrl:string = "https://utility.arcgisonline.com/arcgis/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task"
        // srvUrl:string = "https://www.leica.com.tw/arcgiswa/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task"
    ){
        this._view = view
        this._previewRoot = previewRoot || view.container
        this._srvUrl =  srvUrl
    }

    get previewWidth(){ return !this.scale ? this._page_width : this.scale / this._view.scale * this._page_width}
    get previewHeight(){ return !this.scale ? this._page_height : this.scale / this._view.scale * this._page_height}
    
    /**
     * 產生預覽框 DOM
     */
    renderPreviewRegion(){
        
        if(!this._previewDom){ //- first create

            this._previewContainer = document.createElement("div")
            this._previewContainer.style.cssText = `
                position: fixed;
                pointer-events: none;
                z-index: 1;
                top: 0;
                right: 0;
                left: 0;
                bottom: 0;
                display: flex;
                align-items: center;
                justify-content: center;
            `

            this._previewDom = document.createElement("div")
            this._previewDom.style.cssText = `
                box-sizing: border-box;
                box-shadow: 0px 0px 0px 2000px rgba(0,0,0,0.6);
                border: 1px solid red;
                transition: .2s all ease;
            `

            this._previewContainer.append(this._previewDom)
            this._previewRoot.append(this._previewContainer)
            
        }
        this._previewDom.style.width = `${this.previewWidth}px`
        this._previewDom.style.height = `${this.previewHeight}px`
        
    }

    /**
     * 設定列印參數
     */
    setOptions(
        sizeOption:{ 
            size:"A0"|"A1"|"A3"|"A4"|"B4"|"B5",
            dir:"vertical"|"horizontal"
            scale:number, 
            title?:string, 
            comment?:string 
        }
    ) {
        this.size = sizeOption.size
        this.dir = sizeOption.dir
        //- 0 means 無設定
        this.scale = sizeOption.scale
        this.title = sizeOption.title
        this.comment = sizeOption.comment

        enum width {
            A0=4964,
            A1=3509,
            A3=1754,
            A4=1240,
            B4=1476,
            B5=1029
        }
        enum height {
            A1=7022,
            A0=4964,
            A3=2481,
            A4=1754,
            B4=2085,
            B5=1476
        }
        let w = width[this.size]*this._RESOLUTION
        let h = height[this.size]*this._RESOLUTION

        this._page_width = this.dir==="vertical" ? w : h
        this._page_height = this.dir==="vertical" ? h : w

        this.renderPreviewRegion()
    }

    /**
     * "欲列印的內容 ( 圖片 )" 加入
     */
    private _generateNewPageByURL(result:__esri.PrintResponse):string{
        let blockTitle = `<div class='title'>${this.title}</div>`;
        let blockMsgAlert = `<div class='alert' style='padding-right:5px;'>本網站所有資料僅供參考用途，不得作為任何形式證明或主張</div>`;
        let blockScale = `<div class='scale' style='padding-left:15px;'>比例尺 1:${this.scale===0 ? Number(this._view.scale.toFixed(0)) : this.scale}</div>`;
        let blockMap = `<div class='map' style='margin-top:2px;'><img src='${result.url}' /></div>`;
        let blockComment = `
            <table style='border-radius:5px;border:1px #999; width:100%;'>
                <tr><td style='padding:5px;border-bottom: 2px #666;font-size:20px;font-weight:bold;text-align:center;'>列印說明</td></tr>
                <tr><td style='padding:5px;font-size:16px;height:100px;vertical-align:top;'>${this.comment.replace(/(?:\\[rn]|[\r\n]+)+/g, "<br/>")}</td></tr>
            </table>
        `;

        let pageContent = "";
        pageContent += `
        <table style='width:100%;' cellpadding='0' cellspacing='0'>
            <tr>
                <td style='width:50%;text-align:left;font-style:italic;font-size:12px;'></td>
                <td style='width:50%;text-align:right;font-style:italic;font-size:12px;'>${new Date()}</td>
            </tr>
            <tr>
                <td colspan='2' style='text-align:center;color:#333;font-size:36px;font-weight:bold;'>${this.title ? blockTitle : ""}</td>
            </tr>
            <tr>
                <td colspan='2' style='text-align:center;border:1px #666;border-bottom:none;'>${blockMap}</td>
            </tr>
            <tr>
                <td style='height:40px;width:50%;border-left:1px #666;border-bottom:1px #666;text-align:left;font-style:italic;font-size:12px;background-color:#e3e5fe;color:#f00;'>${blockScale}</td>
                <td style='height:40px;width:50%;border-right:1px #666;border-bottom:1px #666;text-align:right;font-style:italic;font-size:12px;background-color:#e3e5fe;color:#f00;'>${blockMsgAlert}</td>
            </tr>
            <tr>
                <td colspan='2' style='border-left:1px #666;border-right:1px #666;'>${this.comment ? blockComment : ""}</td>
            </tr>
        </table>
        `;
        return pageContent.trim()
    }

    /**
     * #1 
     * 經由 ARCGIS PRINT API 取得 "欲列印的內容 ( 圖片 )"
     * 會產生 "excute" 請求
     */
    async getPrintPageContent():Promise<__esri.PrintResponse>{
        try{

            let PrintTask = await loadModule<__esri.PrintTaskConstructor>("esri/tasks/PrintTask")
            let PrintTemplate = await loadModule<__esri.PrintTemplateConstructor>("esri/tasks/support/PrintTemplate")
            let PrintParameters = await loadModule<__esri.PrintParametersConstructor>("esri/tasks/support/PrintParameters")    
    
            let printTask = new PrintTask({
                url: this._srvUrl
            })

            let template = new PrintTemplate({
                exportOptions: {
                    width: this._page_width + 5,
                    height: this._page_height + 5,
                    dpi: this._DPI
                },
                layout: "map-only",
                preserveScale:true,
                outScale:this.scale,
                attributionVisible:false,
                format:"png32",
            })

            let params = new PrintParameters({
                view: this._view,
                template: template
            })

            return (await printTask.execute(params))

        }catch(e){
            throw (new Error("excute 失敗，無法產生列印圖檔 : " + e))
        }
    }
    
    /**
     * 執行列印 主函式
     */
    async execute(getPrintPDFURL:(params:getPrintPDFURLParams) => Promise<getPrintPDFURLResponse>):Promise<Ihistory>{
        try{

            //- 取得透過 API 產生的圖片，並加入其他...備註 內容，送到後端 產生PDF
            let params = {
                printContent: this._generateNewPageByURL(await this.getPrintPageContent()),
                pageSize: this.size,
                pageDirection: this.dir
            }

            //- 參數應傳入為，請求PDF的函式
            let result = await getPrintPDFURL(params)
            console.log("getPrintPDFURL respond : ",result)

            //- 建立 iframe dom 附掛到 body 下
            document.body.appendChild(this.createPDFDOM(result))

            //- 將結果加上時間保存到歷史清單
            let current = {...result,...{date:new Date()}}
            this.history.push(current)
            
            this.openPrinter() //- 立即執行開啟列印
            // console.log(await this._view.takeScreenshot())
            return current // 返回紀錄的 fileNames

        }catch(e){
            throw new Error("無法產生 PDF 文件" + e)
        }
    }

    destroy(){
        this._previewRoot.removeChild(this._previewContainer) //- 移除 預覽框
        this.removePDFDOM()
        this._view.focus()
    }
    /**
     * 新分頁開啟 二進制 PDF 檔案
     * @param fileName 
     */
    async openPDF(fileName?:string){
        let ptr:Ihistory = null
        if(fileName){
            ptr = this.history.find(f=>f.fileName === fileName)
        }else{
            ptr = this.history[this.history.length-1]
        }
        // 請求取得的檔案位置，獲得二進制檔案
        let pdf = window.URL.createObjectURL(await (await fetch(ptr.fileUrl)).blob())
        let link = document.createElement('a')
        link.href = pdf
        link.target = "_blank"
        link.click()
        window.URL.revokeObjectURL(pdf)
    }
    
    /**
     * 下載 該次激活狀態中所產生過的檔案
     * Iframe's name(attr) which was appended to body is equal to filaname in history
     */
    openPrinter(fileName?:string){
        if(!fileName){ // select the newest
            let h = this.history[this.history.length-1]
            // window.frames[h.fileName].focus()
            window.frames[h.fileName].print()
            // window.frames[h.fileName].document.close()
        }else{
            // window.frames[fileName].focus()
            window.frames[fileName].print()
            // window.frames[fileName].document.close()
        }
    }

    //- 清除 DOM 和 紀錄
    removePDFDOM(fileName?:string){
        if(fileName){
            //- 移除 IframeDOMs
            let dom = document.body.querySelector(`[name='${fileName}']`)
            document.body.removeChild(dom)
            //- 重置紀錄成員
            this.history = this.history.filter(i=>i.fileName !== fileName)
        }else{
            this.history.forEach(h=>this.removePDFDOM(h.fileName))
        }
    }

    /**
     * 依瀏覽器 建立 要列印 的 DOM 並附掛到 body 中
     */
    createPDFDOM(f:getPrintPDFURLResponse):HTMLElement{
        let ua = window.navigator.userAgent
        let msie = ua.indexOf('MSIE ')
        let trident = ua.indexOf('Trident/')
        let edge = ua.indexOf('Edge/')
        let url = f.fileUrl
        let PDFDom = null
        if(msie > 0 || trident > 0 || edge > 0){
            PDFDom = document.createElement("object")
            PDFDom.data = url
            PDFDom.type = "application/pdf"
        }else{
            PDFDom = document.createElement("iframe")
            PDFDom.src = url
        }
        PDFDom.name = f.fileName
        PDFDom.style.display = 'none'
        return PDFDom
    }
}
