import {loadModule,proj} from "./utils"

export class LayerWorldFile {
    
    view:__esri.MapView
    extent:{xmin:number,ymax:number,xmax:number,ymin:number}
    img:CanvasImageSource
    canvas:HTMLCanvasElement
    canvasCxt:CanvasRenderingContext2D 

    constructor(view:__esri.MapView){
        this.view = view
    }

    private toExtent({pixelSizeX, pixelSizeY, rotationX, rotaionY, centerCoordX, centerCoordY, imagewidth, imageHeight}) {
        const xmin = centerCoordX - (pixelSizeX / 2)
        const ymax = centerCoordY - (pixelSizeY / 2)
        const xmax = xmin + (pixelSizeX * imagewidth)
        const ymin = ymax + (pixelSizeY * imageHeight)
        return {xmin,ymax,xmax,ymin}
    }

    async read(img:File,wf:File){
        
        console.log("img", img)
        console.log("wf", wf)
        
        const fileReader = new FileReader()
        
        const wDef = await new Promise((res,rej)=>{
            fileReader.readAsText(wf)
            fileReader.onload = () => res(fileReader.result as string)
            fileReader.onerror = e => rej("[ world args read error ]" + e)
        }) as string

        // get img size
        const image = new Image()
        image.src = URL.createObjectURL(img)
        let imagewidth = 0 
        let imageHeight = 0 
        const {w,h} = await new Promise((res,rej)=>{
            image.onload = ()=>res({w:image.width,h:image.height})
            image.onerror = e=>rej('[ img read error ]' + e )
        })
        this.img = image
        imagewidth = w
        imageHeight = h
        
        console.log({imagewidth,imageHeight})

        // parse six args
        const wfArgs = wDef.split(/\r|\n/).map(s=>s.trim()).filter(s=>s!=='')
        console.log("[ parse world file args ]",wfArgs)

        const [
            pixelSizeX,
            rotationX,
            rotaionY,
            pixelSizeY,
            centerCoordX,
            centerCoordY,
        ] = wfArgs

        this.extent = this.toExtent({pixelSizeX, pixelSizeY, rotationX, rotaionY, centerCoordX, centerCoordY, imagewidth, imageHeight})

        return this.extent
    }

    async getLyrConstrutor(srcEPSG:string){
        console.log("[ source srs ]",srcEPSG)
        const BaseDynamicLayer: any = await loadModule<__esri.BaseDynamicLayer>("esri/layers/BaseDynamicLayer")

        this.canvas = document.createElement("canvas")
        this.canvas.width = 1230
        this.canvas.height = 912
        this.canvasCxt = this.canvas.getContext("2d")

        const customlyr = BaseDynamicLayer.createSubclass({
            properties: {
                getMapUrl: null,
                getMapParameters: null
            },
            getImageUrl: ()=> {
                
                const {xmax,ymax,xmin,ymin} = this.extent
                console.log("{xmax,ymax,xmin,ymin}",{xmax,ymax,xmin,ymin})

                const rt84 = proj(srcEPSG,"EPSG:4326",[xmax,ymax])
                const rt = this.view.toScreen({
                    x: rt84[0],
                    y: rt84[1],
                    spatialReference: {
                        wkid: 4326
                    }
                } as any)
                const rb84 = proj(srcEPSG,"EPSG:4326",[xmax,ymin])
                const rb = this.view.toScreen({
                    x: rb84[0],
                    y: rb84[1],
                    spatialReference: {
                        wkid: 4326
                    }
                } as any)
                const lt84 = proj(srcEPSG,"EPSG:4326",[xmin,ymax])
                const lt = this.view.toScreen({
                    x: lt84[0],
                    y: lt84[1],
                    spatialReference: {
                        wkid: 4326
                    }
                } as any)
                this.canvasCxt.clearRect(0,0,this.canvas.width,this.canvas.height)
                this.canvasCxt.drawImage(
                    this.img, 
                    lt.x,
                    lt.y,
                    Math.abs(rt.x - lt.x), 
                    Math.abs(lt.y - rb.y)
                )
                return this.canvas.toDataURL()
            }
        })
        return customlyr
    }
}